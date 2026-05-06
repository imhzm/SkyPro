'use client'

import { Check, Shield, RotateCcw, CreditCard, Zap, Clock, Headphones, TrendingUp } from 'lucide-react'

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
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[12px] font-semibold text-emerald-400 mb-4">
            الأسعار
          </div>
          <h2 className="section-title">خطة واحدة، <span className="gradient-text">كل المميزات</span></h2>
          <p className="section-desc mt-3">لا رسوم خفية، لا اشتراكات معقدة — كل شيء في خطة واحدة</p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="gradient-border relative overflow-hidden p-8 sm:p-10">
            <div className="absolute top-0 right-0 bg-gradient-to-r from-sky-500 to-violet-500 text-white text-[11px] font-bold px-5 py-1.5 rounded-bl-2xl">
              الأكثر شعبية
            </div>

            <div className="text-center">
              <h3 className="text-2xl font-bold text-white mb-2">سيندر برو</h3>
              <p className="text-slate-500 mb-8 text-sm">اشتراك سنوي — كل المميزات متاحة</p>

              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-6xl font-extrabold gradient-text-brand">2,000</span>
                <span className="text-2xl text-slate-400 font-semibold">ج.م</span>
              </div>
              <p className="text-sm text-slate-600 mb-8">سنوياً — أقل من 167 ج.م/شهر</p>

              <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                {highlights.map((h) => (
                  <span key={h.text} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-[12px] font-medium">
                    <h.icon className={`h-3.5 w-3.5 ${h.color}`} />
                    <span className="text-slate-300">{h.text}</span>
                  </span>
                ))}
              </div>

              <div className="space-y-3.5 text-right mb-10">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                      <Check className="h-3 w-3 text-emerald-400" />
                    </div>
                    <span className="text-slate-300 text-[15px]">{feature}</span>
                  </div>
                ))}
              </div>

              <a href="/auth/register" className="btn-primary w-full justify-center text-lg py-4 shadow-2xl shadow-sky-500/20">
                ابدأ التجربة المجانية
              </a>
              <p className="text-xs text-slate-600 mt-4">لا تحتاج بطاقة ائتمانية — تجربة مجانية يومين</p>
            </div>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {guarantees.map((item) => (
            <div key={item.title} className="text-center glass-card p-5 rounded-2xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/6 border border-white/8 mx-auto mb-3">
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <h4 className="font-bold text-white mb-1">{item.title}</h4>
              <p className="text-sm text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}