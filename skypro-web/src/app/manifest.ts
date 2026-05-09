import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SkyPro — منصة التسويق الآلي على 18+ منصة',
    short_name: 'SkyPro',
    description: 'منصة التسويق الآلي رقم 1 عربياً — استخراج بيانات، بث جماعي، وإدارة حسابات على 18+ منصة بضغطة واحدة.',
    start_url: '/',
    display: 'standalone',
    background_color: '#060d1b',
    theme_color: '#0A6CF1',
    orientation: 'portrait-primary',
    lang: 'ar',
    dir: 'rtl',
    categories: ['business', 'productivity', 'marketing', 'social'],
    icons: [
      { src: '/favicon.ico',                  sizes: 'any',     type: 'image/x-icon' },
      { src: '/images/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/images/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/images/icon-192.png',          sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/images/icon-512.png',          sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/images/apple-touch-icon.png',  sizes: '180x180', type: 'image/png' },
    ],
  }
}
