import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const bulkSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(500),
  action: z.enum(['suspend', 'activate', 'delete', 'force_logout']),
  reason: z.string().max(500).optional(),
})

/**
 * POST /api/admin/users/bulk
 * Apply an action to many users at once.
 *
 * - suspend: status='suspended' + revoke keys + deactivate devices
 * - activate: status='active' + reactivate suspended keys
 * - delete: status='deleted' + revoke keys + deactivate devices + anonymize
 * - force_logout: bump passwordChangedAt to invalidate sessions
 *
 * Refuses to act on admin accounts and on the actor themselves.
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const parsed = bulkSchema.safeParse(await req.json())
    if (!parsed.success) {
      const errs = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errs), { status: 400 })
    }

    const { ids, action, reason } = parsed.data
    const adminId = Number(guard.session?.user.id)
    const ipAddress = getClientIp(req)

    // Filter out the actor and other admins
    const targets = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, role: true, email: true },
    })

    const targetIds = targets
      .filter((u) => u.id !== adminId && u.role !== 'admin')
      .map((u) => u.id)

    const skipped = ids.length - targetIds.length

    if (targetIds.length === 0) {
      return NextResponse.json(
        errorResponse(`لا يمكن تطبيق الإجراء على أي من المستخدمين المحددين (تم تخطي ${skipped})`),
        { status: 400 }
      )
    }

    let affectedSummary = ''

    await prisma.$transaction(async (tx) => {
      const now = new Date()

      if (action === 'suspend') {
        await tx.user.updateMany({ where: { id: { in: targetIds } }, data: { status: 'suspended' } })
        await tx.activationKey.updateMany({
          where: { userId: { in: targetIds }, status: { notIn: ['revoked', 'expired'] } },
          data: { status: 'suspended' },
        })
        await tx.device.updateMany({
          where: { userId: { in: targetIds }, isActive: true },
          data: { isActive: false },
        })
        await tx.subscription.updateMany({
          where: { userId: { in: targetIds }, status: { notIn: ['expired', 'cancelled'] } },
          data: { status: 'suspended' },
        })
        affectedSummary = `تم حظر ${targetIds.length} مستخدم`
      }

      if (action === 'activate') {
        await tx.user.updateMany({ where: { id: { in: targetIds } }, data: { status: 'active' } })
        await tx.activationKey.updateMany({
          where: { userId: { in: targetIds }, status: 'suspended' },
          data: { status: 'active' },
        })
        affectedSummary = `تم تنشيط ${targetIds.length} مستخدم`
      }

      if (action === 'delete') {
        for (const id of targetIds) {
          await tx.user.update({
            where: { id },
            data: {
              status: 'deleted',
              email: `deleted_user_${id}_${now.getTime()}@deleted.local`,
              name: 'Deleted User',
              passwordHash: null,
              avatarUrl: null,
            },
          })
        }
        await tx.activationKey.updateMany({
          where: { userId: { in: targetIds } },
          data: { status: 'revoked' },
        })
        await tx.device.updateMany({
          where: { userId: { in: targetIds } },
          data: { isActive: false },
        })
        affectedSummary = `تم حذف ${targetIds.length} مستخدم`
      }

      if (action === 'force_logout') {
        await tx.user.updateMany({
          where: { id: { in: targetIds } },
          data: { passwordChangedAt: now },
        })
        affectedSummary = `تم إنهاء جلسات ${targetIds.length} مستخدم`
      }

      await tx.auditLog.create({
        data: {
          userId: adminId,
          action: `bulk_${action}`,
          details: {
            targetIds,
            count: targetIds.length,
            skipped,
            reason: reason ?? null,
          },
          ipAddress,
        },
      })
    })

    return NextResponse.json(successResponse(
      { affected: targetIds.length, skipped },
      affectedSummary + (skipped > 0 ? ` (تخطي ${skipped} حساب admin)` : '')
    ))
  } catch (err) {
    console.error('Bulk action error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
