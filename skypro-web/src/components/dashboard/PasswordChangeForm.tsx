'use client'

import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

export default function PasswordChangeForm() {
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [show, setShow] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setFeedback(null)

    if (newPwd.length < 10) {
      setFeedback({ type: 'error', message: 'كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل' })
      return
    }
    if (newPwd !== confirmPwd) {
      setFeedback({ type: 'error', message: 'كلمتا المرور غير متطابقتين' })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        setFeedback({ type: 'success', message: 'تم تغيير كلمة المرور بنجاح' })
        setCurrentPwd('')
        setNewPwd('')
        setConfirmPwd('')
      } else {
        setFeedback({ type: 'error', message: data?.message || data?.error || 'تعذّر تغيير كلمة المرور' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'تعذّر الاتصال بالخادم' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PwdField
        label="كلمة المرور الحالية"
        value={currentPwd}
        onChange={setCurrentPwd}
        show={show}
        onToggle={() => setShow(!show)}
        autoComplete="current-password"
      />
      <PwdField
        label="كلمة المرور الجديدة"
        value={newPwd}
        onChange={setNewPwd}
        show={show}
        autoComplete="new-password"
        hint="10 أحرف على الأقل، تشمل حرفاً كبيراً ورقماً ورمزاً"
      />
      <PwdField
        label="تأكيد كلمة المرور الجديدة"
        value={confirmPwd}
        onChange={setConfirmPwd}
        show={show}
        autoComplete="new-password"
      />

      {feedback && (
        <p className={`text-sm font-medium ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {feedback.message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !currentPwd || !newPwd || !confirmPwd}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Lock className="w-4 h-4" />
        {submitting ? 'جارٍ التغيير...' : 'تغيير كلمة المرور'}
      </button>
    </form>
  )
}

function PwdField({
  label, value, onChange, show, onToggle, autoComplete, hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle?: () => void
  autoComplete?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-300 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          dir="ltr"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 pr-10 text-sm text-white outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
        />
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-slate-600 mt-1">{hint}</p>}
    </div>
  )
}
