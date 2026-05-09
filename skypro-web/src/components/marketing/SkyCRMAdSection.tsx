'use client'

import { motion } from 'framer-motion'
import {
  MessageCircle, Bot, Mail, Users, ArrowUpRight,
  Sparkles, ShieldCheck, Zap, Star
} from 'lucide-react'

const features = [
  {
    icon: Bot,
    title: 'شات بوت AI بالعربية',
    desc: 'يرد صوتاً وكتابةً بكل اللهجات العربية، 24/7',
    color: 'from-violet-500 to-fuchsia-500',
  },
  {
    icon: MessageCircle,
    title: 'بث جماعي بدون حظر',
    desc: 'حملات واتساب معتمدة من Meta — معدل وصول 98%',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Mail,
    title: 'حملات Gmail مدمجة',
    desc: 'حتى 500 إيميل يومياً مع تتبع فوري للنتائج',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Users,
    title: 'صندوق فريق موحّد',
    desc: 'كل موظف يرى محادثاته، والمدير يرى كل شيء',
    color: 'from-sky-500 to-cyan-500',
  },
]

const stats = [
  { value: '20,000+', label: 'شركة تثق بنا' },
  { value: '4.9/5', label: 'تقييم العملاء' },
  { value: '< 3s', label: 'متوسط وقت الرد' },
  { value: '98%', label: 'معدل الوصول' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.08 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

export function SkyCRMAdSection() {
  return (
    <section className="relative py-24 overflow-hidden" id="skycrm">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/10 to-transparent pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />

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
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              منتج آخر من Sky Wave
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h2
            variants={itemVariants}
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-center mb-4 leading-tight"
          >
            <span className="text-white">جرّب </span>
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              SkyCRM
            </span>
            <span className="text-white"> — منصة واتساب الأعمال</span>
          </motion.h2>

          <motion.p
            variants={itemVariants}
            className="text-center text-slate-400 max-w-2xl mx-auto mb-12 text-base sm:text-lg leading-relaxed"
          >
            أول منصة عربية معتمدة رسمياً من <strong className="text-white">Meta</strong>.
            شات بوت ذكي بالعربية، بث جماعي بدون حظر، حملات Gmail، وصندوق فريق موحّد —
            في مساحة عمل واحدة.
          </motion.p>

          {/* Showcase Card */}
          <motion.div
            variants={itemVariants}
            className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/10 rounded-3xl p-6 sm:p-10 mb-10 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left: Brand + meta */}
              <div className="lg:col-span-5 text-center lg:text-right">
                <div className="inline-flex items-center gap-3 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-right">
                    <h3 className="text-2xl font-extrabold text-white">SkyCRM</h3>
                    <p className="text-emerald-300 text-xs font-medium">by Sky Wave</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    <ShieldCheck className="w-3 h-3" />
                    شريك Meta معتمد
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    <Star className="w-3 h-3 fill-amber-300" />
                    4.9/5 تقييم
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-300">
                    <Zap className="w-3 h-3" />
                    تفعيل في 48 ساعة
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed text-sm sm:text-base mb-6">
                  أكثر من <strong className="text-white">20,000 شركة</strong> في مصر والخليج تستخدم SkyCRM
                  لتحويل واتساب إلى ماكينة مبيعات حقيقية. ابدأ تجربتك المجانية الآن.
                </p>

                <div className="flex flex-wrap justify-center lg:justify-start gap-3">
                  <a
                    href="https://crm.skywaveads.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
                  >
                    جرّب مجاناً 48 ساعة
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                  <a
                    href="https://crm.skywaveads.com#pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 px-6 py-3 text-sm font-semibold text-slate-200 transition-all"
                  >
                    شاهد الأسعار
                  </a>
                </div>
              </div>

              {/* Right: Visual */}
              <div className="lg:col-span-7">
                <div className="relative aspect-[4/3] sm:aspect-[16/10] rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900/60 border border-white/10 overflow-hidden p-6 flex flex-col justify-between">
                  {/* Mock chat header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-white/8">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-bold">SkyCRM AI</p>
                      <p className="text-emerald-400 text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        متاح الآن
                      </p>
                    </div>
                    <span className="mr-auto text-[10px] text-slate-500 bg-white/5 px-2 py-1 rounded-full">
                      WhatsApp Business
                    </span>
                  </div>

                  {/* Mock messages */}
                  <div className="flex-1 flex flex-col justify-end gap-2 py-3">
                    <div className="self-end max-w-[80%] bg-emerald-500/15 border border-emerald-500/20 rounded-2xl rounded-tr-sm px-3 py-2">
                      <p className="text-emerald-100 text-xs">عاوز أعرف الأسعار للباقة الشاملة</p>
                    </div>
                    <div className="self-start max-w-[85%] bg-white/[0.04] border border-white/8 rounded-2xl rounded-tl-sm px-3 py-2">
                      <p className="text-slate-200 text-xs leading-relaxed">
                        أهلاً! 👋 الباقة الشاملة بـ <strong>$49/شهر</strong> وتشمل:
                      </p>
                      <ul className="text-slate-300 text-[11px] mt-1.5 space-y-0.5">
                        <li>• AI شات بوت غير محدود</li>
                        <li>• 500 إيميل Gmail يومياً</li>
                        <li>• حسابات فريق + صندوق موحّد</li>
                      </ul>
                    </div>
                    <div className="self-start max-w-[55%] bg-white/[0.04] border border-white/8 rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-2">
                      <span className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:200ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse [animation-delay:400ms]" />
                      </span>
                      <span className="text-slate-400 text-[11px]">جاري الكتابة...</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-white/8">
                    <div className="flex-1 bg-white/[0.03] border border-white/8 rounded-full px-3 py-1.5 text-slate-500 text-xs">
                      اكتب رسالة...
                    </div>
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                      <ArrowUpRight className="w-3.5 h-3.5 text-white -rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
          >
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 hover:bg-white/[0.05] hover:border-white/15 transition-all group"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <h4 className="text-white font-bold mb-1.5 text-sm">{f.title}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 bg-white/[0.02] border border-white/8 rounded-2xl p-6"
          >
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  {s.value}
                </p>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
