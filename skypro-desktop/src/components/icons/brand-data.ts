import {
  siFacebook,
  siWhatsapp,
  siInstagram,
  siX,
  siTelegram,
  siSnapchat,
  siPinterest,
  siReddit,
  siTiktok,
  siThreads,
  siGoogle,
  siGmail,
} from 'simple-icons'

/* ============================================================
   Brand data — official platform marks & colors.
   All paths are 24×24 (simple-icons normalized). LinkedIn was
   delisted from simple-icons, so its classic mark is inlined.
   ============================================================ */

// Classic LinkedIn 24×24 mark (pre-delisting path, used app-wide on the web).
const LINKEDIN_PATH =
  'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z'

// Four-point sparkle for Telegram Premium (premium ✦ mark in the sidebar).
const SPARKLE_PATH =
  'M12 1.5l2.59 7.91L22.5 12l-7.91 2.59L12 22.5l-2.59-7.91L1.5 12l7.91-2.59z'

export interface BrandDef {
  /** 24×24 SVG path of the official mark. */
  path: string
  /** Brand color used by the `color` variant. */
  color: string
  /** Optional gradient (Instagram) — overrides `color` fill. */
  gradient?: [string, string, string]
  /** Official multicolor mark renderer key (Google). */
  multicolor?: 'google'
}

export const BRANDS: Record<string, BrandDef> = {
  facebook:           { path: siFacebook.path,  color: '#1877F2' },
  whatsapp:           { path: siWhatsapp.path,  color: '#25D366' },
  instagram:          { path: siInstagram.path, color: '#E4405F', gradient: ['#F9CE34', '#EE2A7B', '#6228D7'] },
  twitter:            { path: siX.path,         color: '#FFFFFF' },             // X — white on night theme
  linkedin:           { path: LINKEDIN_PATH,    color: '#0A66C2' },
  telegram:           { path: siTelegram.path,  color: '#2AABEE' },
  'telegram-premium': { path: SPARKLE_PATH,     color: '#FBBF24' },             // premium ✦ gold
  snapchat:           { path: siSnapchat.path,  color: '#FFFC00' },
  pinterest:          { path: siPinterest.path, color: '#E60023' },
  reddit:             { path: siReddit.path,    color: '#FF4500' },
  tiktok:             { path: siTiktok.path,    color: '#FE2C55' },
  threads:            { path: siThreads.path,   color: '#FFFFFF' },             // Threads — white on night theme
  google:             { path: siGoogle.path,    color: '#4285F4', multicolor: 'google' },
  'send-emails':      { path: siGmail.path,     color: '#EA4335' },
}

/** Brand color per platform id — for KPI chips, donut legends, glows. */
export const BRAND_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(BRANDS).map(([id, def]) => [id, def.color]),
)

export function hasBrandIcon(platformId: string): boolean {
  return platformId in BRANDS
}
