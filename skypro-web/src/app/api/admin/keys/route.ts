/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { generateApiKey } from '@/lib/utils'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const keyStatusSchema = z.enum(['available', 'assigned', 'active', 'expired', 'revoked', 'suspended'])

const listKeysSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(100).default(20),
  status: z.union([keyStatusSchema, z.literal('')]).default('')
})

const generateKeysSchema = z.object({
  count: z.coerce.number().int().min(1).max(100).default(1),
  plan: z.string().trim().min(1).max(40).default('pro'),
  durationDays: z.coerce.number().int().min(1).max(3650).default(365),
  maxDevices: z.coerce.number().int().min(1).max(50).default(1),
  userId: z.coerce.number().int().positive().optional()
})

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const url = new URL(req.url)
    const parsed = listKeysSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('بيانات البحث غير صحيحة'), { status: 400 })
    }

    const { page, limit, status } = parsed.data
    const where: any = {}
    if (status) where.status = status

    const [keys, total] = await Promise.all([
      prisma.activationKey.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true, status: true } },
          _count: { select: { devices: true } }
        }
      }),
      prisma.activationKey.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        keys: keys.map((k) => ({
          id: k.id,
          keyCode: k.keyCode,
          status: k.status,
          plan: k.plan,
          durationDays: k.durationDays,
          maxDevices: k.maxDevices,
          activatedAt: k.activatedAt,
          expiresAt: k.expiresAt,
          createdAt: k.createdAt,
          user: k.user,
          devicesCount: k._count.devices
        })),
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    })
  } catch (err) {
    console.error('Keys list error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 16 * 1024)
    if (largePayload) return largePayload

    const parsed = generateKeysSchema.safeParse(await req.json())
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { count, plan, durationDays, maxDevices, userId } = parsed.data

    if (userId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true }
      })
      if (!targetUser) {
        return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
      }
      if (targetUser.status !== 'active') {
        return NextResponse.json(errorResponse('لا يمكن إنشاء سيريال لمستخدم غير نشط'), { status: 400 })
      }
    }

    const keys = await prisma.$transaction(async (tx) => {
      const createdKeys = []
      for (let i = 0; i < count; i++) {
        const key = await tx.activationKey.create({
          data: {
            keyCode: generateApiKey(),
            plan,
            durationDays,
            maxDevices,
            userId: userId || null,
            status: userId ? 'assigned' : 'available'
          }
        })
        createdKeys.push(key)
      }

      await tx.auditLog.create({
        data: {
          userId: Number(guard.session?.user.id),
          action: 'admin_generate_keys',
          details: { count, plan, durationDays, maxDevices, userId: userId || null },
          ipAddress: getClientIp(req)
        }
      })

      return createdKeys
    })

    return NextResponse.json({
      success: true,
      data: { keys },
      message: `تم إنشاء ${count} مفتاح بنجاح`
    })
  } catch (err) {
    console.error('Admin generate keys error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
