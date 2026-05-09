import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { rejectCrossSite, rejectLargeJson, checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/request-security'
import { generateSecret, buildOTPAuthURL } from '@/lib/totp'

export const dynamic = 'force-dynamic'

/**
 * POST /api/account/2fa/setup
 * Generates a temporary TOTP secret and returns it + the otpauth:// URL
 * for the user to scan. The secret is NOT yet stored as enabled — the user
 * must verify with /api/account/2fa/verify-setup before activation.
 *
 * To prevent secret reuse if user abandons setup, the secret is stored in
 * twoFactorSecret with twoFactorEnabled=false. Once they verify, we set
 * twoFactorEnabled=true.
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
    const limit = checkRateLimit(`2fa-setup:user:${session.user.id}`, 5, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const userId = Number(session.user.id)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    })
    if (!user) {
      return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }
    if (user.twoFactorEnabled) {
      return NextResponse.json(errorResponse('2FA مُفعَّل بالفعل. عطّله أولاً لتغيير الجهاز.'), { status: 400 })
    }

    const secret = generateSecret(20)
    const otpauthUrl = buildOTPAuthURL({
      secret,
      accountName: user.email,
      issuer: 'SkyPro',
    })

    // Store provisional secret (NOT yet enabled)
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, twoFactorEnabled: false, twoFactorBackupCodes: null },
    })

    await prisma.auditLog.create({
      data: { userId: user.id, action: '2fa_setup_initiated', ipAddress: ip },
    })

    return NextResponse.json(successResponse({
      secret,
      otpauthUrl,
      // QR code is rendered on the client using the otpauth URL
    }))
  } catch (err) {
    console.error('2FA setup error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
