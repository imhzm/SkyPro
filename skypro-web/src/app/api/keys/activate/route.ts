/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { isKeyExpired, getActivationExpiry } from '@/lib/utils'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

const activateKeySchema = z.object({
  key: z.string().trim().min(1, 'مفتاح التفعيل مطلوب'),
  userId: z.coerce.number().int().positive().optional()
})

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 16 * 1024)
    if (largePayload) return largePayload

    const parsed = activateKeySchema.safeParse(await req.json())
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }
    const { key, userId } = parsed.data
    const adminId = guard.session?.user?.id ? Number(guard.session.user.id) : null
    const ipAddress = getClientIp(req)

    const activationKey = await prisma.activationKey.findUnique({
      where: { keyCode: key },
      include: { devices: true }
    })

    if (!activationKey) {
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'admin_activate_key_denied',
          details: { keyCode: key, reason: 'key_not_found' },
          ipAddress
        }
      })
      return NextResponse.json(errorResponse('مفتاح التفعيل غير صالح'), { status: 404 })
    }

    if (activationKey.status === 'revoked') {
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'admin_activate_key_denied',
          details: { keyCode: key, reason: 'key_revoked' },
          ipAddress
        }
      })
      return NextResponse.json(errorResponse('تم إلغاء هذا المفتاح'), { status: 403 })
    }

    if (activationKey.status === 'expired' || isKeyExpired(activationKey.expiresAt)) {
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'admin_activate_key_denied',
          details: { keyCode: key, reason: 'key_expired' },
          ipAddress
        }
      })
      return NextResponse.json(errorResponse('انتهت صلاحية هذا المفتاح'), { status: 403 })
    }

    if (activationKey.status === 'active' && activationKey.userId && activationKey.userId !== userId) {
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'admin_activate_key_denied',
          details: { keyCode: key, reason: 'key_assigned_to_other_user', targetUserId: userId || null },
          ipAddress
        }
      })
      return NextResponse.json(errorResponse('هذا المفتاح مخصص لمستخدم آخر'), { status: 403 })
    }

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true }
      })
      if (!user || user.status !== 'active') {
        await prisma.auditLog.create({
          data: {
            userId: adminId,
            action: 'admin_activate_key_denied',
            details: { keyCode: key, reason: 'invalid_target_user', targetUserId: userId },
            ipAddress
          }
        })
        return NextResponse.json(errorResponse('المستخدم المحدد غير صالح أو غير نشط'), { status: 400 })
      }
    }

    const expiresAt = activationKey.expiresAt || getActivationExpiry()

    const updateData: any = {
      status: 'active',
      activatedAt: new Date(),
      expiresAt
    }

    if (userId) {
      updateData.userId = userId
    }

    await prisma.activationKey.update({
      where: { id: activationKey.id },
      data: updateData
    })

    if (userId) {
      await prisma.subscription.upsert({
        where: { keyId: activationKey.id },
        create: {
          userId,
          keyId: activationKey.id,
          status: 'active',
          startedAt: new Date(),
          expiresAt,
          amount: 2000,
          currency: 'EGP'
        },
        update: {
          status: 'active',
          startedAt: new Date(),
          expiresAt
        }
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'admin_activate_key',
        details: { keyCode: activationKey.keyCode, targetUserId: userId || null },
        ipAddress
      }
    })

    return NextResponse.json(successResponse({
      status: 'active',
      expiresAt,
      maxDevices: activationKey.maxDevices
    }, 'تم تفعيل المفتاح بنجاح'))
  } catch (err) {
    console.error('Activate key error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
