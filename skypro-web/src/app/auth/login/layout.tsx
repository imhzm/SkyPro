import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'تسجيل الدخول إلى SkyPro',
  description:
    'سجّل دخولك إلى حسابك في SkyPro — منصة التسويق الآلي #1 عربياً. أدر حملاتك على 18+ منصة من لوحة تحكم واحدة.',
  alternates: { canonical: '/auth/login' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'تسجيل الدخول | SkyPro',
    description: 'ادخل إلى حسابك في SkyPro لإدارة حملاتك التسويقية.',
    url: 'https://skypro.skywaveads.com/auth/login',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'SkyPro Login' }],
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
