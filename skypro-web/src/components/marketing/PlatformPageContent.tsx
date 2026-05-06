'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Check, ChevronDown, ArrowRight, Star, Shield,
  Monitor, Sparkles, Send, Cpu, Lock, BarChart3, Globe,
} from 'lucide-react'
import { PlatformIcon } from '@/components/marketing/PlatformIcon'
import { platformPages, getPlatformIds } from '@/data/platform-pages'
import type { PlatformPageData } from '@/data/platform-pages'

const toolIcons = [Send, Cpu, Lock, BarChart3, Globe, Check]

function getComparison(platform: PlatformPageData) {
  const comps: Record<string, { feature: string; us: string; them: string }[]> = {
    facebook: [
      { feature: 'استخراج بيانات الأعضاء', us: 'غير محدود', them: 'محدود أو غير متوفر' },
      { feature: 'إرسال رسائل جماعية', us: 'تأخير ذكي + حماية', them: 'بدون حماية' },
      { feature: 'السعر', us: '2,000 ج.م/سنة', them: '5,000+ ج.م/سنة' },
      { feature: 'عدد المنصات', us: '18+ منصة', them: '1-3 منصات' },
      { feature: 'الدعم الفني', us: 'مصري 24/7', them: 'أجنبي محدود' },
      { feature: 'التحديثات', us: 'مجانية مدى الحياة', them: 'مدفوعة' },
    ],
    whatsapp: [
      { feature: 'إرسال رسائل جماعية', us: 'تأخير ذكي + حماية', them: 'بدون حماية' },
      { feature: 'استخراج المجموعات', us: 'متوفر', them: 'غير متوفر' },
      { feature: 'تصفية الأرقام', us: 'متوفر', them: 'غير متوفر' },
      { feature: 'السعر', us: '2,000 ج.م/سنة', them: '4,000+ ج.م/سنة' },
      { feature: 'عدد المنصات', us: '18+', them: 'واتساب فقط' },
      { feature: 'التحديثات', us: 'مجانية مدى الحياة', them: 'مدفوعة' },
    ],
  }
  return comps[platform.id] || [
    { feature: 'عدد المنصات', us: '18+ منصة', them: '1-3 منصات' },
    { feature: 'السعر', us: '2,000 ج.م/سنة', them: '5,000+ ج.م/سنة' },
    { feature: 'الدعم الفني', us: 'مصري 24/7', them: 'أجنبي محدود' },
    { feature: 'الحماية من الحظر', us: 'متقدمة', them: 'بدون حماية' },
    { feature: 'التحديثات', us: 'مجانية مدى الحياة', them: 'مدفوعة' },
    { feature: 'التشغيل الآلي', us: '24/7', them: 'يدوي' },
  ]
}

function getTestimonial(platform: PlatformPageData) {
  const testimonials: Record<string, { name: string; role: string; text: string; rating: number }[]> = {
    facebook: [
      { name: 'أحمد محمد', role: 'صاحب متجر إلكتروني', text: 'سيندر برو وفّر عليّ ساعات يومياً. حملات فيسبوك صارت أسرع 10 مرات والنتايج أحسن بكثير.', rating: 5 },
      { name: 'سارة علي', role: 'مديرة تسويق', text: 'أفضل أداة استخدمتها. استخراج الأعضاء من الجروبات وسيلة لا تقدر بثمن.', rating: 5 },
      { name: 'محمد حسين', role: 'وكالة تسويق رقمي', text: 'نشر 200+ جروب في ساعة واحدة. كان بيآخد يوم كامل قبل سيندر برو.', rating: 5 },
    ],
    whatsapp: [
      { name: 'محمد خالد', role: 'مدير مبيعات', text: 'حملات واتساب بتوصل لعملاء حقيقيين. معدل الاستجابة 45% — أفضل من أي أداة تانية.', rating: 5 },
      { name: 'فاطمة حسن', role: 'صاحبة متجر', text: 'تصفية الأرقام وفرّت وقت كتير. بقت أرسل بس للأرقام الفعّالة.', rating: 5 },
      { name: 'عمر فاروق', role: 'رائد أعمال', text: 'القوالب المتغيرة في الرسائل خلّت العملاء يحسوا إن الرسالة مخصصة ليهم بس.', rating: 5 },
    ],
    instagram: [
      { name: 'نورهان أحمد', role: 'صانعة محتوى', text: 'المتابعة التلقائية زودت متابعيني 3 مرات في شهر. وأفضل شيء إنها آمنة.', rating: 5 },
      { name: 'عمر فاروق', role: 'رائد أعمال', text: 'رسائل DM المخصصة جابتلي عملاء حقيقيين. أفضل استثمار سويته.', rating: 5 },
      { name: 'منى سعيد', role: 'مديرة حسابات', text: 'استخراج المتابعين من الحسابات المنافسة بيدينا دقة جامدة في الاستهداف.', rating: 5 },
    ],
  }
  return testimonials[platform.id] || [
    { name: 'محمد أحمد', role: 'مسوق رقمي', text: `سيندر برو غيّر طريقة عملي على ${platform.arabicName}. الأتمتة وفرّت عليّ وقت كتير والنتايج أحسن بكتير.`, rating: 5 },
    { name: 'نور الدين', role: 'صاحب متجر', text: `${platform.arabicName} كان بيآخد وقت طويل، بس مع سيندر برو كل شيء اتعمل تلقائي وبدقة عالية.`, rating: 5 },
  ]
}

function getHighlights(platform: PlatformPageData) {
  const highlights: Record<string, string[]> = {
    facebook: ['لا حاجة لخبرة تقنية', 'تشغيل تلقائي 24/7', 'حماية متقدمة من الحظر', 'تحديثات مجانية مدى الحياة', 'دعم فني مصري 24/7', 'اشتراك سنوي بدون رسوم خفية'],
    whatsapp: ['تصفية تلقائية للأرقام', 'قوالب رسائل متغيرة', 'إيقاف ذكي عند الأخطاء', 'حسابات متعددة مع دوران', 'تقارير مفصلة في الوقت الحقيقي', '2,000 ج.م/سنة فقط'],
    instagram: ['متابعة تلقائية ذكية', 'رسائل DM مخصصة بالاسم', 'حدود آمنة للحماية', 'إشارة تلقائية في التعليقات', 'حماية من القيود', 'تصدير CSV و Excel'],
  }
  return highlights[platform.id] || ['تشغيل تلقائي 24/7', 'حماية متقدمة من الحظر', 'حسابات متعددة', 'تحديثات مجانية مدى الحياة', 'دعم فني مصري 24/7', '2,000 ج.م/سنة فقط']
}

function AnimatedCounter({ value, label, color }: { value: string; label: string; color: string }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { setVisible(true) }, [])
  return (
    <div className="glass-card p-5 text-center group hover:border-white/15 transition-all">
      <div className="stat-value text-2xl sm:text-3xl mb-1" style={visible ? {} : { opacity: 0 }}>{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
      <div className="h-1 w-8 mx-auto mt-3 rounded-full transition-all group-hover:w-16" style={{ background: color }} />
    </div>
  )
}

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.section>
  )
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`glass-card overflow-hidden transition-all ${open ? 'border-sky-500/20' : ''}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-right">
        <span className="text-white font-semibold text-[15px]">{q}</span>
        <ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-sky-400' : 'text-slate-500'}`} />
      </button>
      <motion.div initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
        <div className="px-5 pb-5 text-slate-400 text-sm leading-relaxed">{a}</div>
      </motion.div>
    </div>
  )
}

export function PlatformPageContent({ data }: { data: PlatformPageData }) {
  const highlights = getHighlights(data)
  const comparison = getComparison(data)
  const testimonials = getTestimonial(data)
  const allPages = getPlatformIds().map(id => platformPages[id]).filter(p => p.id !== data.id)
  const relatedPlatforms = allPages.slice(0, 6)
  const allTools = data.features.flatMap(f => f.details)

  return (
    <main className="min-h-screen bg-[#060d1b] pt-16">
      {/* ===== HERO ===== */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1938] to-[#060d1b]" />
          <div className="absolute top-10 w-[700px] h-[500px] rounded-full blur-[160px] opacity-[0.12]" style={{ background: data.color, right: '5%' }} />
          <div className="absolute bottom-0 w-[400px] h-[400px] rounded-full blur-[140px] opacity-10" style={{ background: '#8B2CF5', left: '5%' }} />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        </div>

        <div className="relative z-10 section-shell">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center mb-14">
            <Link href="/platforms" className="inline-flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-8 transition-colors">
              <ArrowRight className="h-4 w-4" />
              جميع المنصات
            </Link>

            <div className="flex items-center justify-center gap-5 mb-8">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl shadow-2xl" style={{ background: `linear-gradient(135deg, ${data.color}30, ${data.color}10)`, border: `1px solid ${data.color}30` }}>
                <PlatformIcon id={data.id} size={40} style={{ color: data.color }} />
              </div>
              <div className="text-right">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white">{data.arabicName}</h1>
                <p className="text-xl sm:text-2xl gradient-text-brand font-bold">سيندر برو</p>
              </div>
            </div>

            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-4">{data.tagline}</p>
            <p className="text-base text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10">{data.heroDescription}</p>

            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              <Link href="/auth/register" className="btn-primary text-lg px-10 py-4 shadow-2xl shadow-sky-500/20">ابدأ مجاناً</Link>
              <a href="#features" className="btn-secondary text-lg px-8 py-4">اكتشف المميزات</a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-2xl mx-auto">
              {highlights.map((h) => (
                <span key={h} className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3.5 py-1.5 text-[12px] font-medium text-slate-400">
                  <Check className="h-3 w-3 text-emerald-400" />
                  {h}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }} className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {data.stats.map((s, i) => (
              <AnimatedCounter key={i} value={s.value} label={s.label} color={data.color} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ===== MOCKUP ===== */}
      <section className="py-12">
        <div className="section-shell">
          <Section>
            <div className="relative mx-auto max-w-4xl">
              <div className="gradient-border p-1 overflow-hidden">
                <div className="rounded-[20px] bg-[#0a1020] p-4 sm:p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <div className="flex-1 bg-white/5 rounded-lg h-7 mx-4 flex items-center px-3">
                      <Monitor className="h-3 w-3 text-slate-500 ml-2" />
                      <span className="text-[11px] text-slate-600 mr-auto">senderpro.skywaveads.com/{data.id}</span>
                      <div className="flex gap-1 ml-auto">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[9px] text-emerald-400">متصل</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-3 space-y-2">
                      <div className="rounded-lg bg-white/5 h-8 flex items-center px-3" style={{ borderInlineStart: `2px solid ${data.color}` }}>
                        <PlatformIcon id={data.id} size={14} style={{ color: data.color }} />
                        <span className="text-[10px] text-slate-500 mr-2">{data.arabicName}</span>
                      </div>
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="rounded-lg bg-white/[0.03] h-6 flex items-center px-3">
                          <div className="w-2 h-2 rounded-sm bg-white/10 ml-auto" />
                        </div>
                      ))}
                    </div>
                    <div className="col-span-9 space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        {data.stats.slice(0, 3).map((s, i) => (
                          <div key={i} className="rounded-lg bg-white/5 p-3 text-center">
                            <div className="text-sm font-bold" style={{ color: data.color }}>{s.value}</div>
                            <div className="text-[9px] text-slate-600">{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-lg bg-white/[0.03] h-24 flex items-end justify-around px-4 pb-2">
                        {[35, 55, 40, 70, 50, 85, 65, 75, 90, 60].map((h, i) => (
                          <div key={i} className="w-3 rounded-t transition-all" style={{ height: `${h}%`, background: i === 8 ? data.color : `${data.color}30` }} />
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {data.features.slice(0, 2).map((f) => (
                          <div key={f.title} className="rounded-lg bg-white/[0.03] p-2.5 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: `${data.color}20` }}>
                              <Check className="h-3 w-3" style={{ color: data.color }} />
                            </div>
                            <span className="text-[10px] text-slate-500 truncate">{f.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="py-20">
        <div className="section-shell">
          <Section>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 text-[12px] font-semibold text-sky-400 mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                المميزات
              </div>
              <h2 className="section-title gradient-text mb-3">مميزات {data.arabicName}</h2>
              <p className="section-desc max-w-2xl mx-auto">{data.longDescription}</p>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.features.map((f, i) => (
              <Section key={i}>
                <div className="glass-card p-6 h-full group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-24 h-24 rounded-full blur-[60px] opacity-20 group-hover:opacity-30 transition-opacity" style={{ background: data.color, transform: 'translate(-30%, -30%)' }} />
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl group-hover:scale-110 transition-transform" style={{ background: `${data.color}15` }}>
                        <PlatformIcon id={data.id} size={24} style={{ color: data.color }} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{f.title}</h3>
                        <p className="text-slate-400 text-sm">{f.description}</p>
                      </div>
                    </div>
                    <ul className="space-y-2.5">
                      {f.details.map((d, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-sm text-slate-400">
                          <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: data.color }} />
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ALL TOOLS GRID ===== */}
      <section className="py-20" style={{ background: 'linear-gradient(180deg, #060d1b 0%, #0a1020 50%, #060d1b 100%)' }}>
        <div className="section-shell">
          <Section>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[12px] font-semibold text-emerald-400 mb-4">
                جميع الأدوات
              </div>
              <h2 className="section-title gradient-text mb-3">كل ما تحتاجه في <span className="gradient-text">مكان واحد</span></h2>
              <p className="section-desc">{allTools.length} أداة متكاملة لأتمتة تسويقك على {data.arabicName}</p>
            </div>
          </Section>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {allTools.map((tool, i) => {
              const Icon = toolIcons[i % toolIcons.length]
              return (
                <Section key={i}>
                  <div className="glass-card p-4 text-center group hover:border-white/15">
                    <Icon className="h-5 w-5 mx-auto mb-2 group-hover:scale-110 transition-transform" style={{ color: data.color }} />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{tool}</span>
                  </div>
                </Section>
              )
            })}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20">
        <div className="section-shell">
          <Section>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-[12px] font-semibold text-violet-400 mb-4">
                كيف يعمل
              </div>
              <h2 className="section-title gradient-text mb-3">ابدأ في <span className="gradient-text">3 خطوات</span></h2>
              <p className="section-desc">من التسجيل إلى أول حملة — أقل من 5 دقائق</p>
            </div>
          </Section>

          <div className="relative max-w-4xl mx-auto">
            <div className="hidden md:block absolute top-20 left-[16.67%] right-[16.67%] h-px border-t-2 border-dashed border-white/10" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {data.howItWorks.map((step, i) => (
                <Section key={i}>
                  <div className="glass-card p-8 text-center h-full relative">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold mb-5 mx-auto" style={{ background: `linear-gradient(135deg, ${data.color}25, ${data.color}10)`, color: data.color, border: `2px solid ${data.color}30` }}>
                      {i + 1}
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{step.step}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </Section>
              ))}
            </div>
          </div>

          <Section className="mt-12 text-center">
            <Link href="/auth/register" className="btn-primary text-base px-8 py-3.5 shadow-2xl shadow-sky-500/20">
              جرّب مجاناً — يومين
              <ArrowRight className="h-4 w-4 rotate-180" />
            </Link>
          </Section>
        </div>
      </section>

      {/* ===== USE CASES ===== */}
      <section className="py-20" style={{ background: 'linear-gradient(180deg, #060d1b 0%, #0a1020 50%, #060d1b 100%)' }}>
        <div className="section-shell">
          <Section>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-[12px] font-semibold text-amber-400 mb-4">
                حالات الاستخدام
              </div>
              <h2 className="section-title gradient-text mb-3">من يستخدم {data.arabicName}؟</h2>
            </div>
          </Section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {data.useCases.map((uc, i) => (
              <Section key={i}>
                <div className="glass-card p-6 h-full group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] opacity-10" style={{ background: data.color }} />
                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${data.color}15` }}>
                      <PlatformIcon id={data.id} size={22} style={{ color: data.color }} />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{uc.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{uc.description}</p>
                  </div>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMPARISON ===== */}
      <section className="py-20">
        <div className="section-shell max-w-3xl">
          <Section>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[12px] font-semibold text-emerald-400 mb-4">
                لماذا سيندر برو؟
              </div>
              <h2 className="section-title gradient-text mb-3">{data.arabicName} سيندر برو <span className="gradient-text">مقابل المنافسين</span></h2>
            </div>
          </Section>

          <Section>
            <div className="glass-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-right px-5 py-4 text-sm font-semibold text-slate-400 w-2/5">الميزة</th>
                    <th className="text-center px-5 py-4 w-[30%]">
                      <div className="inline-flex items-center gap-2">
                        <Send className="h-4 w-4 text-sky-400" />
                        <span className="text-sm font-bold gradient-text-brand">سيندر برو</span>
                      </div>
                    </th>
                    <th className="text-center px-5 py-4 text-sm font-semibold text-slate-600 w-[30%]">المنافسون</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row, i) => (
                    <tr key={i} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                      <td className="text-right px-5 py-3.5 text-sm text-slate-300 font-medium">{row.feature}</td>
                      <td className="text-center px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400">
                          <Check className="h-4 w-4" />
                          {row.us}
                        </span>
                      </td>
                      <td className="text-center px-5 py-3.5 text-sm text-slate-600">{row.them}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section className="mt-8 text-center">
            <Link href="/auth/register" className="btn-primary px-8 py-3">جرّب سيندر برو مجاناً</Link>
          </Section>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-20" style={{ background: 'linear-gradient(180deg, #060d1b 0%, #0a1020 50%, #060d1b 100%)' }}>
        <div className="section-shell">
          <Section>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 text-[12px] font-semibold text-sky-400 mb-4">
                آراء العملاء
              </div>
              <h2 className="section-title gradient-text mb-3">ماذا يقول عملاؤنا عن {data.arabicName}؟</h2>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <Section key={i}>
                <div className="glass-card p-6 h-full flex flex-col">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, si) => (
                      <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 leading-relaxed text-sm flex-1 mb-4">&ldquo;{t.text}&rdquo;</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white font-bold text-sm shrink-0">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING HIGHLIGHT ===== */}
      <section className="py-20">
        <div className="section-shell">
          <Section>
            <div className="gradient-border p-8 sm:p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-violet-500/5" />
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-10" style={{ background: data.color }} />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 text-center md:text-right">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[12px] font-semibold text-emerald-400 mb-4">
                    <Shield className="h-3.5 w-3.5" />
                    ضمان الاسترجاع 7 أيام
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                    اشتراك واحد = كل المنصات
                  </h3>
                  <p className="text-slate-400 leading-relaxed mb-2">
                    {data.arabicName} + 18 منصة أخرى بسعر واحد. بدون رسوم خفية.
                  </p>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400"><Check className="h-4 w-4 text-emerald-400" /> فترة تجريبية يومين</span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400"><Check className="h-4 w-4 text-emerald-400" /> تحديثات مجانية</span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400"><Check className="h-4 w-4 text-emerald-400" /> دعم فني مصري</span>
                  </div>
                </div>
                <div className="text-center shrink-0">
                  <div className="text-sm text-slate-500 mb-1">السعر</div>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl sm:text-6xl font-extrabold gradient-text-brand">2,000</span>
                    <span className="text-xl text-slate-400 font-semibold">ج.م</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">سنوياً — أقل من 167 ج.م/شهر</div>
                  <Link href="/auth/register" className="btn-primary w-full justify-center mt-6 text-lg px-8 py-3.5">
                    ابدأ مجاناً
                  </Link>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-20">
        <div className="section-shell max-w-3xl">
          <Section>
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-[12px] font-semibold text-violet-400 mb-4">
                أسئلة شائعة
              </div>
              <h2 className="section-title gradient-text mb-3">أسئلة شائعة عن {data.arabicName}</h2>
            </div>
          </Section>

          <div className="space-y-3">
            {data.faq.map((item, i) => (
              <Section key={i}>
                <FAQItem q={item.question} a={item.answer} />
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ===== RELATED PLATFORMS ===== */}
      <section className="py-20" style={{ background: 'linear-gradient(180deg, #060d1b 0%, #0a1020 50%, #060d1b 100%)' }}>
        <div className="section-shell">
          <Section>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 text-[12px] font-semibold text-sky-400 mb-4">
                منصات أخرى
              </div>
              <h2 className="section-title gradient-text mb-3">استكشف منصات أخرى</h2>
              <p className="section-desc">كل المنصات في اشتراك واحد</p>
            </div>
          </Section>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {relatedPlatforms.map((p) => (
              <Section key={p.id}>
                <Link href={`/platforms/${p.id}`} className="glass-card p-4 text-center group block">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl mx-auto mb-2 group-hover:scale-110 transition-transform" style={{ background: `${p.color}15` }}>
                    <PlatformIcon id={p.id} size={22} style={{ color: p.color }} />
                  </div>
                  <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{p.arabicName}</span>
                </Link>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="py-24">
        <div className="section-shell">
          <Section>
            <div className="gradient-border p-10 sm:p-16 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-violet-500/5" />
              <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-10" style={{ background: data.color }} />
              <div className="relative z-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl mx-auto mb-6" style={{ background: `${data.color}20`, border: `1px solid ${data.color}30` }}>
                  <PlatformIcon id={data.id} size={32} style={{ color: data.color }} />
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                  جاهز تبدأ التسويق على {data.arabicName}؟
                </h2>
                <p className="text-lg text-slate-400 mb-8 max-w-xl mx-auto">
                  انضم لأكثر من 5,000 مسوق يستخدمون سيندر برو لأتمتة حملاتهم على {data.arabicName} و 18+ منصة أخرى.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <Link href="/auth/register" className="btn-primary text-lg px-10 py-4 shadow-2xl shadow-sky-500/20">
                    ابدأ مجاناً الآن
                  </Link>
                  <Link href="/platforms" className="btn-secondary text-lg px-8 py-4">
                    جميع المنصات
                  </Link>
                </div>
                <p className="text-sm text-slate-500 mt-4">لا تحتاج بطاقة ائتمان — فترة تجريبية مجانية</p>
              </div>
            </div>
          </Section>
        </div>
      </section>
    </main>
  )
}