'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Inbox, AlertTriangle, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Logo } from '@/components/marketing/Logo'
import { Suspense } from 'react'

function RegisterSuccessContent() {
  const params = useSearchParams()
  const email = params.get('email') || ''
  const [resending, setResending] = useState(false)
  const [resendDone, setResendDone] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const handleResend = async () => {
    if (!email || resending || countdown > 0) return
    setResending(true)
    try {
      await fetch('/api/auth/resend-verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResendDone(true)
      setCountdown(60)
    } catch {
      // silent
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060d1b] px-4" dir="rtl">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[100px]" />
        <Image
          src="/images/hero-background.png"
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover opacity-[0.14]"
        />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Logo size={44} priority />
            <span className="text-2xl font-bold gradient-text-brand">SkyPro</span>
          </Link>
        </div>

        <div className="gradient-border p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                <Mail className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-2">
            تم إنشاء حسابك بنجاح!
          </h1>
          <p className="text-slate-400 text-center mb-6">
            أرسلنا بيانات التفعيل والسيريال إلى بريدك الإلكتروني
          </p>

          {email && (
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl px-4 py-3 mb-5 text-center">
              <p className="text-sky-300 text-sm font-medium" dir="ltr">{email}</p>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 bg-white/[0.03] border border-white/8 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <Inbox className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">1. افتح بريدك الإلكتروني</p>
                <p className="text-slate-400 text-xs mt-1">ابحث عن رسالة من SkyPro تحتوي على رابط التأكيد وبيانات التفعيل (السيريال)</p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-amber-300 font-semibold text-sm">2. لم تجد الرسالة؟ راجع Spam / Junk</p>
                <p className="text-slate-400 text-xs mt-1">
                  في كثير من الأحيان تصل الرسالة إلى قسم البريد غير المرغوب فيه (Spam أو Junk). افتحه وانقل الرسالة إلى الوارد.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-white/[0.03] border border-white/8 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">3. اضغط رابط التأكيد</p>
                <p className="text-slate-400 text-xs mt-1">بعد الضغط على الرابط سيتم تفعيل حسابك وتجربتك المجانية لمدة يومين تلقائياً</p>
              </div>
            </div>
          </div>

          {/* Resend */}
          <div className="text-center mb-6">
            {resendDone && countdown > 0 ? (
              <p className="text-emerald-400 text-sm">
                تم إرسال رابط جديد. تحقق من بريدك (وSpam). يمكنك الإعادة بعد {countdown} ثانية
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending || !email || countdown > 0}
                className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300 font-semibold disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'جارٍ إعادة الإرسال...' : 'لم تصل الرسالة؟ أعد إرسالها'}
              </button>
            )}
          </div>

          {/* Login Button */}
          <Link
            href="/auth/login"
            className="btn-primary w-full justify-center text-base py-3.5 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            الذهاب لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#060d1b]" />}>
      <RegisterSuccessContent />
    </Suspense>
  )
}
