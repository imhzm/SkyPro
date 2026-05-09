'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X } from 'lucide-react'

const WA_NUMBER = '201067894321'
const QUICK_REPLIES = [
  'محتاج معرفة الأسعار',
  'أريد عرض ديمو',
  'مشكلة في الحساب',
  'استفسار عام',
] as const

export function WhatsAppButton() {
  const [open, setOpen] = useState(false)
  const [showHint, setShowHint] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 3000)
    return () => clearTimeout(t)
  }, [])

  const buildLink = (text: string) =>
    `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`

  return (
    <div className="fixed bottom-6 left-6 z-50" dir="rtl">
      {/* Quick-reply popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-20 left-0 w-72 sm:w-80 rounded-2xl bg-[#0a1628] border border-white/10 shadow-2xl shadow-emerald-500/10 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-emerald-600 to-green-700 p-4 flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full bg-white/15 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-300 border-2 border-emerald-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold">دعم SkyPro</p>
                <p className="text-emerald-100 text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  متاح الآن — يرد خلال دقائق
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message bubble */}
            <div className="p-4 bg-[#060d1b]">
              <div className="bg-white/[0.04] border border-white/8 rounded-xl rounded-tr-sm px-3 py-2 mb-3 max-w-[85%]">
                <p className="text-slate-200 text-xs leading-relaxed">
                  أهلاً بك 👋 اختر استفسارك وهيتم تحويلك مباشرة إلى فريق الدعم على واتساب.
                </p>
              </div>

              <div className="space-y-2">
                {QUICK_REPLIES.map((q) => (
                  <a
                    key={q}
                    href={buildLink(q)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-xl px-3 py-2.5 text-emerald-200 text-xs font-medium transition-all group"
                  >
                    <span>{q}</span>
                    <MessageCircle className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>

              <a
                href={buildLink('مرحباً، أريد التواصل مع فريق دعم SkyPro')}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 px-4 py-2.5 text-sm font-bold text-white transition-all"
              >
                ابدأ محادثة جديدة
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint bubble */}
      <AnimatePresence>
        {showHint && !open && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-2 left-20 sm:left-[5.5rem] whitespace-nowrap bg-[#0a1628] border border-white/10 rounded-full px-3.5 py-2 shadow-xl flex items-center gap-2"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-200 font-medium">محتاج مساعدة؟</span>
            <button
              onClick={() => setShowHint(false)}
              className="text-slate-500 hover:text-slate-300 -mr-1"
              aria-label="إخفاء"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.button
        onClick={() => {
          setOpen((v) => !v)
          setShowHint(false)
        }}
        whileTap={{ scale: 0.92 }}
        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 shadow-2xl shadow-emerald-500/40 transition-all duration-300 hover:shadow-emerald-500/60 hover:scale-105"
        aria-label={open ? 'إغلاق محادثة الدعم' : 'فتح محادثة الدعم'}
      >
        {/* Outer pulse rings */}
        <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
        <span className="absolute inset-[-6px] rounded-full bg-emerald-500/15 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />

        {/* Inner glow */}
        <span className="absolute inset-1 rounded-full bg-gradient-to-tr from-white/20 to-transparent" />

        {/* Icon (rotates between WA and X) */}
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <X className="w-7 h-7 text-white drop-shadow-md" strokeWidth={2.5} />
            </motion.span>
          ) : (
            <motion.span
              key="wa"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <MessageCircle className="w-7 h-7 text-white drop-shadow-md fill-white/10" strokeWidth={2} />
            </motion.span>
          )}
        </AnimatePresence>

        {/* Status indicator */}
        {!open && (
          <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-300 border-2 border-[#060d1b]">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
        )}
      </motion.button>
    </div>
  )
}
