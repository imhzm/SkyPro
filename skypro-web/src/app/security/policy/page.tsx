import { publicMetadata } from "@/data/site-metadata";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

export const metadata = publicMetadata(
  "/security/policy",
  "سياسة الإفصاح الأمني | Sky Pro",
  "إرشادات الإبلاغ المسؤول عن الثغرات في Sky Pro ونطاق التقارير والتواصل مع فريق الأمان.",
);

export default function SecurityPolicyPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-page py-20 px-4" dir="rtl">
        <article className="max-w-3xl mx-auto prose-legal text-muted">
          <h1 className="text-3xl font-bold text-foreground mb-3">
            سياسة الإفصاح الأمني المسؤول
          </h1>
          <p className="text-muted mb-8">
            نقدّر مساعدة الباحثين الأمنيين في الحفاظ على أمان SkyPro. اتبع هذه
            الإرشادات لإبلاغنا عن الثغرات.
          </p>

          <h2>كيف تبلّغ عن ثغرة</h2>
          <ul>
            <li>
              البريد الإلكتروني المخصص:{" "}
              <a href="mailto:security@skywaveads.com" className="text-brand">
                security@skywaveads.com
              </a>
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
            <li>
              الرد خلال <strong>72 ساعة</strong> من استلام التقرير
            </li>
            <li>تحديث منتظم خلال عملية الإصلاح</li>
            <li>
              الاعتراف العلني (مع موافقتك) في{" "}
              <a href="/security/hall-of-fame" className="text-brand">
                صفحة شُكر الباحثين
              </a>
            </li>
            <li>
              عدم اتخاذ أي إجراء قانوني ضد الباحثين الذين يلتزمون بهذه السياسة
            </li>
          </ul>

          <h2>المهلة قبل الإفصاح العلني</h2>
          <p>
            نطلب <strong>90 يوماً</strong> على الأقل من تاريخ التقرير قبل
            الإفصاح العلني، أو حتى نُصدر إصلاحاً (أيهما أقرب).
          </p>

          <p className="mt-8 text-slate-500 text-sm">آخر تحديث: ١٠ مايو ٢٠٢٦</p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
