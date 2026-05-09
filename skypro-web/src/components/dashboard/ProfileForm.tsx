'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'

export default function ProfileForm({
  initialName,
  email,
  avatarUrl,
}: {
  initialName: string
  email: string
  avatarUrl: string | null
}) {
  const [name, setName] = useState(initialName)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const dirty = name.trim() !== initialName.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dirty || submitting) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        setFeedback({ type: 'success', message: 'تم حفظ التغييرات' })
      } else {
        setFeedback({ type: 'error', message: data?.message || data?.error || 'تعذّر الحفظ' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'تعذّر الاتصال بالخادم' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setFeedback(null), 4000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-1.5">البريد الإلكتروني</label>
        <input
          type="email"
          value={email}
          disabled
          className="w-full bg-white/[0.02] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
          dir="ltr"
        />
        <p className="text-xs text-slate-600 mt-1">لتغيير البريد، تواصل مع الدعم.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-300 mb-1.5">الاسم</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30"
          placeholder="اسمك الكامل"
        />
      </div>

      {avatarUrl && (
        <div>
          <p className="text-xs text-slate-500 mb-1.5">صورتك الحالية:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt="صورة الحساب"
            className="w-14 h-14 rounded-full border border-white/10 object-cover"
          />
        </div>
      )}

      {feedback && (
        <p className={`text-sm font-medium ${feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {feedback.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!dirty || submitting}
        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="w-4 h-4" />
        {submitting ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
      </button>
    </form>
  )
}
