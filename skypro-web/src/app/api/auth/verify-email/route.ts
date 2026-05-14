import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { sendEmail, generateActivationConfirmEmail, generateActivationConfirmEmailText } from '@/lib/email'
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

    // Send activation confirmation email with serial key
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      })
      const activationKey = await prisma.activationKey.findFirst({
        where: { userId, status: 'active' },
        orderBy: { activatedAt: 'desc' }
      })
      const subscription = await prisma.subscription.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })

      if (user && activationKey) {
        const expiryDate = subscription?.expiresAt || activationKey.expiresAt
        const emailData = {
          name: user.name || 'عميلنا الكريم',
          email: user.email,
          serial: activationKey.keyCode,
          expiryDate: expiryDate ? expiryDate.toLocaleDateString('ar-EG') : 'غير محدد',
          planLabel: activationKey.plan === 'trial'
            ? `تجربة مجانية لمدة ${activationKey.durationDays} يوم`
            : 'اشتراك نشط',
        }

        await sendEmail({
          to: user.email,
          subject: 'تم تفعيل حسابك في SkyPro — بيانات الدخول والسيريال',
          text: generateActivationConfirmEmailText(emailData),
          html: generateActivationConfirmEmail(emailData),
        })
      }
    } catch {
      // best-effort — don't block the success response
    }

    return NextResponse.json({ success: true, message: 'تم تأكيد البريد الإلكتروني بنجاح' })
  } catch (err) {
    console.error('Verify email error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
