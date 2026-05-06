/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'

export const dynamic = 'force-dynamic'

const listDevicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(100).default(20),
  userId: z.preprocess((value) => value === '' ? undefined : value, z.coerce.number().int().positive().optional())
})

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const url = new URL(req.url)
    const parsed = listDevicesSchema.safeParse(Object.fromEntries(url.searchParams))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('بيانات البحث غير صحيحة'), { status: 400 })
    }

    const { page, limit, userId } = parsed.data
    const where: any = {}
    if (userId) where.userId = userId

    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastSeenAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, name: true, status: true } },
          key: { select: { keyCode: true, status: true } }
        }
      }),
      prisma.device.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: {
        devices,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    })
  } catch (err) {
    console.error('Devices list error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const url = new URL(req.url)
    const id = Number(url.searchParams.get('id'))

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(errorResponse('معرف الجهاز مطلوب'), { status: 400 })
    }

    const device = await prisma.device.findUnique({ where: { id } })
    if (!device) {
      return NextResponse.json(errorResponse('الجهاز غير موجود'), { status: 404 })
    }

    await prisma.device.update({
      where: { id },
      data: { isActive: false, resetCount: device.resetCount + 1 }
    })

    await prisma.auditLog.create({
      data: {
        userId: Number(guard.session?.user.id),
        action: 'admin_reset_device',
        details: { deviceId: id, deviceFingerprint: device.deviceFingerprint },
        ipAddress: getClientIp(req)
      }
    })

    return NextResponse.json({ success: true, message: 'تم إعادة تعيين الجهاز بنجاح' })
  } catch (err) {
    console.error('Reset device error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
