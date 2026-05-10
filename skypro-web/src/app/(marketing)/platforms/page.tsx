import { Metadata } from 'next'
import Image from 'next/image'
import { platformPages, getPlatformIds } from '@/data/platform-pages'
import { PlatformsListContent } from '@/components/marketing/PlatformsListContent'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { WhatsAppButton } from '@/components/marketing/WhatsAppButton'
import { CosmicBackground } from '@/components/marketing/CosmicBackground'

const SITE_URL = 'https://skypro.skywaveads.com'

export const metadata: Metadata = {
  title: 'المنصات المدعومة | SkyPro — 18+ منصة تسويق آلي بالذكاء الاصطناعي',
  description:
    'اكتشف 18+ منصة مدعومة في SkyPro لأتمتة التسويق: فيسبوك، واتساب، انستغرام، تويتر، لينكد إن، تيليجرام، تيك توك وأكثر. أدِر كل قنواتك من لوحة تحكم واحدة.',
  keywords: [
    'منصات تسويق آلي', 'تسويق فيسبوك', 'تسويق واتساب', 'تسويق انستغرام',
    'تسويق تويتر', 'تسويق لينكد إن', 'تسويق تيليجرام', 'تسويق تيك توك',
    'تسويق سناب شات', 'تسويق ريديت', 'تسويق بنترست', 'تسويق سوشيال ميديا',
    'SkyPro', 'Sky Wave', 'social media automation', 'multi-platform marketing',
  ],
  alternates: { canonical: `${SITE_URL}/platforms` },
  openGraph: {
    title: 'المنصات المدعومة | SkyPro — 18+ منصة في تطبيق واحد',
    description:
      'فيسبوك، واتساب، انستغرام، تويتر، تيك توك، لينكد إن وأكثر — كلها مدعومة في SkyPro بأتمتة ذكية وحماية كاملة من الحظر.',
    url: `${SITE_URL}/platforms`,
    siteName: 'SkyPro — Sky Wave',
    type: 'website',
  },
}

export default function PlatformsPage() {
  const ids = getPlatformIds()
  const pages = ids.map((id) => platformPages[id])

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'منصات SkyPro المدعومة',
    description: 'جميع المنصات المدعومة في SkyPro لأتمتة التسويق',
    numberOfItems: pages.length,
    itemListElement: pages.map((p, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `SkyPro لـ ${p.arabicName}`,
      url: `${SITE_URL}/platforms/${p.id}`,
    })),
  }

  const breadcrumbsLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'المنصات المدعومة', item: `${SITE_URL}/platforms` },
    ],
  }

  // CollectionPage schema (better than just ItemList for Google understanding)
  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/platforms#collection`,
    name: 'كل منصات SkyPro المدعومة',
    description: 'استكشف 18+ منصة تسويق آلي مدعومة في SkyPro.',
    url: `${SITE_URL}/platforms`,
    inLanguage: 'ar',
    isPartOf: { '@id': `${SITE_URL}#website` },
    mainEntity: { '@id': `${SITE_URL}/platforms#collection-list` },
    breadcrumb: { '@id': `${SITE_URL}/platforms#breadcrumb` },
  }

  return (
    <main className="relative">
      <CosmicBackground />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <Navbar />
      <section className="relative overflow-hidden pt-32 pb-16 bg-[#060d1b]">
        <div className="absolute inset-0">
          <Image
            src="/images/platforms-network.png"
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            className="h-full w-full object-cover opacity-[0.12]"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060d1bcc] via-[#060d1be6] to-[#060d1b]" />
        </div>
        
        {/* Animated Orbs */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 section-shell text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">المنصات <span className="gradient-text">المدعومة</span></h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            اختر المنصة المناسبة وابدأ أتمتة التسويق بذكاء أعلى وسرعة تنفيذ أكبر من لوحة تحكم واحدة.
          </p>
        </div>
      </section>
      <PlatformsListContent pages={pages} />
      <Footer />
      <WhatsAppButton />
    </main>
  )
}
