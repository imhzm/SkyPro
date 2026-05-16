'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CreditCard, Loader2, Filter, Search, ExternalLink, X,
  CheckCircle2, AlertCircle, RotateCcw, XCircle,
  type LucideIcon,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

interface UserLite { id: number; name: string | null; email: string }
interface InvoiceLite { id: number; invoiceNumber: string; status: string; totalAmount: number }

interface Payment {
  id: number
  amount: number
  currency: string
  status: string
  method: string | null
  provider: string | null
  providerRef: string | null
  paidAt: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: UserLite | null
  subscription: { id: number; status: string } | null
  invoice: InvoiceLite | null
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'معلّقة',
  paid: 'ناجحة',
  failed: 'فاشلة',
  refunded: 'مردودة',
}

const STATUS_TONES: Record<string, string> = {
  pending: 'admin-badge-warning',
  paid: 'admin-badge-success',
  failed: 'admin-badge-danger',
  refunded: 'admin-badge',
}

const STATUS_ICONS: Record<string, LucideIcon> = {
  pending: AlertCircle,
  paid: CheckCircle2,
  failed: XCircle,
  refunded: RotateCcw,
}

function fmt(n: number, currency: string): string {
  return `${n.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`
}

export default function AdminPaymentsPage() {
  const { success, error } = useToast()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [actionId, setActionId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Payment | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/payments?${params}`)
      const data = await res.json()
      if (data?.success) {
        setPayments(data.data.payments)
        setTotalPages(data.data.totalPages)
      }
    } catch {
      error('فشل تحميل المدفوعات')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, error])

  useEffect(() => { load() }, [load])

  const refund = async (p: Payment) => {
    if (!confirm(`استرداد دفعة بقيمة ${fmt(p.amount, p.currency)}?`)) return
    setActionId(p.id)
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, status: 'refunded' }),
      })
      const data = await res.json()
      if (data?.success) {
        success('تم تسجيل الاسترداد')
        await load()
      } else {
        error(data?.error || 'فشل الاسترداد')
      }
    } catch {
      error('فشل الاتصال بالخادم')
    } finally {
      setActionId(null)
    }
  }

  const filtered = search
    ? payments.filter((p) =>
        (p.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.providerRef || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.invoice?.invoiceNumber || '').toLowerCase().includes(search.toLowerCase()),
      )
    : payments

  const totalAmount = filtered
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
               style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>
            <CreditCard size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">المدفوعات</h1>
            <p className="text-sm text-slate-400 mt-0.5">سجل كامل لكل العمليات المالية</p>
          </div>
        </div>
        {filtered.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-slate-500">إجمالي مدفوعات الصفحة</div>
            <div className="text-lg font-bold text-emerald-400" dir="ltr">
              {fmt(totalAmount, payments[0]?.currency || 'EGP')}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="admin-card mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              dir="rtl"
              className="admin-input pr-9"
              placeholder="بحث بالبريد أو رقم الفاتورة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={14} className="text-slate-500" />
            {['', 'paid', 'pending', 'failed', 'refunded'].map((s) => (
              <button
                key={s || 'all'}
                onClick={() => { setStatusFilter(s); setPage(1) }}
                className={statusFilter === s ? 'admin-filter-btn-active' : 'admin-filter-btn-inactive'}
              >
                {s === '' ? 'الكل' : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-sky-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-semibold">لا توجد مدفوعات</p>
            <p className="text-xs text-slate-500 mt-1.5">
              {statusFilter ? 'لا توجد مدفوعات بهذه الحالة' : 'لم يتم تسجيل أي دفعة بعد'}
            </p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الحالة</th>
                  <th>العميل</th>
                  <th>المبلغ</th>
                  <th>الطريقة</th>
                  <th>الفاتورة</th>
                  <th>تاريخ الدفع</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const StatusIcon = STATUS_ICONS[p.status] || AlertCircle
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className={`${STATUS_TONES[p.status] ?? 'admin-badge'} inline-flex items-center gap-1`}>
                          <StatusIcon size={11} />
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                      <td>
                        <div className="text-white font-medium truncate max-w-[200px]">
                          {p.user?.name || '—'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]" dir="ltr">
                          {p.user?.email || 'بلا مستخدم'}
                        </div>
                      </td>
                      <td className={`font-bold ${p.status === 'paid' ? 'text-emerald-400' : 'text-white'}`} dir="ltr">
                        {fmt(p.amount, p.currency)}
                      </td>
                      <td className="text-slate-300 text-sm">{p.method || p.provider || '—'}</td>
                      <td>
                        {p.invoice ? (
                          <code className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded font-mono text-slate-300" dir="ltr">
                            {p.invoice.invoiceNumber}
                          </code>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="text-slate-500 text-xs">
                        {p.paidAt
                          ? new Date(p.paidAt).toLocaleDateString('ar-EG')
                          : new Date(p.createdAt).toLocaleDateString('ar-EG')}
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelected(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
                            title="عرض التفاصيل"
                          >
                            <ExternalLink size={14} />
                          </button>
                          {p.status === 'paid' && (
                            <button
                              onClick={() => refund(p)}
                              disabled={actionId === p.id}
                              className="text-[11px] bg-amber-500/15 border border-amber-500/25 text-amber-300 px-2.5 py-1 rounded-lg hover:bg-amber-500/25 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              {actionId === p.id ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                              استرداد
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                    className="admin-btn-secondary !py-1.5 !px-3 disabled:opacity-50">السابق</button>
            <span className="text-sm text-slate-500">{page} من {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                    className="admin-btn-secondary !py-1.5 !px-3 disabled:opacity-50">التالي</button>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-xl border border-emerald-500/30 bg-slate-950 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-xs text-slate-500 mb-1">عملية رقم</div>
                <h2 className="text-xl font-bold text-white font-mono" dir="ltr">#{selected.id}</h2>
                <span className={`mt-2 inline-flex items-center gap-1 ${STATUS_TONES[selected.status] ?? 'admin-badge'}`}>
                  {STATUS_LABELS[selected.status] ?? selected.status}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-center">
                <div className="text-xs text-slate-400 mb-1">المبلغ</div>
                <div className="text-3xl font-bold text-emerald-400" dir="ltr">
                  {fmt(selected.amount, selected.currency)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500 mb-1">العميل</div>
                  <div className="text-white font-medium">{selected.user?.name || '—'}</div>
                  <div className="text-[11px] text-slate-400" dir="ltr">{selected.user?.email || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">الطريقة</div>
                  <div className="text-white">{selected.method || '—'}</div>
                  <div className="text-[11px] text-slate-400">{selected.provider || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">تاريخ الدفع</div>
                  <div className="text-white">
                    {selected.paidAt ? new Date(selected.paidAt).toLocaleString('ar-EG') : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">إنشاء السجل</div>
                  <div className="text-white">{new Date(selected.createdAt).toLocaleString('ar-EG')}</div>
                </div>
              </div>

              {selected.invoice && (
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3">
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <ExternalLink size={11} /> الفاتورة المرتبطة
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-violet-300" dir="ltr">
                      {selected.invoice.invoiceNumber}
                    </code>
                    <div className="text-sm text-white font-bold" dir="ltr">
                      {fmt(selected.invoice.totalAmount, selected.currency)}
                    </div>
                  </div>
                </div>
              )}

              {selected.providerRef && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">مرجع البوابة</div>
                  <code className="block text-xs text-slate-300 bg-white/[0.02] p-2 rounded-lg border border-white/5 font-mono break-all" dir="ltr">
                    {selected.providerRef}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
