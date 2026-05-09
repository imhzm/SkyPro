import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { registerSchema } from '@/lib/validations'
import { generateApiKey, getTrialEndDate, hashPassword } from '@/lib/utils'
import { generateWelcomeEmail, generateWelcomeEmailText, sendEmail } from '@/lib/email'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rejectCrossSite,
  rejectLargeJson,
} from '@/lib/request-security'
import { checkPasswordBreach } from '@/lib/security'

export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const ipAddress = getClientIp(req)
    const ipLimit = checkRateLimit(`register:ip:${ipAddress}`, 10, 60 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { name, email, password } = parsed.data
    const emailLimit = checkRateLimit(`register:email:${email}`, 3, 60 * 60 * 1000)
    if (!emailLimit.allowed) return rateLimitedResponse(emailLimit.retryAfter)

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(errorResponse('البريد الإلكتروني مسجل بالفعل'), { status: 409 })
    }

    // Block known-breached passwords (HIBP k-anonymity API)
    const breach = await checkPasswordBreach(password)
    if (breach.breached && breach.count >= 50) {
      return NextResponse.json(
        errorResponse(`كلمة المرور هذه ظهرت في تسريبات معروفة (${breach.count.toLocaleString('ar-EG')} مرة). اختر كلمة مرور أقوى.`),
        { status: 400 }
      )
    }

    const passwordHash = hashPassword(password)
    const trialDays = parseInt(process.env.DEFAULT_TRIAL_DAYS || '2', 10)
    const maxDevices = parseInt(process.env.DEFAULT_MAX_DEVICES || '1', 10)
    const trialEndsAt = getTrialEndDate()
    const keyCode = generateApiKey()

    const { user, activationKey, rawVerifyToken } = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'user',
          status: 'pending_verification',
          emailVerifiedAt: null  // Email NOT verified until user clicks verification link
        }
      })

      const activationKey = await tx.activationKey.create({
        data: {
          keyCode,
          userId: user.id,
          status: 'pending',  // Key stays pending until email is verified
          plan: 'trial',
          durationDays: trialDays,
          maxDevices,
          activatedAt: null,  // Not activated yet
          expiresAt: trialEndsAt
        }
      })

      await tx.subscription.create({
        data: {
          userId: user.id,
          keyId: activationKey.id,
          status: 'pending_email',  // Will become 'trial' after email verification
          trialEndsAt,
          startedAt: null,
          expiresAt: trialEndsAt
        }
      })

      const rawVerifyToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawVerifyToken).digest('hex')
      await tx.verificationToken.create({
        data: {
          identifier: `verify-email:${user.id}`,
          token: tokenHash,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      })

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'register',
          details: { keyId: activationKey.id, trialDays, pendingVerification: true },
          ipAddress
        }
      })

      return { user, activationKey, rawVerifyToken }
    })

    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://skypro.skywaveads.com'
    const verifyLink = `${appUrl}/auth/verify-email?token=${rawVerifyToken}`

    const welcomeData = {
      name,
      email,
      serial: activationKey.keyCode,
      expiryDate: trialEndsAt.toLocaleDateString('ar-EG'),
      loginMethod: 'Use the password you chose during registration',
      planLabel: `تجربة مجانية لمدة ${trialDays} يوم`,
      verifyLink
    }
    const emailResult = await sendEmail({
      to: email,
      subject: 'بيانات حسابك وتجربة SkyPro المجانية',
      text: generateWelcomeEmailText(welcomeData),
      html: generateWelcomeEmail(welcomeData)
    })

    return NextResponse.json(successResponse({
      userId: user.id,
      email: user.email,
      trialEndsAt,
      emailSent: emailResult.success,
      pendingVerification: true
    }, emailResult.success
      ? 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني لتفعيل التجربة المجانية. إذا لم تظهر الرسالة في الوارد، راجع قسم Spam/Junk.'
      : 'تم إنشاء الحساب، لكن فشل إرسال البريد. تواصل مع الدعم لتفعيل حسابك.'))
  } catch (err) {
    console.error('Register error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
