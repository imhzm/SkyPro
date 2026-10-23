"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackProductEvent } from "@/lib/product-analytics";

export function ProductEvents() {
  const pathname = usePathname();
  const recordedPage = useRef<string | null>(null);
  const startedRegistration = useRef(false);
  useEffect(() => {
    const publicPage = pathname === "/" || pathname.startsWith("/platforms") || pathname.startsWith("/blog");
    const view = () => {
      const platform = pathname.match(/^\/platforms\/([a-z-]+)$/)?.[1];
      if (platform && recordedPage.current !== pathname && trackProductEvent("view_platform", platform)) recordedPage.current = pathname;
    };
    const click = (event: MouseEvent) => {
      if (!publicPage || !(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!link) return;
      const url = new URL(link.getAttribute("href") || "", location.origin);
      if (url.origin === location.origin && url.pathname === "/auth/register") trackProductEvent("click_trial");
      else if (url.hostname === "wa.me") trackProductEvent("click_whatsapp");
      else if (url.hostname === "downloads.skywaveads.com" || link.hasAttribute("download")) trackProductEvent("click_download");
    };
    const input = (event: Event) => {
      if (pathname !== "/auth/register" || startedRegistration.current || !(event.target instanceof HTMLInputElement)) return;
      if (trackProductEvent("start_registration")) startedRegistration.current = true;
    };
    view();
    window.addEventListener("skypro:consent-changed", view);
    window.addEventListener("skypro:analytics-ready", view);
    document.addEventListener("click", click);
    document.addEventListener("input", input);
    return () => {
      window.removeEventListener("skypro:consent-changed", view);
      window.removeEventListener("skypro:analytics-ready", view);
      document.removeEventListener("click", click);
      document.removeEventListener("input", input);
    };
  }, [pathname]);
  return null;
}
