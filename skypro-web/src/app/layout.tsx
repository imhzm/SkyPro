import type { Metadata, Viewport } from 'next'
import './globals.css'
import { CookieBanner } from '@/components/marketing/CookieBanner'
import { Analytics } from '@/components/analytics/Analytics'

const SITE_URL = 'https://skypro.skywaveads.com'
const SITE_NAME = 'SkyPro'
const PUBLISHER = 'Sky Wave'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: 'SkyPro — منصة التسويق الآلي #1 عربياً | Sky Wave',
    template: '%s | SkyPro',
  },
  description:
    'SkyPro — الجيل الجديد من التسويق الآلي. استخراج بيانات العملاء، بث جماعي ذكي، وإدارة حسابات متعددة على 18+ منصة بضغطة واحدة. ثقة +10,000 شركة عربية. منتج Sky Wave.',
  keywords: [
    'SkyPro', 'تسويق آلي', 'سوشيال ميديا',
    'فيسبوك', 'واتساب', 'انستغرام', 'تويتر', 'لينكد إن', 'تيليجرام', 'تيك توك',
    'استخراج بيانات', 'بث جماعي', 'إدارة حسابات', 'حملات تسويقية',
    'Sky Wave', 'تسويق رقمي', 'أتمتة التسويق', 'AI marketing',
  ],
  authors: [{ name: 'Sky Wave', url: 'https://www.skywaveads.com' }],
  creator: PUBLISHER,
  publisher: PUBLISHER,
  category: 'Business / Marketing Software',
  alternates: {
    canonical: '/',
    languages: { 'ar-EG': '/' },
  },
  openGraph: {
    title: 'SkyPro — منصة التسويق الآلي #1 عربياً',
    description:
      'أتمت تسويقك على 18+ منصة بضغطة واحدة. استخراج بيانات، بث جماعي، إدارة حسابات متعددة — بقوة الذكاء الاصطناعي.',
    url: SITE_URL,
    siteName: `${SITE_NAME} — ${PUBLISHER}`,
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SkyPro — منصة التسويق الآلي على 18+ منصة، منتج Sky Wave',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@skywaveads',
    creator: '@skywaveads',
    title: 'SkyPro — منصة التسويق الآلي #1 عربياً',
    description: 'أتمت تسويقك على 18+ منصة بضغطة واحدة. منتج Sky Wave.',
    images: ['/twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '512x512' },
      { url: '/images/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/images/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/images/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/favicon.png',
  },
  manifest: '/manifest.webmanifest',
  formatDetection: { email: false, address: false, telephone: false },
  referrer: 'strict-origin-when-cross-origin',
  verification: {
    // Add your Google/Bing site verification tokens here when available:
    // google: 'XXXXXXXXXXXXXXXXXXXXXXXXX',
    // yandex: 'XXXXXXXXXX',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0A6CF1' },
    { media: '(prefers-color-scheme: dark)',  color: '#060d1b' },
  ],
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}#organization`,
  name: 'Sky Wave',
  alternateName: 'Sky Wave for Digital Marketing',
  url: 'https://www.skywaveads.com',
  logo: `${SITE_URL}/og-image.png`,
  email: 'admin@skywaveads.com',
  telephone: '+201067894321',
  description:
    'وكالة Sky Wave للتسويق الرقمي ومطوّر منصة SkyPro للتسويق الآلي. شريك Meta المعتمد ومتخصصون في حلول الذكاء الاصطناعي للأعمال في مصر والخليج.',
  foundingDate: '2024',
  areaServed: ['EG', 'SA', 'AE', 'KW', 'QA', 'OM', 'BH'],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+201067894321',
      contactType: 'customer support',
      email: 'admin@skywaveads.com',
      availableLanguage: ['Arabic', 'English'],
      areaServed: ['EG', 'SA', 'AE'],
    },
  ],
  sameAs: [
    'https://www.skywaveads.com',
    'https://wa.me/201067894321',
  ],
}

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}#website`,
  name: SITE_NAME,
  alternateName: 'منصة SkyPro للتسويق الآلي',
  url: SITE_URL,
  description:
    'SkyPro — أتمت تسويقك على 18+ منصة. استخراج بيانات، بث جماعي، إدارة حسابات متعددة بضغطة واحدة.',
  inLanguage: 'ar-EG',
  publisher: { '@id': `${SITE_URL}#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/platforms?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}#software`,
  name: 'SkyPro',
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Marketing Automation',
  operatingSystem: 'Windows 10/11',
  url: SITE_URL,
  downloadUrl: `${SITE_URL}/auth/register`,
  description:
    'تطبيق SkyPro للتسويق الآلي على 18+ منصة (فيسبوك، واتساب، انستغرام، تيليجرام، لينكد إن، تيك توك، تويتر، وغيرها). استخراج بيانات، بث جماعي، إدارة حسابات متعددة، نظام حماية من الحظر.',
  inLanguage: 'ar',
  publisher: { '@id': `${SITE_URL}#organization` },
  offers: {
    '@type': 'Offer',
    price: '2000',
    priceCurrency: 'EGP',
    availability: 'https://schema.org/InStock',
    description: 'اشتراك سنوي — تجربة مجانية يومين',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '10000',
    bestRating: '5',
    worstRating: '1',
  },
  featureList: [
    'استخراج بيانات العملاء من 18+ منصة',
    'بث جماعي معتمد بدون حظر',
    'إدارة حسابات متعددة في وقت واحد',
    'جدولة الحملات التسويقية',
    'تقارير وتحليلات تفصيلية',
    'ذكاء اصطناعي للأتمتة',
    'دعم عربي 24/7',
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://wa.me" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
        />
      </head>
      <body className="font-cairo antialiased bg-[#060d1b] text-white min-h-screen">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:right-3 focus:z-[100] focus:bg-sky-500 focus:text-white focus:px-4 focus:py-2 focus:rounded-xl focus:font-semibold">
          تخطّى إلى المحتوى الرئيسي
        </a>
        <div id="main-content">
          {children}
        </div>
        <CookieBanner />
        <Analytics />
      </body>
    </html>
  )
}
