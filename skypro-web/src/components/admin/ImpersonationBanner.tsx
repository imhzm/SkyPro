'use client'

/**
 * Banner shown across the app when impersonation is active.
 * Detects via the sp_impersonation cookie.
 */

import { useEffect, useState } from 'react'
import { LogOut, UserCheck } from 'lucide-react'

export default function ImpersonationBanner() {
  const [active, setActive] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setActive(document.cookie.split(';').some((c) => c.trim().startsWith('sp_impersonation=') && c.split('=')[1]))
  }, [])

  const stop = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users/impersonate', { method: 'DELETE' })
      const data = await res.json()
      if (data?.success) {
        window.location.href = data.data?.redirectTo || '/admin'
      } else {
        alert(data?.error || 'فشل إنهاء الانتحال')
        setSubmitting(false)
      }
    } catch {
      alert('فشل الاتصال')
      setSubmitting(false)
    }
  }

  if (!active) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[70] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>
            <strong>وضع الانتحال نشط</strong> — أنت تتصفح الموقع كأنك المستخدم. كل الإجراءات مسجّلة في الـ audit log.
          </span>
        </div>
        <button
          onClick={stop}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50"
        >
          <LogOut className="w-3.5 h-3.5" />
          {submitting ? 'جارٍ...' : 'إنهاء الانتحال'}
        </button>
      </div>
    </div>
  )
}
