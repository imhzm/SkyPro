import type { MetadataRoute } from 'next'

const SITE_URL = 'https://skypro.skywaveads.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/dashboard',
          '/dashboard/',
          '/auth/callback',
          '/auth/verify-email',
          '/auth/reset-password',
        ],
      },
      {
        userAgent: ['GPTBot', 'CCBot', 'ClaudeBot', 'anthropic-ai', 'Google-Extended'],
        allow: '/',
        disallow: ['/admin', '/api', '/dashboard'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
