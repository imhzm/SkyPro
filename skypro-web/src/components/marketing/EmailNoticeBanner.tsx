'use client'

import { useState, useEffect } from 'react'
import { Mail, X } from 'lucide-react'

const DISMISS_KEY = 'skypro-email-notice-dismissed'

export function EmailNoticeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show when redirected from successful registration (?welcome=1)
    const params = new URLSearchParams(window.location.search)
    if (params.get('welcome') !== '1') return
    const dismissed = sessionStorage.getItem(DISMISS_KEY)
    if (!dismissed) setVisible(true)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    sessionStorage.setItem(DISMISS_KEY, '1')
    // Clean the ?welcome=1 from URL so a refresh won't re-show it
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('welcome')
      window.history.replaceState({}, '', url.toString())
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative bg-gradient-to-r from-sky-600/90 via-sky-500/85 to-violet-500/80 text-white py-3 px-4 text-center text-sm z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 flex-wrap">
        <Mail className="w-4 h-4 shrink-0" />
        <span className="font-medium">
          سجّلت حساباً جديداً؟ بيانات التفعيل والسيريال أُرسلت إلى بريدك الإلكتروني.
        </span>
        <span className="text-white/80">
          إذا لم تجد الرسالة في الوارد، راجع قسم <strong className="text-white">Spam / Junk</strong>.
        </span>
      </div>
      <button
        onClick={dismiss}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
