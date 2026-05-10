'use client'

import { useEffect, useState, useCallback } from 'react'
import { CalendarPlus, Check, Download, Power, X } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

interface Subscription {
  id: number
  userId: number
  keyId: number | null
  status: string
  trialEndsAt: string | null
  startedAt: string | null
  expiresAt: string | null
  autoRenew: boolean
  amount: number | null
  currency: string
  createdAt: string
  user: { id: number; email: string; name: string | null }
  key: { keyCode: string; status: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  trial: 'تجريبي',
  active: 'نشط',
  expired: 'منتهي',
  cancelled: 'ملغى',
  suspended: 'موقوف',
  pending_email: 'بانتظار التفعيل',
}

const STATUS_CLASSES: Record<string, string> = {
  trial: 'admin-badge-warning',
  active: 'admin-badge-success',
  expired: 'admin-badge-danger',
  cancelled: 'admin-badge-danger',
  suspended: 'admin-badge-warning',
  pending_email: 'admin-badge-warning',
}

const EXTEND_PRESETS = [
  { days: 7,   label: 'أسبوع' },
  { days: 30,  label: '30 يوم' },
  { days: 90,  label: '3 شهور' },
  { days: 180, label: '6 شهور' },
  { days: 365, label: 'سنة' },
]

export default function AdminSubscriptionsPage() {
  const { success, error } = useToast()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionId, setActionId] = useState<number | null>(null)
  const [extendTarget, setExtendTarget] = useState<Subscription | null>(null)
  const [extendDays, setExtendDays] = useState<number>(30)
  const [customDays, setCustomDays] = useState('')

  const loadSubscriptions = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    fetch(`/api/admin/subscriptions?${params}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSubscriptions(data.data.subscriptions)
          setTotalPages(data.data.totalPages)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    loadSubscriptions()
  }, [loadSubscriptions])

  const updateStatus = async (sub: Subscription, status: string) => {
    setActionId(sub.id)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sub.id, status }),
      })
      const data = await res.json()
      if (data.success) {
        success('تم تحديث الاشتراك بنجاح')
        loadSubscriptions()
      } else {
        error(data.error || 'فشلت العملية')
      }
    } catch {
      error('فشل الاتصال بالخادم')
    } finally {
      setActionId(null)
    }
  }

  const extendSubscription = async () => {
    if (!extendTarget) return
    const days = extendDays
    if (!Number.isFinite(days) || days <= 0 || days > 3650) {
      error('عدد أيام غير صالح')
      return
    }

    setActionId(extendTarget.id)
    try {
      const baseDate = extendTarget.expiresAt ? new Date(extendTarget.expiresAt) : new Date()
      // If already expired, extend from today
      const start = baseDate.getTime() < Date.now() ? new Date() : baseDate
      const newExpiresAt = new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: extendTarget.id,
          expiresAt: newExpiresAt,
          status: 'active',
        }),
      })
      const data = await res.json()
      if (data.success) {
        success(`تم تمديد الاشتراك ${days} يوم بنجاح`)
        setExtendTarget(null)
        setCustomDays('')
        setExtendDays(30)
        loadSubscriptions()
      } else {
        error(data.error || 'فشل التمديد')
      }
    } catch {
      error('فشل الاتصال بالخادم')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الاشتراكات</h1>
          <p className="text-sm text-slate-500 mt-1">{subscriptions.length} اشتراك في هذه الصفحة</p>
        </div>
        <a href="/api/admin/export?type=subscriptions" className="admin-btn-secondary" download>
          <Download size={16} />
          تصدير CSV
        </a>
      </div>

      <div className="admin-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="py-12 text-center text-slate-500">لا يوجد اشتراكات</div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>المفتاح</th>
                  <th>الحالة</th>
                  <th>النوع</th>
                  <th>بداية</th>
                  <th>انتهاء</th>
                  <th>المبلغ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => {
                  const expiresDate = sub.expiresAt ? new Date(sub.expiresAt) : null
                  const isExpired = expiresDate && expiresDate.getTime() < Date.now()
                  return (
                    <tr key={sub.id}>
                      <td>
                        <div className="font-medium text-white">{sub.user?.name || 'بدون اسم'}</div>
                        <div className="mt-0.5 text-xs text-slate-500" dir="ltr">{sub.user?.email}</div>
                      </td>
                      <td className="text-sm font-mono text-slate-400" dir="ltr">{sub.key?.keyCode || '—'}</td>
                      <td><span className={STATUS_CLASSES[sub.status] ?? 'admin-badge'}>{STATUS_LABELS[sub.status] ?? sub.status}</span></td>
                      <td className="text-slate-300">{sub.trialEndsAt ? 'تجريبي' : 'مدفوع'}</td>
                      <td className="text-slate-500">{sub.startedAt ? new Date(sub.startedAt).toLocaleDateString('ar-EG') : '—'}</td>
                      <td className={`text-slate-500 ${isExpired ? '!text-red-400' : ''}`}>
                        {expiresDate ? expiresDate.toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td className="text-slate-300">{sub.amount ? `${sub.amount} ${sub.currency}` : '—'}</td>
                      <td>
                        <div className="flex gap-1.5 flex-wrap">
                          <button
                            onClick={() => { setExtendTarget(sub); setExtendDays(30); setCustomDays('') }}
                            disabled={actionId === sub.id}
                            className="text-xs bg-sky-500/15 border border-sky-500/25 text-sky-300 px-2.5 py-1 rounded-lg hover:bg-sky-500/25 transition-colors disabled:opacity-50"
                            title="تمديد الاشتراك"
                          >
                            <CalendarPlus size={13} className="inline ml-1" />
                            تمديد
                          </button>
                          {sub.status === 'trial' && (
                            <button
                              onClick={() => updateStatus(sub, 'active')}
                              disabled={actionId === sub.id}
                              className="text-xs bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                            >
                              تفعيل
                            </button>
                          )}
                          {sub.status === 'active' && (
                            <button
                              onClick={() => updateStatus(sub, 'cancelled')}
                              disabled={actionId === sub.id}
                              className="text-xs bg-red-500/15 border border-red-500/25 text-red-300 px-2.5 py-1 rounded-lg hover:bg-red-500/25 transition-colors disabled:opacity-50"
                            >
                              <Power size={13} className="inline ml-1" />
                              إلغاء
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
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="admin-btn-secondary !py-1.5 !px-3 disabled:opacity-50">السابق</button>
            <span className="text-sm text-slate-500">{page} من {totalPages}</span>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="admin-btn-secondary !py-1.5 !px-3 disabled:opacity-50">التالي</button>
          </div>
        )}
      </div>

      {/* Extend modal */}
      {extendTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => actionId === null && setExtendTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border border-sky-500/30 bg-slate-950 p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarPlus size={18} className="text-sky-400" />
                  تمديد الاشتراك
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  سيتم تمديد تاريخ الانتهاء بإضافة عدد الأيام المختارة وتفعيل الاشتراك.
                </p>
              </div>
              <button onClick={() => setExtendTarget(null)} disabled={actionId !== null} className="text-slate-400 hover:text-white" aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <div className="font-medium text-white">{extendTarget.user?.name || 'بدون اسم'}</div>
              <div className="mt-1 text-slate-400" dir="ltr">{extendTarget.user?.email}</div>
              <div className="mt-2 text-xs text-slate-500">
                ينتهي حالياً: {extendTarget.expiresAt
                  ? new Date(extendTarget.expiresAt).toLocaleDateString('ar-EG')
                  : '—'}
              </div>
            </div>

            <label className="admin-label">اختر مدة التمديد</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {EXTEND_PRESETS.map((p) => (
                <button
                  key={p.days}
                  onClick={() => { setExtendDays(p.days); setCustomDays('') }}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    extendDays === p.days && !customDays
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={3650}
                value={customDays}
                onChange={(e) => {
                  setCustomDays(e.target.value)
                  const n = parseInt(e.target.value, 10)
                  if (Number.isFinite(n) && n > 0) setExtendDays(n)
                }}
                placeholder="أيام مخصصة"
                className="admin-input !py-2 !text-sm"
              />
            </div>

            <p className="text-xs text-slate-500 mb-4">
              التاريخ الجديد:{' '}
              <strong className="text-sky-300">
                {(() => {
                  const base = extendTarget.expiresAt ? new Date(extendTarget.expiresAt) : new Date()
                  const start = base.getTime() < Date.now() ? new Date() : base
                  const newDate = new Date(start.getTime() + extendDays * 24 * 60 * 60 * 1000)
                  return newDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
                })()}
              </strong>
            </p>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setExtendTarget(null)} disabled={actionId !== null} className="admin-btn-secondary">
                إلغاء
              </button>
              <button
                onClick={extendSubscription}
                disabled={actionId !== null || !extendDays}
                className="admin-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check size={16} />
                {actionId !== null ? 'جارٍ التمديد...' : 'تأكيد التمديد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
