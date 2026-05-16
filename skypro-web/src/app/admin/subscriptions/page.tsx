'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { CalendarPlus, Check, Download, Power, X, Zap, Sparkles, Loader2, UserPlus } from 'lucide-react'
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

  /* Stable "now" reference for impure Date comparisons during render.
     Refreshes after every subscriptions reload so the UI stays current. */
  const nowMs = useMemo(() => new Date().getTime(), [subscriptions])

  /* ---------- Grant Access state ---------- */
  const [grantOpen, setGrantOpen] = useState(false)
  const [granting, setGranting] = useState(false)
  const [grantForm, setGrantForm] = useState({
    userEmail: '',
    type: 'paid' as 'paid' | 'trial',
    plan: 'pro',
    durationDays: 365,
    maxDevices: 1,
    price: '2000',
    currency: 'EGP',
    createInvoice: true,
    markPaid: true,
    paymentMethod: 'manual',
    notes: '',
  })
  const [grantResult, setGrantResult] = useState<{ keyCode: string; expiresAt: string; invoiceNumber?: string } | null>(null)

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

  /* ---------- Grant Access handler ---------- */
  const submitGrant = async () => {
    if (!grantForm.userEmail) {
      error('بريد العميل مطلوب')
      return
    }
    if (grantForm.type === 'paid' && (!grantForm.price || parseFloat(grantForm.price) <= 0)) {
      error('السعر مطلوب للاشتراك المدفوع')
      return
    }
    setGranting(true)
    setGrantResult(null)
    try {
      // 1. Resolve user by email
      const userRes = await fetch(
        `/api/admin/users?search=${encodeURIComponent(grantForm.userEmail)}&limit=5`,
      )
      const userData = await userRes.json()
      const u = (userData?.data?.users || []).find(
        (x: { email: string }) => x.email.toLowerCase() === grantForm.userEmail.toLowerCase(),
      )
      if (!u) {
        error('لم يتم العثور على مستخدم بهذا البريد')
        setGranting(false)
        return
      }
      // 2. Call grant-access
      const res = await fetch('/api/admin/users/grant-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: u.id,
          plan: grantForm.plan,
          durationDays: grantForm.durationDays,
          maxDevices: grantForm.maxDevices,
          type: grantForm.type,
          price: grantForm.type === 'paid' ? parseFloat(grantForm.price) : 0,
          currency: grantForm.currency,
          createInvoice: grantForm.type === 'paid' && grantForm.createInvoice,
          markPaid: grantForm.type === 'paid' && grantForm.markPaid,
          paymentMethod: grantForm.paymentMethod,
          notes: grantForm.notes || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        success(data.message || 'تم فتح الاشتراك بنجاح')
        setGrantResult({
          keyCode: data.data.key.keyCode,
          expiresAt: data.data.key.expiresAt,
          invoiceNumber: data.data.invoice?.invoiceNumber,
        })
        loadSubscriptions()
      } else {
        error(data?.error || 'فشل فتح الاشتراك')
      }
    } catch {
      error('فشل الاتصال بالخادم')
    } finally {
      setGranting(false)
    }
  }

  const closeGrant = () => {
    if (granting) return
    setGrantOpen(false)
    setGrantResult(null)
    setGrantForm({
      ...grantForm,
      userEmail: '',
      notes: '',
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة الاشتراكات</h1>
          <p className="text-sm text-slate-500 mt-1">{subscriptions.length} اشتراك في هذه الصفحة</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a href="/api/admin/export?type=subscriptions" className="admin-btn-secondary" download>
            <Download size={16} />
            تصدير CSV
          </a>
          <button
            onClick={() => { setGrantOpen(true); setGrantResult(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #0a6cf1 0%, #5c3df0 55%, #8b2cf5 100%)',
              boxShadow: '0 6px 20px rgba(10,108,241,0.40)',
            }}
          >
            <Zap size={16} />
            فتح اشتراك لعميل
          </button>
        </div>
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
                  const isExpired = expiresDate && expiresDate.getTime() < nowMs
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
                  const base = extendTarget.expiresAt ? new Date(extendTarget.expiresAt) : new Date(nowMs)
                  const start = base.getTime() < nowMs ? new Date(nowMs) : base
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

      {/* ===== Grant Access modal ===== */}
      {grantOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          onClick={closeGrant}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border bg-slate-950 shadow-2xl overflow-hidden"
            style={{ borderColor: 'rgba(10,108,241,0.4)' }}
          >
            {/* Header */}
            <div
              className="relative p-5 overflow-hidden"
              style={{
                background:
                  'linear-gradient(135deg, #0a6cf1 0%, #5c3df0 55%, #8b2cf5 100%)',
              }}
            >
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-30"
                   style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)', filter: 'blur(20px)' }} />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                       style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)' }}>
                    <Sparkles size={22} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">فتح اشتراك لعميل</h2>
                    <p className="text-xs text-white/75 mt-0.5">
                      ينشئ مفتاح + اشتراك + فاتورة + دفعة في خطوة واحدة
                    </p>
                  </div>
                </div>
                <button onClick={closeGrant} disabled={granting}
                        className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {grantResult ? (
                /* Success view */
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <Check size={20} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-white font-bold">تم فتح الاشتراك بنجاح ✓</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        ينتهي: {new Date(grantResult.expiresAt).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-500 mb-1.5 font-semibold">مفتاح التفعيل</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm bg-white/5 border border-white/10 px-3 py-2.5 rounded-lg font-mono text-emerald-300 break-all" dir="ltr">
                        {grantResult.keyCode}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(grantResult.keyCode); success('تم النسخ') }}
                        className="admin-btn-secondary !py-2.5"
                      >
                        نسخ
                      </button>
                    </div>
                  </div>

                  {grantResult.invoiceNumber && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1.5 font-semibold">رقم الفاتورة</div>
                      <code className="block text-sm bg-white/5 border border-white/10 px-3 py-2.5 rounded-lg font-mono text-violet-300" dir="ltr">
                        {grantResult.invoiceNumber}
                      </code>
                    </div>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-white/10">
                    <button
                      onClick={() => { setGrantResult(null) }}
                      className="admin-btn-primary flex-1"
                    >
                      <UserPlus size={16} /> فتح اشتراك آخر
                    </button>
                    <button onClick={closeGrant} className="admin-btn-secondary">
                      إغلاق
                    </button>
                  </div>
                </div>
              ) : (
                /* Form view */
                <>
                  <div>
                    <label htmlFor="grant-email" className="admin-label">بريد العميل *</label>
                    <input
                      id="grant-email"
                      type="email"
                      dir="ltr"
                      autoComplete="off"
                      className="admin-input"
                      value={grantForm.userEmail}
                      onChange={(e) => setGrantForm({ ...grantForm, userEmail: e.target.value })}
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div>
                    <label className="admin-label">نوع الاشتراك *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGrantForm({ ...grantForm, type: 'paid' })}
                        className={`p-3 rounded-xl border-2 text-right transition-all ${
                          grantForm.type === 'paid'
                            ? 'bg-emerald-500/15 border-emerald-500 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-bold text-sm">مدفوع 💰</div>
                        <div className="text-[11px] mt-0.5 opacity-80">مع فاتورة وسجل دفع</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrantForm({ ...grantForm, type: 'trial' })}
                        className={`p-3 rounded-xl border-2 text-right transition-all ${
                          grantForm.type === 'trial'
                            ? 'bg-amber-500/15 border-amber-500 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <div className="font-bold text-sm">تجريبي 🎁</div>
                        <div className="text-[11px] mt-0.5 opacity-80">بدون فاتورة</div>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="grant-plan" className="admin-label">الخطة</label>
                      <select
                        id="grant-plan"
                        className="admin-input"
                        value={grantForm.plan}
                        onChange={(e) => setGrantForm({ ...grantForm, plan: e.target.value })}
                      >
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                        <option value="basic">Basic</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="grant-max-devices" className="admin-label">حد الأجهزة</label>
                      <input
                        id="grant-max-devices"
                        type="number"
                        min="1"
                        max="50"
                        className="admin-input"
                        value={grantForm.maxDevices}
                        onChange={(e) => setGrantForm({ ...grantForm, maxDevices: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="admin-label">مدة الاشتراك</label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { d: 7, l: 'أسبوع' },
                        { d: 30, l: 'شهر' },
                        { d: 90, l: '3 شهور' },
                        { d: 180, l: '6 شهور' },
                        { d: 365, l: 'سنة' },
                      ].map((p) => (
                        <button
                          key={p.d}
                          type="button"
                          onClick={() => setGrantForm({ ...grantForm, durationDays: p.d })}
                          className={`p-2 rounded-lg text-sm font-semibold transition-all border ${
                            grantForm.durationDays === p.d
                              ? 'bg-sky-500/15 border-sky-500 text-sky-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                          }`}
                        >
                          {p.l}
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min={1}
                      max={3650}
                      className="admin-input mt-2 !py-2 !text-sm"
                      placeholder="أو عدد أيام مخصص"
                      value={grantForm.durationDays}
                      onChange={(e) => setGrantForm({ ...grantForm, durationDays: parseInt(e.target.value) || 30 })}
                    />
                  </div>

                  {grantForm.type === 'paid' && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <label htmlFor="grant-price" className="admin-label">السعر *</label>
                          <input
                            id="grant-price"
                            type="number"
                            step="0.01"
                            min="0"
                            className="admin-input"
                            value={grantForm.price}
                            onChange={(e) => setGrantForm({ ...grantForm, price: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor="grant-currency" className="admin-label">العملة</label>
                          <select
                            id="grant-currency"
                            className="admin-input"
                            value={grantForm.currency}
                            onChange={(e) => setGrantForm({ ...grantForm, currency: e.target.value })}
                          >
                            <option value="EGP">EGP</option>
                            <option value="USD">USD</option>
                            <option value="SAR">SAR</option>
                            <option value="AED">AED</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={grantForm.createInvoice}
                            onChange={(e) => setGrantForm({ ...grantForm, createInvoice: e.target.checked })}
                            className="w-4 h-4 accent-sky-500"
                          />
                          <span className="text-sm text-slate-300">إنشاء فاتورة تلقائياً</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={grantForm.markPaid && grantForm.createInvoice}
                            disabled={!grantForm.createInvoice}
                            onChange={(e) => setGrantForm({ ...grantForm, markPaid: e.target.checked })}
                            className="w-4 h-4 accent-emerald-500 disabled:opacity-30"
                          />
                          <span className={`text-sm ${grantForm.createInvoice ? 'text-slate-300' : 'text-slate-600'}`}>
                            تسجيل دفعة كاملة (مدفوعة)
                          </span>
                        </label>
                      </div>
                    </>
                  )}

                  <div>
                    <label htmlFor="grant-notes" className="admin-label">ملاحظات (اختياري)</label>
                    <textarea
                      id="grant-notes"
                      className="admin-input min-h-[50px]"
                      value={grantForm.notes}
                      onChange={(e) => setGrantForm({ ...grantForm, notes: e.target.value })}
                      placeholder="ملاحظات للسجل الداخلي"
                      maxLength={500}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!grantResult && (
              <div className="border-t border-white/5 bg-white/[0.02] p-4 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  {grantForm.type === 'paid' && grantForm.price ? (
                    <>الإجمالي: <strong className="text-emerald-400" dir="ltr">{parseFloat(grantForm.price).toLocaleString('ar-EG')} {grantForm.currency}</strong></>
                  ) : grantForm.type === 'trial' ? (
                    <>فترة تجريبية مجانية</>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <button onClick={closeGrant} disabled={granting} className="admin-btn-secondary">
                    إلغاء
                  </button>
                  <button
                    onClick={submitGrant}
                    disabled={granting || !grantForm.userEmail}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #0a6cf1 0%, #5c3df0 55%, #8b2cf5 100%)',
                      boxShadow: granting ? 'none' : '0 6px 18px rgba(10,108,241,0.40)',
                    }}
                  >
                    {granting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                    {granting ? 'جارٍ الفتح...' : 'فتح الاشتراك الآن'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
