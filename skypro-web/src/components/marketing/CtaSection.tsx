'use client'

import Link from 'next/link'
import { Send, ArrowLeft, Zap, Shield, Users, CheckCircle2 } from 'lucide-react'

const highlights = [
  { icon: Zap, text: 'إعداد في دقائق' },
  { icon: Shield, text: 'بدون التزام' },
  { icon: Users, text: '10,000+ مستخدم' },
  { icon: CheckCircle2, text: 'تجربة مجانية' },
]

export function CtaSection() {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-violet-700 to-purple-800" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px]" />

      <div className="relative z-10 section-shell text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 border border-white/20 mx-auto mb-6">
          <Send className="h-7 w-7 text-white" />
        </div>
        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
          ابدأ تسويقك الآلي اليوم
        </h2>
        <p className="text-lg text-white/70 mb-8 max-w-2xl mx-auto leading-relaxed">
          جرّب سيندر برو مجاناً ليومين. بدون بطاقة ائتمانية. بدون التزامات. كل المميزات متاحة.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          {highlights.map((h) => (
            <span key={h.text} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm font-medium text-white/80">
              <h.icon className="h-4 w-4 text-white/70" />
              {h.text}
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-sky-700 shadow-2xl shadow-black/20 transition-all duration-200 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]">
            جرّب مجاناً — يومين
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
          <a href="#pricing" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 hover:border-white/60 px-8 py-4 text-base font-semibold text-white transition-all duration-200">
            عرض الأسعار
          </a>
        </div>
      </div>
    </section>
  )
}