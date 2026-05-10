'use client'

import { useState } from 'react'
import { Mail, Send } from 'lucide-react'
import { useToast } from '@/components/ui/Toaster'

export default function EmailChangeForm({ currentEmail, requiresPassword }: { currentEmail: string; requiresPassword: boolean }) {
  const { success, error } = useToast()
  const [open, setOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/account/email/request-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: newEmail.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
        success(data.message || 'تم إرسال رابط التأكيد')
      } else {
        error(data.error || 'فشل الطلب')
      }
    } catch {
      error('فشل الاتصال')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <div className="bg-white/[0.02] border border-white/8 rounded-xl p-4 flex items-center gap-3">
        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-xs">البريد الحالي:</p>
          <p className="text-slate-200 text-sm font-mono truncate" dir="ltr">{currentEmail}</p>
        </div>
        <button
          onClick={() => { setOpen(true); setSent(false) }}
          className="text-xs font-semibold text-sky-400 hover:text-sky-300 px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/25 shrink-0"
        >
          تغيير البريد
        </button>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-4">
        <p className="text-emerald-300 text-sm leading-relaxed">
          ✉️ أرسلنا رابط التأكيد إلى <strong className="font-mono" dir="ltr">{newEmail}</strong>. اضغط على الرابط من البريد الجديد لإتمام التغيير. الرابط صالح لمدة ساعة.
        </p>
        <button
          onClick={() => { setOpen(false); setSent(false); setNewEmail(''); setPassword('') }}
          className="mt-3 text-xs text-sky-400 hover:text-sky-300"
        >
          العودة
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white/[0.02] border border-white/8 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs text-slate-500 mb-1">البريد الجديد</label>
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          required
          dir="ltr"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          placeholder="new@example.com"
        />
      </div>
      {requiresPassword && (
        <div>
          <label className="block text-xs text-slate-500 mb-1">كلمة المرور (للتأكيد)</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            dir="ltr"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          />
        </div>
      )}
      <p className="text-[11px] text-slate-500 leading-relaxed">
        سنرسل رابط تأكيد للبريد الجديد. لن يتم التغيير حتى تضغط على الرابط منه.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={submitting || !newEmail.trim() || (requiresPassword && !password)}
          className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-violet-500 text-xs font-bold text-white disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          {submitting ? 'جارٍ...' : 'أرسل رابط التأكيد'}
        </button>
      </div>
    </form>
  )
}
