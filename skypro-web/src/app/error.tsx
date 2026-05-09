'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCcw, Home, MessageCircle } from 'lucide-react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error boundary:', error)
  }, [error])

  return (
    <main className="min-h-screen bg-[#060d1b] flex items-center justify-center px-4 py-20" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-xl w-full text-center">
        <div className="w-20 h-20 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-rose-400" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
          عذراً، حدث خطأ غير متوقع
        </h1>
        <p className="text-base text-slate-400 max-w-md mx-auto mb-3 leading-relaxed">
          واجهنا مشكلة أثناء تحميل هذه الصفحة. فريقنا تم إخطاره تلقائياً ونعمل على حل المشكلة.
        </p>
        {error.digest && (
          <p className="text-xs text-slate-600 font-mono mb-8">
            معرّف الخطأ: <span className="text-slate-500">{error.digest}</span>
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-105"
          >
            <RefreshCcw className="w-4 h-4" />
            إعادة المحاولة
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 px-6 py-3 text-sm font-semibold text-slate-200 transition-all"
          >
            <Home className="w-4 h-4" />
            الرئيسية
          </Link>
          <a
            href="https://wa.me/201067894321"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15 px-6 py-3 text-sm font-semibold text-emerald-300 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            الدعم
          </a>
        </div>
      </div>
    </main>
  )
}
