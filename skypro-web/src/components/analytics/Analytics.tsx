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
import { useEffect, useState } from 'react'

const CONSENT_KEY = 'skypro_cookie_consent_v1'

type Consent = {
  necessary: true
  analytics: boolean
  marketing: boolean
  consentedAt: string
}

function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    return raw ? JSON.parse(raw) as Consent : null
  } catch {
    return null
  }
}

export function Analytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  const plausibleScript = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT
    || 'https://plausible.io/js/script.js'

  const [analyticsAllowed, setAnalyticsAllowed] = useState(false)

  useEffect(() => {
    const sync = () => setAnalyticsAllowed(!!readConsent()?.analytics)
    sync()
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    // Custom event so cookie banner can broadcast updates within the same tab
    const onConsentChange = () => sync()
    window.addEventListener('skypro:consent-changed', onConsentChange)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('skypro:consent-changed', onConsentChange)
    }
  }, [])

  return (
    <>
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
                anonymize_ip: true,
                cookie_flags: 'SameSite=Lax;Secure',
              });
            `}
          </Script>
        </>
      )}
    </>
  )
}
