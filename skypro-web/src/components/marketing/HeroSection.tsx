'use client'

import { platforms } from '@/data/platforms'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowDown, Shield, Zap, Users, Globe } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { PlatformIcon } from '@/components/marketing/PlatformIcon'
import { StatusWidget } from '@/components/marketing/StatusWidget'

const stats = [
  { value: 18, suffix: '+', label: 'منصة مدعومة', icon: Globe },
  { value: 10, suffix: 'K+', label: 'مستخدم نشط', icon: Users },
  { value: 50, suffix: 'M+', label: 'رسالة مرسلة', icon: Zap },
  { value: 99.9, suffix: '%', label: 'وقت التشغيل', icon: Shield },
]

function AnimatedCounter({ value, suffix, duration = 2 }: { value: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const end = value
    const increment = end / (duration * 60)
    const timer = setInterval(() => {
      start += increment
      if (start >= end) {
        setCount(end)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start * 10) / 10)
      }
    }, 1000 / 60)
    return () => clearInterval(timer)
  }, [inView, value, duration])

  return (
    <div ref={ref} className="stat-value">
      {Number.isInteger(value) ? Math.floor(count) : count.toFixed(1)}{suffix}
    </div>
  )
}

export function HeroSection() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const topPlatforms = platforms.slice(0, 7)

  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1938] to-[#060d1b]" />

        {/* Hero background image */}
        <div className="absolute inset-0 opacity-[0.07]">
          <Image
            src="/images/hero-background.png"
            alt=""
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Animated orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-600/5 rounded-full blur-[150px]" />

        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

        {/* Floating particles */}
        <div className="absolute top-[20%] right-[20%] w-3 h-3 bg-sky-400/30 rounded-full animate-float" />
        <div className="absolute top-[60%] left-[30%] w-2 h-2 bg-violet-400/30 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[25%] left-[50%] w-2 h-2 bg-amber-400/20 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[45%] right-[10%] w-1.5 h-1.5 bg-emerald-400/25 rounded-full animate-float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-[75%] right-[40%] w-2.5 h-2.5 bg-sky-300/20 rounded-full animate-float" style={{ animationDelay: '1.8s' }} />
        <div className="absolute top-[15%] left-[15%] w-2 h-2 bg-rose-400/15 rounded-full animate-float" style={{ animationDelay: '2.5s' }} />
      </div>

      <div className="relative z-10 section-shell w-full pt-32 pb-20 lg:pt-40 lg:pb-28">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge + Live Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-2.5 mb-8"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 text-[12px] font-semibold text-sky-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400" />
              </span>
              مُدعوم بالذكاء الاصطناعي · ثقة +10,000 شركة · من Sky Wave
            </span>
            <StatusWidget />
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] mb-6"
          >
            <span className="text-white">سرّع نموّك على</span>{' '}
            <span className="gradient-text-brand">18+ منصة</span>
            <br />
            <span className="text-white">بدون أي خبرة تقنية</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            <strong className="text-white">SkyPro</strong> منصة التسويق الآلي رقم 1 عربياً —
            استخرج بيانات العملاء بدقة، أطلق حملات جماعية ذكية،
            وأدر حسابات متعددة في وقت واحد. <span className="text-sky-400 font-semibold">وفّر 90% من وقتك</span> وضاعِف نتائجك.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            <Link
              href="/auth/register"
              className="btn-primary text-base px-8 py-3.5 shadow-2xl shadow-sky-500/25 animate-glow-pulse"
            >
              جرّب مجاناً — يومين
            </Link>
            <a href="#features" className="btn-secondary text-base px-8 py-3.5 group">
              اكتشف المميزات
              <ArrowDown className="h-4 w-4 transition-transform group-hover:translate-y-1" />
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex items-center justify-center gap-2 mb-14"
          >
            <div className="flex -space-x-2 space-x-reverse">
              {['أ', 'م', 'ن', 'ص'].map((letter, i) => (
                <div
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#060d1b] text-[10px] font-bold text-white"
                  style={{ background: ['#0A6CF1', '#8B2CF5', '#10b981', '#f59e0b'][i] }}
                >
                  {letter}
                </div>
              ))}
            </div>
            <div className="text-[12px] text-slate-500">
              انضم لـ <span className="text-white font-semibold">10,000+</span> مسوّق
            </div>
          </motion.div>

          {/* Platform tags */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto mb-16"
          >
            {topPlatforms.map((p, i) => (
              <motion.span
                key={p.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={mounted ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="tag"
              >
                <PlatformIcon id={p.id} size={14} />
                {p.name}
              </motion.span>
            ))}
            <span className="inline-flex items-center rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-[11px] font-semibold text-sky-400">
              +{platforms.length - topPlatforms.length} منصات أخرى
            </span>
          </motion.div>

          {/* Stats with animated counters */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-3xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card p-4 rounded-2xl group">
                <stat.icon className="h-4 w-4 text-sky-400 mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Showcase images */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={mounted ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-14 grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-4 max-w-5xl mx-auto"
          >
            {/* Main showcase */}
            <div className="showcase-card">
              <Image
                src="/images/hero-dashboard.png"
                alt="لوحة تحكم SkyPro — إدارة الحملات وتتبع الأداء لحظياً"
                width={1400}
                height={512}
                className="h-64 w-full object-cover opacity-80"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060d1b] via-[#060d1bcc] to-transparent" />
              <div className="absolute bottom-0 right-0 left-0 p-5 text-right">
                <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300">
                  تحديث لحظي
                </div>
                <h3 className="mt-2 text-lg font-bold text-white">راقب النتائج لحظيًا أثناء الإرسال</h3>
                <p className="mt-1 text-sm text-slate-300">معدلات فتح واستجابة وتقارير أداء داخل لوحة موحّدة.</p>
              </div>
            </div>

            {/* Side showcase */}
            <div className="grid grid-cols-2 gap-4">
              <div className="showcase-card">
                <Image
                  src="/images/data-extraction.png"
                  alt="استخراج بيانات العملاء من منصات التواصل بفلترة ذكية"
                  width={700}
                  height={256}
                  className="h-32 w-full object-cover opacity-75"
                />
              </div>
              <div className="showcase-card">
                <Image
                  src="/images/bulk-messaging.png"
                  alt="إرسال رسائل جماعية محمية بنظام مضاد للحظر"
                  width={700}
                  height={256}
                  className="h-32 w-full object-cover opacity-75"
                />
              </div>
              <div className="col-span-2 rounded-3xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 to-violet-500/10 p-4 text-right">
                <p className="text-sm text-slate-300">
                  لقطات حقيقية من داخل التطبيق — كل ما تراه هنا يمكنك تجربته مجاناً.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#060d1b] to-transparent" />
    </section>
  )
}
