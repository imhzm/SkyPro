'use client'

import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { Menu, X, ChevronLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Logo } from '@/components/marketing/Logo'

const navLinks = [
  { label: 'المميزات', href: '/#features' },
  { label: 'المنصات', href: '/platforms' },
  { label: 'كيف يعمل', href: '/#how-it-works' },
  { label: 'الأسعار', href: '/#pricing' },
  { label: 'الأسئلة الشائعة', href: '/#faq' },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeSection, setActiveSection] = useState('')

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20)

    // Scroll progress
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight
    const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0
    setScrollProgress(progress)

    // Active section detection
    const sections = ['features', 'how-it-works', 'pricing', 'faq']
    for (const id of sections.reverse()) {
      const el = document.getElementById(id)
      if (el && window.scrollY >= el.offsetTop - 200) {
        setActiveSection(id)
        break
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const isActive = (href: string) => {
    const id = href.replace('/#', '')
    return activeSection === id
  }

  return (
    <>
      {/* Scroll progress bar */}
      <div className="scroll-progress" style={{ width: `${scrollProgress}%` }} />

      <header
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'border-b border-white/8 bg-[rgba(6,13,27,0.92)] backdrop-blur-2xl shadow-2xl shadow-black/30'
            : 'bg-transparent'
        }`}
      >
        <div className="section-shell">
          <div className="flex items-center justify-between gap-4 py-4">
            {/* Logo */}
            <Link href="/" className="flex min-w-0 items-center gap-3 group">
              <div className="transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-3deg]">
                <Logo size={44} priority />
              </div>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-display text-lg font-extrabold tracking-wide gradient-text-brand">SkyPro</span>
                <span className="truncate text-[10px] text-slate-500 transition-colors group-hover:text-slate-400">by Sky Wave</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 lg:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                    isActive(link.href)
                      ? 'text-white bg-white/10'
                      : 'text-slate-300 hover:bg-white/8 hover:text-white'
                  }`}
                >
                  {link.label}
                  {isActive(link.href) && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute bottom-0 right-2 left-2 h-0.5 rounded-full bg-gradient-to-r from-sky-500 to-violet-500"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </a>
              ))}
              <Link href="/auth/login" className="nav-link text-slate-300">تسجيل الدخول</Link>
              <Link
                href="/auth/register"
                className="btn-primary mr-2 !py-2 !px-5 text-[13px] animate-glow-pulse"
              >
                جرّب مجاناً
              </Link>
            </nav>

            {/* Mobile controls */}
            <div className="flex items-center gap-2 lg:hidden">
              <Link href="/auth/register" className="btn-primary !py-1.5 !px-3 text-[11px]">
                جرّب مجاناً
              </Link>
              <button
                onClick={() => setOpen(!open)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition-all hover:bg-white/10"
                aria-label="القائمة"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {open ? (
                    <motion.div
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <X size={20} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="menu"
                      initial={{ rotate: 90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: -90, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Menu size={20} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 top-0 bg-black/60 backdrop-blur-sm lg:hidden z-40"
                onClick={() => setOpen(false)}
              />

              {/* Drawer */}
              <motion.div
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-[rgba(6,13,27,0.98)] backdrop-blur-2xl border-l border-white/8 lg:hidden z-50 overflow-y-auto"
              >
                <div className="p-6 pt-8">
                  {/* Close button */}
                  <button
                    onClick={() => setOpen(false)}
                    className="absolute top-5 left-5 h-9 w-9 flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <X size={18} />
                  </button>

                  {/* Logo inside drawer */}
                  <div className="flex items-center gap-3 mb-10">
                    <Logo size={40} />
                    <div>
                      <span className="font-display text-lg font-extrabold gradient-text-brand">SkyPro</span>
                      <span className="block text-[10px] text-slate-500">by Sky Wave</span>
                    </div>
                  </div>

                  {/* Nav links */}
                  <div className="space-y-1">
                    {navLinks.map((link, i) => (
                      <motion.a
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 + 0.1 }}
                        className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-medium text-slate-300 hover:bg-white/6 hover:text-white transition-all group"
                      >
                        <span>{link.label}</span>
                        <ChevronLeft className="h-4 w-4 text-slate-600 group-hover:text-sky-400 transition-colors" />
                      </motion.a>
                    ))}
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: navLinks.length * 0.05 + 0.1 }}
                    >
                      <Link
                        href="/auth/login"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-medium text-slate-300 hover:bg-white/6 hover:text-white transition-all"
                      >
                        <span>تسجيل الدخول</span>
                        <ChevronLeft className="h-4 w-4 text-slate-600" />
                      </Link>
                    </motion.div>
                  </div>

                  {/* CTA */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-8"
                  >
                    <Link
                      href="/auth/register"
                      onClick={() => setOpen(false)}
                      className="btn-primary w-full text-center text-base py-3.5"
                    >
                      جرّب مجاناً — يومين
                    </Link>
                    <p className="text-center text-[11px] text-slate-600 mt-3">
                      بدون بطاقة ائتمانية
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>
    </>
  )
}