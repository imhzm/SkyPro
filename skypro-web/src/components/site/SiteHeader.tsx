"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, Menu, X } from "lucide-react";
import { NavbarAuthMenu } from "../marketing/NavbarAuthMenu";
import { ThemeControl } from "../theme/ThemeControl";
import { SiteBrand } from "./SiteBrand";
import styles from "./site.module.css";
const links = [
  { label: "الرئيسية", href: "/" },
  { label: "المميزات", href: "/#features" },
  { label: "أدوات المنصات", href: "/#platforms" },
  { label: "جميع المنصات", href: "/platforms" },
  { label: "الأسعار", href: "/#pricing" },
  { label: "أدلة الاستخدام", href: "/guides" },
];
const help = [
  { label: "الأسئلة الشائعة", href: "/#faq" },
  { label: "سياسة الخصوصية", href: "/privacy" },
  { label: "الشروط والأحكام", href: "/terms" },
  { label: "سياسة الأمان", href: "/security/policy" },
];
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menu = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
      if (e.key === "Tab") {
        const items = [
          trigger.current,
          ...Array.from(
            menu.current?.querySelectorAll<HTMLElement>("a,button") || [],
          ),
        ].filter(Boolean) as HTMLElement[];
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);
  return (
    <header className={styles.header}>
      <div className={styles.navbar}>
        <SiteBrand />
        <nav className={styles.desktopNav} aria-label="التنقل الرئيسي">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={pathname === l.href || (l.href === "/guides" && pathname.startsWith("/guides/")) ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
          <details className={styles.help}>
            <summary>المساعدة</summary>
            <div>
              {help.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>
        <div className={styles.headerActions}>
          <ThemeControl />
          <div className={styles.authMenu}>
            <NavbarAuthMenu />
          </div>
          <button
            ref={trigger}
            type="button"
            className={`${styles.iconButton} ${styles.menuButton}`}
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          ref={menu}
          id={menuId}
          className={styles.mobileNav}
          aria-label="قائمة الهاتف"
        >
          {[...links, ...help].map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
              <ArrowLeft size={16} />
            </Link>
          ))}
          <NavbarAuthMenu variant="mobile" />
        </nav>
      )}
    </header>
  );
}
