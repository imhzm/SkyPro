import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'استعادة كلمة المرور — SkyPro',
  description: 'نسيت كلمة مرورك؟ أدخل بريدك الإلكتروني وسنرسل لك رابط استعادة آمن خلال دقائق.',
  alternates: { canonical: '/auth/forgot-password' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'استعادة كلمة المرور | SkyPro',
    description: 'استعد وصولك لحسابك في SkyPro خلال دقائق.',
    url: 'https://skypro.skywaveads.com/auth/forgot-password',
    type: 'website',
  },
}

export default function ForgotLayout({ children }: { children: React.ReactNode }) {
  return children
}
