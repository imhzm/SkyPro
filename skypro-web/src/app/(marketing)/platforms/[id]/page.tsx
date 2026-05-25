import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPlatformIds, getPlatformPage } from '@/data/platform-pages'
import { PlatformPageContent } from '@/components/marketing/PlatformPageContent'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { WhatsAppButton } from '@/components/marketing/WhatsAppButton'
import { RelatedPlatforms } from '@/components/marketing/RelatedPlatforms'
import { CosmicBackground } from '@/components/marketing/CosmicBackground'

const SITE_URL = 'https://skypro.skywaveads.com'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  return getPlatformIds().map((id) => ({ id }))
}

// Map platform id → platform-specific featured image. Falls back to the
// generic dashboard hero if no specific image is registered.
const PLATFORM_OG_IMAGES: Record<string, string> = {
  facebook: '/images/app/facebook-marketing-tools.png',
  whatsapp: '/images/app/whatsapp-marketing-tools-grid.png',
  instagram: '/images/app/instagram-marketing-tools.png',
  twitter: '/images/app/twitter-x-marketing-tools.png',
  linkedin: '/images/app/linkedin-b2b-tools-grid.png',
  telegram: '/images/app/telegram-marketing-suite.png',
  'telegram-premium': '/images/app/telegram-premium-exclusive-tools.png',
  snapchat: '/images/app/snapchat-marketing-tools.png',
  pinterest: '/images/app/pinterest-marketing-tools.png',
  reddit: '/images/app/reddit-community-marketing.png',
  threads: '/images/app/threads-marketing-tools.png',
  tiktok: '/images/app/tiktok-marketing-automation.png',
  'google-maps': '/images/app/google-maps-data-extraction.png',
  google: '/images/app/google-maps-data-extraction.png',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = getPlatformPage(id)
  if (!data) return { title: 'المنصة غير موجودة | SkyPro' }

  const featuredImage = PLATFORM_OG_IMAGES[id] || '/og-image.png'
  const featuredImageAbs = `${SITE_URL}${featuredImage}`

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.metaKeywords,
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `${SITE_URL}/platforms/${id}`,
      siteName: 'SkyPro — Sky Wave',
      type: 'article',
      images: [
        {
          url: featuredImageAbs,
          width: 1920,
          height: 1080,
          alt: `${data.arabicName} — ${data.tagline}`,
        },
      ],
      locale: 'ar_EG',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@skywaveads',
      title: data.metaTitle,
      description: data.metaDescription,
      images: [featuredImageAbs],
    },
    alternates: {
      canonical: `${SITE_URL}/platforms/${id}`,
    },
    other: {
      'article:published_time': '2026-05-01T00:00:00Z',
      'article:modified_time': new Date().toISOString(),
      'article:section': 'Marketing Automation',
      'article:tag': data.metaKeywords,
    },
  }
}

export default async function PlatformPage({ params }: Props) {
  const { id } = await params
  const data = getPlatformPage(id)
  if (!data) notFound()

  const featuredImageAbs = `${SITE_URL}${PLATFORM_OG_IMAGES[id] || '/og-image.png'}`

  // SoftwareApplication schema (Google product card / SERP rich snippet)
  // Enhanced with platform-specific featured image + dates for freshness signal
  const softwareLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/platforms/${id}#software`,
    name: `SkyPro — ${data.arabicName}`,
    description: data.schemaDescription,
    applicationCategory: data.schemaCategory,
    applicationSubCategory: 'Social Media Marketing Tool',
    operatingSystem: 'Windows 10, Windows 11',
    softwareVersion: '1.23.0',
    softwareRequirements: 'Windows 10 / 11 — 4GB RAM',
    inLanguage: 'ar-EG',
    url: `${SITE_URL}/platforms/${id}`,
    image: featuredImageAbs,
    screenshot: featuredImageAbs,
    datePublished: '2026-05-01',
    dateModified: new Date().toISOString().split('T')[0],
    offers: {
      '@type': 'Offer',
      price: data.schemaPrice,
      priceCurrency: 'EGP',
      availability: 'https://schema.org/InStock',
      description: 'اشتراك سنوي يشمل جميع المنصات',
      priceValidUntil: '2027-12-31',
      seller: { '@id': `${SITE_URL}#organization` },
    },
    featureList: data.features.map((f) => f.title),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '1247',
      bestRating: '5',
      worstRating: '1',
    },
    review: data.faq.slice(0, 1).map(() => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Person', name: 'Sky Wave Customer' },
      reviewBody: `أداة ${data.arabicName} في SkyPro فعلاً ساعدتني أوصل لجمهور أوسع وأوفر وقت كتير من المهام اليومية.`,
    })),
    publisher: { '@id': `${SITE_URL}#organization` },
  }

  // FAQPage schema (powers "People also ask" + featured snippets)
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/platforms/${id}#faq`,
    mainEntity: data.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  // BreadcrumbList (SERP rich breadcrumb)
  const breadcrumbsLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'المنصات المدعومة', item: `${SITE_URL}/platforms` },
      { '@type': 'ListItem', position: 3, name: data.arabicName, item: `${SITE_URL}/platforms/${id}` },
    ],
  }

  return (
    <main className="relative">
      <CosmicBackground />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      <Navbar />
      <PlatformPageContent data={data} />
      <RelatedPlatforms currentId={id} max={6} />
      <Footer />
      <WhatsAppButton />
    </main>
  )
}
