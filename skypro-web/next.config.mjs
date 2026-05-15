/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production'

// ──────────────────────────────────────────────────────────────────────────────
// Content-Security-Policy — strict by default with explicit allowlists for the
// known third parties (Google Fonts, Google Analytics, Plausible, lucide CDN
// nope — we self-host icons, etc.).
// ──────────────────────────────────────────────────────────────────────────────
const csp = [
  "default-src 'self'",
  // Scripts: self + inline (Next.js needs it for hydration scripts) + GA4 + Plausible
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://www.google-analytics.com https://plausible.io https://*.plausible.io`,
  "script-src-elem 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://plausible.io https://*.plausible.io",
  // Styles: self + inline (Tailwind injects them) + Google Fonts CSS
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts: self + Google Fonts CDN + data URIs (for icon fonts)
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images: self + data URIs (used by lucide) + blob (uploads) + https (avatars from Google etc.)
  "img-src 'self' data: blob: https:",
  // Network connections: self + GA + Plausible (for analytics beacons) + WebSocket dev
  `connect-src 'self' https://www.google-analytics.com https://plausible.io https://*.plausible.io https://downloads.skywaveads.com ${isDev ? 'ws://localhost:* http://localhost:*' : ''}`.trim(),
  // Frames: none (no embedding allowed)
  "frame-src 'none'",
  "frame-ancestors 'none'",
  // Form actions: only same-origin (prevents CSRF via form submission)
  "form-action 'self'",
  // Plugins: none (no Flash, no Java)
  "object-src 'none'",
  // Base tag must be self
  "base-uri 'self'",
  // Workers: self only
  "worker-src 'self' blob:",
  // Manifest: self
  "manifest-src 'self'",
  // Media: self (no remote videos/audio)
  "media-src 'self'",
  // Force HTTPS in production
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: csp,
  },
  // HSTS — force HTTPS for 2 years, include subdomains, preload-eligible
  ...(isDev ? [] : [{
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  }]),
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=(), payment=(self)' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // Remove Server fingerprint header
  { key: 'Server', value: 'SkyPro' },
]

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,
  images: {
    remotePatterns: [
      // Allow Google avatar images (for OAuth profiles)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        // Apply to ALL routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Extra-strict cookie scoping for auth callbacks (prevent CSRF on /api/auth)
        source: '/api/auth/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      {
        // Prevent caching of sensitive admin/dashboard responses
        source: '/api/admin/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'private, no-store, no-cache, must-revalidate, max-age=0' },
        ],
      },
      {
        // Public static assets — long cache + immutable
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
}

export default nextConfig
