'use client'

import { motion } from 'framer-motion'

const trustedCompanies = [
  { name: 'شركة النور للتجارة', initial: 'ن' },
  { name: 'مجموعة الخليج', initial: 'خ' },
  { name: 'وكالة ديجيتال بلس', initial: 'د' },
  { name: 'متجر روز', initial: 'ر' },
  { name: 'أوفيس ماركت', initial: 'أ' },
  { name: 'ستار ميديا', initial: 'س' },
  { name: 'بيكسل برو', initial: 'ب' },
  { name: 'تك فيجن', initial: 'ت' },
  { name: 'جروث لابز', initial: 'ج' },
  { name: 'سمارت هب', initial: 'ه' },
]

const marqueeItems = [...trustedCompanies, ...trustedCompanies]

const colors = [
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
  'from-emerald-400 to-green-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-teal-600',
  'from-indigo-400 to-indigo-600',
  'from-fuchsia-400 to-fuchsia-600',
  'from-sky-400 to-blue-600',
  'from-violet-400 to-purple-600',
]

export function TrustedBySection() {
  return (
    <section className="py-14 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#060d1b]" />

      <div className="relative z-10">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-slate-600 mb-8 tracking-wide"
        >
          يثق بنا أكثر من <span className="text-slate-400 font-semibold">500+</span> شركة ومسوّق
        </motion.p>

        <div className="marquee-container">
          <div className="marquee-track" style={{ animationDuration: '35s' }}>
            {marqueeItems.map((company, i) => (
              <div
                key={i}
                className="flex items-center gap-3 shrink-0 px-6 py-3 rounded-2xl border border-white/6 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 cursor-default"
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${colors[i % colors.length]} text-white font-bold text-sm shrink-0 opacity-80`}>
                  {company.initial}
                </div>
                <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
                  {company.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
