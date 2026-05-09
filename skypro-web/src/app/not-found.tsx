import Link from 'next/link'
import type { Metadata } from 'next'
import { Compass, Home, ArrowRight, Layers, MessageCircle } from 'lucide-react'

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة (404)',
  description: 'الصفحة التي تبحث عنها غير موجودة. عُد إلى صفحة SkyPro الرئيسية.',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#060d1b] flex items-center justify-center px-4 py-20" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/30 px-4 py-1.5 mb-8">
          <Compass className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-semibold text-sky-300">خطأ 404 — الصفحة غير موجودة</span>
        </div>

        <h1 className="text-7xl sm:text-9xl font-extrabold bg-gradient-to-br from-sky-400 via-blue-500 to-violet-500 bg-clip-text text-transparent mb-4">
          404
        </h1>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          ضعت في السحاب؟
        </h2>
        <p className="text-base sm:text-lg text-slate-400 max-w-md mx-auto mb-10 leading-relaxed">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها. جرّب أحد الروابط بالأسفل أو عُد للرئيسية.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-105"
          >
            <Home className="w-4 h-4" />
            العودة للرئيسية
          </Link>
          <Link
            href="/platforms"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 px-6 py-3 text-sm font-semibold text-slate-200 transition-all"
          >
            <Layers className="w-4 h-4" />
            استكشف المنصات
          </Link>
          <a
            href="https://wa.me/201067894321"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15 px-6 py-3 text-sm font-semibold text-emerald-300 transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            تواصل عبر واتساب
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
          {[
            { label: 'الأسعار',         href: '/#pricing' },
            { label: 'الأسئلة الشائعة', href: '/#faq' },
            { label: 'تسجيل الدخول',     href: '/auth/login' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white/[0.03] border border-white/8 rounded-xl px-4 py-3 text-sm text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/15 transition-all flex items-center justify-center gap-2 group"
            >
              {link.label}
              <ArrowRight className="w-3.5 h-3.5 -scale-x-100 opacity-50 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
