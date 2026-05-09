'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Rocket, Download, Zap, ArrowLeft, Shield, Clock, Users, CheckCircle2, Play } from 'lucide-react'

const steps = [
  {
    icon: Rocket,
    title: 'سجّل حسابك',
    desc: 'أنشئ حسابك مجاناً في أقل من دقيقة عبر البريد الإلكتروني',
    detail: 'لا تحتاج بطاقة ائتمانية',
    color: 'from-sky-400 to-blue-600',
    shadow: 'shadow-sky-500/30',
  },
  {
    icon: Download,
    title: 'حمّل التطبيق',
    desc: 'نزّل تطبيق SkyPro على جهازك وأدخل مفتاح التفعيل',
    detail: 'تثبيت في أقل من دقيقتين',
    color: 'from-violet-400 to-purple-600',
    shadow: 'shadow-violet-500/30',
  },
  {
    icon: Zap,
    title: 'ابدأ التسويق',
    desc: 'استخرج بيانات العملاء، أرسل رسائل جماعية، وأدر حملاتك',
    detail: 'نتائج فورية من أول استخدام',
    color: 'from-amber-400 to-orange-600',
    shadow: 'shadow-amber-500/30',
  },
]

const benefits = [
  { icon: Clock, text: 'إعداد في أقل من 5 دقائق' },
  { icon: Shield, text: 'بدون أي التزام مالي' },
  { icon: Users, text: 'دعم فني على مدار الساعة' },
  { icon: CheckCircle2, text: 'تجربة مجانية يومين' },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-28 relative">
      <div className="absolute inset-0 bg-[#060d1b]" />
      <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[120px]" />

      <div className="relative z-10 section-shell">
        {/* Header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-[12px] font-semibold text-violet-400 mb-4"
          >
            <Play className="h-3.5 w-3.5" />
            كيف يعمل
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title"
          >
            ابدأ في <span className="gradient-text">3 خطوات</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="section-desc mt-3"
          >
            من التسجيل إلى أول حملة — أقل من 5 دقائق
          </motion.p>
        </div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Animated connector line */}
          <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-px overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: '100%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.5, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-sky-500/50 via-violet-500/50 to-amber-500/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.6 }}
                className="relative text-center group"
              >
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${step.color} shadow-2xl ${step.shadow} transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-5deg]`}>
                  <step.icon className="h-9 w-9 text-white" />
                </div>
                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/6 border border-white/10 text-sm font-bold text-white/50 mb-4">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed max-w-xs mx-auto mb-3">{step.desc}</p>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-medium text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  {step.detail}
                </span>
                {i < steps.length - 1 && (
                  <ArrowLeft className="hidden md:block absolute top-24 -left-6 h-5 w-5 text-white/20 rotate-180" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16 max-w-2xl mx-auto"
        >
          <div className="glass-card p-6 sm:p-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 + i * 0.08 }}
                  className="flex items-center gap-2.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <b.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-300 leading-tight">{b.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Showcase images */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl mx-auto"
        >
          <div className="showcase-card">
            <Image
              src="/images/hero-dashboard.png"
              alt="خطوة 1 — تسجيل حساب جديد والوصول للوحة التحكم فوراً"
              width={900}
              height={288}
              className="h-36 w-full object-cover opacity-75"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060d1b] via-transparent to-transparent" />
            <div className="absolute bottom-2 right-3 left-3">
              <span className="text-[11px] text-slate-300 font-medium">لوحة التحكم</span>
            </div>
          </div>
          <div className="showcase-card">
            <Image
              src="/images/campaign-analytics.png"
              alt="خطوة 2 — تحميل التطبيق وتفعيل الاشتراك في دقيقتين"
              width={900}
              height={288}
              className="h-36 w-full object-cover opacity-75"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060d1b] via-transparent to-transparent" />
            <div className="absolute bottom-2 right-3 left-3">
              <span className="text-[11px] text-slate-300 font-medium">تحليلات الحملات</span>
            </div>
          </div>
          <div className="showcase-card">
            <Image
              src="/images/bulk-messaging.png"
              alt="خطوة 3 — إطلاق أول حملة تسويقية ومتابعة النتائج"
              width={900}
              height={288}
              className="h-36 w-full object-cover opacity-75"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060d1b] via-transparent to-transparent" />
            <div className="absolute bottom-2 right-3 left-3">
              <span className="text-[11px] text-slate-300 font-medium">الإرسال الجماعي</span>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-14 text-center"
        >
          <a href="/auth/register" className="btn-primary text-base px-10 py-4 shadow-2xl shadow-sky-500/20 group">
            ابدأ التجربة المجانية الآن
            <ArrowLeft className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
