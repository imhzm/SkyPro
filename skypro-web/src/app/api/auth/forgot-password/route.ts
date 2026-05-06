import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { forgotPasswordSchema } from '@/lib/validations'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { generatePasswordResetEmail, generatePasswordResetEmailText, sendEmail } from '@/lib/email'
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rejectCrossSite,
  rejectLargeJson,
} from '@/lib/request-security'
import crypto from 'crypto'

const RESET_EXPIRES_MINUTES = 60
const RESET_RESPONSE = 'إذا كان البريد مسجلاً، ستصلك رسالة إعادة التعيين خلال دقائق'

export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 16 * 1024)
    if (largePayload) return largePayload

    const ip = getClientIp(req)
    const ipLimit = checkRateLimit(`forgot-password:ip:${ip}`, 5, 60 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const body = await req.json()
    const parsed = forgotPasswordSchema.safeParse(body)

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { email } = parsed.data
    const emailLimit = checkRateLimit(`forgot-password:email:${email}`, 3, 60 * 60 * 1000)
    if (!emailLimit.allowed) return rateLimitedResponse(emailLimit.retryAfter)

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json(successResponse(null, RESET_RESPONSE))
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expires = new Date(Date.now() + RESET_EXPIRES_MINUTES * 60 * 1000)
    const identifier = `reset-password:${user.id}`

    await prisma.$transaction([
      prisma.verificationToken.deleteMany({ where: { identifier } }),
      prisma.verificationToken.create({
        data: {
          identifier,
          token: tokenHash,
          expires
        }
      })
    ])

    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || req.nextUrl.origin
    const resetUrl = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'إعادة تعيين كلمة مرور SkyPro',
      text: generatePasswordResetEmailText({
        name: user.name,
        resetUrl,
        expiresMinutes: RESET_EXPIRES_MINUTES
      }),
      html: generatePasswordResetEmail({
        name: user.name,
        resetUrl,
        expiresMinutes: RESET_EXPIRES_MINUTES
      })
    })

    if (!emailResult.success) {
      console.error('Password reset email failed:', emailResult.error)
    }

    return NextResponse.json(successResponse(null, RESET_RESPONSE))
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
