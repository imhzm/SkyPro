import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { generateWelcomeEmail, generateWelcomeEmailText, sendEmail } from '@/lib/email'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const schema = z.object({
  userId: z.coerce.number().int().positive(),
})

/**
 * POST /api/admin/users/resend-welcome
 * Re-sends welcome email + serial to a user. Used when the user
 * lost the original email or it landed in spam.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 4 * 1024)
    if (largePayload) return largePayload

    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('userId غير صالح'), { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      include: {
        activationKeys: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { keyCode: true, expiresAt: true, plan: true },
        },
      },
    })
    if (!user) {
      return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }

    const key = user.activationKeys[0]
    if (!key) {
      return NextResponse.json(errorResponse('لا يوجد سيريال مرتبط بالمستخدم'), { status: 400 })
    }

    const data = {
      name: user.name || 'عميلنا الكريم',
      email: user.email,
      serial: key.keyCode,
      expiryDate: key.expiresAt
        ? key.expiresAt.toLocaleDateString('ar-EG')
        : 'غير محدد',
      planLabel: key.plan === 'trial' ? 'تجربة مجانية' : 'اشتراك',
    }

    const result = await sendEmail({
      to: user.email,
      subject: 'إعادة إرسال بيانات حسابك في SkyPro',
      text: generateWelcomeEmailText(data),
      html: generateWelcomeEmail(data),
    })

    await prisma.auditLog.create({
      data: {
        userId: Number(guard.session?.user.id),
        action: 'admin_resend_welcome',
        details: { targetUserId: user.id, emailSent: result.success, error: result.error ?? null },
        ipAddress: getClientIp(req),
      },
    })

    if (!result.success) {
      return NextResponse.json(errorResponse(`فشل الإرسال: ${result.error || 'خطأ غير معروف'}`), { status: 502 })
    }

    return NextResponse.json(successResponse(null, `تم إعادة الإرسال إلى ${user.email}`))
  } catch (err) {
    console.error('Resend welcome error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
