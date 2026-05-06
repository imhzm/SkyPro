'use client'

import { platforms } from '@/data/platforms'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowDown, Shield, Zap, Users, Globe } from 'lucide-react'
import { PlatformIcon } from '@/components/marketing/PlatformIcon'

const stats = [
  { value: '18+', label: 'منصة مدعومة', icon: Globe },
  { value: '10K+', label: 'مستخدم نشط', icon: Users },
  { value: '50M+', label: 'رسالة مرسلة', icon: Zap },
  { value: '99.9%', label: 'وقت التشغيل', icon: Shield },
]

export function HeroSection() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const otherPlatforms = platforms.slice(5, 12)

  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1938] to-[#060d1b]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-600/5 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-sky-400/30 rounded-full animate-float" />
        <div className="absolute top-2/3 left-1/3 w-2 h-2 bg-violet-400/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/4 left-1/2 w-2 h-2 bg-amber-400/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 section-shell w-full pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 text-[12px] font-semibold text-sky-400 mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
            </span>
            منتج من Sky Wave — أقوى أداة تسويق آلي
          </div>

          <h1 className={`text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] mb-6 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-white">أتمت تسويقك على</span>
            <br />
            <span className="gradient-text-brand">18+ منصة</span>
            <br />
            <span className="text-white">بضغطة واحدة</span>
          </h1>

          <p className={`text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            استخرج بيانات العملاء، أرسل رسائل جماعية، وأدر حسابات متعددة — كل ذلك من تطبيق واحد احترافي.
          </p>

          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Link href="/auth/register" className="btn-primary text-base px-8 py-3.5 shadow-2xl shadow-sky-500/25">
              جرّب مجاناً — يومين
            </Link>
            <a href="#features" className="btn-secondary text-base px-8 py-3.5">
              اكتشف المميزات
              <ArrowDown className="h-4 w-4" />
            </a>
          </div>

          <div className={`flex items-center justify-center gap-2 mb-14 transition-all duration-700 delay-[350ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex -space-x-2 space-x-reverse">
              {['أ', 'م', 'ن', 'ص'].map((letter, i) => (
                <div key={i} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#060d1b] text-[10px] font-bold text-white" style={{ background: ['#0A6CF1', '#8B2CF5', '#10b981', '#f59e0b'][i] }}>
                  {letter}
                </div>
              ))}
            </div>
            <div className="text-[12px] text-slate-500">
              انضم لـ <span className="text-white font-semibold">10,000+</span> مسوّق
            </div>
          </div>

          <div className={`flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto mb-16 transition-all duration-700 delay-[400ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {otherPlatforms.map((p) => (
              <span key={p.id} className="tag">
                <PlatformIcon id={p.id} size={14} />
                {p.name}
              </span>
            ))}
            <span className="inline-flex items-center rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-[11px] font-semibold text-sky-400">
              +6 منصات أخرى
            </span>
          </div>

          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto transition-all duration-700 delay-[500ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card p-4 rounded-2xl group">
                <stat.icon className="h-4 w-4 text-sky-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <div className="stat-value">{stat.value}</div>
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className={`mt-14 grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-4 max-w-5xl mx-auto transition-all duration-700 delay-[550ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
              <Image
                src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=1400"
                alt="فريق تسويق رقمي يعمل على لوحة تحليل حملات"
                width={1400}
                height={512}
                className="h-64 w-full object-cover opacity-70"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060d1b] via-[#060d1bcc] to-transparent" />
              <div className="absolute bottom-0 right-0 left-0 p-5 text-right">
                <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                  Live Campaign Room
                </div>
                <h3 className="mt-2 text-lg font-bold text-white">راقب النتائج لحظيًا أثناء الإرسال</h3>
                <p className="mt-1 text-sm text-slate-300">معدلات فتح واستجابة وتقارير أداء داخل لوحة موحّدة.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                <Image
                  src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=700"
                  alt="تحليل بيانات العملاء"
                  width={700}
                  height={256}
                  className="h-32 w-full object-cover opacity-75"
                  loading="lazy"
                />
              </div>
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
                <Image
                  src="https://images.pexels.com/photos/6956897/pexels-photo-6956897.jpeg?auto=compress&cs=tinysrgb&w=700"
                  alt="إدارة رسائل تسويقية جماعية"
                  width={700}
                  height={256}
                  className="h-32 w-full object-cover opacity-75"
                  loading="lazy"
                />
              </div>
              <div className="col-span-2 rounded-3xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 to-violet-500/10 p-4 text-right">
                <p className="text-sm text-slate-300">
                  صور التشغيل الحقيقية تضيف ثقة أكبر للزائر وتوضح قيمة المنتج من أول شاشة.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#060d1b] to-transparent" />
    </section>
  )
}
