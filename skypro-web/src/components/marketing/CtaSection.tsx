'use client'

import Link from 'next/link'
import { Send, ArrowLeft, Zap, Shield, Users, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

const highlights = [
  { icon: Zap, text: 'إعداد في دقائق' },
  { icon: Shield, text: 'بدون التزام' },
  { icon: Users, text: '10,000+ مستخدم' },
  { icon: CheckCircle2, text: 'تجربة مجانية' },
]

export function CtaSection() {
  return (
    <section className="py-28 relative overflow-hidden">
      {/* Background gradients and meshes */}
      <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-violet-700 to-purple-800" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
      
      {/* Animated glowing orbs */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-white/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 section-shell text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.5 }}
          className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 border border-white/20 mx-auto mb-8 shadow-2xl shadow-black/20"
        >
          <Send className="h-10 w-10 text-white" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
        >
          ابدأ تسويقك الآلي اليوم
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-lg sm:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed"
        >
          انضم إلى آلاف المسوقين الذين يعتمدون على SkyPro. جرّب مجاناً ليومين وبدون بطاقة ائتمانية.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-3 mb-12"
        >
          {highlights.map((h, i) => (
            <motion.span
              key={h.text}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-2 text-sm font-medium text-white shadow-sm backdrop-blur-sm hover:bg-white/15 transition-colors cursor-default"
            >
              <h.icon className="h-4 w-4 text-sky-200" />
              {h.text}
            </motion.span>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link href="/auth/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-10 py-4 text-lg font-bold text-sky-700 shadow-2xl shadow-black/20 transition-all duration-300 hover:bg-sky-50 hover:scale-105 active:scale-95 group">
            جرّب مجاناً — يومين
            <ArrowLeft className="h-5 w-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <a href="#pricing" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-white/30 hover:border-white/60 hover:bg-white/5 px-10 py-4 text-lg font-semibold text-white transition-all duration-300">
            عرض الأسعار
          </a>
        </motion.div>
      </div>
    </section>
  )
}