import { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPlatformIds, getPlatformPage } from '@/data/platform-pages'
import { PlatformPageContent } from '@/components/marketing/PlatformPageContent'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { WhatsAppButton } from '@/components/marketing/WhatsAppButton'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  return getPlatformIds().map((id) => ({ id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const data = getPlatformPage(id)
  if (!data) return { title: 'المنصة غير موجودة | سيندر برو' }

  return {
    title: data.metaTitle,
    description: data.metaDescription,
    keywords: data.metaKeywords,
    openGraph: {
      title: data.metaTitle,
      description: data.metaDescription,
      url: `https://skypro.skywaveads.com/platforms/${id}`,
      siteName: 'سيندر برو — Sky Wave',
      type: 'website',
    },
    alternates: {
      canonical: `https://skypro.skywaveads.com/platforms/${id}`,
    },
  }
}

export default async function PlatformPage({ params }: Props) {
  const { id } = await params
  const data = getPlatformPage(id)
  if (!data) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `سيندر برو — ${data.arabicName}`,
    description: data.schemaDescription,
    applicationCategory: data.schemaCategory,
    operatingSystem: 'Windows',
    offers: {
      '@type': 'Offer',
      price: data.schemaPrice,
      priceCurrency: 'EGP',
      description: 'اشتراك سنوي',
    },
    featureList: data.features.map((f) => f.title),
    url: `https://skypro.skywaveads.com/platforms/${id}`,
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: data.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Navbar />

      <PlatformPageContent data={data} />
      <Footer />
      <WhatsAppButton />
    </>
  )
}
