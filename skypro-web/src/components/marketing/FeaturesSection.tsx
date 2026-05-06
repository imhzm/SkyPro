'use client'

import { platforms } from '@/data/platforms'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { PlatformIcon } from '@/components/marketing/PlatformIcon'
import { ArrowLeft, Bot, Target, Users, Shield, BarChart3, Globe, Layers, Cpu } from 'lucide-react'

const coreCapabilities = [
  {
    icon: Bot,
    title: 'أتمتة كاملة',
    desc: 'أتمت كل عملياتك التسويقية — من الاستخراج للإرسال — بدون تدخل يدوي',
    color: 'from-sky-400 to-blue-600',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
  {
    icon: Target,
    title: 'استهداف دقيق',
    desc: 'استخرج بيانات العملاء المستهدفين من 18+ منصة بفلترة ذكية',
    color: 'from-violet-400 to-purple-600',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: Users,
    title: 'إدارة متعددة',
    desc: 'أدر حسابات متعددة لنفس المنصة مع تبديل تلقائي وحماية متقدمة',
    color: 'from-emerald-400 to-green-600',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: Shield,
    title: 'حماية متقدمة',
    desc: 'نظام مضاد للحظر يشمل تأخير عشوائي، بروكسي مخصص، وتغيير البصمة',
    color: 'from-amber-400 to-orange-600',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: BarChart3,
    title: 'تقارير مفصلة',
    desc: 'تتبع نتائج حملاتك بالتفصيل — عدد الرسائل، الاستجابات، والأداء',
    color: 'from-rose-400 to-pink-600',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  {
    icon: Globe,
    title: '18+ منصة',
    desc: 'منصة واحدة لجميع منصاتك — فيسبوك، واتساب، انستغرام والمزيد',
    color: 'from-cyan-400 to-teal-600',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    icon: Layers,
    title: 'جدولة ذكية',
    desc: 'جدول حملاتك لتعمل تلقائياً في الأوقات المثالية بدون إشراف',
    color: 'from-indigo-400 to-indigo-600',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20',
  },
  {
    icon: Cpu,
    title: 'تصدير مرن',
    desc: 'صدّر بياناتك بأي صيغة — Excel، CSV — للاستخدام في أدوات أخرى',
    color: 'from-fuchsia-400 to-fuchsia-600',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-500/20',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1020] to-[#060d1b]" />
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px]" />

      <div className="relative z-10 section-shell">
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 text-[12px] font-semibold text-sky-400 mb-4">
            المميزات
          </div>
          <h2 className="section-title">كل ما تحتاجه <span className="gradient-text">في مكان واحد</span></h2>
          <p className="section-desc mt-3 max-w-2xl mx-auto">مميزات متقدمة توفّر عليك ساعات من العمل اليومي وترفع كفاءة حملاتك التسويقية</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
          {coreCapabilities.map((cap, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="glass-card p-6 group"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cap.color} shadow-lg mb-4`}>
                <cap.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{cap.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{cap.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-[12px] font-semibold text-violet-400 mb-4">
            المنصات المدعومة
          </div>
          <h2 className="section-title">أتمت حملاتك على <span className="gradient-text">18+ منصة</span></h2>
          <p className="section-desc mt-3 max-w-2xl mx-auto">استخراج بيانات، إرسال جماعي، إدارة حسابات — كل شيء من مكان واحد</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform, i) => (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.4 }}
            >
              <Link
                href={`/platforms/${platform.id}`}
                className="glass-card p-5 group block"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0"
                    style={{ background: `${platform.color}15` }}
                  >
                    <PlatformIcon id={platform.id} size={22} className="shrink-0" style={{ color: platform.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-[15px]">{platform.name}</h3>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-slate-600 group-hover:text-sky-400 transition-colors shrink-0 rotate-180" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {platform.features.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center rounded-lg bg-white/5 border border-white/6 px-2.5 py-1 text-[11px] font-medium text-slate-400 group-hover:border-white/10 group-hover:text-slate-300 transition-colors"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/platforms" className="btn-secondary">
            اكتشف كل المنصات بالتفصيل
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <Image
              src="https://images.pexels.com/photos/7567462/pexels-photo-7567462.jpeg?auto=compress&cs=tinysrgb&w=1400"
              alt="لوحة تسويقية تعرض تحليلات ومؤشرات أداء"
              width={1400}
              height={480}
              className="h-60 w-full object-cover opacity-70"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060d1b] via-[#060d1ba8] to-transparent" />
            <div className="absolute bottom-0 right-0 left-0 p-5">
              <h3 className="text-lg font-bold text-white">Dashboard متكامل لإدارة الحملات</h3>
              <p className="mt-1 text-sm text-slate-300">تابع الأداء، قارن النتائج، وخصص الاستهداف من شاشة واحدة.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
            <Image
              src="https://images.pexels.com/photos/8438922/pexels-photo-8438922.jpeg?auto=compress&cs=tinysrgb&w=900"
              alt="فريق يستخدم أدوات تحليل العملاء"
              width={900}
              height={480}
              className="h-60 w-full object-cover opacity-75"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
