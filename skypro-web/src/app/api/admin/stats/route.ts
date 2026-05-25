import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { requireAdmin } from '@/lib/admin-security'
import { sweepExpiredAccess } from '@/lib/subscription-maintenance'

export const dynamic = 'force-dynamic'

// In-memory cache for sweep result. The dashboard polls every 15s but the
// sweep involves DB scans + updates — we don't need to run it more than
// once every 5 minutes. The endpoint still recomputes counts on every
// request (fresh data), only the sweep itself is rate-limited.
let lastSweepAt = 0
let lastSweepResult: { expiredKeys: number; expiredSubscriptions: number; disabledDevices: number } = {
  expiredKeys: 0,
  expiredSubscriptions: 0,
  disabledDevices: 0,
}
const SWEEP_THROTTLE_MS = 5 * 60 * 1000 // 5 min

export async function GET() {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    // Throttle the auto-expire sweep — it's expensive (DB scans + transactional
    // updates) and the same dashboard refresh fires every 15s. Once per 5 min
    // is plenty for catching newly-expired keys; the subsequent stats counts
    // are always fresh.
    let sweepResult = lastSweepResult
    const now = Date.now()
    if (now - lastSweepAt >= SWEEP_THROTTLE_MS) {
      try {
        sweepResult = await sweepExpiredAccess()
        lastSweepAt = now
        lastSweepResult = sweepResult
      } catch (e) {
        console.error('[Stats] sweepExpiredAccess failed:', e)
      }
    }

    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      deletedUsers,
      totalKeys,
      availableKeys,
      activeKeys,
      suspendedKeys,
      expiredKeys,
      revokedKeys,
      activeDevices,
      inactiveDevices,
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      suspendedSubscriptions,
      recentUsers,
      recentAuditLogs,
      priceSetting
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.user.count({ where: { status: 'suspended' } }),
      prisma.user.count({ where: { status: 'deleted' } }),
      prisma.activationKey.count(),
      prisma.activationKey.count({ where: { status: 'available' } }),
      prisma.activationKey.count({ where: { status: 'active' } }),
      prisma.activationKey.count({ where: { status: 'suspended' } }),
      prisma.activationKey.count({ where: { status: 'expired' } }),
      prisma.activationKey.count({ where: { status: 'revoked' } }),
      prisma.device.count({ where: { isActive: true } }),
      prisma.device.count({ where: { isActive: false } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'trial' } }),
      prisma.subscription.count({ where: { status: 'suspended' } }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, status: true, createdAt: true }
      }),
      prisma.auditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          createdAt: true,
          user: { select: { email: true, name: true } }
        }
      }),
      prisma.systemSetting.findUnique({ where: { settingKey: 'key_price' } })
    ])

    const keyPrice = parseFloat(priceSetting?.settingValue || process.env.DEFAULT_KEY_PRICE || '2000') || 2000

    let totalRevenue = activeKeys * keyPrice
    let revenueSource: 'payments' | 'estimated_keys' = 'estimated_keys'

    try {
      const paidRevenue = await prisma.payment.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true }
      })
      if (typeof paidRevenue._sum.amount === 'number' && paidRevenue._sum.amount >= 0) {
        totalRevenue = Math.round(paidRevenue._sum.amount * 100) / 100
        revenueSource = 'payments'
      }
    } catch {
      // Fallback for environments where payments table is not migrated yet.
      totalRevenue = activeKeys * keyPrice
      revenueSource = 'estimated_keys'
    }

    const monthlyRevenue = Math.round(totalRevenue / 12)

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        deletedUsers,
        totalKeys,
        availableKeys,
        activeKeys,
        suspendedKeys,
        expiredKeys,
        revokedKeys,
        activeDevices,
        inactiveDevices,
        totalSubscriptions,
        activeSubscriptions,
        trialSubscriptions,
        suspendedSubscriptions,
        totalRevenue,
        monthlyRevenue,
        revenueSource,
        recentUsers,
        recentAuditLogs,
        autoExpire: sweepResult,
        generatedAt: new Date().toISOString(),
      }
    })
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
