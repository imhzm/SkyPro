import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { requireAdmin } from '@/lib/admin-security'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

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
        recentAuditLogs
      }
    })
  } catch (err) {
    console.error('Stats error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
