import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(2000),
  type: z.enum(['info', 'success', 'warning', 'error']).default('info'),
  link: z.string().url().max(500).optional(),
  audience: z.enum(['all', 'specific']).default('all'),
  userIds: z.array(z.coerce.number().int().positive()).max(5000).optional(),
})

/**
 * POST /api/admin/notifications/broadcast
 * Send a notification to all users (audience='all'), or specific user IDs.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 64 * 1024)
    if (largePayload) return largePayload

    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(errorResponse(parsed.error.errors.map((e) => e.message).join(', ')), { status: 400 })
    }

    const { title, body, type, link, audience, userIds } = parsed.data
    const adminId = Number(guard.session?.user.id)
    const ipAddress = getClientIp(req)

    let count = 0

    if (audience === 'all') {
      // Single broadcast row (userId=null) — every user sees it via OR clause in /notifications
      await prisma.notification.create({
        data: { userId: null, title, body, type, link },
      })
      count = 1
    } else if (userIds && userIds.length > 0) {
      const result = await prisma.notification.createMany({
        data: userIds.map((id) => ({ userId: id, title, body, type, link })),
      })
      count = result.count
    } else {
      return NextResponse.json(errorResponse('audience=specific requires userIds'), { status: 400 })
    }

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'admin_broadcast_notification',
        details: { audience, recipients: count, title, type },
        ipAddress,
      },
    })

    return NextResponse.json(successResponse(
      { delivered: count },
      audience === 'all' ? 'تم إرسال الإشعار لجميع المستخدمين' : `تم إرسال الإشعار إلى ${count} مستخدم`
    ))
  } catch (err) {
    console.error('Broadcast error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
