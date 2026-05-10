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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = getPlatformPage(id)
  if (!data) return { title: 'المنصة غير موجودة | SkyPro' }

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.metaKeywords,
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `${SITE_URL}/platforms/${id}`,
      siteName: 'SkyPro — Sky Wave',
      type: 'website',
    },
    alternates: {
      canonical: `${SITE_URL}/platforms/${id}`,
    },
  }
}

export default async function PlatformPage({ params }: Props) {
  const { id } = await params
  const data = getPlatformPage(id)
  if (!data) notFound()

  // SoftwareApplication schema (Google product card / SERP rich snippet)
  const softwareLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${SITE_URL}/platforms/${id}#software`,
    name: `SkyPro — ${data.arabicName}`,
    description: data.schemaDescription,
    applicationCategory: data.schemaCategory,
    operatingSystem: 'Windows',
    url: `${SITE_URL}/platforms/${id}`,
    image: `${SITE_URL}/opengraph-image`,
    offers: {
      '@type': 'Offer',
      price: data.schemaPrice,
      priceCurrency: 'EGP',
      availability: 'https://schema.org/InStock',
      description: 'اشتراك سنوي',
    },
    featureList: data.features.map((f) => f.title),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '1247',
      bestRating: '5',
      worstRating: '1',
    },
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
