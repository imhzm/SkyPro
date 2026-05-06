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
      <section className="relative overflow-hidden pt-24 pb-8 bg-[#060d1b]">
        <div className="absolute inset-0">
          <Image
            src="https://images.pexels.com/photos/7681098/pexels-photo-7681098.jpeg?auto=compress&cs=tinysrgb&w=1800"
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            className="h-full w-full object-cover opacity-[0.16]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060d1bcc] via-[#060d1be8] to-[#060d1b]" />
        </div>
        <div className="relative section-shell text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-white">{data.arabicName}</h1>
          <p className="mt-3 text-slate-300 max-w-2xl mx-auto">{data.schemaDescription}</p>
        </div>
      </section>
      <PlatformPageContent data={data} />
      <Footer />
      <WhatsAppButton />
    </>
  )
}
