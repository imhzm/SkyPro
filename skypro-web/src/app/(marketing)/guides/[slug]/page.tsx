import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { WhatsAppButton } from "@/components/marketing/WhatsAppButton";
import { ProductGallery } from "@/components/product/ProductGallery";
import { getPublishedGuide, publishedGuides } from "@/data/articles";
import { getProductShot } from "@/data/platform-media";
import styles from "@/components/guides/guides.module.css";

const origin = "https://skypro.skywaveads.com";
interface Props { params: Promise<{ slug: string }> }
export const dynamicParams = false;
export function generateStaticParams() { return publishedGuides.map(article => ({ slug: article.slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getPublishedGuide((await params).slug);
  if (!article) return { title: "الدليل غير موجود", robots: { index: false, follow: true } };
  const cover = getProductShot(article.coverShot), url = `${origin}/guides/${article.slug}`;
  return {
    title: { absolute: `${article.title} | Sky Pro` }, description: article.description,
    alternates: { canonical: url }, authors: [{ name: article.author.name, url: article.author.url }],
    openGraph: { type: "article", locale: "ar_EG", title: article.title, description: article.description,
      url, publishedTime: article.publishedAt, modifiedTime: article.updatedAt, authors: [article.author.url],
      images: [{ url: cover.src, width: cover.width, height: cover.height, alt: cover.alt }] },
    twitter: { card: "summary_large_image", title: article.title, description: article.description, images: [cover.src] },
  };
}
const formatDate = (date: string) => new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" }).format(new Date(date + "T12:00:00Z"));

export default async function GuidePage({ params }: Props) {
  const article = getPublishedGuide((await params).slug);
  if (!article) notFound();
  const cover = getProductShot(article.coverShot), url = `${origin}/guides/${article.slug}`;
  const related = article.relatedSlugs.map(getPublishedGuide).filter(article => article !== undefined);
  const schemas = [
    { "@context": "https://schema.org", "@type": "Article", "@id": url + "#article", headline: article.title,
      description: article.description, mainEntityOfPage: { "@type": "WebPage", "@id": url },
      inLanguage: "ar-EG", articleSection: article.category, image: [origin + cover.src],
      datePublished: article.publishedAt, dateModified: article.updatedAt,
      author: { "@type": article.author.type, name: article.author.name, url: article.author.url },
      publisher: { "@id": origin + "#organization" }, citation: article.sources.map(source => source.href) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: origin + "/" },
      { "@type": "ListItem", position: 2, name: "أدلة الاستخدام", item: origin + "/guides" },
      { "@type": "ListItem", position: 3, name: article.title, item: url },
    ] },
  ];
  return <>
    <Navbar />
    <main className={styles.page}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas).replace(/</g, "\\u003c") }} />
      <article className={styles.shell}>
        <nav aria-label="مسار التصفح"><ol className={styles.breadcrumb}>
          <li><Link href="/">الرئيسية</Link></li><li aria-hidden="true">/</li>
          <li><Link href="/guides">أدلة الاستخدام</Link></li><li aria-hidden="true">/</li>
          <li aria-current="page">{article.category}</li>
        </ol></nav>
        <header className={styles.articleHeader}><p className={styles.eyebrow}>{article.category} · دليل عملي</p>
          <h1>{article.title}</h1><div className={styles.articleMeta}>
            <span>إعداد <a href={article.author.url}>{article.author.name}</a></span>
            <span>نُشر <time dateTime={article.publishedAt}>{formatDate(article.publishedAt!)}</time></span>
            {article.updatedAt !== article.publishedAt && <span>آخر تحديث <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time></span>}
          </div>
        </header>
        <div className={styles.articleMedia}>
          <ProductGallery images={[{ ...cover, caption: article.coverCaption }]} layout="hero" priority label="صورة الدليل الأصلية القابلة للتكبير" />
        </div>
        <div className={styles.articleGrid}>
          <aside className={styles.toc} aria-labelledby="toc-title"><h2 id="toc-title">في الدليل</h2>
            <ol>{article.sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.heading}</a></li>)}
              <li><a href="#sources">المصادر والمراجع</a></li>
            </ol>
          </aside>
          <div className={styles.prose}>
            <div className={styles.lead}>{article.intro.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
            {article.sections.map(section => <section className={styles.section} id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`}>{section.heading}</h2>
              {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}
              {section.table && <div className={styles.tableWrap} role="region" aria-label={`جدول: ${section.heading}`} tabIndex={0}>
                <table><thead><tr>{section.table.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
                  <tbody>{section.table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
                </table>
              </div>}
              {section.example && <aside className={styles.example} aria-label={section.example.title}>
                <h3>{section.example.title}</h3>{section.example.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
              </aside>}
              {section.sourceIds && <div className={styles.sectionSources}><span>المصدر:</span>{section.sourceIds.map(id => {
                const source = article.sources.find(source => source.id === id)!;
                return <a key={id} href={source.href}>{source.title}</a>;
              })}</div>}
            </section>)}
            <section className={styles.sources} id="sources" aria-labelledby="sources-title"><h2 id="sources-title">المصادر والمراجع</h2>
              <ul>{article.sources.map(source => <li key={source.id}><a href={source.href}>{source.title}</a></li>)}</ul>
            </section>
            <nav className={styles.productLinks} aria-label="الأدوات المرتبطة بالدليل">{article.productLinks.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
            <section className={styles.articleCta}><h2>كمّل من الأداة المناسبة</h2><p>{article.cta.description}</p>
              <Link className={styles.primaryLink} href={article.cta.href}>{article.cta.label}<ArrowLeft size={18} aria-hidden="true" /></Link>
            </section>
            {related.length > 0 && <nav className={styles.related} aria-labelledby="related-title"><h2 id="related-title">أدلة تكمل الخطوة اللي بعدها</h2>
              <ul>{related.map(guide => <li key={guide.slug}><Link href={`/guides/${guide.slug}`}>{guide.title}<ArrowLeft size={18} aria-hidden="true" /></Link></li>)}</ul>
            </nav>}
          </div>
        </div>
      </article>
    </main>
    <Footer /><WhatsAppButton />
  </>;
}
