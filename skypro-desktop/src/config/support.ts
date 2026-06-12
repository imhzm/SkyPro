// Centralized support / contact channels for SkyPro desktop.
// Kept in sync with the web portal (skypro.skywaveads.com) so customers reach the same team.

export const SUPPORT = {
  whatsappNumber: '201067894321',
  whatsappUrl: 'https://wa.me/201067894321',
  email: 'admin@skywaveads.com',
  website: 'https://skypro.skywaveads.com',
} as const

/** WhatsApp deep link with an optional pre-filled message. */
export function whatsappLink(prefill?: string): string {
  return prefill ? `${SUPPORT.whatsappUrl}?text=${encodeURIComponent(prefill)}` : SUPPORT.whatsappUrl
}

/** mailto: link with an optional subject (opens the user's mail client via the main process). */
export function emailLink(subject?: string): string {
  const base = `mailto:${SUPPORT.email}`
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base
}

/**
 * Open an external support URL. In Electron this routes through the main process'
 * window-open handler (shell.openExternal), which only permits https:/mailto:.
 */
export function openExternal(url: string): void {
  try {
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch {
    // no-op: external open is best-effort
  }
}
