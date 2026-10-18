"use client";
import { useEffect, useRef } from "react";
export function useMobileDrawer(open: boolean, close: () => void) {
  const drawer = useRef<HTMLElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const returnTarget = trigger.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        drawer.current?.querySelectorAll<HTMLElement>(
          "a,button,input,select",
        ) || [],
      ).filter(
        (e) =>
          e.getBoundingClientRect().width > 0 && !e.hasAttribute("disabled"),
      );
    focusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        trigger.current?.focus();
      }
      if (event.key === "Tab") {
        const items = focusable();
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
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = previous;
      returnTarget?.focus();
    };
  }, [open, close]);
  return { drawer, trigger };
}
