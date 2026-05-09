import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'سياسة الإفصاح الأمني',
  description: 'كيف تبلّغ عن ثغرة أمنية في SkyPro بشكل مسؤول.',
  alternates: { canonical: '/security/policy' },
  robots: { index: true, follow: true },
}

export default function SecurityPolicyPage() {
  return (
    <main className="min-h-screen bg-[#060d1b] py-20 px-4" dir="rtl">
      <article className="max-w-3xl mx-auto prose-legal text-slate-300">
        <h1 className="text-3xl font-bold text-white mb-3">سياسة الإفصاح الأمني المسؤول</h1>
        <p className="text-slate-400 mb-8">
          نقدّر مساعدة الباحثين الأمنيين في الحفاظ على أمان SkyPro. اتبع هذه الإرشادات لإبلاغنا عن الثغرات.
        </p>

        <h2>كيف تبلّغ عن ثغرة</h2>
        <ul>
          <li>
            البريد الإلكتروني المخصص:{' '}
            <a href="mailto:security@skywaveads.com" className="text-sky-400">security@skywaveads.com</a>
          </li>
          <li>زوّدنا بخطوات إعادة الإنتاج، URL، وأي screenshots/POC.</li>
          <li>إن أمكن، شفّر رسالتك بـ PGP.</li>
        </ul>

        <h2>ما الذي ندعمه</h2>
        <ul>
          <li>ثغرات XSS، SQL injection، CSRF، authorization bypass</li>
          <li>تسرب بيانات أو معلومات حساسة</li>
          <li>اختراق حسابات أو session takeover</li>
          <li>كشف ثغرات في الـ APIs أو الـ webhooks</li>
        </ul>

        <h2>ما الذي خارج النطاق</h2>
        <ul>
          <li>هجمات DoS / DDoS (نتعامل معها بشكل منفصل)</li>
          <li>ثغرات تتطلب وصولاً فعلياً لجهاز المستخدم</li>
          <li>هجمات social engineering</li>
          <li>تقارير من ماسحات تلقائية بدون POC حقيقي</li>
        </ul>

        <h2>التزاماتنا تجاهك</h2>
        <ul>
          <li>الرد خلال <strong>72 ساعة</strong> من استلام التقرير</li>
          <li>تحديث منتظم خلال عملية الإصلاح</li>
          <li>الاعتراف العلني (مع موافقتك) في{' '}
            <a href="/security/hall-of-fame" className="text-sky-400">صفحة شُكر الباحثين</a>
          </li>
          <li>عدم اتخاذ أي إجراء قانوني ضد الباحثين الذين يلتزمون بهذه السياسة</li>
        </ul>

        <h2>المهلة قبل الإفصاح العلني</h2>
        <p>
          نطلب <strong>90 يوماً</strong> على الأقل من تاريخ التقرير قبل الإفصاح العلني، أو حتى نُصدر إصلاحاً
          (أيهما أقرب).
        </p>

        <p className="mt-8 text-slate-500 text-sm">
          آخر تحديث: ١٠ مايو ٢٠٢٦
        </p>
      </article>
    </main>
  )
}
