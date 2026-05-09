'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

export default function DeleteAccountCard({ requiresPassword }: { requiresPassword: boolean }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = confirmation === 'DELETE' && (!requiresPassword || password.length > 0)

  const handleDelete = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirmation }),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        // Hard navigation so the cleared cookie is honored
        window.location.href = '/?deleted=1'
      } else {
        setError(data?.message || data?.error || 'تعذّر حذف الحساب')
        setSubmitting(false)
      }
    } catch {
      setError('تعذّر الاتصال بالخادم')
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="space-y-3">
        <p className="text-slate-300 text-sm leading-relaxed">
          حذف الحساب نهائي ويُلغي اشتراكك ومفاتيح التفعيل والأجهزة المرتبطة. <strong className="text-red-300">
          لا يمكن التراجع عن هذا الإجراء.</strong>
        </p>
        <ul className="text-xs text-slate-500 space-y-1 mr-4 list-disc">
          <li>كل مفاتيح التفعيل ستُلغى فوراً</li>
          <li>كل أجهزتك ستُفصل عن البرنامج</li>
          <li>اشتراكك سيُلغى ولا تُستعاد المبالغ المدفوعة</li>
          <li>بريدك الإلكتروني سيُجهَّل في سجلاتنا</li>
        </ul>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 px-4 py-2 text-sm font-semibold text-red-300 transition-all"
        >
          <Trash2 className="w-4 h-4" />
          حذف حسابي نهائياً
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !submitting && setOpen(false)}
          dir="rtl"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#0a1628] border border-red-500/30 rounded-2xl shadow-2xl shadow-red-500/10 overflow-hidden"
          >
            <div className="bg-gradient-to-br from-red-500/15 to-transparent p-5 border-b border-red-500/20 flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-base">حذف الحساب نهائياً</h3>
                <p className="text-slate-400 text-xs mt-1">هذا الإجراء لا يمكن التراجع عنه.</p>
              </div>
              <button
                onClick={() => !submitting && setOpen(false)}
                className="text-slate-500 hover:text-white"
                aria-label="إلغاء"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {requiresPassword && (
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-1.5">كلمة المرور</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={submitting}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 disabled:opacity-60"
                    placeholder="أدخل كلمة المرور للتأكيد"
                    dir="ltr"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                  اكتب <code className="bg-red-500/15 text-red-300 px-1.5 py-0.5 rounded text-xs font-bold">DELETE</code> للتأكيد
                </label>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  disabled={submitting}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 disabled:opacity-60"
                  placeholder="DELETE"
                  dir="ltr"
                  autoComplete="off"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-xl text-xs">
                  {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold text-slate-300 transition disabled:opacity-60"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!canSubmit || submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-sm font-bold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'جارٍ الحذف...' : 'حذف نهائي'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
