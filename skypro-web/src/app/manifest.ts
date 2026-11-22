import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SkyPro',
    short_name: 'SkyPro',
    description: 'أدوات Sky Pro لإدارة حسابات المنصات وتنظيم البيانات والرسائل من برنامج Windows بواجهة عربية. جرّب البرنامج مجانًا لمدة يومين.',
    start_url: '/',
    display: 'standalone',
    background_color: '#060d1b',
    theme_color: '#0A6CF1',
    orientation: 'portrait-primary',
    lang: 'ar',
    dir: 'rtl',
    categories: ['business', 'productivity', 'marketing', 'social'],
    icons: [
      { src: '/favicon.ico',                  sizes: '16x16 32x32', type: 'image/x-icon' },
      { src: '/images/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/images/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/images/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/images/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/images/apple-touch-icon.png',  sizes: '180x180', type: 'image/png' },
    ],
  }
}
