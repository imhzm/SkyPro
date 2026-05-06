import { Metadata } from 'next'
import Image from 'next/image'
import { platformPages, getPlatformIds } from '@/data/platform-pages'
import { PlatformsListContent } from '@/components/marketing/PlatformsListContent'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { WhatsAppButton } from '@/components/marketing/WhatsAppButton'

export const metadata: Metadata = {
  title: 'المنصات المدعومة | سيندر برو — 18+ منصة تسويق آلي',
  description: 'استكشف 18+ منصة مدعومة في سيندر برو: فيسبوك، واتساب، انستغرام، تويتر، لينكد إن، تيليجرام والمزيد. أتمت حملاتك التسويقية على كل المنصات.',
  keywords: 'منصات تسويق آلي, فيسبوك, واتساب, انستغرام, تويتر, لينكد إن, تيليجرام, تيك توك, سيندر برو',
  openGraph: {
    title: 'المنصات المدعومة | سيندر برو',
    description: '18+ منصة تسويق آلي في مكان واحد',
    url: 'https://skypro.skywaveads.com/platforms',
    siteName: 'سيندر برو — Sky Wave',
    type: 'website',
  },
}

export default function PlatformsPage() {
  const ids = getPlatformIds()
  const pages = ids.map((id) => platformPages[id])

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'منصات سيندر برو المدعومة',
    description: 'جميع المنصات المدعومة في سيندر برو لأتمتة التسويق',
    numberOfItems: pages.length,
    itemListElement: pages.map((p, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: `سيندر برو - ${p.arabicName}`,
      url: `https://skypro.skywaveads.com/platforms/${p.id}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <section className="relative overflow-hidden pt-28 pb-10 bg-[#060d1b]">
        <div className="absolute inset-0">
          <Image
            src="https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?auto=compress&cs=tinysrgb&w=1800"
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            className="h-full w-full object-cover opacity-[0.18]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060d1bcc] via-[#060d1be6] to-[#060d1b]" />
        </div>
        <div className="relative section-shell">
          <h1 className="text-3xl sm:text-5xl font-bold text-white text-center">المنصات المدعومة</h1>
          <p className="text-slate-300 mt-3 text-center max-w-2xl mx-auto">
            اختر المنصة المناسبة وابدأ أتمتة التسويق بذكاء أعلى وسرعة تنفيذ أكبر.
          </p>
        </div>
      </section>
      <PlatformsListContent pages={pages} />
      <Footer />
      <WhatsAppButton />
    </>
  )
}
