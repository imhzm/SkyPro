"use client";
import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import styles from "../site/site.module.css";

export function ThemeSync() {
  useEffect(() => {
    const system = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let value: string | null = null;
      try {
        value = localStorage.getItem("skypro-theme");
      } catch {
        /* Private storage. */
      }
      document.documentElement.dataset.skyproTheme =
        value === "light" || value === "dark"
          ? value
          : system.matches
            ? "dark"
            : "light";
    };
    window.addEventListener("storage", sync);
    system.addEventListener("change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      system.removeEventListener("change", sync);
    };
  }, []);
  return null;
}
export function ThemeControl() {
  function toggle() {
    const theme =
      document.documentElement.dataset.skyproTheme === "light"
        ? "dark"
        : "light";
    document.documentElement.dataset.skyproTheme = theme;
    try {
      localStorage.setItem("skypro-theme", theme);
    } catch {
      /* The control still works. */
    }
  }
  return (
    <button
      type="button"
      className={styles.iconButton}
      onClick={toggle}
      aria-label="تبديل المظهر الفاتح والداكن"
    >
      <Sun className={styles.sun} size={18} />
      <Moon className={styles.moon} size={18} />
    </button>
  );
}
