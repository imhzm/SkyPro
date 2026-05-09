'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  BarChart3, Database, Boxes, FileText, Network, ShieldCheck,
  ArrowUpRight, Sparkles
} from 'lucide-react'

const modules = [
  { icon: Boxes,    title: 'إدارة المخزون',     desc: 'تتبّع كل صنف ومخزن في الوقت الفعلي' },
  { icon: BarChart3, title: 'تقارير ذكية',       desc: 'لوحات تحكم لحظية لكل القرارات' },
  { icon: FileText,  title: 'فواتير وحسابات',   desc: 'CRM + محاسبة + ضرائب في مكان واحد' },
  { icon: Network,   title: 'تكامل مع الأنظمة',  desc: 'يربط فروعك ومنصاتك ومتاجرك معاً' },
  { icon: Database,  title: 'قاعدة بيانات موحّدة', desc: 'كل بياناتك آمنة ومنظمة في الكلاود' },
  { icon: ShieldCheck, title: 'صلاحيات وأمان',  desc: 'تحكّم دقيق في صلاحيات كل موظف' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function SkyERPAdSection() {
  return (
    <section className="relative py-24 overflow-hidden" id="skyerp">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="max-w-6xl mx-auto"
        >
          {/* Eyebrow */}
          <motion.div variants={itemVariants} className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-violet-500/10 border border-violet-500/25 text-violet-300">
              <Sparkles className="w-3.5 h-3.5" />
              نظام ERP من Sky Wave
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-center mb-4 leading-tight"
          >
            <span className="text-white">إدارة كاملة لشركتك مع </span>
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              SkyERP
            </span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-center text-slate-400 max-w-2xl mx-auto mb-12 text-base sm:text-lg leading-relaxed"
          >
            نظام ERP عربي متكامل لإدارة المخزون، المبيعات، المشتريات، الحسابات، والموارد البشرية —
            في مساحة عمل واحدة سحابية وآمنة.
          </motion.p>

          {/* Showcase: Logo + Description */}
          <motion.div
            variants={itemVariants}
            className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-10 mb-10 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-fuchsia-500/10 rounded-full blur-3xl" />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Logo */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-72 h-72 sm:w-80 sm:h-80">
                  <div className="absolute inset-0 bg-violet-500/15 rounded-3xl blur-2xl" />
                  <Image
                    src="/images/skyerp-logo-erp-software-sky-wave.png"
                    alt="شعار SkyERP - نظام تخطيط موارد المؤسسات من Sky Wave"
                    fill
                    sizes="(min-width: 1024px) 320px, 280px"
                    className="object-contain relative drop-shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                    priority={false}
                  />
                </div>
              </div>

              {/* Right: Description */}
              <div className="lg:col-span-7 text-center lg:text-right">
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/15 border border-violet-500/30 text-violet-300">
                    سحابي 100%
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300">
                    عربي بالكامل
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/15 border border-pink-500/30 text-pink-300">
                    قابل للتخصيص
                  </span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
                  نظام ERP عربي متكامل لإدارة الأعمال
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm sm:text-base mb-6">
                  من المخزون إلى المحاسبة، ومن المبيعات إلى الموارد البشرية — SkyERP يوفر
                  منصة واحدة لإدارة كل أقسام شركتك بكفاءة، مع تقارير ذكية تساعدك على اتخاذ
                  قرارات أسرع وأدق.
                </p>

                <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                  <a
                    href="mailto:admin@skywaveads.com?subject=استفسار%20عن%20SkyERP"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105"
                  >
                    احجز عرضاً تجريبياً
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                  <a
                    href="https://wa.me/201067894321?text=اريد%20معرفة%20المزيد%20عن%20SkyERP"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 px-6 py-3 text-sm font-semibold text-slate-200 transition-all"
                  >
                    تواصل عبر واتساب
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Modules Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {modules.map((m, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:bg-white/[0.05] hover:border-violet-500/20 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-violet-400/60 transition-all">
                  <m.icon className="w-5 h-5 text-violet-300" />
                </div>
                <h4 className="text-white font-bold mb-1.5 text-sm">{m.title}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
