import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { rejectCrossSite, rejectLargeJson, checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/request-security'
import { verifyTOTP, generateBackupCodes } from '@/lib/totp'
import { notifySecurityEvent } from '@/lib/security'

export const dynamic = 'force-dynamic'

/**
 * POST /api/account/2fa/verify-setup
 * Body: { code: '123456' }
 *
 * Confirms the TOTP code from the authenticator app, enables 2FA, and
 * returns 10 single-use backup codes (shown ONCE — user must save them).
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
    const limit = checkRateLimit(`2fa-verify-setup:user:${session.user.id}`, 10, 15 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const body = await req.json().catch(() => null)
    const code = typeof body?.code === 'string' ? body.code : ''
    if (!code) {
      return NextResponse.json(errorResponse('الرمز مطلوب'), { status: 400 })
    }

    const userId = Number(session.user.id)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, twoFactorSecret: true, twoFactorEnabled: true },
    })
    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(errorResponse('ابدأ الإعداد أولاً'), { status: 400 })
    }
    if (user.twoFactorEnabled) {
      return NextResponse.json(errorResponse('2FA مُفعَّل بالفعل'), { status: 400 })
    }

    if (!verifyTOTP(user.twoFactorSecret, code)) {
      return NextResponse.json(errorResponse('رمز غير صحيح. تحقق من ساعة جهازك وحاول مرة أخرى.'), { status: 400 })
    }

    // Generate + store backup codes (hashed)
    const { plain, hashes } = generateBackupCodes(10)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: JSON.stringify(hashes),
      },
    })

    await notifySecurityEvent({
      userId: user.id,
      email: user.email,
      name: user.name,
      action: '2fa_enabled',
      ipAddress: ip,
      userAgent: req.headers.get('user-agent'),
    })

    return NextResponse.json(successResponse(
      { backupCodes: plain },
      '🛡️ تم تفعيل التحقق بخطوتين بنجاح. احتفظ برموز النسخ الاحتياطي في مكان آمن.'
    ))
  } catch (err) {
    console.error('2FA verify-setup error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
