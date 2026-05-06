import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'سيندر برو — تسويق آلي احترافي | Sky Wave',
  description: 'أقوى أداة تسويق آلي في الشرق الأوسط. أتمت حملاتك على فيسبوك، واتساب، انستغرام، تويتر وغيرها. استخراج بيانات، إرسال جماعي، إدارة حسابات متعددة.',
  keywords: 'تسويق آلي, سوشيال ميديا, فيسبوك, واتساب, انستغرام, تويتر, لينكد إن, تيليجرام, E-marketing, sender pro, سيندر برو',
  openGraph: {
    title: 'سيندر برو — تسويق آلي احترافي | 18+ منصة',
    description: 'أقوى أداة تسويق آلي لـ 18+ منصة تواصل اجتماعي',
    url: 'https://skypro.skywaveads.com',
    siteName: 'سيندر برو — Sky Wave',
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'سيندر برو — تسويق آلي احترافي',
    description: 'أقوى أداة تسويق آلي لـ 18+ منصة تواصل اجتماعي',
  },
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-cairo antialiased bg-[#060d1b] text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}