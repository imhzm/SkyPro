"use client";
import { useCallback } from "react";
import { useMobileDrawer } from "@/components/theme/useMobileDrawer";
import { ThemeControl } from "@/components/theme/ThemeControl";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Monitor,
  LogOut,
  Menu,
  X,
  Settings,
  CreditCard,
  Activity,
} from "lucide-react";
import { Logo } from "@/components/marketing/Logo";
import NotificationBell from "@/components/dashboard/NotificationBell";

interface User {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

const navLinks = [
  { href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { href: "/dashboard/devices", label: "الأجهزة", icon: Monitor },
  { href: "/dashboard/billing", label: "الفوترة", icon: CreditCard },
  { href: "/dashboard/activity", label: "سجل النشاط", icon: Activity },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export default function DashboardSidebar({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const closeDrawer = useCallback(() => setOpen(false), []);
  const { drawer, trigger } = useMobileDrawer(open, closeDrawer);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await signOut({ redirect: false });
      window.location.href = "/auth/login?logged_out=1";
    } catch {
      window.location.href = "/api/auth/logout";
    }
  };

  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user.email[0].toUpperCase();

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 h-14 bg-page backdrop-blur border-b border-line">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground font-bold text-lg"
        >
          <Logo size={28} />
          SkyPro
        </Link>
        <div className="flex items-center gap-2">
          <ThemeControl />
          <NotificationBell />
          <button
            ref={trigger}
            aria-label={open ? "إغلاق قائمة الحساب" : "فتح قائمة الحساب"}
            aria-expanded={open}
            aria-controls="customer-navigation"
            onClick={() => setOpen(!open)}
            className="text-muted hover:text-foreground"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        ref={drawer}
        id="customer-navigation"
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label="تنقل الحساب"
        data-drawer-open={open}
        className={`fixed top-0 right-0 z-40 h-full w-64 bg-panel border-l border-line flex flex-col transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"} lg:translate-x-0`}
        dir="rtl"
      >
        <button
          type="button"
          aria-label="إغلاق القائمة الجانبية"
          className="lg:hidden absolute top-4 left-3 z-50 rounded-lg bg-soft p-2 text-foreground"
          onClick={closeDrawer}
        >
          <X size={18} />
        </button>
        {/* Logo + Bell */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-line">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} priority />
            <span className="font-extrabold text-lg gradient-text-brand">
              SkyPro
            </span>
          </Link>
          <NotificationBell />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${
                    active
                      ? "bg-sky-500/15 text-brand border border-sky-500/20"
                      : "text-muted hover:text-foreground hover:bg-soft"
                  }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-line space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-foreground text-sm font-medium truncate">
                {user.name ?? "مستخدم"}
              </p>
              <p className="text-muted text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-muted hover:text-negative hover:bg-red-500/10 text-sm transition-all disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {loggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}
          </button>
        </div>
      </aside>
    </>
  );
}
