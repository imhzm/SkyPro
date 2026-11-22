export type ProductEvent =
  | "view_platform"
  | "view_product_gallery"
  | "click_trial"
  | "start_registration"
  | "complete_registration"
  | "trial_activated"
  | "click_download"
  | "click_whatsapp"
  | "click_contact";

export const ANALYTICS_CONSENT_KEY = "skypro_cookie_consent_v1";
export const ANALYTICS_CONSENT_COOKIE = "cookie_consent";
export const GOOGLE_CONVERSION_ENDPOINT = "/api/auth/google/conversion";
export const GOOGLE_CONVERSION_RETURN = "/auth/callback?google_conversion=1";
export const GOOGLE_CONVERSION_CONFIRMED = "skypro:google-conversion-confirmed";

export function isGoogleConversionReturn(location: Pick<Location, "pathname" | "search">) {
  return location.pathname === "/auth/callback" && location.search === "?google_conversion=1";
}

export function hasAnalyticsConsentCookie(value: string | undefined) {
  return value === "a" || value === "am";
}

export function hasAnalyticsConsent() {
  if (typeof window === "undefined") return false;
  try {
    return JSON.parse(localStorage.getItem(ANALYTICS_CONSENT_KEY) || "null")?.analytics === true;
  } catch { return false; }
}

export function isPublicAnalyticsPath(pathname: string) {
  return pathname === "/" || /^\/(platforms|guides)(\/|$)/.test(pathname)
    || ["/privacy", "/terms", "/security/policy", "/security/hall-of-fame"].includes(pathname);
}

export function isAnalyticsPath(pathname: string) {
  return isPublicAnalyticsPath(pathname) || ["/auth/register", "/auth/verify-email"].includes(pathname);
}

export function productLinkEvent(pathname: string, href: string, origin: string, download = false): ProductEvent | null {
  let url: URL;
  try { url = new URL(href, origin); } catch { return null; }
  if (pathname === "/auth/register" && url.origin === origin
    && url.pathname === "/api/auth/google" && !url.search && !url.hash) return "start_registration";
  if (!isPublicAnalyticsPath(pathname)) return null;
  if (url.origin === origin && url.pathname === "/auth/register") return "click_trial";
  if (url.protocol === "https:" && url.hostname === "wa.me") return "click_whatsapp";
  if (url.protocol === "tel:" || url.protocol === "mailto:") return "click_contact";
  if (url.protocol === "https:" && (url.hostname === "downloads.skywaveads.com" || (url.origin === origin && download))) return "click_download";
  return null;
}

export function isCreatedRegistration(ok: boolean, payload: unknown) {
  if (!ok || !payload || typeof payload !== "object") return false;
  const result = payload as {success?: unknown; data?: {userId?: unknown; pendingVerification?: unknown}};
  return result.success === true && Number.isSafeInteger(result.data?.userId)
    && Number(result.data?.userId) > 0 && result.data?.pendingVerification === true;
}

export function isConfirmedTrialActivation(ok: boolean, payload: unknown) {
  if (!ok || !payload || typeof payload !== "object") return false;
  const result = payload as { success?: unknown; trialActivated?: unknown };
  return result.success === true && result.trialActivated === true;
}

export function applyGoogleAnalyticsConsent(measurementId: string, allowed: boolean) {
  if (typeof window === "undefined" || !/^G-[A-Z0-9]+$/.test(measurementId)) return;
  const client = window as Window & {gtag?: (...args: unknown[]) => void};
  // Google's opt-out flag stops an already loaded tag as well as new collection.
  (window as unknown as Record<string, unknown>)[`ga-disable-${measurementId}`] = !allowed;
  client.gtag?.("consent", "update", {
    analytics_storage: allowed ? "granted" : "denied",
    ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied",
  });
}

// No email, form values, tokens, query strings, device identifiers or key data.
export function trackProductEvent(event: ProductEvent, platform?: string, onSent?: () => void) {
  if (typeof window === "undefined") return false;
  const googleReturn = isGoogleConversionReturn(window.location)
    && (event === "complete_registration" || event === "trial_activated");
  if (!hasAnalyticsConsent() || !(isAnalyticsPath(window.location.pathname) || googleReturn)) return false;
  const client = window as Window & { gtag?: (...args: unknown[]) => void };
  if (!client.gtag) return false;
  try {
    client.gtag("event", event, {
      page_path: window.location.pathname,
      page_location: window.location.origin + window.location.pathname,
      ...(platform && /^[a-z-]{1,32}$/.test(platform) ? { platform } : {}),
      ...(googleReturn ? { method: "google" } : {}),
      ...(onSent ? { event_callback: onSent, event_timeout: 800 } : {}),
    });
    return true;
  } catch { return false; }
}

export function trackGoogleConversions(registrationCompleted: boolean, trialActivated: boolean) {
  if (!hasAnalyticsConsent() || !isGoogleConversionReturn(window.location)) return Promise.resolve();
  const events: ProductEvent[] = [];
  if (registrationCompleted) events.push("complete_registration");
  if (trialActivated) events.push("trial_activated");
  if (!events.length) return Promise.resolve();

  return new Promise<void>((resolve) => {
    let pending = events.length;
    let started = false;
    const complete = () => {
      window.clearTimeout(timer);
      window.removeEventListener("skypro:analytics-ready", send);
      window.removeEventListener("skypro:consent-changed", send);
      resolve();
    };
    const sent = () => { if (--pending === 0) complete(); };
    const send = () => {
      if (!hasAnalyticsConsent()) return complete();
      if (started || !(window as Window & { gtag?: unknown }).gtag) return;
      started = true;
      for (const event of events) {
        if (!trackProductEvent(event, undefined, sent)) sent();
      }
    };
    const timer = window.setTimeout(complete, 1200);
    window.addEventListener("skypro:analytics-ready", send);
    window.addEventListener("skypro:consent-changed", send);
    window.dispatchEvent(new Event(GOOGLE_CONVERSION_CONFIRMED));
    send();
  });
}

export function trackPageView(referrer: string) {
  if (!hasAnalyticsConsent() || typeof window === "undefined" || !isAnalyticsPath(window.location.pathname)) return false;
  const client = window as Window & { gtag?: (...args: unknown[]) => void };
  if (!client.gtag) return false;
  const pageLocation = window.location.origin + window.location.pathname;
  let safeReferrer = "";
  try { const parsed = new URL(referrer); if (/^https?:$/.test(parsed.protocol)) safeReferrer = parsed.origin + parsed.pathname; } catch { /* empty/invalid referrer */ }
  try {
    const page = {page_location: pageLocation, page_referrer: safeReferrer, page_title: document.title};
    client.gtag("set", page);
    client.gtag("event", "page_view", page);
    return true;
  } catch { return false; }
}
