import { useEffect, useState } from 'react'

// Per-platform "background mode": when ON, that platform's browser launches
// headless (hidden) so automation runs without disturbing the user. Persisted
// in localStorage; the login calls read it FRESH at click-time via
// getBackgroundMode(), and the toggle UI (AccountCycleBanner) stays reactive
// via useBackgroundMode() — both share the same key so they never drift.
const KEY = (platform: string) => `skypro:bgMode:${platform}`

export function getBackgroundMode(platform: string): boolean {
  try {
    return JSON.parse(localStorage.getItem(KEY(platform)) || 'false') === true
  } catch {
    return false
  }
}

export function setBackgroundMode(platform: string, on: boolean): void {
  try {
    localStorage.setItem(KEY(platform), JSON.stringify(on))
    // Notify other hook instances in this tab (storage events don't fire for
    // same-document writes), so a toggle reflects everywhere immediately.
    window.dispatchEvent(new CustomEvent('skypro:bgmode', { detail: { platform, on } }))
  } catch {
    /* localStorage unavailable */
  }
}

export function useBackgroundMode(platform: string): [boolean, (on: boolean) => void] {
  const [on, setOn] = useState<boolean>(() => getBackgroundMode(platform))

  useEffect(() => {
    setOn(getBackgroundMode(platform))
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail && detail.platform === platform) setOn(detail.on)
    }
    window.addEventListener('skypro:bgmode', handler)
    return () => window.removeEventListener('skypro:bgmode', handler)
  }, [platform])

  return [on, (v: boolean) => setBackgroundMode(platform, v)]
}
