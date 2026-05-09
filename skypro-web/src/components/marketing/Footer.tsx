'use client'

import { Send, Mail, Phone, MessageCircle, Globe, ArrowUp, Heart, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { PlatformIcon } from '@/components/marketing/PlatformIcon'
import { platforms } from '@/data/platforms'

const footerLinks = {
  product: [
    { label: 'المميزات', href: '#features' },
    { label: 'الأسعار', href: '#pricing' },
    { label: 'الأسئلة الشائعة', href: '#faq' },
    { label: 'المنصات المدعومة', href: '/platforms' },
  ],
  support: [
    { label: 'مركز المساعدة', href: '#faq' },
    { label: 'تواصل معنا', href: 'https://wa.me/201067894321' },
    { label: 'الشروط والأحكام', href: '/terms' },
    { label: 'سياسة الخصوصية', href: '/privacy' },
  ],
}

export function Footer() {
  const topPlatforms = platforms.slice(0, 8)
  const otherPlatforms = platforms.slice(8, 16)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleScroll = useCallback(() => {
    setShowBackToTop(window.scrollY > 500)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'homepage_footer' }),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        setFeedback({ type: 'success', message: data.message ?? 'تم الاشتراك بنجاح' })
        setEmail('')
      } else {
        setFeedback({
          type: 'error',
          message: data?.message ?? data?.error ?? 'تعذّر الاشتراك، حاول مرة أخرى',
        })
      }
    } catch {
      setFeedback({ type: 'error', message: 'تعذّر الاتصال بالخادم' })
    } finally {
      setSubmitting(false)
      setTimeout(() => setFeedback(null), 6000)
    }
  }

  return (
    <>
      {/* Wave separator */}
      <div className="relative h-20 overflow-hidden bg-[#060d1b]">
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <path
            d="M0 40C360 80 720 0 1080 40C1260 60 1380 50 1440 40V80H0V40Z"
            fill="#040a15"
          />
        </svg>
      </div>

      <footer className="relative overflow-hidden bg-[#040a15]">
        {/* Animated gradient bg */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[150px] animate-pulse" />
          <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 section-shell py-16">
          {/* Newsletter section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-6 sm:p-8 mb-14 text-center"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-violet-500 mx-auto mb-4">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">ابقَ على اطلاع</h3>
            <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
              اشترك في نشرتنا البريدية لتصلك آخر التحديثات والعروض الحصرية
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="بريدك الإلكتروني"
                required
                disabled={submitting}
                className="flex-1 rounded-full bg-white/5 border border-white/10 px-5 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all focus:border-sky-500/50 focus:bg-white/8 focus:ring-1 focus:ring-sky-500/30 disabled:opacity-60"
                dir="ltr"
              />
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="btn-primary !px-6 !py-3 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'جارٍ الإرسال...' : 'اشترك الآن'}
              </button>
            </form>
            {feedback && (
              <p
                role="status"
                className={`mt-4 text-sm font-medium ${
                  feedback.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {feedback.message}
              </p>
            )}
          </motion.div>

          {/* Main footer grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
            {/* Brand column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-4"
            >
              <div className="flex items-center gap-3 mb-5 group">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 shadow-lg shadow-sky-500/20 transition-all duration-300 group-hover:shadow-sky-500/40 group-hover:scale-105">
                  <Send className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="font-display text-lg font-bold text-white">سيندر برو</span>
                  <span className="block text-[10px] text-slate-600">by Sky Wave</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed max-w-sm mb-6">
                أقوى أداة تسويق آلي لمنصات التواصل الاجتماعي. منتج من Sky Wave — وكالة النمو الرقمي.
              </p>
              <div className="flex items-center gap-3">
                {[
                  { icon: Mail, href: 'mailto:admin@skywaveads.com', label: 'البريد الإلكتروني' },
                  { icon: MessageCircle, href: 'https://wa.me/201067894321', label: 'واتساب', external: true },
                  { icon: Phone, href: 'tel:+201067894321', label: 'اتصل بنا' },
                  { icon: Globe, href: 'https://skypro.skywaveads.com', label: 'الموقع', external: true },
                ].map((social, i) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    target={social.external ? '_blank' : undefined}
                    rel={social.external ? 'noopener noreferrer' : undefined}
                    aria-label={social.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:border-white/15 hover:bg-white/10 hover:scale-110 transition-all duration-300"
                  >
                    <social.icon className="h-4 w-4" />
                  </motion.a>
                ))}
              </div>
            </motion.div>

            {/* Product links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <h4 className="font-semibold text-white mb-4 text-sm">المنتج</h4>
              <ul className="space-y-2.5">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link href={link.href} className="text-sm text-slate-500 hover:text-white hover:translate-x-[-4px] transition-all duration-200 inline-block">{link.label}</Link>
                    ) : (
                      <a href={link.href} className="text-sm text-slate-500 hover:text-white hover:translate-x-[-4px] transition-all duration-200 inline-block">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Support links */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-2"
            >
              <h4 className="font-semibold text-white mb-4 text-sm">الدعم</h4>
              <ul className="space-y-2.5">
                {footerLinks.support.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith('http') ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-white hover:translate-x-[-4px] transition-all duration-200 inline-block">{link.label}</a>
                    ) : (
                      <a href={link.href} className="text-sm text-slate-500 hover:text-white hover:translate-x-[-4px] transition-all duration-200 inline-block">{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Platforms */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-4"
            >
              <h4 className="font-semibold text-white mb-4 text-sm">المنصات</h4>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {topPlatforms.map((p) => (
                  <Link
                    key={p.id}
                    href={`/platforms/${p.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-all group"
                  >
                    <PlatformIcon id={p.id} size={14} className="shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ color: p.color }} />
                    {p.name}
                  </Link>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {otherPlatforms.map((p) => (
                  <Link
                    key={p.id}
                    href={`/platforms/${p.id}`}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-all group"
                  >
                    <PlatformIcon id={p.id} size={14} className="shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ color: p.color }} />
                    {p.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/6 mt-12 pt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-slate-600">
                &copy; {new Date().getFullYear()} سيندر برو — Sky Wave Ads. جميع الحقوق محفوظة.
              </p>
              <p className="text-sm text-slate-600 flex items-center gap-1.5 flex-wrap justify-center sm:justify-start">
                صُنع بـ <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 animate-pulse" /> بواسطة
                <a
                  href="https://www.skywaveads.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 font-semibold transition-colors"
                >
                  Sky Wave
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Back to top button (right side, opposite WhatsApp) */}
        <motion.button
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={
            showBackToTop
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 0.8, y: 20, pointerEvents: 'none' }
          }
          transition={{ duration: 0.3, ease: 'easeOut' }}
          whileTap={{ scale: 0.92 }}
          className="group fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 via-blue-500 to-violet-500 text-white shadow-2xl shadow-sky-500/40 hover:shadow-sky-500/60 hover:scale-105 transition-all duration-300"
          aria-label="رجوع للأعلى"
        >
          <span className="absolute inset-0 rounded-full bg-sky-400/20 animate-ping" />
          <span className="absolute inset-1 rounded-full bg-gradient-to-tr from-white/20 to-transparent" />
          <ArrowUp className="relative h-6 w-6 drop-shadow-md transition-transform duration-300 group-hover:-translate-y-0.5" strokeWidth={2.5} />
        </motion.button>
      </footer>
    </>
  )
}