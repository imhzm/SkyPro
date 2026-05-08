'use client'

import { Check, Shield, RotateCcw, CreditCard, Zap, Clock, Headphones, TrendingUp, DollarSign } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  'جميع المنصات الـ 18+ متاحة',
  'استخراج بيانات غير محدود',
  'إرسال رسائل جماعية',
  'إدارة حسابات متعددة',
  'نظام حماية مضاد للحظر',
  'بروكسي مخصص لكل جلسة',
  'جدولة الحملات',
  'تحديثات مجانية مدة الاشتراك',
  'دعم فني على مدار الساعة',
  'فترة تجريبية يومين مجاناً',
]

const guarantees = [
  { icon: Shield, title: 'دفع آمن', desc: 'فودافون كاش أو تحويل بنكي', color: 'text-sky-400' },
  { icon: RotateCcw, title: 'ضمان استرجاع', desc: '7 أيام استرجاع كامل', color: 'text-emerald-400' },
  { icon: CreditCard, title: 'بدون التزام', desc: 'اشتراك سنوي بدون تجديد تلقائي', color: 'text-violet-400' },
]

const highlights = [
  { icon: Zap, text: 'بدون رسوم خفية', color: 'text-sky-400' },
  { icon: Clock, text: 'تفعيل فوري', color: 'text-emerald-400' },
  { icon: Headphones, text: 'دعم 24/7', color: 'text-violet-400' },
  { icon: TrendingUp, text: 'تحديثات مستمرة', color: 'text-amber-400' },
]

export function PricingSection() {
  return (
    <section id="pricing" className="py-28 relative">
      <div className="absolute inset-0 bg-[#060d1b]" />
      <div className="absolute top-0 left-1/3 w-[600px] h-[400px] bg-sky-500/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
      
      <div className="relative z-10 section-shell">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[12px] font-semibold text-emerald-400 mb-4"
          >
            <DollarSign className="h-3.5 w-3.5" />
            الأسعار
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title"
          >
            خطة واحدة، <span className="gradient-text">كل المميزات</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="section-desc mt-3"
          >
            لا رسوم خفية، لا اشتراكات معقدة — كل شيء في خطة واحدة
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-lg mx-auto"
        >
          <div className="gradient-border relative overflow-hidden p-8 sm:p-10 group">
            {/* Glow effect on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="absolute top-0 right-0 bg-gradient-to-r from-sky-500 to-violet-500 text-white text-[11px] font-bold px-5 py-1.5 rounded-bl-2xl shadow-lg">
              الأكثر شعبية
            </div>

            <div className="text-center relative z-10">
              <h3 className="text-2xl font-bold text-white mb-2">سيندر برو</h3>
              <p className="text-slate-500 mb-8 text-sm">اشتراك سنوي — كل المميزات متاحة</p>

              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-6xl font-extrabold gradient-text-brand drop-shadow-lg group-hover:scale-105 transition-transform duration-300">2,000</span>
                <span className="text-2xl text-slate-400 font-semibold">ج.م</span>
              </div>
              <p className="text-sm text-slate-600 mb-8">سنوياً — أقل من 167 ج.م/شهر</p>

              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                {highlights.map((h, i) => (
                  <motion.span
                    key={h.text}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[12px] font-medium hover:bg-white/10 transition-colors"
                  >
                    <h.icon className={`h-3.5 w-3.5 ${h.color}`} />
                    <span className="text-slate-300">{h.text}</span>
                  </motion.span>
                ))}
              </div>

              <div className="space-y-3.5 text-right mb-10">
                {features.map((feature, i) => (
                  <motion.div
                    key={feature}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    className="flex items-center gap-3 group/item"
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 group-hover/item:scale-110 group-hover/item:bg-emerald-500/25 transition-all duration-300">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-slate-300 text-[15px] group-hover/item:text-white transition-colors">{feature}</span>
                  </motion.div>
                ))}
              </div>

              <a href="/auth/register" className="btn-primary w-full justify-center text-lg py-4 shadow-2xl shadow-sky-500/20 group/btn relative overflow-hidden">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  ابدأ التجربة المجانية
                  <Zap className="h-4 w-4 group-hover/btn:animate-bounce" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-sky-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              </a>
              <p className="text-xs text-slate-600 mt-4 flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" /> لا تحتاج بطاقة ائتمانية — تجربة مجانية يومين
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {guarantees.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-center glass-card p-5 rounded-2xl group cursor-default"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/6 border border-white/8 mx-auto mb-3 group-hover:bg-white/10 group-hover:scale-110 transition-all duration-300">
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <h4 className="font-bold text-white mb-1 group-hover:text-sky-300 transition-colors">{item.title}</h4>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}