import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/db'
import { sendEmail, generateWelcomeEmail, generateWelcomeEmailText } from '@/lib/email'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rejectCrossSite,
  rejectLargeJson,
} from '@/lib/request-security'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 4 * 1024)
    if (largePayload) return largePayload

    const ipAddress = getClientIp(req)
    const ipLimit = checkRateLimit(`resend-verify:ip:${ipAddress}`, 5, 60 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(errorResponse('بريد إلكتروني غير صالح'), { status: 400 })
    }

    const emailLimit = checkRateLimit(`resend-verify:email:${email}`, 3, 60 * 60 * 1000)
    if (!emailLimit.allowed) return rateLimitedResponse(emailLimit.retryAfter)

    // Always return generic success to avoid leaking which emails are registered.
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        activationKeys: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { keyCode: true, expiresAt: true },
        },
      },
    })

    const genericResponse = successResponse(
      null,
      'إذا كان البريد مسجلاً وغير مؤكد، أرسلنا لك رابطاً جديداً. تحقق من بريدك ومن قسم Spam.'
    )

    if (!user) return NextResponse.json(genericResponse)
    if (user.emailVerifiedAt) {
      // Already verified — still return generic message
      return NextResponse.json(genericResponse)
    }
    if (user.status === 'suspended' || user.status === 'deleted') {
      return NextResponse.json(genericResponse)
    }

    // Invalidate any prior verify-email tokens for this user
    await prisma.verificationToken.deleteMany({
      where: { identifier: `verify-email:${user.id}` },
    })

    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    await prisma.verificationToken.create({
      data: {
        identifier: `verify-email:${user.id}`,
        token: tokenHash,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '')
      || 'https://skypro.skywaveads.com'
    const verifyLink = `${baseUrl}/auth/verify-email?token=${rawToken}`

    const key = user.activationKeys[0]
    const welcomeData = {
      name: user.name || 'عميلنا الكريم',
      email: user.email,
      serial: key?.keyCode ?? '—',
      expiryDate: key?.expiresAt?.toLocaleDateString('ar-EG') || '—',
      planLabel: 'تجربة مجانية',
      verifyLink,
    }

    await sendEmail({
      to: user.email,
      subject: 'تأكيد بريدك الإلكتروني — SkyPro',
      text: generateWelcomeEmailText(welcomeData),
      html: generateWelcomeEmail(welcomeData),
    })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'resend_verification_email',
        ipAddress,
      },
    })

    return NextResponse.json(genericResponse)
  } catch (err) {
    console.error('Resend verification email error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
