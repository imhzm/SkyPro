'use client'

/**
 * Privacy-first analytics loader.
 *
 * - Plausible: privacy-friendly, cookieless. Loads on first paint when configured (no consent needed).
 * - Google Analytics 4: requires `analytics: true` in cookie consent. Loads only after consent.
 *
 * Configure via env:
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-XXXXXXXXXX'
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN  = 'skypro.skywaveads.com'
 *   NEXT_PUBLIC_PLAUSIBLE_SCRIPT  = 'https://plausible.io/js/script.js'  (optional override)
 */

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ProductEvents } from './ProductEvents'
import { ANALYTICS_CONSENT_KEY, applyGoogleAnalyticsConsent, hasAnalyticsConsent, isAnalyticsPath, trackPageView } from '@/lib/product-analytics'

export function Analytics() {
  const configuredId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const gaId = configuredId && /^G-[A-Z0-9]+$/.test(configuredId) ? configuredId : null
  const pathname = usePathname()
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  const plausibleScript = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT
    || 'https://plausible.io/js/script.js'

  const [analyticsAllowed, setAnalyticsAllowed] = useState(false)
  const recordedPath = useRef<string | null>(null)
  const previousLocation = useRef('')

  useEffect(() => {
    const view = () => {
      if (!gaId || recordedPath.current === pathname || !hasAnalyticsConsent() || !isAnalyticsPath(pathname)) return
      if (trackPageView(previousLocation.current || document.referrer)) {
        recordedPath.current = pathname
        previousLocation.current = location.origin + pathname
      }
    }
    const sync = () => {
      const allowed = hasAnalyticsConsent() && isAnalyticsPath(pathname)
      if (gaId) applyGoogleAnalyticsConsent(gaId, allowed)
      if (!allowed) recordedPath.current = null
      setAnalyticsAllowed(allowed)
      if (allowed) {
        view()
        // Notify product observers after the loaded tag's opt-out/consent state is updated.
        if ((window as Window & {gtag?: unknown}).gtag) window.dispatchEvent(new Event('skypro:analytics-ready'))
      }
    }
    sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key === ANALYTICS_CONSENT_KEY || e.key === null) sync()
    }
    window.addEventListener('storage', onStorage)
    // Custom event so cookie banner can broadcast updates within the same tab
    const onConsentChange = () => sync()
    window.addEventListener('skypro:consent-changed', onConsentChange)
    window.addEventListener('skypro:analytics-ready', view)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('skypro:consent-changed', onConsentChange)
      window.removeEventListener('skypro:analytics-ready', view)
    }
  }, [gaId, pathname])

  return (
    <>
      <ProductEvents />
      {/* Plausible — privacy-friendly, cookieless. Loads always (no PII / consent needed). */}
      {plausibleDomain && (
        <Script
          src={plausibleScript}
          data-domain={plausibleDomain}
          strategy="afterInteractive"
        />
      )}

      {/* Google Analytics 4 — only after analytics consent */}
      {gaId && analyticsAllowed && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('consent', 'default', {
                'ad_storage': 'denied',
                'analytics_storage': 'granted',
                'ad_user_data': 'denied',
                'ad_personalization': 'denied',
              });
              gtag('js', new Date());
              gtag('config', '${gaId}', {
                send_page_view: false,
                allow_google_signals: false,
                allow_ad_personalization_signals: false,
                cookie_flags: 'SameSite=Lax;Secure',
                page_location: location.origin + location.pathname,
                page_referrer: document.referrer.split('?')[0].split('#')[0],
              });
              window.dispatchEvent(new Event('skypro:analytics-ready'));
            `}
          </Script>
        </>
      )}
    </>
  )
}
