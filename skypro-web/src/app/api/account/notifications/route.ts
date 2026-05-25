import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { rejectCrossSite, rejectLargeJson, checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const markSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(200).optional(),
  all: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(errorResponse('غير مصرح'), { status: 401 })
    }
    const userId = Number(session.user.id)
    const ip = getClientIp(req)

    const limit = checkRateLimit(`notifications-list:${userId}`, 60, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const [items, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { OR: [{ userId }, { userId: null }] },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({
        where: {
          OR: [{ userId }, { userId: null }],
          readAt: null,
        },
      }),
    ])

    return NextResponse.json(successResponse({ items, unread }))
  } catch (err) {
    console.error('Notifications list error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite
    const largePayload = rejectLargeJson(req, 4 * 1024)
    if (largePayload) return largePayload

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(errorResponse('غير مصرح'), { status: 401 })
    }
    const userId = Number(session.user.id)
    const ip = getClientIp(req)

    const limit = checkRateLimit(`notifications-mark:${userId}`, 120, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const parsed = markSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('بيانات غير صالحة'), { status: 400 })
    }

    // CRITICAL FIX: only mark THIS user's own notifications as read.
    // Broadcast rows (userId=null) are shared — marking them read would
    // hide the broadcast from EVERY user, not just this one. The user-side
    // GET endpoint already shows broadcasts to all users via OR clause.
    // Until we add per-user read receipts for broadcasts, we just skip
    // them in mark-read so the broadcast stays visible to all users.
    const where: Record<string, unknown> = parsed.data.all
      ? { userId, readAt: null }
      : { id: { in: parsed.data.ids ?? [] }, userId }

    const result = await prisma.notification.updateMany({
      where,
      data: { readAt: new Date() },
    })

    return NextResponse.json(successResponse({ marked: result.count }))
  } catch (err) {
    console.error('Notifications mark error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
