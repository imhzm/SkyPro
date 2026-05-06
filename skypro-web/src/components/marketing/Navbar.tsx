'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, Send } from 'lucide-react'

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-white/8 bg-[rgba(6,13,27,0.92)] backdrop-blur-2xl shadow-lg shadow-black/20' : 'bg-transparent'}`}>
      <div className="section-shell">
        <div className="flex items-center justify-between gap-4 py-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 shadow-lg shadow-sky-500/25">
              <Send className="h-5 w-5 text-white" />
            </div>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-display text-lg font-bold tracking-wide text-white">سيندر برو</span>
              <span className="truncate text-[10px] text-slate-500">by Sky Wave</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="nav-link">
                {link.label}
              </a>
            ))}
            <Link href="/auth/login" className="nav-link">تسجيل الدخول</Link>
            <Link href="/auth/register" className="btn-primary mr-2 !py-2 !px-5 text-[13px]">
              جرّب مجاناً
            </Link>
          </nav>

          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/auth/register" className="btn-primary !py-1.5 !px-3 text-[11px] sm:inline-flex">
              جرّب مجاناً
            </Link>
            <button onClick={() => setOpen(!open)} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-white/8 bg-[rgba(6,13,27,0.98)] backdrop-blur-2xl">
          <div className="section-shell py-4 space-y-2">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/6 hover:text-white transition">
                {link.label}
              </a>
            ))}
            <Link href="/auth/login" onClick={() => setOpen(false)} className="block rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/6 hover:text-white transition">
              تسجيل الدخول
            </Link>
            <Link href="/auth/register" onClick={() => setOpen(false)} className="block btn-primary text-center mt-3">
              جرّب مجاناً — يومين
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}