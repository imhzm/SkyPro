import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { WhatsAppButton } from "@/components/marketing/WhatsAppButton";
import { GuideCover } from "@/components/guides/GuideCover";
import { GuideCatalog } from "@/components/guides/GuideCatalog";
import { publishedGuides } from "@/data/articles";
import { getProductShot } from "@/data/platform-media";
import styles from "@/components/guides/guides.module.css";

const url = "https://skypro.skywaveads.com/guides";
const title = "أدلة Sky Pro: اختيار البرنامج وتجهيز مهام المنصات";
const description = "أدلة عملية لاختيار برنامج مناسب، وتنظيم الحسابات، وتجهيز مهام المنصات ورسائل الاختبار. أمثلة واضحة وصور أصلية ومتطلبات تراجعها قبل الاشتراك.";
const cover = getProductShot("skypro-saved-accounts-manager");
export const metadata: Metadata = {
  title: { absolute: title }, description, alternates: { canonical: url },
  openGraph: { type: "website", locale: "ar_EG", title, description, url,
    images: [{ url: cover.src, width: cover.width, height: cover.height, alt: cover.alt }] },
  twitter: { card: "summary_large_image", title, description, images: [cover.src] },
};
export default function GuidesPage() {
  const featured = publishedGuides.find(article => article.slug === "two-day-trial-checklist");
  const schema = { "@context": "https://schema.org", "@type": "CollectionPage", "@id": url + "#webpage",
    url, name: title, description, inLanguage: "ar-EG",
    mainEntity: { "@type": "ItemList", itemListElement: publishedGuides.map((article, index) => ({
      "@type": "ListItem", position: index + 1, name: article.title, url: url + "/" + article.slug,
    })) } };
  return <>
    <Navbar />
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }} />
      <div className={styles.shell}>
        <header className={styles.intro}><p className={styles.eyebrow}>أدلة Sky Pro</p>
          <h1>افهم الأداة من شاشتها.</h1><p>شرح عملي وأمثلة تساعدك تختار المهمة المناسبة وتراجعها قبل الاشتراك.</p>
        </header>
        {featured && <section className={styles.featured} aria-labelledby="featured-guide-title">
          <div className={styles.featuredCopy}><p className={styles.eyebrow}>ابدأ من هنا</p>
            <h2 id="featured-guide-title">تجربة يومين،<br />وقرار على أساس واضح.</h2>
            <p>اختار مهمة واحدة وسجّل نتيجتها، علشان تعرف البرنامج مناسب لشغلك إزاي.</p>
            <Link className={styles.primaryLink} href={`/guides/${featured.slug}`}>اقرأ خطة التجربة <ArrowLeft size={18} aria-hidden="true" /></Link>
          </div>
          <GuideCover shotId={cover.id} priority />
        </section>}
        <GuideCatalog articles={publishedGuides.map(({ slug, title, description, category, coverShot }) => ({ slug, title, description, category, coverShot }))} />
      </div>
    </main>
    <Footer /><WhatsAppButton />
  </>;
}
