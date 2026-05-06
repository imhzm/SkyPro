import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const subscriptionStatusSchema = z.enum(['trial', 'active', 'expired', 'cancelled', 'suspended'])

const listSubscriptionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(100).default(20)
})

const updateSubscriptionSchema = z.object({
  id: z.coerce.number().int().positive(),
  status: subscriptionStatusSchema.optional(),
  expiresAt: z.string().datetime().optional(),
  autoRenew: z.boolean().optional()
})

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const url = new URL(req.url)
    const parsed = listSubscriptionsSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('بيانات البحث غير صحيحة'), { status: 400 })
    }

    const { page, limit } = parsed.data
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true, status: true } },
          key: { select: { keyCode: true, status: true } }
        }
      }),
      prisma.subscription.count()
    ])

    return NextResponse.json({
      success: true,
      data: {
        subscriptions,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    })
  } catch (err) {
    console.error('Subscriptions list error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 16 * 1024)
    if (largePayload) return largePayload

    const parsed = updateSubscriptionSchema.safeParse(await req.json())
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { id, status, expiresAt, autoRenew } = parsed.data
    const updateData: { status?: string; expiresAt?: Date; autoRenew?: boolean } = {}
    if (status) updateData.status = status
    if (expiresAt) updateData.expiresAt = new Date(expiresAt)
    if (autoRenew !== undefined) updateData.autoRenew = autoRenew

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(errorResponse('لا توجد بيانات لتحديثها'), { status: 400 })
    }

    const subscription = await prisma.subscription.findUnique({
      where: { id },
      select: { id: true }
    })
    if (!subscription) {
      return NextResponse.json(errorResponse('الاشتراك غير موجود'), { status: 404 })
    }

    await prisma.subscription.update({
      where: { id },
      data: updateData
    })

    await prisma.auditLog.create({
      data: {
        userId: Number(guard.session?.user.id),
        action: 'update_subscription',
        details: {
          subscriptionId: id,
          updates: {
            status: status || null,
            expiresAt: expiresAt || null,
            autoRenew: autoRenew ?? null
          }
        },
        ipAddress: getClientIp(req)
      }
    })

    return NextResponse.json({ success: true, message: 'تم تحديث الاشتراك بنجاح' })
  } catch (err) {
    console.error('Update subscription error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
