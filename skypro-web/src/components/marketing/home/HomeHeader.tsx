"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Menu, Moon, Sun, X } from "lucide-react";
import { NavbarAuthMenu } from "../NavbarAuthMenu";
import { Brand } from "./shared";
import styles from "./home.module.css";
const navLinks = [
  { label: "الرئيسية", href: "#" },
  { label: "المميزات", href: "#features" },
  { label: "المنصات", href: "#platforms" },
  { label: "الأسعار", href: "#pricing" },
  { label: "الأسئلة الشائعة", href: "#faq" },
];

export function HomeHeader() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const systemTheme = matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem("skypro-theme");
      } catch {
        /* Storage may be disabled. */
      }
      document.documentElement.dataset.skyproTheme =
        saved === "light" || saved === "dark"
          ? saved
          : systemTheme.matches
            ? "dark"
            : "light";
    };
    window.addEventListener("storage", syncTheme);
    systemTheme.addEventListener("change", syncTheme);
    return () => {
      window.removeEventListener("storage", syncTheme);
      systemTheme.removeEventListener("change", syncTheme);
    };
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === "Tab") {
        const items = [
          menuButton.current,
          ...Array.from(
            menuRef.current?.querySelectorAll<HTMLElement>("a, button") || [],
          ),
        ].filter(Boolean) as HTMLElement[];
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  function toggleTheme() {
    const theme =
      document.documentElement.dataset.skyproTheme === "light"
        ? "dark"
        : "light";
    document.documentElement.dataset.skyproTheme = theme;
    try {
      localStorage.setItem("skypro-theme", theme);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
  }
  return (
    <header className={styles.header}>
      <div className={styles.navbar}>
        <Brand />
        <nav className={styles.desktopNav} aria-label="التنقل الرئيسي">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={toggleTheme}
            aria-label="تبديل المظهر الفاتح والداكن"
          >
            <Sun className={styles.sun} size={18} />
            <Moon className={styles.moon} size={18} />
          </button>
          <div className={styles.authMenu}>
            <NavbarAuthMenu />
          </div>
          <button
            ref={menuButton}
            type="button"
            className={`${styles.iconButton} ${styles.menuButton}`}
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            aria-controls="home-mobile-nav"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          ref={menuRef}
          id="home-mobile-nav"
          className={styles.mobileNav}
          aria-label="قائمة الهاتف"
        >
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
              <ArrowLeft size={16} />
            </a>
          ))}
          <NavbarAuthMenu variant="mobile" />
        </nav>
      )}
    </header>
  );
}
