"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import type { GuideArticle } from "@/data/articles/types";
import { GuideCover } from "./GuideCover";
import styles from "./guides.module.css";

export type GuideCard = Pick<GuideArticle, "slug" | "title" | "description" | "category" | "coverShot">;
const filters = ["الكل", "اختيار البرنامج", "الحسابات", "المنصات", "البريد", "البيانات"];
function group(category: string) {
  return ["اختيار البرنامج", "الحسابات", "البريد", "البيانات"].includes(category) ? category : "المنصات";
}
export function GuideCatalog({ articles }: { articles: GuideCard[] }) {
  const [category, setCategory] = useState("الكل"), [search, setSearch] = useState("");
  const term = search.normalize("NFKC").trim().toLocaleLowerCase("ar");
  const visible = articles.filter(article => (category === "الكل" || group(article.category) === category)
    && (!term || `${article.title} ${article.description} ${article.category}`.normalize("NFKC").toLocaleLowerCase("ar").includes(term)));
  return (
    <section className={styles.catalog} aria-labelledby="guide-catalog-title">
      <div className={styles.catalogHeading}>
        <div><p className={styles.eyebrow}>اختار نقطة البداية</p><h2 id="guide-catalog-title">الدليل اللي تحتاجه لشغلك</h2></div>
        <label className={styles.search}><Search size={20} aria-hidden="true" /><span className="sr-only">ابحث في الأدلة</span>
          <input type="search" value={search} maxLength={120} onChange={event => setSearch(event.target.value)} placeholder="حسابات، رسالة اختبار، منصة…" />
          {search && <button type="button" aria-label="مسح البحث" onClick={() => setSearch("")}><X size={17} /></button>}
        </label>
      </div>
      <div className={styles.filters} role="group" aria-label="تصنيف الأدلة">
        {filters.map(filter => <button key={filter} type="button" aria-pressed={category === filter} onClick={() => setCategory(filter)}>{filter}</button>)}
      </div>
      <p className={styles.resultCount} aria-live="polite">{visible.length} دليل{category === "الكل" ? "" : ` في ${category}`}</p>
      <div className={styles.cards}>
        {visible.map(article => <article key={article.slug} className={styles.card}>
          <Link href={`/guides/${article.slug}`} className={styles.coverLink} aria-label={`اقرأ: ${article.title}`} tabIndex={-1} aria-hidden="true">
            <GuideCover shotId={article.coverShot} tone={article.category === "البريد" ? "aqua" : group(article.category) === "المنصات" ? "violet" : "ink"} />
          </Link>
          <div className={styles.cardBody}><p className={styles.eyebrow}>{article.category}</p>
            <h3><Link href={`/guides/${article.slug}`}>{article.title}</Link></h3>
            <p>{article.description}</p>
            <Link className={styles.readLink} href={`/guides/${article.slug}`}>اقرأ الدليل <ArrowLeft size={17} aria-hidden="true" /><span className="sr-only">: {article.title}</span></Link>
          </div>
        </article>)}
      </div>
      {!visible.length && <div className={styles.empty}><h3>مفيش دليل مطابق للبحث ده</h3><p>جرّب اسم منصة أو اختار تصنيف تاني.</p><button type="button" onClick={() => { setSearch(""); setCategory("الكل"); }}>عرض كل الأدلة</button></div>}
    </section>
  );
}
