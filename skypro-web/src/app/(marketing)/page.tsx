import type { Metadata } from 'next'
import { Navbar } from '@/components/marketing/Navbar'
import { HeroSection } from '@/components/marketing/HeroSection'
import { TrustedBySection } from '@/components/marketing/TrustedBySection'
import { FeaturesSection } from '@/components/marketing/FeaturesSection'
import { HowItWorksSection } from '@/components/marketing/HowItWorksSection'
import { TestimonialsSection } from '@/components/marketing/TestimonialsSection'
import { PricingSection } from '@/components/marketing/PricingSection'
import { FaqSection } from '@/components/marketing/FaqSection'
import { CtaSection } from '@/components/marketing/CtaSection'
import { SkyERPAdSection } from '@/components/marketing/SkyERPAdSection'
import { SkyCRMAdSection } from '@/components/marketing/SkyCRMAdSection'
import { Footer } from '@/components/marketing/Footer'
import { WhatsAppButton } from '@/components/marketing/WhatsAppButton'
import { platforms } from '@/data/platforms'

const SITE_URL = 'https://skypro.skywaveads.com'

export const metadata: Metadata = {
  title: 'SkyPro — منصة التسويق الآلي #1 عربياً | 18+ منصة بضغطة واحدة',
  description:
    'سرّع نموّك على 18+ منصة بدون أي خبرة تقنية. SkyPro من Sky Wave — استخراج بيانات، بث جماعي ذكي، وإدارة حسابات متعددة. وفّر 90% من وقتك. ثقة +10,000 شركة عربية.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'SkyPro — منصة التسويق الآلي #1 عربياً',
    description: 'سرّع نموّك على 18+ منصة بضغطة واحدة. وفّر 90% من وقتك. ثقة +10,000 شركة.',
    url: SITE_URL,
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SkyPro Homepage' }],
  },
}

const breadcrumbsLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: SITE_URL },
  ],
}

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'ما هو SkyPro؟',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'SkyPro هو منصة التسويق الآلي الأولى عربياً من Sky Wave. تتيح لك استخراج بيانات العملاء، إرسال رسائل جماعية، وإدارة حسابات متعددة على 18+ منصة تواصل اجتماعي بضغطة واحدة.',
      },
    },
    {
      '@type': 'Question',
      name: 'كم تستغرق التجربة المجانية؟',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'يمكنك تجربة SkyPro مجاناً لمدة يومين كاملين بدون الحاجة لبطاقة ائتمان. سجّل حسابك في دقائق وابدأ فوراً.',
      },
    },
    {
      '@type': 'Question',
      name: 'هل SkyPro آمن وقانوني؟',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'نعم. SkyPro يستخدم نظام حماية متقدم من الحظر، ولا ينتهك شروط استخدام المنصات. جميع بياناتك مشفّرة ومحمية وفقاً لمعايير GDPR.',
      },
    },
    {
      '@type': 'Question',
      name: 'هل أحتاج لخبرة تقنية لاستخدامه؟',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'لا، SkyPro مصمم بواجهة عربية بسيطة تماماً. لو تعرف تستخدم واتساب وفيسبوك، تقدر تستخدم SkyPro من اليوم الأول.',
      },
    },
    {
      '@type': 'Question',
      name: 'ما المنصات المدعومة؟',
      acceptedAnswer: {
        '@type': 'Answer',
        text: `يدعم SkyPro ${platforms.length}+ منصة منها: ${platforms.slice(0, 8).map(p => p.name).join('، ')}، وغيرها من المنصات الشهيرة.`,
      },
    },
  ],
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#060d1b]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Navbar />
      <HeroSection />
      <TrustedBySection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
      <SkyERPAdSection />
      <SkyCRMAdSection />
      <Footer />
      <WhatsAppButton />
    </main>
  )
}
