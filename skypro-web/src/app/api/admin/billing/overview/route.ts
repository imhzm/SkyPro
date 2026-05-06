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
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      suspendedSubscriptions,
      activeAmountAgg,
      currencySetting
    ] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'trial' } }),
      prisma.subscription.count({ where: { status: 'expired' } }),
      prisma.subscription.count({ where: { status: 'cancelled' } }),
      prisma.subscription.count({ where: { status: 'suspended' } }),
      prisma.subscription.aggregate({
        where: { status: 'active', amount: { not: null } },
        _sum: { amount: true }
      }),
      prisma.systemSetting.findUnique({ where: { settingKey: 'key_currency' } })
    ])

    const currency = currencySetting?.settingValue || process.env.DEFAULT_KEY_CURRENCY || 'EGP'
    const totalAmountActive = Math.round((activeAmountAgg._sum.amount || 0) * 100) / 100

    return NextResponse.json({
      success: true,
      data: {
        totalSubscriptions,
        activeSubscriptions,
        trialSubscriptions,
        expiredSubscriptions,
        cancelledSubscriptions,
        suspendedSubscriptions,
        totalAmountActive,
        currency
      }
    })
  } catch (err) {
    console.error('Billing overview error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
