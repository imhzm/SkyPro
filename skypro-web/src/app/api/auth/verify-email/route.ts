import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rejectCrossSite,
  rejectLargeJson,
} from '@/lib/request-security'

export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 16 * 1024)
    if (largePayload) return largePayload

    const ipAddress = getClientIp(req)
    const ipLimit = checkRateLimit(`verify-email:ip:${ipAddress}`, 20, 60 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const { token } = await req.json()

    if (!token || typeof token !== 'string' || token.length > 256) {
      return NextResponse.json(errorResponse('رمز التحقق مطلوب'), { status: 400 })
    }

    const tokenLimit = checkRateLimit(`verify-email:token:${token.slice(0, 16)}`, 5, 60 * 60 * 1000)
    if (!tokenLimit.allowed) return rateLimitedResponse(tokenLimit.retryAfter)

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash }
    })

    if (!verificationToken) {
      return NextResponse.json(errorResponse('رمز التحقق غير صالح'), { status: 400 })
    }

    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token: tokenHash } })
      return NextResponse.json(errorResponse('رمز التحقق منتهي الصلاحية'), { status: 400 })
    }

    const userIdStr = verificationToken.identifier.replace('verify-email:', '')
    const userId = parseInt(userIdStr)

    if (isNaN(userId)) {
      return NextResponse.json(errorResponse('رمز التحقق غير صالح'), { status: 400 })
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date(), status: 'active' }
      }),
      prisma.activationKey.updateMany({
        where: { userId, status: 'pending' },
        data: { status: 'active', activatedAt: new Date() }
      }),
      prisma.subscription.updateMany({
        where: { userId, status: 'pending_email' },
        data: { status: 'trial', startedAt: new Date() }
      }),
      prisma.verificationToken.delete({ where: { token: tokenHash } }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'verify_email',
          ipAddress
        }
      })
    ])

    return NextResponse.json({ success: true, message: 'تم تأكيد البريد الإلكتروني بنجاح' })
  } catch (err) {
    console.error('Verify email error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
