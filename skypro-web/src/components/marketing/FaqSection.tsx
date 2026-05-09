'use client'

import { faqs } from '@/data/platforms'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, MessageCircle, HelpCircle } from 'lucide-react'

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] to-[#060d1b]" />
      <div className="absolute top-1/2 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-sky-500/5 rounded-full blur-[120px]" />
      
      <div className="relative z-10 section-shell">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-[12px] font-semibold text-violet-400 mb-4"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            أسئلة شائعة
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title"
          >
            الأسئلة <span className="gradient-text">الشائعة</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="section-desc mt-3"
          >
            إجابات على أكثر الأسئلة تكراراً حول SkyPro
          </motion.p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3 mb-12">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                openIndex === i 
                  ? 'border-violet-500/30 bg-white/[0.04] shadow-lg shadow-violet-500/5' 
                  : 'border-white/6 bg-white/[0.02] hover:border-white/12 hover:bg-white/[0.03]'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-right transition-colors"
                aria-expanded={openIndex === i}
              >
                <span className={`font-semibold text-[15px] transition-colors ${openIndex === i ? 'text-white' : 'text-slate-300'}`}>
                  {faq.question}
                </span>
                <div className={`flex items-center justify-center h-8 w-8 rounded-full transition-colors shrink-0 mr-4 ${openIndex === i ? 'bg-violet-500/20 text-violet-300' : 'bg-white/5 text-slate-500'}`}>
                  <ChevronDown
                    className={`w-5 h-5 transition-transform duration-300 ${openIndex === i ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] as [number, number, number, number] }}
                  >
                    <p className="px-5 pb-6 text-slate-400 leading-relaxed text-[15px] border-t border-white/5 pt-4 mx-5 mt-1">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="max-w-3xl mx-auto glass-card p-8 sm:p-10 text-center relative overflow-hidden group"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/10 border border-sky-500/20 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
              <MessageCircle className="h-8 w-8 text-sky-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">لم تجد إجابتك؟</h3>
            <p className="text-sm text-slate-400 mb-8">تواصل مع فريق الدعم الفني المتواجد على مدار الساعة وسنرد عليك في أقل من ساعة</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://wa.me/201067894321" target="_blank" rel="noopener noreferrer" className="btn-primary w-full sm:w-auto text-sm px-8 py-3">
                تواصل عبر واتساب
              </a>
              <a href="mailto:admin@skywaveads.com" className="btn-secondary w-full sm:w-auto text-sm px-8 py-3">
                راسلنا بالبريد
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}