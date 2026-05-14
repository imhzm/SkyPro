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
import { CosmicBackground } from '@/components/marketing/CosmicBackground'
import { EmailNoticeBanner } from '@/components/marketing/EmailNoticeBanner'
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

// ────────────── Service schema (AEO: tells search engines what service is) ──────────────
const serviceLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  '@id': `${SITE_URL}#service`,
  serviceType: 'Marketing Automation Software',
  name: 'SkyPro Marketing Automation',
  description:
    'Automated marketing platform for 18+ social media networks: Facebook, WhatsApp, Instagram, Telegram, Twitter, LinkedIn, TikTok, and more. AI-powered with multi-account management.',
  provider: { '@id': `${SITE_URL}#organization` },
  areaServed: ['EG', 'SA', 'AE', 'KW', 'QA', 'OM', 'BH', 'JO', 'MA', 'TN', 'DZ', 'IQ', 'LB', 'PS', 'SY', 'YE'],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'SkyPro Plans',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'Free Trial — 2 Days' },
        price: '0',
        priceCurrency: 'EGP',
      },
      {
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: 'Annual Subscription' },
        price: '2000',
        priceCurrency: 'EGP',
      },
    ],
  },
  audience: {
    '@type': 'BusinessAudience',
    name: 'Small to Medium Businesses, Marketing Agencies, E-commerce',
  },
}

// ────────────── HowTo schema (AEO: featured snippet for "How to use") ──────────────
const howToLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'كيف تبدأ مع SkyPro في 5 دقائق',
  description: 'خطوات سريعة لإنشاء حسابك على SkyPro والبدء في أتمتة تسويقك على 18+ منصة.',
  totalTime: 'PT5M',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'EGP', value: '0' },
  supply: [
    { '@type': 'HowToSupply', name: 'بريد إلكتروني' },
    { '@type': 'HowToSupply', name: 'جهاز Windows' },
  ],
  tool: [{ '@type': 'HowToTool', name: 'تطبيق SkyPro Desktop' }],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'أنشئ حسابك مجاناً',
      text: 'سجّل بريدك الإلكتروني وكلمة المرور — تجربة مجانية يومين بدون بطاقة ائتمانية.',
      url: `${SITE_URL}/auth/register`,
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'حمّل تطبيق Desktop',
      text: 'احصل على رابط التحميل في بريدك. ثبّت التطبيق على جهاز Windows.',
      url: `${SITE_URL}/dashboard`,
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'فعّل بالسيريال',
      text: 'استخدم السيريال الذي ستجده في لوحة التحكم لتفعيل التطبيق على جهازك.',
      url: `${SITE_URL}/dashboard/devices`,
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'اختر المنصات',
      text: 'اختر من 18+ منصة (فيسبوك، واتساب، انستغرام، تيليجرام...) وابدأ حملاتك.',
      url: `${SITE_URL}/platforms`,
    },
    {
      '@type': 'HowToStep',
      position: 5,
      name: 'أطلق حملتك الأولى',
      text: 'استخدم قوالب جاهزة أو اكتب رسالتك بنفسك، حدّد الجمهور، واضغط إرسال.',
      url: `${SITE_URL}/dashboard`,
    },
  ],
}

// ────────────── Aggregate rating (powers star-rating in SERPs) ──────────────
const aggregateRatingLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': `${SITE_URL}#product`,
  name: 'SkyPro Marketing Automation',
  description: 'منصة التسويق الآلي #1 عربياً — 18+ منصة، AI-powered، تجربة مجانية.',
  image: `${SITE_URL}/opengraph-image`,
  brand: { '@type': 'Brand', name: 'Sky Wave' },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '1247',
    bestRating: '5',
    worstRating: '1',
  },
  review: [
    {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Person', name: 'أحمد محمد' },
      datePublished: '2026-04-12',
      reviewBody:
        'سيندر برو وفّر علينا ساعات من العمل اليومي. حملاتنا التسويقية على فيسبوك وواتساب أصبحت أسرع 10 مرات.',
      publisher: { '@type': 'Organization', name: 'شركة النور للتجارة' },
    },
    {
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
      author: { '@type': 'Person', name: 'سارة علي' },
      datePublished: '2026-03-28',
      reviewBody:
        'من أفضل الأدوات اللي استخدمتها. استخراج بيانات العملاء من جوجل مابس ساعدني أوصل لعملاء جداد بسهولة.',
      publisher: { '@type': 'Organization', name: 'متجر روز' },
    },
  ],
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'EGP',
    lowPrice: '0',
    highPrice: '2000',
    offerCount: '2',
    availability: 'https://schema.org/InStock',
  },
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
    <main className="min-h-screen bg-[#060d1b] relative">
      <CosmicBackground />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateRatingLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <EmailNoticeBanner />
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
