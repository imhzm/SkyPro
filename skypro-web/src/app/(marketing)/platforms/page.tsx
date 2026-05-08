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
    </>
  )
}
