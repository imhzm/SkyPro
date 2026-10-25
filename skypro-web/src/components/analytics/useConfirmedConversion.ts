'use client'

import { useCallback, useEffect, useRef } from 'react'
import { hasAnalyticsConsent, trackProductEvent } from '@/lib/product-analytics'

type ConfirmedConversion = 'complete_registration' | 'trial_activated'

// The backend can finish before the consented Google tag initializes on a fresh page.
// Keep only the confirmed event name in memory until the provider is ready.
export function useConfirmedConversion() {
  const pending = useRef<ConfirmedConversion | null>(null)
  const record = useCallback((event: ConfirmedConversion) => {
    if (!hasAnalyticsConsent()) return
    pending.current = trackProductEvent(event) ? null : event
  }, [])

  useEffect(() => {
    const flush = () => {
      if (!hasAnalyticsConsent()) {
        pending.current = null
        return
      }
      if (pending.current && trackProductEvent(pending.current)) pending.current = null
    }
    window.addEventListener('skypro:analytics-ready', flush)
    window.addEventListener('skypro:consent-changed', flush)
    return () => {
      pending.current = null
      window.removeEventListener('skypro:analytics-ready', flush)
      window.removeEventListener('skypro:consent-changed', flush)
    }
  }, [])

  return record
}
