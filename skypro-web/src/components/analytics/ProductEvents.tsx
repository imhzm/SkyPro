"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { productLinkEvent, trackProductEvent } from "@/lib/product-analytics";

export function ProductEvents() {
  const pathname = usePathname();
  const recordedPage = useRef<string | null>(null);
  const startedRegistration = useRef(false);
  useEffect(() => {
    const view = () => {
      const platform = pathname.match(/^\/platforms\/([a-z-]+)$/)?.[1];
      if (platform && recordedPage.current !== pathname && trackProductEvent("view_platform", platform)) recordedPage.current = pathname;
    };
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!link) return;
      const action = productLinkEvent(pathname, link.getAttribute("href") || "", location.origin, link.hasAttribute("download"));
      if (action) trackProductEvent(action);
    };
    const input = (event: Event) => {
      if (pathname !== "/auth/register" || startedRegistration.current || !(event.target instanceof HTMLInputElement) || !event.target.closest("form")) return;
      if (trackProductEvent("start_registration")) startedRegistration.current = true;
    };
    view();
    window.addEventListener("skypro:analytics-ready", view);
    document.addEventListener("click", click);
    document.addEventListener("input", input);
    return () => {
      window.removeEventListener("skypro:analytics-ready", view);
      document.removeEventListener("click", click);
      document.removeEventListener("input", input);
    };
  }, [pathname]);
  return null;
}
