import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'سياسة الخصوصية',
  description:
    'سياسة الخصوصية الكاملة لمنصة SkyPro من Sky Wave: ما البيانات التي نجمعها، كيف نستخدمها، حقوقك (GDPR)، الاحتفاظ بالبيانات، الجهات الفرعية، وكيفية حذف بياناتك.',
  alternates: { canonical: '/privacy' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'سياسة الخصوصية | SkyPro',
    description: 'كيف نحمي بياناتك في SkyPro — حقوقك (GDPR) والاحتفاظ والجهات الفرعية.',
    url: 'https://skypro.skywaveads.com/privacy',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SkyPro Privacy Policy' }],
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
