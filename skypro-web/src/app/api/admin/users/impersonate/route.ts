import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const SESSION_COOKIE = process.env.NODE_ENV === 'production'
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token'

const IMPERSONATION_COOKIE = 'sp_impersonation'

const startSchema = z.object({ userId: z.coerce.number().int().positive() })

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
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response
    const largePayload = rejectLargeJson(req, 4 * 1024)
    if (largePayload) return largePayload

    const parsed = startSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('userId غير صالح'), { status: 400 })
    }

    const adminId = Number(guard.session?.user.id)
    const target = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, email: true, name: true, role: true, status: true, avatarUrl: true },
    })
    if (!target) {
      return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }
    if (target.id === adminId) {
      return NextResponse.json(errorResponse('لا يمكن انتحال شخصيتك'), { status: 400 })
    }
    if (target.role === 'admin') {
      return NextResponse.json(errorResponse('لا يمكن انتحال شخصية أدمن آخر'), { status: 403 })
    }
    if (target.status !== 'active') {
      return NextResponse.json(errorResponse('الحساب غير نشط'), { status: 400 })
    }

    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      return NextResponse.json(errorResponse('NEXTAUTH_SECRET ناقص'), { status: 500 })
    }

    // Capture original admin token from current request cookie
    const originalSessionToken = req.cookies.get(SESSION_COOKIE)?.value || ''

    // Issue a 30-min session token impersonating the target user
    const maxAge = 30 * 60
    const sessionToken = await encode({
      token: {
        id: String(target.id),
        sub: String(target.id),
        email: target.email,
        name: target.name || undefined,
        picture: target.avatarUrl || undefined,
        role: target.role || 'user',
        status: 'active',
        impersonatedBy: adminId, // marker (not strictly enforced, just for audit)
      },
      secret,
      salt: SESSION_COOKIE,
      maxAge,
    })

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'admin_impersonate_start',
        details: { targetUserId: target.id, targetEmail: target.email },
        ipAddress: getClientIp(req),
      },
    })

    const response = NextResponse.json(successResponse(
      { redirectTo: '/dashboard', target: { id: target.id, email: target.email, name: target.name } },
      `بدأ انتحال شخصية ${target.email}. الجلسة محدودة بـ 30 دقيقة.`
    ))

    // Replace session cookie with the impersonated one
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    })

    // Save the original admin session so we can restore it
    response.cookies.set(IMPERSONATION_COOKIE, originalSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60,
    })

    return response
  } catch (err) {
    console.error('Impersonate start error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

/**
 * DELETE /api/admin/users/impersonate
 * Restores the original admin session from the sp_impersonation cookie.
 */
export async function DELETE(req: NextRequest) {
  try {
    const original = req.cookies.get(IMPERSONATION_COOKIE)?.value || ''
    if (!original) {
      return NextResponse.json(errorResponse('لا يوجد جلسة انتحال نشطة'), { status: 400 })
    }

    // Best-effort audit log — uses current (impersonated) session, fine
    const ip = getClientIp(req)
    try {
      // Don't fail if audit insert fails
      await prisma.auditLog.create({
        data: { userId: null, action: 'admin_impersonate_stop', ipAddress: ip },
      })
    } catch {}

    const response = NextResponse.json(successResponse(
      { redirectTo: '/admin' },
      'تم إنهاء الانتحال — عُدت لحساب الأدمن'
    ))

    // Restore original admin session, clear impersonation marker
    response.cookies.set(SESSION_COOKIE, original, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })
    response.cookies.set(IMPERSONATION_COOKIE, '', { maxAge: 0, path: '/' })

    return response
  } catch (err) {
    console.error('Impersonate stop error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
