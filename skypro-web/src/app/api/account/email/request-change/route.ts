import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/utils'
import { sendEmail } from '@/lib/email'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { rejectCrossSite, rejectLargeJson, checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const schema = z.object({
  newEmail: z.string().email().max(254),
  password: z.string().min(1).max(128).optional(), // optional for OAuth-only accounts
})

/**
 * POST /api/account/email/request-change
 * Step 1: User enters new email + current password (if password account).
 * Sends a confirmation link to the NEW email. Until confirmed, the email
 * stays the same.
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

    const ip = getClientIp(req)
    const limit = checkRateLimit(`email-change:user:${session.user.id}`, 3, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(errorResponse(parsed.error.errors.map((e) => e.message).join(', ')), { status: 400 })
    }

    const userId = Number(session.user.id)
    const newEmail = parsed.data.newEmail.trim().toLowerCase()
    const password = parsed.data.password ?? ''

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, passwordHash: true, name: true },
    })
    if (!user) {
      return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }

    if (newEmail === user.email) {
      return NextResponse.json(errorResponse('البريد الجديد مطابق للحالي'), { status: 400 })
    }

    const taken = await prisma.user.findUnique({ where: { email: newEmail }, select: { id: true } })
    if (taken) {
      return NextResponse.json(errorResponse('هذا البريد الإلكتروني مستخدم بالفعل'), { status: 409 })
    }

    if (user.passwordHash) {
      if (!password || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json(errorResponse('كلمة المرور غير صحيحة'), { status: 401 })
      }
    }

    // Generate confirmation token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    // Store as VerificationToken with identifier = "email-change:<userId>:<newEmail>"
    await prisma.verificationToken.deleteMany({
      where: { identifier: { startsWith: `email-change:${userId}:` } },
    })

    await prisma.verificationToken.create({
      data: {
        identifier: `email-change:${userId}:${newEmail}`,
        token: tokenHash,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') || 'https://skypro.skywaveads.com'
    const confirmLink = `${baseUrl}/auth/email-change/confirm?token=${rawToken}`

    await sendEmail({
      to: newEmail,
      subject: 'تأكيد تغيير البريد الإلكتروني — SkyPro',
      text: `مرحباً ${user.name || 'عميلنا الكريم'}\n\nطلبت تغيير بريدك الإلكتروني في SkyPro إلى هذا العنوان.\n\nاضغط على الرابط التالي للتأكيد (صالح لمدة ساعة):\n${confirmLink}\n\nإن لم تكن أنت، تجاهل هذه الرسالة.\n\n— فريق SkyPro`,
      html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
        <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
          <div style="background:#0f172a;color:#fff;padding:20px;text-align:center;"><h1 style="margin:0;font-size:18px;">SkyPro</h1></div>
          <div style="padding:24px;line-height:1.8;">
            <p>مرحباً <strong>${(user.name || 'عميلنا الكريم').replace(/[<>&"']/g, '')}</strong></p>
            <p>طلبت تغيير بريدك الإلكتروني في SkyPro إلى هذا العنوان.</p>
            <p style="text-align:center;margin:24px 0;">
              <a href="${confirmLink}" style="display:inline-block;background:#0A6CF1;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:bold;">تأكيد البريد الجديد</a>
            </p>
            <p style="color:#64748b;font-size:13px;">الرابط صالح لمدة ساعة. إن لم تكن أنت، تجاهل هذه الرسالة.</p>
          </div>
        </div>
      </div>`,
    })

    await prisma.auditLog.create({
      data: { userId, action: 'email_change_requested', details: { newEmail }, ipAddress: ip },
    })

    return NextResponse.json(successResponse(null, 'تم إرسال رابط التأكيد إلى البريد الجديد. تحقق من صندوق الوارد وSpam.'))
  } catch (err) {
    console.error('Email change request error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
