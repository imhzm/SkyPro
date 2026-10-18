import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
const url = "https://skypro.skywaveads.com/security/hall-of-fame";
const title = "شكر الباحثين الأمنيين | Sky Pro";
const description =
  "صفحة شكر الباحثين الأمنيين وإرشادات التواصل والإفصاح المسؤول عن الثغرات في Sky Pro.";
export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: url },
  openGraph: { title, description, url, type: "website", locale: "ar_EG" },
  twitter: { card: "summary", title, description },
};
export default function SecurityAcknowledgements() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[65vh] bg-page px-5 py-16">
        <article className="max-w-3xl mx-auto prose-legal">
          <ShieldCheck className="text-brand mb-5" size={40} />
          <h1 className="text-3xl sm:text-4xl font-bold mb-6">
            شكر الباحثين الأمنيين
          </h1>
          <p>
            بنقدّر مساهمة الباحثين في تحسين أمان Sky Pro. بننشر أسماء أصحاب
            التقارير بعد التحقق من التقرير وموافقة صاحبه، حسب سياسة الإفصاح
            الأمني.
          </p>
          <section className="admin-card my-8">
            <h2 className="text-xl font-bold mb-3">
              مفيش أسماء منشورة في الصفحة حاليًا
            </h2>
            <p>لو عندك تقرير أو استفسار عن نشر اسمك، تواصل مع فريق الأمان.</p>
          </section>
          <div className="flex flex-wrap gap-3">
            <Link href="/security/policy" className="btn-primary">
              سياسة الإفصاح الأمني
            </Link>
            <a href="mailto:security@skywaveads.com" className="btn-secondary">
              تواصل مع فريق الأمان
            </a>
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
