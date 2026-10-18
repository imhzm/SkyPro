"use client";
import { useCallback } from "react";
import { useMobileDrawer } from "@/components/theme/useMobileDrawer";
import { ThemeControl } from "@/components/theme/ThemeControl";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
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
  Megaphone,
  Wallet,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/marketing/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  section?: string;
}

const navItems: NavItem[] = [
  {
    href: "/admin",
    label: "لوحة التحكم",
    icon: LayoutDashboard,
    section: "الرئيسية",
  },

  // Users + access
  {
    href: "/admin/users",
    label: "المستخدمين",
    icon: Users,
    section: "الحسابات",
  },
  { href: "/admin/keys", label: "المفاتيح", icon: Key, section: "الحسابات" },
  {
    href: "/admin/devices",
    label: "الأجهزة",
    icon: Monitor,
    section: "الحسابات",
  },

  // Billing & subscriptions
  {
    href: "/admin/subscriptions",
    label: "الاشتراكات",
    icon: CreditCard,
    section: "الفوترة",
  },
  {
    href: "/admin/billing",
    label: "الإيرادات",
    icon: Wallet,
    section: "الفوترة",
  },
  {
    href: "/admin/invoices",
    label: "الفواتير",
    icon: Receipt,
    section: "الفوترة",
  },
  {
    href: "/admin/payments",
    label: "المدفوعات",
    icon: CreditCard,
    section: "الفوترة",
  },

  // Marketing
  {
    href: "/admin/offers",
    label: "العروض والإعلانات",
    icon: Sparkles,
    section: "التسويق",
  },
  {
    href: "/admin/broadcast",
    label: "إشعار جماعي",
    icon: Megaphone,
    section: "التسويق",
  },

  // System
  {
    href: "/admin/audit-log",
    label: "سجل الأحداث",
    icon: FileText,
    section: "النظام",
  },
  {
    href: "/admin/settings",
    label: "الإعدادات",
    icon: Settings,
    section: "النظام",
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeDrawer = useCallback(() => setMobileOpen(false), []);
  const { drawer, trigger } = useMobileDrawer(mobileOpen, closeDrawer);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ redirect: false });
    router.replace("/auth/login");
    router.refresh();
  };

  return (
    <>
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-16 flex items-center justify-between px-4 bg-panel border-b border-line">
        <button
          ref={trigger}
          aria-label={mobileOpen ? "إغلاق قائمة الإدارة" : "فتح قائمة الإدارة"}
          aria-expanded={mobileOpen}
          aria-controls="admin-navigation"
          onClick={() => {
            setCollapsed(false);
            setMobileOpen(!mobileOpen);
          }}
          className="bg-soft border border-line text-foreground p-2.5 rounded-xl"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-foreground"
        >
          <Logo size={28} />
          Sky Pro
        </Link>
        <ThemeControl />
      </div>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        ref={drawer}
        id="admin-navigation"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen || undefined}
        aria-label="تنقل الإدارة"
        data-drawer-open={mobileOpen}
        data-collapsed={collapsed}
        className={`fixed top-0 right-0 h-screen bg-panel border-l border-line z-40 transition-all duration-300 ${collapsed ? "w-16" : "w-64"} ${mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}
      >
        <button
          type="button"
          aria-label="إغلاق القائمة الجانبية"
          className="lg:hidden absolute top-4 left-3 z-50 rounded-lg bg-soft p-2 text-foreground"
          onClick={closeDrawer}
        >
          <X size={18} />
        </button>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-line">
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5"
            >
              <Logo size={36} />
              {!collapsed && (
                <div>
                  <span className="text-lg font-bold gradient-text-brand">
                    SkyPro
                  </span>
                  <p className="text-[10px] text-muted leading-tight">
                    لوحة التحكم
                  </p>
                </div>
              )}
            </Link>
          </div>

          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item, idx) => {
              const isActive = pathname === item.href;
              const prevSection = idx > 0 ? navItems[idx - 1].section : null;
              const showSectionHeader =
                !collapsed && item.section && item.section !== prevSection;
              return (
                <div key={item.href}>
                  {showSectionHeader && (
                    <div className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
                      {item.section}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-sky-500/15 text-brand font-semibold border border-sky-500/20"
                        : "text-muted hover:bg-soft hover:text-foreground border border-transparent"
                    }`}
                  >
                    <item.icon size={19} />
                    {!collapsed && (
                      <span className="text-sm">{item.label}</span>
                    )}
                  </Link>
                </div>
              );
            })}
          </nav>

          <div className="p-3 border-t border-line">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-negative hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={20} />
              {!collapsed && <span className="text-sm">تسجيل الخروج</span>}
            </button>
          </div>
        </div>

        <button
          aria-label={collapsed ? "توسيع قائمة الإدارة" : "طي قائمة الإدارة"}
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute top-1/2 -left-3 w-6 h-6 bg-soft border border-line rounded-full items-center justify-center text-foreground hover:bg-soft transition-colors"
        >
          <ChevronLeft
            size={14}
            className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
          />
        </button>
      </aside>
    </>
  );
}
