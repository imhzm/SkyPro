import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'سجّل مجاناً في SkyPro — تجربة يومين بدون بطاقة',
  description:
    'أنشئ حسابك في SkyPro مجاناً وابدأ تجربتك لمدة يومين بدون بطاقة ائتمان. تسويق آلي على 18+ منصة، استخراج بيانات، وبث جماعي.',
  alternates: { canonical: '/auth/register' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'سجّل مجاناً في SkyPro',
    description: 'تجربة مجانية يومين — بدون بطاقة ائتمان. ابدأ في 5 دقائق.',
    url: 'https://skypro.skywaveads.com/auth/register',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SkyPro Sign Up' }],
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children
}
