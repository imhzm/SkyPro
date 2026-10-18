"use client";
import Link from "next/link";
import Image from "next/image";
import { useId, useMemo, useState } from "react";
import { ArrowLeft, Search, Check } from "lucide-react";
import { PlatformIcon } from "../marketing/PlatformIcon";
import type { PlatformPageData } from "@/data/platform-pages";
import { platformCategory, platformImage } from "@/data/platform-media";
import styles from "./platforms.module.css";
const categories = [
  { id: "all", label: "الكل" },
  { id: "social", label: "تواصل اجتماعي" },
  { id: "data", label: "بيانات وبحث" },
  { id: "email", label: "البريد الإلكتروني" },
  { id: "tools", label: "أدوات الحسابات" },
];
export function PlatformsListContent({
  pages,
  initialSearch = "",
}: {
  pages: PlatformPageData[];
  initialSearch?: string;
}) {
  const [category, setCategory] = useState("all"),
    [search, setSearch] = useState(initialSearch);
  const searchId = useId();
  const filtered = useMemo(
    () =>
      pages.filter(
        (p) =>
          (category === "all" || platformCategory(p.id) === category) &&
          (!search.trim() ||
            [p.name, p.arabicName, p.heroDescription]
              .join(" ")
              .toLowerCase()
              .includes(search.trim().toLowerCase())),
      ),
    [pages, category, search],
  );
  return (
    <main className={styles.page}>
      <section className={`${styles.shell} ${styles.listHero}`}>
        <nav className={styles.breadcrumbs} aria-label="مسار الصفحة">
          <Link href="/">الرئيسية</Link>
          <span>/</span>
          <span>جميع المنصات</span>
        </nav>
        <span className={styles.eyebrow}>
          {pages.length} منصة وأداة في برنامج واحد
        </span>
        <h1>
          اختار منصتك.
          <br />
          <span className={styles.gradient}>كل أدواتك أقرب.</span>
        </h1>
        <p>
          استكشف أدوات Sky Pro، وشوف صورها الحقيقية وطريقة استخدامها قبل ما
          تبدأ.
        </p>
        <div className={styles.search}>
          <label htmlFor={searchId}>ابحث عن منصة أو أداة</label>
          <div>
            <Search size={20} aria-hidden="true" />
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="فيسبوك، خرائط جوجل، البريد..."
            />
          </div>
        </div>
        <div className={styles.filters} role="group" aria-label="تصفية المنصات">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>
      <section
        className={`${styles.shell} ${styles.catalog}`}
        aria-label="نتائج المنصات"
      >
        <p role="status" className={styles.resultCount}>
          {filtered.length} منصة وأداة
        </p>
        <div className={styles.grid}>
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/platforms/${p.id}`}
              className={styles.platformCard}
            >
              <div className={styles.cardImage}>
                <Image
                  src={platformImage(p.id)}
                  alt={`واجهة ${p.arabicName} الفعلية داخل Sky Pro`}
                  width={900}
                  height={520}
                  sizes="(max-width:600px) 100vw,(max-width:1000px) 50vw,33vw"
                />
                <span className={styles.mark}>
                  <PlatformIcon id={p.id} size={25} />
                </span>
              </div>
              <div className={styles.cardBody}>
                <h2>{p.arabicName}</h2>
                <p>{p.heroDescription}</p>
                <ul>
                  {p.features.slice(0, 3).map((f) => (
                    <li key={f.title}>
                      <Check size={14} />
                      {f.title}
                    </li>
                  ))}
                </ul>
                <span className={styles.cardLink}>
                  اكتشف الأدوات <ArrowLeft size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>
        {!filtered.length && (
          <div className={styles.empty}>
            <h2>مفيش نتائج للبحث ده</h2>
            <p>جرّب اسم منصة مختلف أو اعرض كل الأدوات.</p>
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                setSearch("");
              }}
              className={styles.secondary}
            >
              عرض كل المنصات
            </button>
          </div>
        )}
      </section>
      <section className={`${styles.shell} ${styles.cta}`}>
        <div>
          <h2>جرّب الأداة المناسبة لشغلك</h2>
          <p>تجربة يومين مجانًا. الاشتراك السنوي ٢٬٠٠٠ جنيه مصري.</p>
        </div>
        <Link href="/auth/register" className={styles.primary}>
          ابدأ تجربتك <ArrowLeft size={18} />
        </Link>
      </section>
    </main>
  );
}
