'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { Mail, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/marketing/Logo'

function VerifyEmailForm() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      setStatus('error')
      setMessage('رمز التحقق غير موجود في الرابط')
      return
    }

    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus('success')
          setMessage(data.message || 'تم تأكيد البريد الإلكتروني بنجاح')
        } else {
          setStatus('error')
          setMessage(data.error || 'فشل تأكيد البريد الإلكتروني')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('فشل الاتصال بالخادم')
      })
  }, [])

  useEffect(() => {
    if (status !== 'success') return
    if (countdown <= 0) {
      window.location.href = '/auth/login?verified=1'
      return
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d1b] px-4" dir="rtl">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Logo size={44} priority />
            <span className="text-2xl font-bold gradient-text-brand">SkyPro</span>
          </Link>
        </div>

        <div className="gradient-border p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-400">جارٍ تأكيد البريد الإلكتروني...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-emerald-500/15 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">تم تأكيد البريد الإلكتروني بنجاح!</h2>
              <p className="text-slate-400 mb-2">{message}</p>
              <p className="text-emerald-400 text-sm mb-6">تم تفعيل حسابك وتجربتك المجانية. سيتم توجيهك لتسجيل الدخول خلال {countdown} ثوان...</p>
              <Link href="/auth/login?verified=1" className="btn-primary inline-block">
                تسجيل الدخول الآن
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/15 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">فشل تأكيد البريد</h2>
              <p className="text-slate-400 mb-6">{message}</p>
              <Link href="/auth/login" className="btn-primary inline-block">
                العودة لتسجيل الدخول
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#060d1b]" dir="rtl">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  )
}
