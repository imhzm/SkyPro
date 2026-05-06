'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Key,
  Monitor,
  CreditCard,
  Receipt,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Send
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/admin/users', label: 'المستخدمين', icon: Users },
  { href: '/admin/keys', label: 'المفاتيح', icon: Key },
  { href: '/admin/devices', label: 'الأجهزة', icon: Monitor },
  { href: '/admin/subscriptions', label: 'الاشتراكات', icon: CreditCard },
  { href: '/admin/billing', label: 'الفوترة', icon: Receipt },
  { href: '/admin/audit-log', label: 'سجل الأحداث', icon: FileText },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    await signOut({ redirect: false })
    router.replace('/auth/login')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 bg-white/10 backdrop-blur border border-white/10 text-white p-2 rounded-xl shadow-lg"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed top-0 right-0 h-screen bg-[#0a1020] border-l border-white/5 z-40 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'} ${mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-white/5">
            <Link href="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 shadow-lg shadow-sky-500/20">
                <Send className="h-4 w-4 text-white" />
              </div>
              {!collapsed && (
                <div>
                  <span className="text-lg font-bold gradient-text-brand">سيندر برو</span>
                  <p className="text-[10px] text-slate-500 leading-tight">لوحة التحكم</p>
                </div>
              )}
            </Link>
          </div>

          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-sky-500/15 text-sky-400 font-semibold border border-sky-500/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <item.icon size={20} />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-white/5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={20} />
              {!collapsed && <span className="text-sm">تسجيل الخروج</span>}
            </button>
          </div>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute top-1/2 -left-3 w-6 h-6 bg-white/10 border border-white/10 rounded-full items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft size={14} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>
    </>
  )
}
