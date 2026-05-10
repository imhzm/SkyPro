'use client'

import { useState } from 'react'
import { Send, Bell, AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

const TYPE_OPTIONS = [
  { value: 'info',    label: 'معلومة',  Icon: Info,         cls: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  { value: 'success', label: 'نجاح',    Icon: CheckCircle2, cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  { value: 'warning', label: 'تنبيه',  Icon: AlertTriangle, cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  { value: 'error',   label: 'خطأ',     Icon: XCircle,      cls: 'border-red-500/40 bg-red-500/10 text-red-300' },
] as const

export default function AdminBroadcastPage() {
  const { success, error } = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState<'info' | 'success' | 'warning' | 'error'>('info')
  const [link, setLink] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const send = async () => {
    if (title.length < 2 || body.length < 2) {
      error('العنوان والمحتوى مطلوبان')
      return
    }
    if (!confirm('هل أنت متأكد من إرسال هذا الإشعار لجميع المستخدمين؟')) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          type,
          link: link.trim() || undefined,
          audience: 'all',
        }),
      })
      const data = await res.json()
      if (data.success) {
        success(data.message || 'تم الإرسال')
        setTitle('')
        setBody('')
        setLink('')
      } else {
        error(data.error || 'فشل الإرسال')
      }
    } catch {
      error('فشل الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedType = TYPE_OPTIONS.find((t) => t.value === type)!

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">إرسال إشعار جماعي</h1>
        <p className="text-slate-400 text-sm mt-1">سيظهر الإشعار لجميع المستخدمين في جرس الإشعارات.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="space-y-4 admin-card !p-6">
          <div>
            <label className="admin-label">نوع الإشعار</label>
            <div className="grid grid-cols-4 gap-2">
              {TYPE_OPTIONS.map((opt) => {
                const active = type === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    type="button"
                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-semibold transition-all ${
                      active ? opt.cls : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <opt.Icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="admin-label">العنوان <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="admin-input"
              placeholder="مثال: تحديث جديد متاح"
            />
            <p className="text-[11px] text-slate-600 mt-1">{title.length}/120</p>
          </div>

          <div>
            <label className="admin-label">المحتوى <span className="text-red-400">*</span></label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              rows={6}
              className="admin-input resize-none"
              placeholder="اشرح للمستخدمين التفاصيل..."
            />
            <p className="text-[11px] text-slate-600 mt-1">{body.length}/2000</p>
          </div>

          <div>
            <label className="admin-label">رابط (اختياري)</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              maxLength={500}
              dir="ltr"
              className="admin-input"
              placeholder="https://skypro.skywaveads.com/..."
            />
          </div>

          <button
            onClick={send}
            disabled={submitting || title.length < 2 || body.length < 2}
            className="admin-btn-primary w-full disabled:opacity-50"
          >
            <Send size={16} />
            {submitting ? 'جارٍ الإرسال...' : 'إرسال لجميع المستخدمين'}
          </button>
        </div>

        {/* Preview */}
        <div>
          <p className="text-slate-400 text-xs mb-2 px-1">معاينة الإشعار:</p>
          <div className="bg-[#0a1628] border border-white/10 rounded-2xl p-3 max-w-[380px]">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-500/[0.04]">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${selectedType.cls}`}>
                <selectedType.Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium break-words">{title || 'عنوان الإشعار'}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed break-words">{body || 'محتوى الإشعار يظهر هنا...'}</p>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <span className="text-[10px] text-slate-600">الآن</span>
                  {link && <span className="text-[11px] text-sky-400">عرض</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-amber-500/[0.05] border border-amber-500/20 rounded-2xl p-4 text-sm text-slate-300">
            <p className="flex items-start gap-2">
              <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                الإشعار سيظهر فوراً لكل المستخدمين في جرس الإشعارات على لوحة تحكمهم.
                لا يمكن سحب الإشعار بعد الإرسال — تأكد من المحتوى أولاً.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
