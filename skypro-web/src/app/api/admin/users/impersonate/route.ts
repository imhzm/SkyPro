import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decode, encode } from "next-auth/jwt";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, getErrorMessage } from "@/lib/api";
import { getClientIp, requireAdmin } from "@/lib/admin-security";
import { rejectLargeJson, sameOrigin } from "@/lib/request-security";
import { encryptToken, decryptToken } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Match Auth.js' URL-based secure-cookie default, including HTTP loopback preview.
const SECURE_COOKIES = (
  process.env.AUTH_URL ||
  process.env.NEXTAUTH_URL ||
  (process.env.NODE_ENV === "production" ? "https:" : "http:")
).startsWith("https:");
const SESSION_COOKIE = SECURE_COOKIES
  ? "__Secure-authjs.session-token"
  : "authjs.session-token";

const IMPERSONATION_COOKIE = "sp_impersonation";

const startSchema = z.object({ userId: z.coerce.number().int().positive() });

/**
 * POST /api/admin/users/impersonate
 * Body: { userId }
 *
 * Issues a temporary session token for the target user (capped at 30 minutes).
 * The original admin session is preserved in `sp_impersonation` cookie so we
 * can restore it via DELETE /api/admin/users/impersonate.
 *
 * Heavy audit logging — every impersonation start/stop is recorded.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true });
    if (guard.response) return guard.response;
    const largePayload = rejectLargeJson(req, 4 * 1024);
    if (largePayload) return largePayload;

    const parsed = startSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(errorResponse("userId غير صالح"), {
        status: 400,
      });
    }

    const adminId = Number(guard.session?.user.id);
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        avatarUrl: true,
      },
    });
    if (!target) {
      return NextResponse.json(errorResponse("المستخدم غير موجود"), {
        status: 404,
      });
    }
    if (target.id === adminId) {
      return NextResponse.json(errorResponse("لا يمكن انتحال شخصيتك"), {
        status: 400,
      });
    }
    if (target.role === "admin") {
      return NextResponse.json(errorResponse("لا يمكن انتحال شخصية أدمن آخر"), {
        status: 403,
      });
    }
    if (target.status !== "active") {
      return NextResponse.json(errorResponse("الحساب غير نشط"), {
        status: 400,
      });
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      return NextResponse.json(errorResponse("NEXTAUTH_SECRET ناقص"), {
        status: 500,
      });
    }

    // Capture original admin token from current request cookie
    const originalSessionToken = req.cookies.get(SESSION_COOKIE)?.value || "";
    if (!originalSessionToken) {
      return NextResponse.json(errorResponse("جلسة الإدارة غير صالحة"), {
        status: 403,
      });
    }

    // Issue a 30-min session token impersonating the target user
    const maxAge = 30 * 60;
    const sessionToken = await encode({
      token: {
        id: String(target.id),
        sub: String(target.id),
        email: target.email,
        name: target.name || undefined,
        picture: target.avatarUrl || undefined,
        role: target.role || "user",
        status: "active",
        // Carries the original admin's role so the proxy can authorize the
        // restore call while the session itself is the target user's.
        impersonatorRole: "admin",
        impersonatedBy: adminId,
      },
      secret,
      salt: SESSION_COOKIE,
      maxAge,
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "admin_impersonate_start",
        details: { targetUserId: target.id, targetEmail: target.email },
        ipAddress: getClientIp(req),
      },
    });

    const response = NextResponse.json(
      successResponse(
        {
          redirectTo: "/dashboard",
          target: { id: target.id, email: target.email, name: target.name },
        },
        `بدأ انتحال شخصية ${target.email}. الجلسة محدودة بـ 30 دقيقة.`,
      ),
    );

    // Replace session cookie with the impersonated one
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: SECURE_COOKIES,
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    // Save the original admin session so we can restore it (encrypted with NEXTAUTH_SECRET)
    const encrypted = encryptToken(originalSessionToken);
    response.cookies.set(IMPERSONATION_COOKIE, encrypted, {
      httpOnly: true,
      secure: SECURE_COOKIES,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 60,
    });

    return response;
  } catch (err) {
    console.error("Impersonate start error:", err);
    return NextResponse.json(errorResponse(getErrorMessage(err)), {
      status: 500,
    });
  }
}

/**
 * DELETE /api/admin/users/impersonate
 * Restores the original admin session from the sp_impersonation cookie.
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!sameOrigin(req)) {
      return NextResponse.json(errorResponse("تم رفض الطلب لأسباب أمنية"), {
        status: 403,
      });
    }
    const encrypted = req.cookies.get(IMPERSONATION_COOKIE)?.value || "";
    if (!encrypted) {
      return NextResponse.json(errorResponse("لا يوجد جلسة انتحال نشطة"), {
        status: 400,
      });
    }

    const original = decryptToken(encrypted);
    if (!original) {
      return NextResponse.json(
        errorResponse("جلسة الانتحال غير صالحة أو معدلة"),
        { status: 403 },
      );
    }

    // Identify actor + target for the audit trail. The current session is the
    // impersonated one — `impersonatedBy` holds the original admin's id.
    const currentSession = await auth();
    const actorAdminId = currentSession?.user.impersonatedBy;
    const secret = process.env.NEXTAUTH_SECRET;
    if (
      !secret ||
      !actorAdminId ||
      currentSession?.user.impersonatorRole !== "admin"
    ) {
      return NextResponse.json(errorResponse("جلسة الانتحال غير صالحة"), {
        status: 403,
      });
    }
    const originalClaims = await decode({
      token: original,
      secret,
      salt: SESSION_COOKIE,
    }).catch(() => null);
    const originalAdmin = await prisma.user.findUnique({
      where: { id: actorAdminId },
      select: { role: true, status: true, passwordChangedAt: true },
    });
    if (
      !originalClaims ||
      Number(originalClaims.id) !== actorAdminId ||
      originalAdmin?.role !== "admin" ||
      originalAdmin.status !== "active" ||
      (originalAdmin.passwordChangedAt &&
        (!originalClaims.iat ||
          Math.floor(originalAdmin.passwordChangedAt.getTime() / 1000) >
            originalClaims.iat))
    ) {
      return NextResponse.json(
        errorResponse("جلسة الإدارة الأصلية لم تعد صالحة"),
        { status: 403 },
      );
    }
    const targetUserId = Number(currentSession?.user?.id) || null;
    const ip = getClientIp(req);

    // Best-effort audit log — don't fail the restore over an insert error.
    try {
      await prisma.auditLog.create({
        data: {
          userId: actorAdminId,
          action: "admin_impersonate_stop",
          details: { targetUserId },
          ipAddress: ip,
        },
      });
    } catch {}

    const response = NextResponse.json(
      successResponse(
        { redirectTo: "/admin" },
        "تم إنهاء الانتحال — عُدت لحساب الأدمن",
      ),
    );

    // Restore original admin session, clear impersonation marker
    response.cookies.set(SESSION_COOKIE, original, {
      httpOnly: true,
      secure: SECURE_COOKIES,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    response.cookies.set(IMPERSONATION_COOKIE, "", { maxAge: 0, path: "/" });

    return response;
  } catch (err) {
    console.error("Impersonate stop error:", err);
    return NextResponse.json(errorResponse(getErrorMessage(err)), {
      status: 500,
    });
  }
}
