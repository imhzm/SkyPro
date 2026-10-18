import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, ChevronDown, Layers3 } from "lucide-react";
import { PlatformIcon } from "../marketing/PlatformIcon";
import {
  getPlatformIds,
  getPlatformPage,
  type PlatformPageData,
} from "@/data/platform-pages";
import {
  platformImage,
  platformMedia,
  platformCategory,
} from "@/data/platform-media";
import { homeOffer } from "@/data/home-theme";
import styles from "./platforms.module.css";
export function PlatformPageContent({ data }: { data: PlatformPageData }) {
  const media = platformMedia[data.id];
  const others = getPlatformIds()
    .filter((id) => id !== data.id)
    .sort(
      (a, b) =>
        Number(platformCategory(b) === platformCategory(data.id)) -
        Number(platformCategory(a) === platformCategory(data.id)),
    )
    .slice(0, 6)
    .map((id) => getPlatformPage(id)!);
  return (
    <main className={styles.page}>
      <section className={`${styles.shell} ${styles.detailHero}`}>
        <nav className={styles.breadcrumbs} aria-label="مسار الصفحة">
          <Link href="/">الرئيسية</Link>
          <span>/</span>
          <Link href="/platforms">جميع المنصات</Link>
          <span>/</span>
          <span>{data.arabicName}</span>
        </nav>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <PlatformIcon id={data.id} size={19} />
              أدوات {data.name}
            </span>
            <h1>
              {data.arabicName}
              <br />
              <span className={styles.gradient}>من داخل Sky Pro</span>
            </h1>
            <p>{data.heroDescription}</p>
            <div className={styles.actions}>
              <Link href="/auth/register" className={styles.primary}>
                جرّب يومين مجانًا <ArrowLeft size={18} />
              </Link>
              <a href="#tools" className={styles.secondary}>
                استكشف الأدوات
              </a>
            </div>
            <ul className={styles.trust}>
              <li>
                <Check size={15} />
                واجهة عربية
              </li>
              <li>
                <Check size={15} />
                برنامج Windows
              </li>
              <li>
                <Check size={15} />
                اشتراك سنوي واحد
              </li>
            </ul>
          </div>
          <figure className={styles.heroScreen}>
            <div>
              <span />
              <span />
              <span />
              <b dir="ltr">Sky Pro · {data.name}</b>
            </div>
            <Image
              src={platformImage(data.id)}
              alt={`لقطة فعلية من موديول ${data.arabicName} في Sky Pro`}
              width={1567}
              height={904}
              priority
              sizes="(max-width:900px) 100vw,60vw"
            />
            {media.caption && <figcaption>{media.caption}</figcaption>}
          </figure>
        </div>
      </section>
      <section id="tools" className={`${styles.shell} ${styles.section}`}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>تعرف على الأدوات</span>
          <h2>إيه المتاح في {data.arabicName}؟</h2>
          <p>{data.longDescription}</p>
        </div>
        <div className={styles.toolsGrid}>
          {data.features.map((f, i) => (
            <article key={f.title} className={styles.tool}>
              <span className={styles.toolNumber}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
              <ul>
                {f.details.map((d) => (
                  <li key={d}>
                    <Check size={15} />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
      {!!media.gallery.length && (
        <section className={`${styles.shell} ${styles.section}`}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>شوف البرنامج بنفسك</span>
            <h2>صور فعلية للأدوات</h2>
          </div>
          <div className={styles.gallery}>
            {media.gallery.map((file, i) => (
              <figure key={file}>
                <Image
                  src={`/images/app/${file}.png`}
                  alt={`شاشة ${i + 1} من أدوات ${data.arabicName} في Sky Pro`}
                  width={1440}
                  height={900}
                  sizes="(max-width:900px) 100vw,50vw"
                />
                <figcaption>
                  واجهة {data.arabicName} — لقطة من البرنامج
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      <section className={`${styles.shell} ${styles.section}`}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>من الإعداد للتشغيل</span>
          <h2>ابدأ بخطوات واضحة</h2>
        </div>
        <ol className={styles.steps}>
          {data.howItWorks.map((s, i) => (
            <li key={s.step}>
              <b>{i + 1}</b>
              <div>
                <h3>{s.step}</h3>
                <p>{s.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      {!!data.useCases.length && (
        <section className={`${styles.shell} ${styles.section}`}>
          <div className={styles.sectionHeading}>
            <span className={styles.eyebrow}>استخدامات عملية</span>
            <h2>اختار الأداة حسب احتياجك</h2>
          </div>
          <div className={styles.useCases}>
            {data.useCases.map((s) => (
              <article key={s.title}>
                <Layers3 size={24} />
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className={`${styles.shell} ${styles.section} ${styles.faq}`}>
        <div>
          <span className={styles.eyebrow}>قبل ما تبدأ</span>
          <h2>أسئلة عن {data.arabicName}</h2>
          <p>
            توافر البيانات والنتائج يختلف حسب المنصة وصلاحيات الحساب وحالة
            الجلسة. إعدادات التشغيل لا تضمن عدم تقييد الحساب.
          </p>
          <a href={homeOffer.whatsapp} className={styles.secondary}>
            اسأل فريق الدعم
          </a>
        </div>
        <div>
          {data.faq.map((f) => (
            <details key={f.question}>
              <summary>
                {f.question}
                <ChevronDown size={18} />
              </summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section className={`${styles.shell} ${styles.cta}`}>
        <div>
          <span className={styles.eyebrow}>كل الأدوات في اشتراك واحد</span>
          <h2>جرّب {data.arabicName} مع Sky Pro</h2>
          <p>يومين مجانًا. الاشتراك السنوي ٢٬٠٠٠ جنيه مصري لجهاز واحد.</p>
        </div>
        <Link href="/auth/register" className={styles.primary}>
          ابدأ تجربتك <ArrowLeft size={18} />
        </Link>
      </section>
      <section className={`${styles.shell} ${styles.section}`}>
        <div className={styles.relatedHeading}>
          <h2>كمّل استكشاف الأدوات</h2>
          <Link href="/platforms">
            جميع المنصات <ArrowLeft size={16} />
          </Link>
        </div>
        <div className={styles.related}>
          {others.map((p) => (
            <Link key={p.id} href={`/platforms/${p.id}`}>
              <PlatformIcon id={p.id} size={23} />
              <span>{p.arabicName}</span>
              <ArrowLeft size={16} />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
