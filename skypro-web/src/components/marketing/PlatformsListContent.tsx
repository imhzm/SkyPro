'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Check, ArrowLeft, Shield, Zap, Clock, Headphones, Star, Search } from 'lucide-react'
import { PlatformIcon } from '@/components/marketing/PlatformIcon'
import type { PlatformPageData } from '@/data/platform-pages'

const trustBadges = [
  { icon: Shield, label: 'حماية متقدمة من الحظر' },
  { icon: Zap, label: 'تشغيل تلقائي 24/7' },
  { icon: Clock, label: 'فترة تجريبية مجانية' },
  { icon: Headphones, label: 'دعم فني مصري' },
]

const categories = [
  { id: 'all', label: 'الكل' },
  { id: 'social', label: 'تواصل اجتماعي' },
  { id: 'marketing', label: 'تسويق وأتمتة' },
  { id: 'data', label: 'استخراج بيانات' },
  { id: 'tools', label: 'أدوات مساعدة' },
]

function getCategory(id: string): string {
  if (['facebook', 'whatsapp', 'instagram', 'twitter', 'linkedin', 'telegram', 'tiktok', 'pinterest', 'snapchat', 'threads', 'reddit'].includes(id)) return 'social'
  if (['send-emails'].includes(id)) return 'marketing'
  if (['google-maps', 'olx'].includes(id)) return 'data'
  return 'tools'
}

export function PlatformsListContent({ pages }: { pages: PlatformPageData[] }) {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = pages
    if (category !== 'all') {
      result = result.filter(p => getCategory(p.id) === category)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(p =>
        p.arabicName.includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.tagline.includes(q) ||
        p.features.some(f => f.title.includes(q))
      )
    }
    return result
  }, [pages, category, search])

  return (
    <main className="min-h-screen bg-[#060d1b]">
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1938] to-[#060d1b]" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
        </div>

        <div className="relative z-10 section-shell">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="text-center mb-10">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white text-sm mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              الرئيسية
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 text-[12px] font-semibold text-sky-400 mb-6">
              18+ منصة مدعومة
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              سوّق على <span className="gradient-text-brand">كل المنصات</span>
              <br />
              <span className="text-3xl sm:text-4xl lg:text-5xl text-slate-400">من مكان واحد</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-4">
              استكشف كل منصة مدعومة بالتفصيل — ادوات، مميزات، كيف يعمل، وأسئلة شائعة لكل منصة.
            </p>
            <p className="text-base text-slate-500 max-w-xl mx-auto">
              كل المنصات في اشتراك واحد بسعر 2,000 ج.م/سنة — بدون رسوم خفية.
            </p>
          </motion.div>

          {/* Trust badges */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {trustBadges.map((b) => (
              <span key={b.label} className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-slate-400">
                <b.icon className="h-4 w-4 text-sky-400" />
                {b.label}
              </span>
            ))}
          </motion.div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="ابحث عن منصة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/40 focus:ring-1 focus:ring-sky-500/20 transition-all"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap justify-center">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    category === cat.id
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-white/5 text-slate-400 border border-white/8 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Platform Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4 }}
              >
                <Link
                  href={`/platforms/${p.id}`}
                  className="glass-card p-6 group block"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl shrink-0 group-hover:scale-110 transition-transform" style={{ background: `${p.color}15` }}>
                      <PlatformIcon id={p.id} size={26} style={{ color: p.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white">{p.arabicName}</h3>
                      <p className="text-sm text-slate-500 line-clamp-1">{p.tagline}</p>
                    </div>
                    <ArrowLeft className="h-4 w-4 text-slate-600 group-hover:text-sky-400 transition-all group-hover:-translate-x-1 rotate-180 shrink-0" />
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {p.features.slice(0, 3).map((f) => (
                      <span key={f.title} className="inline-flex items-center gap-1 rounded-lg bg-white/5 border border-white/8 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                        <Check className="h-2.5 w-2.5" style={{ color: p.color }} />
                        {f.title}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {p.stats.slice(0, 2).map((s, si) => (
                      <div key={si} className="text-center bg-white/[0.03] rounded-lg py-2">
                        <div className="text-sm font-bold" style={{ color: p.color }}>{s.value}</div>
                        <div className="text-[10px] text-slate-500">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-sky-400 text-sm font-medium group-hover:gap-3 transition-all">
                    <span>اكتشف المنصة</span>
                    <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500 text-lg">لا توجد منصات تطابق البحث</p>
            </div>
          )}

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="mt-16">
            <div className="glass-card p-8 text-center mb-12">
              <div className="flex items-center justify-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-lg text-white font-semibold mb-2">+5,000 مسوق يثقون في سيندر برو</p>
              <p className="text-sm text-slate-400">جرّب مجاناً ليومين — بدون بطاقة ائتمان</p>
            </div>

            <div className="text-center">
              <Link href="/auth/register" className="btn-primary text-lg px-10 py-4 shadow-2xl shadow-sky-500/20">
                جرّب كل المنصات مجاناً
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  )
}