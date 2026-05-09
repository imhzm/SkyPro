import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'الشروط والأحكام',
  description:
    'الشروط والأحكام الكاملة لاستخدام منصة SkyPro من Sky Wave: شروط الاشتراك، الدفع، الاسترداد، الاستخدام المسموح، الملكية الفكرية، حدود المسؤولية، والقانون المعتمد.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'الشروط والأحكام | SkyPro',
    description: 'شروط استخدام SkyPro — الاشتراك، الدفع، الاسترداد، والاستخدام المسموح.',
    url: 'https://skypro.skywaveads.com/terms',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SkyPro Terms of Service' }],
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
