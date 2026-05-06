'use client'

import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'أحمد محمد',
    role: 'مدير تسويق',
    company: 'شركة النور للتجارة',
    text: 'سيندر برو وفّر علينا ساعات من العمل اليومي. حملاتنا التسويقية على فيسبوك واتساب أصبحت أسرع 10 مرات.',
    rating: 5,
    color: 'from-sky-400 to-blue-600',
  },
  {
    name: 'سارة علي',
    role: 'صاحبة متجر إلكتروني',
    company: 'متجر روز',
    text: 'من أفضل الأدوات اللي استخدمتها. استخراج بيانات العملاء من جوجل مابس ساعدني أوصل لعملاء جداد بسهولة.',
    rating: 5,
    color: 'from-violet-400 to-purple-600',
  },
  {
    name: 'محمد خالد',
    role: 'مدير مبيعات',
    company: 'مجموعة الخليج',
    text: 'إدارة حسابات متعددة في نفس الوقت ميزة رهيبة. والدعم الفني ممتاز — بيردوا في دقائق.',
    rating: 5,
    color: 'from-amber-400 to-orange-600',
  },
  {
    name: 'فاطمة حسن',
    role: 'مسؤولة تسويق',
    company: 'وكالة ديجيتال بلس',
    text: 'نظام الحماية من الحظر فعلاً شغال. قبل سيندر برو كنا بنحظر كل يوم، الحمد لله الموضوع اتظبط.',
    rating: 5,
    color: 'from-emerald-400 to-green-600',
  },
  {
    name: 'عمر فاروق',
    role: 'رائد أعمال',
    company: 'أوفيس ماركت',
    text: 'الجدولة التلقائية للحملات خلصتني من متابعة كل حملة لحالها. بضغطة واحدة الحملة بتشتغل وتخلص لوحدها.',
    rating: 5,
    color: 'from-rose-400 to-pink-600',
  },
  {
    name: 'نورهان أحمد',
    role: 'صانعة محتوى',
    company: 'فري لانسر',
    text: 'بدون سيندر برو كنت بضيع ساعات في استخراج الداتا. حالياً بدقائق بلقّي كل اللي محتاجاه.',
    rating: 5,
    color: 'from-cyan-400 to-teal-600',
  },
]

const stats = [
  { value: '4.9', label: 'تقييم المستخدمين' },
  { value: '10K+', label: 'مستخدم نشط' },
  { value: '98%', label: 'نسبة الرضا' },
]

export function TestimonialsSection() {
  return (
    <section className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1020] to-[#060d1b]" />
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[150px]" />
      <div className="relative z-10 section-shell">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-[12px] font-semibold text-amber-400 mb-4">
            آراء العملاء
          </div>
          <h2 className="section-title">ماذا يقول <span className="gradient-text">عملاؤنا</span></h2>
          <p className="section-desc mt-3">آراء حقيقية من مستخدمين يثقون في سيندر برو</p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-14 max-w-2xl mx-auto">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center glass-card p-4 rounded-2xl">
              <div className="stat-value text-2xl sm:text-3xl">{stat.value}</div>
              <div className="text-xs sm:text-sm text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-6 flex flex-col group"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, si) => (
                  <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <Quote className="h-5 w-5 text-white/10 mb-3 rotate-180" />
              <p className="text-slate-300 leading-relaxed mb-6 flex-1 text-[15px]">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-white/6">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-white font-bold text-sm shrink-0`}>
                  {t.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-xs text-slate-500 truncate">{t.role} — {t.company}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}