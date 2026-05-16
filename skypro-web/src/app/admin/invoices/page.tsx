'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Receipt, Plus, Check, X, Loader2, Search, Filter,
  FileText, CreditCard, AlertCircle, CheckCircle2, ExternalLink,
} from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

interface UserLite { id: number; name: string | null; email: string }
interface PaymentLite { id: number; amount: number; status: string; createdAt: string }

interface Invoice {
  id: number
  invoiceNumber: string
  status: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  currency: string
  dueDate: string | null
  paidAt: string | null
  notes: string | null
  createdAt: string
  user: UserLite | null
  subscription: { id: number; status: string } | null
  payments: PaymentLite[]
}

interface CreateForm {
  userEmail: string
  subtotal: string
  taxAmount: string
  discountAmount: string
  currency: string
  dueDate: string
  notes: string
  /** When true, also generates a serial + subscription and emails the user. */
  fullActivation: boolean
  durationDays: number
  plan: string
  maxDevices: number
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  issued: 'صادرة',
  paid: 'مدفوعة',
  overdue: 'متأخرة',
  cancelled: 'ملغاة',
}

const STATUS_TONES: Record<string, string> = {
  draft: 'admin-badge',
  issued: 'admin-badge-warning',
  paid: 'admin-badge-success',
  overdue: 'admin-badge-danger',
  cancelled: 'admin-badge-danger',
}

const EMPTY_FORM: CreateForm = {
  userEmail: '',
  subtotal: '',
  taxAmount: '0',
  discountAmount: '0',
  currency: 'EGP',
  dueDate: '',
  notes: '',
  fullActivation: true,
  durationDays: 365,
  plan: 'pro',
  maxDevices: 1,
}

function fmt(n: number, currency: string): string {
  return `${n.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`
}

export default function AdminInvoicesPage() {
  const { success, error } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [actionId, setActionId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [resolvingUser, setResolvingUser] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/admin/invoices?${params}`)
      const data = await res.json()
      if (data?.success) {
        setInvoices(data.data.invoices)
        setTotalPages(data.data.totalPages)
      }
    } catch {
      error('فشل تحميل الفواتير')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, error])

  useEffect(() => { load() }, [load])

  const markPaid = async (inv: Invoice) => {
    setActionId(inv.id)
    try {
      // 1. Create payment
      const payRes = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: inv.user?.id,
          subscriptionId: inv.subscription?.id,
          invoiceId: inv.id,
          amount: inv.totalAmount,
          currency: inv.currency,
          status: 'paid',
          method: 'manual',
          paidAt: new Date().toISOString(),
          provider: 'admin_manual',
        }),
      })
      const payData = await payRes.json()
      if (!payRes.ok || !payData?.success) {
        error(payData?.error || 'فشل تسجيل الدفع')
        return
      }
      success(`تم تسجيل دفعة ${fmt(inv.totalAmount, inv.currency)}`)
      await load()
    } catch {
      error('فشل الاتصال بالخادم')
    } finally {
      setActionId(null)
    }
  }

  const cancelInvoice = async (inv: Invoice) => {
    if (!confirm(`إلغاء الفاتورة ${inv.invoiceNumber}?`)) return
    setActionId(inv.id)
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inv.id, status: 'cancelled' }),
      })
      const data = await res.json()
      if (data?.success) {
        success('تم إلغاء الفاتورة')
        await load()
      } else {
        error(data?.error || 'فشل الإلغاء')
      }
    } catch {
      error('فشل الاتصال بالخادم')
    } finally {
      setActionId(null)
    }
  }

  const filtered = search
    ? invoices.filter((i) =>
        i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        (i.user?.email || '').toLowerCase().includes(search.toLowerCase()),
      )
    : invoices

  const submitForm = async () => {
    if (!form.userEmail || !form.subtotal) {
      error('بريد المستخدم والمبلغ مطلوبان')
      return
    }
    const subtotal = parseFloat(form.subtotal)
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      error('مبلغ غير صالح')
      return
    }
    setResolvingUser(true)
    try {
      // Resolve user by email via users list (admins already have this access)
      const userRes = await fetch(
        `/api/admin/users?search=${encodeURIComponent(form.userEmail)}&limit=5`,
      )
      const userData = await userRes.json()
      const u = (userData?.data?.users || []).find(
        (x: { email: string }) => x.email.toLowerCase() === form.userEmail.toLowerCase(),
      )
      if (!u) {
        error('لم يتم العثور على المستخدم')
        setResolvingUser(false)
        return
      }
      // Two paths:
      // 1. fullActivation=true → use grant-access (creates key + sub + invoice + payment + email)
      // 2. fullActivation=false → just create a standalone invoice (legacy behavior)
      if (form.fullActivation) {
        const total = subtotal + (parseFloat(form.taxAmount) || 0) - (parseFloat(form.discountAmount) || 0)
        const res = await fetch('/api/admin/users/grant-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: u.id,
            plan: form.plan || 'pro',
            durationDays: form.durationDays || 365,
            maxDevices: form.maxDevices || 1,
            type: 'paid',
            price: Math.max(0, total),
            currency: form.currency || 'EGP',
            createInvoice: true,
            markPaid: true,
            paymentMethod: 'manual',
            notes: form.notes || undefined,
            sendEmail: true,
          }),
        })
        const data = await res.json()
        if (res.ok && data?.success) {
          const emailStatus = data?.data?.email?.status
          const msg = emailStatus === 'sent'
            ? `${data.message || 'تم'} · تم إرسال السيريال للعميل بالبريد ✉️`
            : emailStatus === 'failed'
              ? `${data.message || 'تم'} · لكن فشل إرسال البريد`
              : data.message || 'تم إنشاء الفاتورة + السيريال'
          success(msg)
          setShowForm(false)
          setForm(EMPTY_FORM)
          await load()
        } else {
          error(data?.error || 'فشل إنشاء الفاتورة الكاملة')
        }
        return
      }

      // Legacy path: just an invoice, no key/sub/email
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: u.id,
          subtotal,
          taxAmount: parseFloat(form.taxAmount) || 0,
          discountAmount: parseFloat(form.discountAmount) || 0,
          currency: form.currency || 'EGP',
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
          notes: form.notes || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        success('تم إنشاء الفاتورة (بدون سيريال أو إيميل)')
        setShowForm(false)
        setForm(EMPTY_FORM)
        await load()
      } else {
        error(data?.error || 'فشل إنشاء الفاتورة')
      }
    } catch {
      error('فشل الاتصال بالخادم')
    } finally {
      setResolvingUser(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
               style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
            <Receipt size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">الفواتير</h1>
            <p className="text-sm text-slate-400 mt-0.5">إصدار وإدارة فواتير العملاء</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM) }}
          className="admin-btn-primary flex items-center gap-2"
        >
          {showForm ? <><X size={16} /> إلغاء</> : <><Plus size={16} /> فاتورة جديدة</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="admin-card mb-6 !border-violet-500/30 !border">
          <h2 className="text-lg font-bold text-white mb-4">إنشاء فاتورة جديدة</h2>

          {/* Mode toggle */}
          <div className="mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/8">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, fullActivation: true })}
                className={`p-3 rounded-xl border-2 text-right transition-all ${
                  form.fullActivation
                    ? 'bg-emerald-500/15 border-emerald-500 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div className="font-bold text-sm">فاتورة كاملة 💎</div>
                <div className="text-[11px] mt-0.5 opacity-80">
                  فاتورة + دفعة + سيريال + إيميل للعميل
                </div>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, fullActivation: false })}
                className={`p-3 rounded-xl border-2 text-right transition-all ${
                  !form.fullActivation
                    ? 'bg-slate-500/15 border-slate-500 text-white'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
              >
                <div className="font-bold text-sm">فاتورة فقط 📄</div>
                <div className="text-[11px] mt-0.5 opacity-80">
                  بدون سيريال أو إيميل
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="inv-email" className="admin-label">بريد العميل</label>
              <input
                id="inv-email"
                type="email"
                dir="ltr"
                className="admin-input"
                value={form.userEmail}
                onChange={(e) => setForm({ ...form, userEmail: e.target.value })}
                placeholder="customer@example.com"
              />
            </div>
            <div>
              <label htmlFor="inv-subtotal" className="admin-label">المبلغ الأساسي *</label>
              <input
                id="inv-subtotal"
                type="number"
                step="0.01"
                min="0"
                className="admin-input"
                value={form.subtotal}
                onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
                placeholder="2000"
              />
            </div>
            <div>
              <label htmlFor="inv-currency" className="admin-label">العملة</label>
              <select
                id="inv-currency"
                className="admin-input"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              >
                <option value="EGP">EGP - جنيه مصري</option>
                <option value="USD">USD - دولار</option>
                <option value="SAR">SAR - ريال سعودي</option>
                <option value="AED">AED - درهم إماراتي</option>
                <option value="EUR">EUR - يورو</option>
              </select>
            </div>
            <div>
              <label htmlFor="inv-tax" className="admin-label">ضريبة</label>
              <input
                id="inv-tax"
                type="number"
                step="0.01"
                min="0"
                className="admin-input"
                value={form.taxAmount}
                onChange={(e) => setForm({ ...form, taxAmount: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="inv-discount" className="admin-label">خصم</label>
              <input
                id="inv-discount"
                type="number"
                step="0.01"
                min="0"
                className="admin-input"
                value={form.discountAmount}
                onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="inv-due" className="admin-label">تاريخ الاستحقاق</label>
              <input
                id="inv-due"
                type="date"
                className="admin-input"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="inv-notes" className="admin-label">ملاحظات (اختياري)</label>
              <textarea
                id="inv-notes"
                className="admin-input min-h-[60px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="بيانات إضافية تظهر في الفاتورة"
                maxLength={500}
              />
            </div>

            {/* Activation fields — only when fullActivation is on */}
            {form.fullActivation && (
              <div className="md:col-span-2 p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/20 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                        style={{ boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
                  بيانات السيريال والاشتراك (سيُرسل للعميل بالبريد)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="inv-plan" className="admin-label">الخطة</label>
                    <select
                      id="inv-plan"
                      className="admin-input"
                      value={form.plan}
                      onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    >
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                      <option value="basic">Basic</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="inv-duration" className="admin-label">المدة (يوم)</label>
                    <select
                      id="inv-duration"
                      className="admin-input"
                      value={form.durationDays}
                      onChange={(e) => setForm({ ...form, durationDays: parseInt(e.target.value) || 365 })}
                    >
                      <option value="30">شهر (30)</option>
                      <option value="90">3 شهور (90)</option>
                      <option value="180">6 شهور (180)</option>
                      <option value="365">سنة (365)</option>
                      <option value="730">سنتين (730)</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="inv-maxdev" className="admin-label">حد الأجهزة</label>
                    <input
                      id="inv-maxdev"
                      type="number"
                      min="1"
                      max="50"
                      className="admin-input"
                      value={form.maxDevices}
                      onChange={(e) => setForm({ ...form, maxDevices: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5">
            <button onClick={submitForm} disabled={resolvingUser} className="admin-btn-primary flex items-center gap-2">
              {resolvingUser ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              إنشاء الفاتورة
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
                    className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 text-sm">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="admin-card mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              dir="rtl"
              className="admin-input pr-9"
              placeholder="بحث برقم الفاتورة أو البريد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={14} className="text-slate-500" />
            {['', 'issued', 'paid', 'overdue', 'cancelled'].map((s) => (
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
            <Receipt size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 font-semibold">لا توجد فواتير</p>
            <p className="text-xs text-slate-500 mt-1.5">
              {statusFilter ? 'لا توجد فواتير بهذه الحالة' : 'لم يتم إنشاء أي فاتورة بعد'}
            </p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الفاتورة</th>
                  <th>العميل</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                  <th>الاستحقاق</th>
                  <th>التاريخ</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <code className="text-xs bg-white/5 border border-white/10 px-2 py-1 rounded font-mono text-slate-300" dir="ltr">
                        {inv.invoiceNumber}
                      </code>
                    </td>
                    <td>
                      <div className="text-white font-medium">{inv.user?.name || '—'}</div>
                      <div className="text-[11px] text-slate-500" dir="ltr">{inv.user?.email || '—'}</div>
                    </td>
                    <td className="text-white font-bold">{fmt(inv.totalAmount, inv.currency)}</td>
                    <td><span className={STATUS_TONES[inv.status] ?? 'admin-badge'}>{STATUS_LABELS[inv.status] ?? inv.status}</span></td>
                    <td className="text-slate-400 text-xs">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td className="text-slate-500 text-xs">{new Date(inv.createdAt).toLocaleDateString('ar-EG')}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setSelected(inv)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"
                          title="عرض التفاصيل"
                        >
                          <ExternalLink size={14} />
                        </button>
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => markPaid(inv)}
                            disabled={actionId === inv.id}
                            className="text-[11px] bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-500/25 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {actionId === inv.id ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                            تسجيل دفع
                          </button>
                        )}
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => cancelInvoice(inv)}
                            disabled={actionId === inv.id}
                            className="text-[11px] bg-red-500/15 border border-red-500/25 text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/25 transition-colors disabled:opacity-50"
                          >
                            إلغاء
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
            className="w-full max-w-2xl rounded-xl border border-violet-500/30 bg-slate-950 p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Receipt size={20} className="text-violet-400" />
                  <span dir="ltr">{selected.invoiceNumber}</span>
                </h2>
                <span className={`mt-2 inline-block ${STATUS_TONES[selected.status] ?? 'admin-badge'}`}>
                  {STATUS_LABELS[selected.status] ?? selected.status}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500 mb-1">العميل</div>
                  <div className="text-white font-semibold">{selected.user?.name || '—'}</div>
                  <div className="text-xs text-slate-400" dir="ltr">{selected.user?.email || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">تاريخ الإنشاء</div>
                  <div className="text-white">{new Date(selected.createdAt).toLocaleString('ar-EG')}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">الاستحقاق</div>
                  <div className="text-white">
                    {selected.dueDate ? new Date(selected.dueDate).toLocaleDateString('ar-EG') : 'غير محدد'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">تاريخ الدفع</div>
                  <div className="text-white">
                    {selected.paidAt ? new Date(selected.paidAt).toLocaleString('ar-EG') : '—'}
                  </div>
                </div>
              </div>

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">المبلغ الأساسي</span>
                  <span className="text-white" dir="ltr">{fmt(selected.subtotal, selected.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">الضريبة</span>
                  <span className="text-white" dir="ltr">+ {fmt(selected.taxAmount, selected.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">الخصم</span>
                  <span className="text-white" dir="ltr">- {fmt(selected.discountAmount, selected.currency)}</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between">
                  <span className="text-white font-bold">الإجمالي</span>
                  <span className="text-emerald-400 font-bold text-lg" dir="ltr">
                    {fmt(selected.totalAmount, selected.currency)}
                  </span>
                </div>
              </div>

              {selected.notes && (
                <div>
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                    <FileText size={12} /> ملاحظات
                  </div>
                  <div className="text-sm text-slate-300 bg-white/[0.02] p-3 rounded-lg border border-white/5">
                    {selected.notes}
                  </div>
                </div>
              )}

              {selected.payments.length > 0 && (
                <div>
                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
                    <CreditCard size={12} /> المدفوعات المرتبطة ({selected.payments.length})
                  </div>
                  <div className="space-y-1.5">
                    {selected.payments.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-sm">
                        <div className="flex items-center gap-2 text-emerald-300">
                          {p.status === 'paid' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                          <span>{p.status === 'paid' ? 'مدفوعة' : p.status}</span>
                        </div>
                        <div className="text-white font-bold" dir="ltr">
                          {fmt(p.amount, selected.currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
