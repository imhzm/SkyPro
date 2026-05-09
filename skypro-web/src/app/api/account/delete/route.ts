import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/utils'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rejectCrossSite,
  rejectLargeJson,
} from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production'
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token'

/**
 * POST /api/account/delete
 *
 * Customer self-deletion. Requires:
 *   { password?: string, confirmation: 'DELETE' }
 *
 * Password is required for password-based accounts; Google-only accounts
 * may omit it (already authenticated via session).
 *
 * Performs a SOFT DELETE (status='deleted') so audit history remains intact.
 * Cascading effects:
 *   - All ActivationKeys → status='revoked'
 *   - All Devices → isActive=false
 *   - Subscriptions → status='cancelled'
 *   - Email/passwordHash anonymized
 *   - Session cookie cleared
 */
export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 4 * 1024)
    if (largePayload) return largePayload

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(errorResponse('غير مصرح'), { status: 401 })
    }

    const ipAddress = getClientIp(req)
    const ipLimit = checkRateLimit(`account-delete:ip:${ipAddress}`, 5, 60 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const userId = Number(session.user.id)
    if (!Number.isFinite(userId)) {
      return NextResponse.json(errorResponse('جلسة غير صالحة'), { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const password = typeof body?.password === 'string' ? body.password : ''
    const confirmation = typeof body?.confirmation === 'string' ? body.confirmation : ''

    if (confirmation !== 'DELETE') {
      return NextResponse.json(
        errorResponse('يجب كتابة كلمة DELETE للتأكيد'),
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, passwordHash: true, status: true },
    })

    if (!user) {
      return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }

    if (user.role === 'admin') {
      return NextResponse.json(
        errorResponse('لا يمكن حذف حساب مسؤول من هذه الواجهة. تواصل مع الدعم.'),
        { status: 403 }
      )
    }

    if (user.passwordHash) {
      if (!password) {
        return NextResponse.json(
          errorResponse('كلمة المرور مطلوبة للتأكيد'),
          { status: 400 }
        )
      }
      const ok = verifyPassword(password, user.passwordHash)
      if (!ok) {
        return NextResponse.json(errorResponse('كلمة المرور غير صحيحة'), { status: 401 })
      }
    }

    const anonymizedEmail = `deleted_user_${user.id}_${Date.now()}@deleted.local`

    await prisma.$transaction(async (tx) => {
      await tx.activationKey.updateMany({
        where: { userId: user.id },
        data: { status: 'revoked' },
      })
      await tx.device.updateMany({
        where: { userId: user.id },
        data: { isActive: false },
      })
      await tx.subscription.updateMany({
        where: { userId: user.id, status: { notIn: ['expired', 'cancelled'] } },
        data: { status: 'cancelled' },
      })
      await tx.user.update({
        where: { id: user.id },
        data: {
          status: 'deleted',
          email: anonymizedEmail,
          name: 'Deleted User',
          passwordHash: null,
          avatarUrl: null,
        },
      })
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'account_self_deleted',
          details: { originalEmail: user.email },
          ipAddress,
        },
      })
    })

    const response = NextResponse.json(
      successResponse(null, 'تم حذف حسابك نهائياً. شكراً لاستخدامك SkyPro.')
    )

    // Wipe session cookie
    response.cookies.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    })

    return response
  } catch (err) {
    console.error('Account delete error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
