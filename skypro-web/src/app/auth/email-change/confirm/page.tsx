'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

function Inner() {
  const params = useSearchParams()
  const token = params.get('token')
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    if (!token) {
      setState('error')
      setMessage('الرابط غير صالح')
      return
    }
    fetch('/api/account/email/confirm-change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setState('success')
          setMessage(data.message)
          setNewEmail(data.data?.newEmail ?? '')
        } else {
          setState('error')
          setMessage(data?.error || 'تعذّر تأكيد التغيير')
        }
      })
      .catch(() => {
        setState('error')
        setMessage('فشل الاتصال بالخادم')
      })
  }, [token])

  return (
    <main className="min-h-screen bg-[#060d1b] flex items-center justify-center px-4" dir="rtl">
      <div className="max-w-md w-full bg-white/[0.03] border border-white/8 rounded-2xl p-8 text-center">
        {state === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-sky-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-300">جارٍ تأكيد بريدك الجديد...</p>
          </>
        )}
        {state === 'success' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">تم تغيير البريد الإلكتروني</h1>
            <p className="text-slate-400 text-sm mb-2">{message}</p>
            {newEmail && (
              <p className="text-sky-300 font-mono text-sm mb-6" dir="ltr">{newEmail}</p>
            )}
            <Link href="/auth/login" className="inline-flex rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 px-5 py-2.5 text-sm font-bold text-white">
              تسجيل الدخول بالبريد الجديد
            </Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">تعذّر التأكيد</h1>
            <p className="text-slate-400 text-sm mb-6">{message}</p>
            <Link href="/dashboard/settings" className="inline-flex rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-5 py-2.5 text-sm font-semibold text-slate-200">
              العودة للإعدادات
            </Link>
          </>
        )}
      </div>
    </main>
  )
}

export default function EmailChangeConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060d1b]" />}>
      <Inner />
    </Suspense>
  )
}
