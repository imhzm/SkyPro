'use client'

import { platforms } from '@/data/platforms'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { PlatformIcon } from '@/components/marketing/PlatformIcon'
import {
  ArrowLeft,
  Bot,
  Target,
  Users,
  Shield,
  BarChart3,
  Globe,
  Layers,
  Cpu,
  Sparkles,
} from 'lucide-react'

const coreCapabilities = [
  {
    icon: Bot,
    title: 'أتمتة كاملة',
    desc: 'أتمت كل عملياتك التسويقية من الاستخراج للإرسال بدون أي تدخل يدوي',
    color: 'from-sky-400 to-blue-600',
  },
  {
    icon: Target,
    title: 'استهداف دقيق',
    desc: 'استخرج بيانات العملاء المستهدفين من 18+ منصة بفلترة ذكية متقدمة',
    color: 'from-violet-400 to-purple-600',
  },
  {
    icon: Users,
    title: 'إدارة متعددة',
    desc: 'أدر حسابات متعددة لنفس المنصة مع تبديل تلقائي وحماية لكل حساب',
    color: 'from-emerald-400 to-green-600',
  },
  {
    icon: Shield,
    title: 'حماية متقدمة',
    desc: 'نظام مضاد للحظر يشمل تأخير عشوائي، بروكسي مخصص، وتغيير البصمة',
    color: 'from-amber-400 to-orange-600',
  },
  {
    icon: BarChart3,
    title: 'تقارير مفصلة',
    desc: 'تتبع نتائج حملاتك بالتفصيل مع عدد الرسائل والاستجابات والأداء',
    color: 'from-rose-400 to-pink-600',
  },
  {
    icon: Globe,
    title: '18+ منصة',
    desc: 'منصة واحدة لجميع قنواتك — فيسبوك، واتساب، انستغرام، تيليجرام والمزيد',
    color: 'from-cyan-400 to-teal-600',
  },
  {
    icon: Layers,
    title: 'جدولة ذكية',
    desc: 'جدول حملاتك لتعمل تلقائياً في الأوقات المثالية بدون إشراف مستمر',
    color: 'from-indigo-400 to-indigo-600',
  },
  {
    icon: Cpu,
    title: 'تصدير مرن',
    desc: 'صدّر بياناتك بأي صيغة تحتاجها — Excel أو CSV — لاستخدامها أينما شئت',
    color: 'from-fuchsia-400 to-fuchsia-600',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1020] to-[#060d1b]" />
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px]" />

      <div className="relative z-10 section-shell">
        {/* Section header */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 text-[12px] font-semibold text-sky-400 mb-4"
          >
            <Sparkles className="h-3.5 w-3.5" />
            المميزات
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title"
          >
            كل ما تحتاجه <span className="gradient-text">في مكان واحد</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="section-desc mt-3 max-w-2xl mx-auto"
          >
            مميزات متقدمة توفّر عليك ساعات من العمل اليومي وترفع كفاءة حملاتك التسويقية
          </motion.p>
        </div>

        {/* Capabilities grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20"
        >
          {coreCapabilities.map((cap, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              className="glass-card-3d p-6 group cursor-default"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cap.color} shadow-lg mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]`}>
                <cap.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{cap.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{cap.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Platforms sub-section */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-[12px] font-semibold text-violet-400 mb-4"
          >
            <Globe className="h-3.5 w-3.5" />
            المنصات المدعومة
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title"
          >
            أتمت حملاتك على <span className="gradient-text">18+ منصة</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="section-desc mt-3 max-w-2xl mx-auto"
          >
            استخراج بيانات، إرسال جماعي، إدارة حسابات — كل شيء من مكان واحد
          </motion.p>
        </div>

        {/* Platforms grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {platforms.map((platform) => (
            <motion.div key={platform.id} variants={cardVariants}>
              <Link
                href={`/platforms/${platform.id}`}
                className="glass-card p-5 group block"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: `${platform.color}15` }}
                  >
                    <PlatformIcon id={platform.id} size={22} className="shrink-0" style={{ color: platform.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-[15px]">{platform.name}</h3>
                  </div>
                  <ArrowLeft className="h-4 w-4 text-slate-600 group-hover:text-sky-400 group-hover:-translate-x-1 transition-all duration-300 shrink-0 rotate-180" />
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
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <Link href="/platforms" className="btn-secondary group">
            اكتشف كل المنصات بالتفصيل
            <ArrowLeft className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Showcase images */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="md:col-span-2 showcase-card">
            <Image
              src="/images/platforms-network.png"
              alt="شبكة المنصات المتصلة — أتمتة التسويق عبر 18+ منصة من مكان واحد"
              width={1400}
              height={480}
              className="h-60 w-full object-cover opacity-70"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060d1b] via-[#060d1ba8] to-transparent" />
            <div className="absolute bottom-0 right-0 left-0 p-5">
              <h3 className="text-lg font-bold text-white">شبكة منصات متكاملة</h3>
              <p className="mt-1 text-sm text-slate-300">تابع الأداء، قارن النتائج، وخصص الاستهداف من لوحة واحدة.</p>
            </div>
          </div>
          <div className="showcase-card">
            <Image
              src="/images/data-extraction.png"
              alt="استخراج ذكي لبيانات العملاء المستهدفين"
              width={900}
              height={480}
              className="h-60 w-full object-cover opacity-75"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060d1b] via-transparent to-transparent" />
            <div className="absolute bottom-0 right-0 left-0 p-4">
              <h3 className="text-sm font-bold text-white">استخراج ذكي للبيانات</h3>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
