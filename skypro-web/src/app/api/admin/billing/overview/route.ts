import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage, successResponse } from '@/lib/api'
import { requireAdmin } from '@/lib/admin-security'

export const dynamic = 'force-dynamic'

interface MonthlyPoint {
  month: string  // 'YYYY-MM'
  revenue: number
  paymentsCount: number
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const now = new Date()
    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonthStart = startOfMonth(now)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)

    const [
      // Subscription counts
      totalSubscriptions,
      activeSubscriptions,
      trialSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      suspendedSubscriptions,
      // Real revenue: sum of PAID payments only.
      paidPaymentsAgg,
      thisMonthPaidAgg,
      lastMonthPaidAgg,
      // Outstanding: issued/overdue invoices not paid
      outstandingInvoicesAgg,
      outstandingInvoicesCount,
      // Recent activity
      recentPayments,
      recentInvoices,
      // Monthly breakdown
      monthlyPayments,
      // Counts
      totalInvoices,
      paidInvoicesCount,
      // Currency
      currencySetting,
    ] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'trial' } }),
      prisma.subscription.count({ where: { status: 'expired' } }),
      prisma.subscription.count({ where: { status: 'cancelled' } }),
      prisma.subscription.count({ where: { status: 'suspended' } }),

      prisma.payment.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: 'paid', paidAt: { gte: thisMonthStart } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: {
          status: 'paid',
          paidAt: { gte: monthAgo, lt: thisMonthStart },
        },
        _sum: { amount: true },
        _count: true,
      }),

      prisma.invoice.aggregate({
        where: { status: { in: ['issued', 'overdue'] } },
        _sum: { totalAmount: true },
      }),
      prisma.invoice.count({
        where: { status: { in: ['issued', 'overdue'] } },
      }),

      prisma.payment.findMany({
        where: { status: 'paid' },
        orderBy: { paidAt: 'desc' },
        take: 5,
        select: {
          id: true,
          amount: true,
          currency: true,
          method: true,
          paidAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.invoice.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          currency: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),

      prisma.payment.findMany({
        where: { status: 'paid', paidAt: { gte: twelveMonthsAgo } },
        select: { amount: true, paidAt: true },
      }),

      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'paid' } }),

      prisma.systemSetting.findUnique({ where: { settingKey: 'key_currency' } }),
    ])

    const currency = currencySetting?.settingValue || process.env.DEFAULT_KEY_CURRENCY || 'EGP'

    // Build monthly series for the last 12 months.
    const monthMap = new Map<string, MonthlyPoint>()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = monthKey(d)
      monthMap.set(key, { month: key, revenue: 0, paymentsCount: 0 })
    }
    for (const p of monthlyPayments) {
      if (!p.paidAt) continue
      const key = monthKey(p.paidAt)
      const entry = monthMap.get(key)
      if (entry) {
        entry.revenue = Math.round((entry.revenue + p.amount) * 100) / 100
        entry.paymentsCount += 1
      }
    }
    const monthlySeries: MonthlyPoint[] = Array.from(monthMap.values())

    const totalRevenue = Math.round((paidPaymentsAgg._sum.amount || 0) * 100) / 100
    const thisMonthRevenue = Math.round((thisMonthPaidAgg._sum.amount || 0) * 100) / 100
    const lastMonthRevenue = Math.round((lastMonthPaidAgg._sum.amount || 0) * 100) / 100
    const outstandingAmount = Math.round((outstandingInvoicesAgg._sum.totalAmount || 0) * 100) / 100

    // MRR: revenue this month
    const mrr = thisMonthRevenue
    // Growth: this vs last month, as a percentage
    const growthPct = lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 1000) / 10
      : null

    return NextResponse.json(
      successResponse({
        currency,
        revenue: {
          total: totalRevenue,
          thisMonth: thisMonthRevenue,
          lastMonth: lastMonthRevenue,
          mrr,
          growthPct,
        },
        payments: {
          total: paidPaymentsAgg._count,
          thisMonth: thisMonthPaidAgg._count,
        },
        outstanding: {
          amount: outstandingAmount,
          count: outstandingInvoicesCount,
        },
        invoices: {
          total: totalInvoices,
          paid: paidInvoicesCount,
          unpaid: totalInvoices - paidInvoicesCount,
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          trial: trialSubscriptions,
          expired: expiredSubscriptions,
          cancelled: cancelledSubscriptions,
          suspended: suspendedSubscriptions,
        },
        monthlySeries,
        recentPayments,
        recentInvoices,
      }),
    )
  } catch (err) {
    console.error('Billing overview error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
