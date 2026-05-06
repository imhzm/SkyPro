'use client'

import { faqs } from '@/data/platforms'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, MessageCircle } from 'lucide-react'

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] to-[#060d1b]" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[150px]" />
      <div className="relative z-10 section-shell">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-[12px] font-semibold text-violet-400 mb-4">
            أسئلة شائعة
          </div>
          <h2 className="section-title">الأسئلة <span className="gradient-text">الشائعة</span></h2>
          <p className="section-desc mt-3">إجابات على أكثر الأسئلة تكراراً</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3 mb-12">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl border transition-all duration-200 ${openIndex === i ? 'border-white/12 bg-white/6' : 'border-white/6 bg-white/[0.02] hover:border-white/10'}`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-right transition-colors"
              >
                <span className="font-semibold text-white text-[15px]">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-500 transition-transform duration-200 shrink-0 mr-3 ${openIndex === i ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-slate-400 leading-relaxed text-[15px]">{faq.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto glass-card p-6 sm:p-8 text-center">
          <MessageCircle className="h-8 w-8 text-sky-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-2">لم تجد إجابتك؟</h3>
          <p className="text-sm text-slate-400 mb-5">تواصل مع فريق الدعم الفني وسنرد عليك في أقل من ساعة</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="https://wa.me/201067894321" target="_blank" rel="noopener noreferrer" className="btn-primary text-sm px-6 py-2.5">
              تواصل عبر واتساب
            </a>
            <a href="mailto:admin@skywaveads.com" className="btn-secondary text-sm px-6 py-2.5">
              راسلنا بالبريد
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}