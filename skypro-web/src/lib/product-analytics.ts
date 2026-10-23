export type ProductEvent =
  | "view_platform"
  | "view_product_gallery"
  | "click_trial"
  | "start_registration"
  | "complete_registration"
  | "click_download"
  | "click_whatsapp";

// No email, form values, tokens, query strings, device identifiers or key data.
export function trackProductEvent(event: ProductEvent, platform?: string) {
  if (typeof window === "undefined") return false;
  try {
    const consent = JSON.parse(localStorage.getItem("skypro_cookie_consent_v1") || "null");
    if (consent?.analytics !== true) return false;
  } catch { return false; }
  const client = window as Window & { gtag?: (...args: unknown[]) => void };
  if (!client.gtag) return false;
  try {
    client.gtag("event", event, {
      page_path: window.location.pathname,
      page_location: window.location.origin + window.location.pathname,
      ...(platform && /^[a-z-]{1,32}$/.test(platform) ? { platform } : {}),
    });
    return true;
  } catch { return false; }
}
