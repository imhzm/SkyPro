'use client'

import { Send, Mail, Phone, MessageCircle, Globe } from 'lucide-react'
import Link from 'next/link'
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
    { label: 'مركز المساعدة', href: '#' },
    { label: 'تواصل معنا', href: 'https://wa.me/201067894321' },
    { label: 'الشروط والأحكام', href: '#' },
    { label: 'سياسة الخصوصية', href: '#' },
  ],
}

export function Footer() {
  const topPlatforms = platforms.slice(0, 8)
  const otherPlatforms = platforms.slice(8, 16)

  return (
    <footer className="border-t border-white/6 bg-[#040a15]">
      <div className="section-shell py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 shadow-lg shadow-sky-500/20">
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
              <a href="mailto:admin@skywaveads.com" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:border-white/15 transition-all">
                <Mail className="h-4 w-4" />
              </a>
              <a href="https://wa.me/201067894321" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:border-white/15 transition-all">
                <MessageCircle className="h-4 w-4" />
              </a>
              <a href="tel:+201067894321" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:border-white/15 transition-all">
                <Phone className="h-4 w-4" />
              </a>
              <a href="https://skypro.skywaveads.com" target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/8 text-slate-400 hover:text-white hover:border-white/15 transition-all">
                <Globe className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-semibold text-white mb-4 text-sm">المنتج</h4>
            <ul className="space-y-2.5">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('/') ? (
                    <Link href={link.href} className="text-sm text-slate-500 hover:text-white transition-colors">{link.label}</Link>
                  ) : (
                    <a href={link.href} className="text-sm text-slate-500 hover:text-white transition-colors">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h4 className="font-semibold text-white mb-4 text-sm">الدعم</h4>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('http') ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 hover:text-white transition-colors">{link.label}</a>
                  ) : (
                    <a href={link.href} className="text-sm text-slate-500 hover:text-white transition-colors">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4">
            <h4 className="font-semibold text-white mb-4 text-sm">المنصات</h4>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {topPlatforms.map((p) => (
                <Link
                  key={p.id}
                  href={`/platforms/${p.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  <PlatformIcon id={p.id} size={14} className="shrink-0" style={{ color: p.color }} />
                  {p.name}
                </Link>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {otherPlatforms.map((p) => (
                <Link
                  key={p.id}
                  href={`/platforms/${p.id}`}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  <PlatformIcon id={p.id} size={14} className="shrink-0" style={{ color: p.color }} />
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/6 mt-12 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-600">
              &copy; {new Date().getFullYear()} سيندر برو — Sky Wave Ads. جميع الحقوق محفوظة.
            </p>
            <p className="text-sm text-slate-600">
              صناعة مصر
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}