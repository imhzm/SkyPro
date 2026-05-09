import type { MetadataRoute } from 'next'
import { getPlatformIds } from '@/data/platform-pages'

const SITE_URL = 'https://skypro.skywaveads.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,           lastModified: now, changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${SITE_URL}/platforms`,  lastModified: now, changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${SITE_URL}/privacy`,    lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/terms`,      lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/auth/login`, lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${SITE_URL}/auth/register`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
  ]

  const platformRoutes: MetadataRoute.Sitemap = getPlatformIds().map((id) => ({
    url: `${SITE_URL}/platforms/${id}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...platformRoutes]
}
