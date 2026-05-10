import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { rejectLargeJson, checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/request-security'
import { notifySecurityEvent } from '@/lib/security'

export const dynamic = 'force-dynamic'

const schema = z.object({ token: z.string().min(32).max(256) })

/**
 * POST /api/account/email/confirm-change
 * Step 2: Anyone with the token (sent to NEW email) confirms the change.
 * Updates the email atomically + invalidates other sessions + alerts old email.
 */
export async function POST(req: NextRequest) {
  try {
    const largePayload = rejectLargeJson(req, 2 * 1024)
    if (largePayload) return largePayload

    const ip = getClientIp(req)
    const limit = checkRateLimit(`email-change-confirm:ip:${ip}`, 30, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(errorResponse('رمز غير صالح'), { status: 400 })
    }

    const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex')
    const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } })
    if (!record || !record.identifier.startsWith('email-change:')) {
      return NextResponse.json(errorResponse('رمز غير صالح'), { status: 400 })
    }
    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => {})
      return NextResponse.json(errorResponse('انتهت صلاحية الرابط، اطلب رابطاً جديداً'), { status: 400 })
    }

    const [, userIdStr, newEmail] = record.identifier.split(':')
    const userId = Number(userIdStr)
    if (!Number.isFinite(userId) || !newEmail) {
      return NextResponse.json(errorResponse('رمز غير صالح'), { status: 400 })
    }

    // Re-check that newEmail still isn't taken (race condition safety)
    const taken = await prisma.user.findFirst({
      where: { email: newEmail, NOT: { id: userId } },
      select: { id: true },
    })
    if (taken) {
      await prisma.verificationToken.delete({ where: { token: tokenHash } }).catch(() => {})
      return NextResponse.json(errorResponse('هذا البريد أصبح مستخدماً، اختر بريداً آخر'), { status: 409 })
    }

    const oldUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
    if (!oldUser) {
      return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }

    // Atomically: update email + bump passwordChangedAt (invalidates sessions) + delete token
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          email: newEmail,
          emailVerifiedAt: new Date(),
          passwordChangedAt: new Date(),
        },
      }),
      prisma.verificationToken.delete({ where: { token: tokenHash } }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'email_changed',
          details: { from: oldUser.email, to: newEmail },
          ipAddress: ip,
        },
      }),
    ])

    // Notify OLD email (security alert)
    await notifySecurityEvent({
      userId,
      email: oldUser.email,
      name: oldUser.name,
      action: 'password_changed', // reuse same template — same security impact
      ipAddress: ip,
      userAgent: req.headers.get('user-agent'),
      extraDetails: { newEmail, change: 'email' },
    }).catch(() => {})

    return NextResponse.json(successResponse(
      { newEmail },
      'تم تغيير بريدك الإلكتروني بنجاح. سجّل الدخول بالبريد الجديد.'
    ))
  } catch (err) {
    console.error('Email confirm-change error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
