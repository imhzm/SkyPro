"use client";
import type { MouseEvent } from "react";
export function SkipLink() {
  const skip = (event: MouseEvent<HTMLAnchorElement>) => {
    const target =
      document.querySelector<HTMLElement>("main h1") ||
      document.querySelector<HTMLElement>("main");
    if (!target) return;
    event.preventDefault();
    target.tabIndex = -1;
    target.focus();
    target.scrollIntoView({ block: "start" });
  };
  return (
    <a
      href="#main-content"
      onClick={skip}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[100] focus:bg-sky-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:font-semibold"
    >
      تخطّى إلى المحتوى الرئيسي
    </a>
  );
}
