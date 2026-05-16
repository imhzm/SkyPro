import { prisma } from '@/lib/db'

/**
 * Sweep expired activation keys + subscriptions and mark them accordingly.
 *
 * Runs on-demand (called from /api/admin/stats so it executes whenever the
 * admin dashboard is refreshed). Idempotent — safe to call repeatedly.
 *
 * Rules:
 * - Any ActivationKey with status in ('active','assigned') whose expiresAt
 *   is in the past becomes status='expired' and the user's session is broken
 *   by deactivating linked devices.
 * - Any Subscription with status in ('active','trial') whose expiresAt is
 *   in the past becomes status='expired'.
 *
 * Returns the count of affected rows so the caller can surface a "X
 * subscriptions auto-expired" hint in the UI.
 */
export async function sweepExpiredAccess(): Promise<{
  expiredKeys: number
  expiredSubscriptions: number
  disabledDevices: number
}> {
  const now = new Date()

  // 1. Find keys that should be expired
  const keysToExpire = await prisma.activationKey.findMany({
    where: {
      status: { in: ['active', 'assigned'] },
      expiresAt: { not: null, lt: now },
    },
    select: { id: true },
  })
  const keyIds = keysToExpire.map((k) => k.id)

  // 2. Find subscriptions that should be expired
  const subsToExpire = await prisma.subscription.findMany({
    where: {
      status: { in: ['active', 'trial'] },
      expiresAt: { not: null, lt: now },
    },
    select: { id: true },
  })
  const subIds = subsToExpire.map((s) => s.id)

  if (keyIds.length === 0 && subIds.length === 0) {
    return { expiredKeys: 0, expiredSubscriptions: 0, disabledDevices: 0 }
  }

  let disabledDevices = 0
  await prisma.$transaction(async (tx) => {
    if (keyIds.length > 0) {
      await tx.activationKey.updateMany({
        where: { id: { in: keyIds } },
        data: { status: 'expired' },
      })
      // Disable any devices still tied to these keys so the desktop app
      // logs out cleanly on next validation tick.
      const deviceUpdate = await tx.device.updateMany({
        where: { keyId: { in: keyIds }, isActive: true },
        data: { isActive: false },
      })
      disabledDevices = deviceUpdate.count
    }
    if (subIds.length > 0) {
      await tx.subscription.updateMany({
        where: { id: { in: subIds } },
        data: { status: 'expired' },
      })
    }
    if (keyIds.length > 0 || subIds.length > 0) {
      await tx.auditLog.create({
        data: {
          userId: null,
          action: 'auto_expire_sweep',
          details: {
            expiredKeys: keyIds.length,
            expiredSubscriptions: subIds.length,
            disabledDevices,
          },
          ipAddress: null,
        },
      })
    }
  })

  return {
    expiredKeys: keyIds.length,
    expiredSubscriptions: subIds.length,
    disabledDevices,
  }
}

/**
 * Permanently delete a user and EVERY row that references them.
 * Used by the admin "hard delete" flow.
 *
 * Order matters because of FK constraints — child rows must die first.
 */
export async function hardDeleteUser(userId: number): Promise<{
  deviceCount: number
  keyCount: number
  subscriptionCount: number
  invoiceCount: number
  paymentCount: number
}> {
  return prisma.$transaction(async (tx) => {
    // Children of children first.
    const deviceCount = (await tx.device.deleteMany({ where: { userId } })).count

    // Payments reference invoices + subscriptions + users.
    const paymentCount = (await tx.payment.deleteMany({ where: { userId } })).count

    // Invoices reference subscriptions + users.
    const invoiceCount = (await tx.invoice.deleteMany({ where: { userId } })).count

    // Subscriptions reference keys + users.
    const subscriptionCount = (await tx.subscription.deleteMany({ where: { userId } })).count

    // Activation keys (have FK on user but optional).
    const keyCount = (await tx.activationKey.deleteMany({ where: { userId } })).count

    // OAuth accounts (cascade in schema but be explicit).
    await tx.account.deleteMany({ where: { userId } })

    // Audit logs reference user but should survive — keep them for forensics
    // by nulling the userId instead of deleting (audit history).
    await tx.auditLog.updateMany({ where: { userId }, data: { userId: null } })

    // Finally the user.
    await tx.user.delete({ where: { id: userId } })

    return { deviceCount, keyCount, subscriptionCount, invoiceCount, paymentCount }
  })
}
