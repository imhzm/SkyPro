import { Metadata } from 'next'
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
      <PlatformsListContent pages={pages} />
      <Footer />
      <WhatsAppButton />
    </main>
  )
}
