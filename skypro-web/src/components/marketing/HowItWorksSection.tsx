'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Rocket, Download, Zap, ArrowLeft, Shield, Clock, Users, CheckCircle2 } from 'lucide-react'

const steps = [
  {
    icon: Rocket,
    title: 'سجّل حسابك',
    desc: 'أنشئ حسابك مجاناً في أقل من دقيقة عبر البريد الإلكتروني أو Google',
    detail: 'لا تحتاج بطاقة ائتمانية',
    color: 'from-sky-400 to-blue-600',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
  {
    icon: Download,
    title: 'حمّل التطبيق',
    desc: 'نزّل تطبيق سيندر برو على جهازك وأدخل مفتاح التفعيل',
    detail: 'تثبيت في أقل من دقيقتين',
    color: 'from-violet-400 to-purple-600',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: Zap,
    title: 'ابدأ التسويق',
    desc: 'استخرج بيانات العملاء، أرسل رسائل جماعية، وأدر حملاتك بكل سهولة',
    detail: 'نتائج فورية من أول استخدام',
    color: 'from-amber-400 to-orange-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  }
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
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-[12px] font-semibold text-violet-400 mb-4">
            كيف يعمل
          </div>
          <h2 className="section-title">ابدأ في <span className="gradient-text">3 خطوات</span></h2>
          <p className="section-desc mt-3">من التسجيل إلى أول حملة — أقل من 5 دقائق</p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-px">
            <div className="h-full bg-gradient-to-r from-sky-500/40 via-violet-500/40 to-amber-500/40" style={{ backgroundSize: '200% 100%', animation: 'shimmer 3s ease-in-out infinite' }} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br ${step.color} shadow-2xl`}>
                  <step.icon className="h-9 w-9 text-white" />
                </div>
                <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white/6 border border-white/10 text-sm font-bold text-white/50 mb-4">
                  {i + 1}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed max-w-xs mx-auto mb-3">{step.desc}</p>
                <span className={`inline-flex items-center gap-1.5 rounded-full ${step.bg} ${step.border} border px-3 py-1 text-[11px] font-medium text-sky-300`}>
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
                <div key={i} className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <b.icon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-300 leading-tight">{b.text}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <Image
              src="https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=900"
              alt="تسجيل حساب جديد في منصة SaaS"
              width={900}
              height={288}
              className="h-36 w-full object-cover opacity-75"
              loading="lazy"
            />
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <Image
              src="https://images.pexels.com/photos/6804063/pexels-photo-6804063.jpeg?auto=compress&cs=tinysrgb&w=900"
              alt="تنصيب تطبيق سطح مكتب للعمل التسويقي"
              width={900}
              height={288}
              className="h-36 w-full object-cover opacity-75"
              loading="lazy"
            />
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
            <Image
              src="https://images.pexels.com/photos/7688460/pexels-photo-7688460.jpeg?auto=compress&cs=tinysrgb&w=900"
              alt="إطلاق حملة تسويق وقياس النتائج"
              width={900}
              height={288}
              className="h-36 w-full object-cover opacity-75"
              loading="lazy"
            />
          </div>
        </div>

        <div className="mt-14 text-center">
          <a href="/auth/register" className="btn-primary text-base px-10 py-4 shadow-2xl shadow-sky-500/20">
            ابدأ التجربة المجانية الآن
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </a>
        </div>
      </div>
    </section>
  )
}
