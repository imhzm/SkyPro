import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage, successResponse } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const updateKeySchema = z.object({
  status: z.enum(['available', 'assigned', 'active', 'expired', 'revoked', 'suspended']).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxDevices: z.coerce.number().int().min(1).max(50).optional(),
  plan: z.string().trim().min(1).max(40).optional(),
  /** Reassign to a different user (or set to null to unassign). */
  userId: z.coerce.number().int().positive().nullable().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin(req)
    if (guard.response) return guard.response

    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(errorResponse('معرّف غير صالح'), { status: 400 })
    }

    const key = await prisma.activationKey.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, status: true } },
        subscription: { select: { id: true, status: true, expiresAt: true } },
        _count: { select: { devices: true } },
      },
    })

    if (!key) return NextResponse.json(errorResponse('المفتاح غير موجود'), { status: 404 })

    return NextResponse.json(successResponse(key))
  } catch (err) {
    console.error('Get key error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const tooLarge = rejectLargeJson(req, 8 * 1024)
    if (tooLarge) return tooLarge

    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(errorResponse('معرّف غير صالح'), { status: 400 })
    }

    const parsed = updateKeySchema.safeParse(await req.json())
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join('، ')
      return NextResponse.json(errorResponse(message), { status: 400 })
    }

    const existing = await prisma.activationKey.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!existing) return NextResponse.json(errorResponse('المفتاح غير موجود'), { status: 404 })

    if (parsed.data.userId !== undefined && parsed.data.userId !== null) {
      const target = await prisma.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, status: true },
      })
      if (!target) return NextResponse.json(errorResponse('المستخدم الجديد غير موجود'), { status: 404 })
      if (target.status !== 'active') {
        return NextResponse.json(errorResponse('لا يمكن تخصيص المفتاح لمستخدم غير نشط'), { status: 400 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status
    if (parsed.data.expiresAt !== undefined) {
      updateData.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null
    }
    if (parsed.data.maxDevices !== undefined) updateData.maxDevices = parsed.data.maxDevices
    if (parsed.data.plan !== undefined) updateData.plan = parsed.data.plan
    if (parsed.data.userId !== undefined) updateData.userId = parsed.data.userId

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(errorResponse('لا توجد بيانات للتحديث'), { status: 400 })
    }

    const key = await prisma.activationKey.update({
      where: { id },
      data: updateData,
    })

    await prisma.auditLog.create({
      data: {
        userId: Number(guard.session?.user.id),
        action: 'admin_update_key',
        // Serialize via JSON.parse(JSON.stringify(...)) to coerce Date instances
        // into ISO strings that Prisma's InputJsonValue accepts.
        details: JSON.parse(JSON.stringify({ keyId: id, updates: updateData })),
        ipAddress: getClientIp(req),
      },
    })

    return NextResponse.json(successResponse(key, 'تم تحديث المفتاح'))
  } catch (err) {
    console.error('Update key error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

/**
 * Soft delete = mark as 'revoked'. We never hard-delete a key because
 * doing so would orphan devices/subscriptions/audit history.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const { id: rawId } = await params
    const id = Number(rawId)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(errorResponse('معرّف غير صالح'), { status: 400 })
    }

    const existing = await prisma.activationKey.findUnique({
      where: { id },
      select: { id: true, status: true, keyCode: true },
    })
    if (!existing) return NextResponse.json(errorResponse('المفتاح غير موجود'), { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.activationKey.update({
        where: { id },
        data: { status: 'revoked', expiresAt: new Date() },
      })
      // Disable devices linked to this key so the desktop client logs out.
      await tx.device.updateMany({
        where: { keyId: id },
        data: { isActive: false },
      })
      // Cancel linked subscription if active.
      await tx.subscription.updateMany({
        where: { keyId: id, status: { in: ['active', 'trial'] } },
        data: { status: 'cancelled' },
      })
      await tx.auditLog.create({
        data: {
          userId: Number(guard.session?.user.id),
          action: 'admin_revoke_key',
          details: { keyId: id, keyCode: existing.keyCode, previousStatus: existing.status },
          ipAddress: getClientIp(req),
        },
      })
    })

    return NextResponse.json(successResponse({ id }, 'تم إلغاء المفتاح'))
  } catch (err) {
    console.error('Revoke key error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
