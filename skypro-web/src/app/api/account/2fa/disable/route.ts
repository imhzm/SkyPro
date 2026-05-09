import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/utils'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { rejectCrossSite, rejectLargeJson, checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/request-security'
import { verifyTOTP } from '@/lib/totp'
import { notifySecurityEvent } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * POST /api/account/2fa/disable
 * Body: { password: '...' , code?: '123456' }
 *
 * Disabling 2FA requires either:
 *  - Current password + valid TOTP code, OR
 *  - Just current password (for users who lost their device — they verified
 *    their identity via password, and we'll send an email alert)
 *
 * For Google-only accounts, only the TOTP code is needed.
 */
export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 1024)
    if (largePayload) return largePayload

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(errorResponse('غير مصرح'), { status: 401 })
    }

    const ip = getClientIp(req)
    const limit = checkRateLimit(`2fa-disable:user:${session.user.id}`, 5, 15 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const body = await req.json().catch(() => null)
    const password = typeof body?.password === 'string' ? body.password : ''
    const code = typeof body?.code === 'string' ? body.code : ''

    const userId = Number(session.user.id)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true,
        passwordHash: true,
        twoFactorEnabled: true, twoFactorSecret: true,
      },
    })
    if (!user) {
      return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }
    if (!user.twoFactorEnabled) {
      return NextResponse.json(errorResponse('2FA غير مُفعَّل'), { status: 400 })
    }

    // Validate identity: password (if has one) AND/OR TOTP
    const isGoogleOnly = !user.passwordHash
    if (isGoogleOnly) {
      if (!code || !user.twoFactorSecret || !verifyTOTP(user.twoFactorSecret, code)) {
        return NextResponse.json(errorResponse('رمز TOTP غير صحيح'), { status: 401 })
      }
    } else {
      if (!password || !verifyPassword(password, user.passwordHash!)) {
        return NextResponse.json(errorResponse('كلمة المرور غير صحيحة'), { status: 401 })
      }
      // Code is OPTIONAL when using password (allows recovery if user lost device)
      // but if they provide one, it must be valid
      if (code && (!user.twoFactorSecret || !verifyTOTP(user.twoFactorSecret, code))) {
        return NextResponse.json(errorResponse('رمز TOTP غير صحيح'), { status: 401 })
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    })

    await notifySecurityEvent({
      userId: user.id,
      email: user.email,
      name: user.name,
      action: '2fa_disabled',
      ipAddress: ip,
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json(successResponse(null, 'تم تعطيل التحقق بخطوتين. استخدم كلمة مرور قوية وفعّله مرة أخرى متى استطعت.'))
  } catch (err) {
    console.error('2FA disable error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
