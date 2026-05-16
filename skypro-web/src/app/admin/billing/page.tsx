'use client'

import { useEffect, useState } from 'react'
import {
  CreditCard, FileText, TrendingUp, AlertCircle, ArrowDownRight, ArrowUpRight,
  DollarSign, Receipt, Wallet, RefreshCw,
} from 'lucide-react'

interface MonthlyPoint {
  month: string
  revenue: number
  paymentsCount: number
}

interface UserRef { id: number; name: string | null; email: string }

interface PaymentRow {
  id: number
  amount: number
  currency: string
  method: string | null
  paidAt: string | null
  user: UserRef | null
}

interface InvoiceRow {
  id: number
  invoiceNumber: string
  status: string
  totalAmount: number
  currency: string
  createdAt: string
  user: UserRef | null
}

interface Overview {
  currency: string
  revenue: { total: number; thisMonth: number; lastMonth: number; mrr: number; growthPct: number | null }
  payments: { total: number; thisMonth: number }
  outstanding: { amount: number; count: number }
  invoices: { total: number; paid: number; unpaid: number }
  subscriptions: {
    total: number; active: number; trial: number; expired: number; cancelled: number; suspended: number
  }
  monthlySeries: MonthlyPoint[]
  recentPayments: PaymentRow[]
  recentInvoices: InvoiceRow[]
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  issued: 'صادرة',
  paid: 'مدفوعة',
  overdue: 'متأخرة',
  cancelled: 'ملغاة',
}

const STATUS_CLASSES: Record<string, string> = {
  draft: 'admin-badge',
  issued: 'admin-badge-warning',
  paid: 'admin-badge-success',
  overdue: 'admin-badge-danger',
  cancelled: 'admin-badge-danger',
}

function fmt(n: number, currency: string): string {
  return `${n.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`
}

function fmtMonth(ym: string): string {
  // ym = 'YYYY-MM'
  const [y, m] = ym.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' })
}

export default function AdminBillingPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      const res = await fetch('/api/admin/billing/overview', { cache: 'no-store' })
      const json = await res.json()
      if (json?.success) setData(json.data)
      else setError(json?.error || 'فشل تحميل بيانات الفوترة')
    } catch {
      setError('فشل الاتصال بالخادم')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <div className="admin-card border-red-500/30 border">
          <div className="flex items-center gap-3 text-red-400">
            <AlertCircle size={20} />
            <span>{error || 'فشل تحميل بيانات الفوترة'}</span>
          </div>
        </div>
        <button onClick={() => load()} className="admin-btn-secondary">إعادة المحاولة</button>
      </div>
    )
  }

  const { currency, revenue, payments, outstanding, invoices, monthlySeries, recentPayments, recentInvoices } = data
  const maxRevenue = Math.max(...monthlySeries.map((m) => m.revenue), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">الفوترة والإيرادات</h1>
          <p className="text-sm text-slate-400 mt-1">
            ملخص حقيقي للإيرادات والمدفوعات والفواتير
          </p>
        </div>
        <button
          onClick={() => load(false)}
          disabled={refreshing}
          className="admin-btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          تحديث
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total revenue */}
        <div className="admin-card relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 65%)', filter: 'blur(20px)' }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-400">إجمالي الإيرادات</span>
            </div>
            <div className="text-2xl font-bold text-white">{fmt(revenue.total, currency)}</div>
            <div className="mt-1 text-xs text-slate-500">{payments.total} عملية دفع ناجحة</div>
          </div>
        </div>

        {/* This month / MRR */}
        <div className="admin-card relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, #0ea5e9 0%, transparent 65%)', filter: 'blur(20px)' }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-400">إيرادات هذا الشهر</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-white">{fmt(revenue.thisMonth, currency)}</div>
              {revenue.growthPct !== null && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    revenue.growthPct >= 0
                      ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/25'
                      : 'text-red-400 bg-red-500/15 border border-red-500/25'
                  }`}
                >
                  {revenue.growthPct >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                  {Math.abs(revenue.growthPct)}%
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              الشهر الماضي: {fmt(revenue.lastMonth, currency)}
            </div>
          </div>
        </div>

        {/* Outstanding */}
        <div className="admin-card relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 65%)', filter: 'blur(20px)' }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-400">مستحقات معلّقة</span>
            </div>
            <div className="text-2xl font-bold text-white">{fmt(outstanding.amount, currency)}</div>
            <div className="mt-1 text-xs text-slate-500">{outstanding.count} فاتورة لم تُدفع</div>
          </div>
        </div>

        {/* Invoices */}
        <div className="admin-card relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
               style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 65%)', filter: 'blur(20px)' }} />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-400">الفواتير</span>
            </div>
            <div className="text-2xl font-bold text-white">{invoices.total}</div>
            <div className="mt-1 text-xs text-slate-500">
              {invoices.paid} مدفوعة · {invoices.unpaid} معلّقة
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">الإيرادات الشهرية</h2>
            <p className="text-xs text-slate-500 mt-0.5">آخر 12 شهر · من المدفوعات الناجحة</p>
          </div>
          <span className="text-xs text-slate-400 px-2 py-1 rounded-full bg-white/5 border border-white/10">
            {currency}
          </span>
        </div>
        <div className="space-y-2 mt-5">
          {monthlySeries.map((m) => {
            const pct = (m.revenue / maxRevenue) * 100
            return (
              <div key={m.month} className="flex items-center gap-3">
                <div className="w-12 text-[11px] text-slate-500 font-mono">{fmtMonth(m.month)}</div>
                <div className="flex-1 h-6 rounded-md bg-white/[0.03] border border-white/5 overflow-hidden relative">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{
                      width: `${Math.max(pct, m.revenue > 0 ? 2 : 0)}%`,
                      background:
                        'linear-gradient(90deg, rgba(10,108,241,0.7) 0%, rgba(139,44,245,0.7) 100%)',
                      boxShadow: m.revenue > 0 ? '0 0 12px rgba(10,108,241,0.3)' : 'none',
                    }}
                  />
                </div>
                <div className="w-28 text-left text-xs text-slate-300 font-medium" dir="ltr">
                  {m.revenue > 0 ? fmt(m.revenue, currency) : '—'}
                </div>
                <div className="w-12 text-[10px] text-slate-500 text-left">
                  {m.paymentsCount > 0 ? `${m.paymentsCount}×` : ''}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent activity grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="admin-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-400" />
              <h2 className="text-base font-bold text-white">آخر المدفوعات</h2>
            </div>
            <a href="/admin/payments" className="text-xs text-sky-400 hover:text-sky-300">
              عرض الكل →
            </a>
          </div>
          {recentPayments.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">لا توجد مدفوعات بعد</div>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-emerald-500/15 border border-emerald-500/25">
                    <DollarSign size={16} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate">
                      {p.user?.name || p.user?.email || '—'}
                    </div>
                    <div className="text-[11px] text-slate-500" dir="ltr">
                      {p.method || 'manual'} · {p.paidAt ? new Date(p.paidAt).toLocaleDateString('ar-EG') : '—'}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-emerald-400 flex-shrink-0">
                    {fmt(p.amount, p.currency)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="admin-card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-violet-400" />
              <h2 className="text-base font-bold text-white">آخر الفواتير</h2>
            </div>
            <a href="/admin/invoices" className="text-xs text-sky-400 hover:text-sky-300">
              عرض الكل →
            </a>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">لا توجد فواتير بعد</div>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-500/15 border border-violet-500/25">
                    <Receipt size={16} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium truncate" dir="ltr">
                      {inv.invoiceNumber}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate" dir="ltr">
                      {inv.user?.email || '—'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="text-sm font-bold text-white">
                      {fmt(inv.totalAmount, inv.currency)}
                    </div>
                    <span className={`text-[9.5px] ${STATUS_CLASSES[inv.status] ?? 'admin-badge'}`}>
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
