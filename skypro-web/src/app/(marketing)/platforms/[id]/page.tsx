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
      <section className="relative overflow-hidden pt-32 pb-16 bg-[#060d1b]">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-background.png"
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            className="h-full w-full object-cover opacity-[0.12]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060d1bcc] via-[#060d1be8] to-[#060d1b]" />
        </div>
        
        {/* Animated Orbs */}
        <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 section-shell text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 text-[12px] font-semibold text-sky-400 mb-6">
            منصة مدعومة
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            <span className="gradient-text">{data.arabicName}</span>
          </h1>
          <p className="mt-3 text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {data.schemaDescription}
          </p>
        </div>
      </section>
      <PlatformPageContent data={data} />
      <Footer />
      <WhatsAppButton />
    </>
  )
}
