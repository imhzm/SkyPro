"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  LogOut,
  User as UserIcon,
  Shield,
} from "lucide-react";

interface SessionUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
  status: string;
}

/**
 * Auth-aware menu that:
 *  - Shows "تسجيل الدخول" + "جرّب مجاناً" for guests
 *  - Shows "لوحة التحكم" + "تسجيل خروج" dropdown for authenticated users
 *  - Routes admins to /admin and customers to /dashboard
 *
 * Used in Navbar (desktop + mobile drawer).
 */
export function NavbarAuthMenu({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile";
}) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.success) setUser(data.data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = user?.role === "admin";
  const dashboardHref = isAdmin ? "/admin" : "/dashboard";
  const initials = (user?.name || user?.email || "?").slice(0, 1).toUpperCase();

  // ─── Mobile drawer variant ───────────────────────────────────
  if (variant === "mobile") {
    if (loading) return null;
    if (!user) {
      return (
        <Link
          href="/auth/login"
          className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-medium text-muted hover:bg-soft hover:text-foreground transition-all"
        >
          <span>تسجيل الدخول</span>
        </Link>
      );
    }
    return (
      <div className="flex flex-col gap-1.5 mt-2">
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3 bg-soft border border-line">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-foreground text-sm font-semibold truncate">
              {user.name || "مستخدم"}
            </p>
            <p className="text-muted text-xs truncate">{user.email}</p>
          </div>
        </div>
        <Link
          href={dashboardHref}
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-brand bg-sky-500/10 border border-sky-500/25 hover:bg-sky-500/15 transition-all"
        >
          {isAdmin ? (
            <Shield className="w-4 h-4" />
          ) : (
            <LayoutDashboard className="w-4 h-4" />
          )}
          {isAdmin ? "لوحة الأدمن" : "لوحة التحكم"}
        </Link>
        <a
          href="/api/auth/logout"
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-negative bg-red-500/10 border border-red-500/25 hover:bg-red-500/15 transition-all"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </a>
      </div>
    );
  }

  // ─── Desktop variant ─────────────────────────────────────────
  if (loading) return <div className="w-32 h-9" aria-hidden="true" />;

  if (!user) {
    return (
      <>
        <Link href="/auth/login" className="nav-link text-muted">
          تسجيل الدخول
        </Link>
        <Link
          href="/auth/register"
          className="btn-primary mr-2 !py-2 !px-5 text-[13px] animate-glow-pulse"
        >
          جرّب مجاناً
        </Link>
      </>
    );
  }

  return (
    <div ref={menuRef} className="relative flex items-center gap-2">
      <Link
        href={dashboardHref}
        className="nav-link text-muted inline-flex items-center gap-1.5"
      >
        {isAdmin ? (
          <Shield className="w-3.5 h-3.5" />
        ) : (
          <LayoutDashboard className="w-3.5 h-3.5" />
        )}
        {isAdmin ? "لوحة الأدمن" : "لوحة التحكم"}
      </Link>

      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-full bg-soft border border-line hover:bg-soft hover:border-line px-2 py-1.5 transition-all"
        aria-label="قائمة الحساب"
        aria-controls={menuId}
        aria-expanded={open}
      >
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
          {initials}
        </div>
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-panel border border-line shadow-2xl shadow-black/50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-line flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-white font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm font-semibold truncate">
                {user.name || "مستخدم"}
              </p>
              <p className="text-muted text-xs truncate" dir="ltr">
                {user.email}
              </p>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-caution">
                  <Shield className="w-2.5 h-2.5" />
                  أدمن
                </span>
              )}
            </div>
          </div>
          <Link
            href={dashboardHref}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted hover:bg-soft hover:text-foreground transition"
            onClick={() => setOpen(false)}
          >
            {isAdmin ? (
              <Shield className="w-4 h-4 text-caution" />
            ) : (
              <LayoutDashboard className="w-4 h-4 text-brand" />
            )}
            {isAdmin ? "لوحة الأدمن" : "لوحة التحكم"}
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-muted hover:bg-soft hover:text-foreground transition"
            onClick={() => setOpen(false)}
          >
            <UserIcon className="w-4 h-4 text-muted" />
            الإعدادات
          </Link>
          <a
            href="/api/auth/logout"
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-negative hover:bg-red-500/10 hover:text-negative transition border-t border-line"
          >
            <LogOut className="w-4 h-4" />
            تسجيل الخروج
          </a>
        </div>
      )}
    </div>
  );
}
