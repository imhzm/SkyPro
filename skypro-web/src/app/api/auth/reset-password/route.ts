import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { resetPasswordSchema } from '@/lib/validations'
import { hashPassword } from '@/lib/utils'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rejectCrossSite,
  rejectLargeJson,
} from '@/lib/request-security'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 16 * 1024)
    if (largePayload) return largePayload

    const ip = getClientIp(req)
    const ipLimit = checkRateLimit(`reset-password:ip:${ip}`, 10, 60 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const body = await req.json()
    const parsed = resetPasswordSchema.safeParse(body)

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { password, token } = parsed.data

    if (!token) {
      return NextResponse.json(errorResponse('رابط إعادة التعيين غير صالح'), { status: 400 })
    }

    const tokenLimit = checkRateLimit(`reset-password:token:${token.slice(0, 16)}`, 5, 60 * 60 * 1000)
    if (!tokenLimit.allowed) return rateLimitedResponse(tokenLimit.retryAfter)

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash }
    })

    if (!verificationToken || verificationToken.expires < new Date()) {
      return NextResponse.json(errorResponse('رابط إعادة التعيين منتهي الصلاحية'), { status: 400 })
    }

    const userIdStr = verificationToken.identifier.replace('reset-password:', '')
    const userId = parseInt(userIdStr)

    if (isNaN(userId)) {
      return NextResponse.json(errorResponse('رابط إعادة التعيين غير صالح'), { status: 400 })
    }

    const passwordHash = hashPassword(password)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      }),
      prisma.verificationToken.deleteMany({
        where: { identifier: verificationToken.identifier }
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'password_reset',
          ipAddress: ip
        }
      })
    ])

    return NextResponse.json(successResponse(null, 'تم إعادة تعيين كلمة المرور بنجاح'))
  } catch (err) {
    console.error('Reset password error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
