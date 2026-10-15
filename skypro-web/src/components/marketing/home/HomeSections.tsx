import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarClock,
  Check,
  ChevronDown,
  Download,
  Headphones,
  Layers3,
  MessageCircle,
  Monitor,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { homeFaqs, homeOffer, homePlatforms } from "@/data/home-theme";
import { Action, PlatformMark, ProductScreen, SectionHeading } from "./shared";
import styles from "./home.module.css";
const platformStrip = [
  "facebook",
  "whatsapp",
  "instagram",
  "google-maps",
  "telegram",
  "linkedin",
  "tiktok",
  "twitter",
  "pinterest",
  "threads",
].map((id) => homePlatforms.find((p) => p.id === id)!);

export function Platforms() {
  return (
    <>
      <section className={`${styles.shell} ${styles.platformsIntro}`}>
        <SectionHeading label="منصات متعددة" title="جميع منصاتك المفضلة مدعومة">
          أدوات لكل منصة، مجتمعة في برنامج واحد.
        </SectionHeading>
        <div className={styles.platformStrip}>
          {platformStrip.map((platform) => (
            <Link key={platform.id} href={platform.href}>
              <PlatformMark platform={platform} />
              <span>{platform.name}</span>
            </Link>
          ))}
        </div>
      </section>
      <section id="platforms" className={`${styles.shell} ${styles.section}`}>
        <SectionHeading label="منصة لكل احتياج" title="برنامج واحد لكل منصة">
          اختار منصتك وشوف أدواتها من داخل Sky Pro.
        </SectionHeading>
        <div className={styles.platformGrid}>
          {homePlatforms.map((platform, index) => (
            <Link
              key={platform.id}
              href={platform.href}
              className={`${styles.platformCard} ${index < 4 ? styles.largePlatform : ""}`}
              style={{ "--platform": platform.color } as CSSProperties}
            >
              <div className={styles.platformPreview}>
                <Image
                  src={`/images/app/${platform.image}.png`}
                  alt={`واجهة أدوات ${platform.name} الفعلية في Sky Pro`}
                  width={1592}
                  height={974}
                  sizes={
                    index < 4
                      ? "(max-width: 600px) 90vw, (max-width: 1024px) 45vw, 300px"
                      : "(max-width: 600px) 43vw, (max-width: 1024px) 30vw, 210px"
                  }
                />
                <PlatformMark platform={platform} />
              </div>
              <h3>إدارة {platform.name}</h3>
              <p>{platform.description}</p>
              <span className={styles.cardLink}>
                معاينة المنصة <ArrowLeft size={13} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

const features = [
  {
    icon: Users,
    title: "إدارة موحدة",
    text: "رتّب حساباتك وأدوات منصاتك داخل برنامج واحد.",
  },
  {
    icon: ShieldCheck,
    title: "إعدادات للجلسات",
    text: "إدارة جلسات الحسابات وخيارات البروكسي لكل جلسة.",
  },
  {
    icon: CalendarClock,
    title: "جدولة الحملات",
    text: "جهّز المحتوى وحدد مواعيد النشر من أدوات الجدولة.",
  },
  {
    icon: BarChart3,
    title: "بيانات منظمة",
    text: "راجع السجلات المستخرجة وصدّرها لمتابعة شغلك.",
  },
  {
    icon: Monitor,
    title: "واجهة عربية",
    text: "أدوات واضحة على الكمبيوتر تساعدك تبدأ بخطوات بسيطة.",
  },
  {
    icon: Headphones,
    title: "دعم فني مباشر",
    text: "تواصل معنا للمساعدة في التحميل والتفعيل والاستخدام.",
  },
];

export function Features() {
  return (
    <section id="features" className={`${styles.shell} ${styles.section}`}>
      <SectionHeading label="مميزات تفرق في شغلك" title="لماذا تختار Sky Pro؟">
        كل ما تحتاجه لتنظيم حساباتك وشغلك اليومي.
      </SectionHeading>
      <div className={styles.featuresLayout}>
        <div className={styles.featureColumn}>
          {features.slice(0, 3).map((feature) => (
            <Feature key={feature.title} {...feature} />
          ))}
        </div>
        <div className={styles.featuresVisual}>
          <ProductScreen compact />
          <span className={styles.visualLabel}>
            <Sparkles size={15} />
            كل أدواتك أقرب
          </span>
        </div>
        <div className={styles.featureColumn}>
          {features.slice(3).map((feature) => (
            <Feature key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function Feature({
  icon: Icon,
  title,
  text,
}: (typeof features)[number]) {
  return (
    <article className={styles.featureCard}>
      <span className={styles.featureIcon}>
        <Icon size={24} />
      </span>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

export function Steps() {
  const steps = [
    {
      icon: Download,
      title: "حمّل وفعّل البرنامج",
      text: "أنشئ حسابك وحمّل نسخة Windows، ثم استخدم مفتاح التفعيل.",
    },
    {
      icon: Layers3,
      title: "اختار منصاتك",
      text: "أضف حساباتك وحدد الأدوات المناسبة لشغلك.",
    },
    {
      icon: BarChart3,
      title: "ابدأ وتابع شغلك",
      text: "جهّز مهامك وراجع النتائج والبيانات من البرنامج.",
    },
  ];
  return (
    <section id="how-it-works" className={`${styles.shell} ${styles.section}`}>
      <SectionHeading label="خطوات بسيطة" title="ابدأ في ٣ خطوات بسيطة">
        من إنشاء حسابك لأول مهمة، الطريق واضح.
      </SectionHeading>
      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className={styles.stepNumber}>{index + 1}</span>
            <step.icon size={32} aria-hidden="true" />
            <div>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
            {index < 2 && (
              <ArrowLeft
                className={styles.stepArrow}
                size={22}
                aria-hidden="true"
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function UseCases() {
  const cases = [
    {
      icon: Users,
      title: "لفرق التسويق",
      text: "رتّب العمل على حسابات متعددة، ووصل لأدوات كل منصة من نفس المكان.",
    },
    {
      icon: MessageCircle,
      title: "لأصحاب المتاجر",
      text: "جهّز رسائل العملاء المهتمين بمنتجاتك وتابع التواصل من أدوات المنصة المناسبة.",
    },
    {
      icon: BarChart3,
      title: "لتطوير الأعمال",
      text: "ابحث عن الأنشطة التجارية على خرائط جوجل ونظّم بيانات الاتصال المتاحة.",
    },
  ];
  return (
    <section className={`${styles.shell} ${styles.section}`}>
      <SectionHeading label="أدوات تناسب شغلك" title="Sky Pro في يومك">
        ابدأ بالأداة اللي تحل احتياجك، ووسّع استخدامك خطوة بخطوة.
      </SectionHeading>
      <div className={styles.useCases}>
        {cases.map((item) => (
          <article key={item.title}>
            <item.icon size={26} aria-hidden="true" />
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Pricing() {
  const plans = [
    {
      title: "التجربة المجانية",
      description: "اكتشف البرنامج قبل الاشتراك",
      price: "٠",
      period: "جنيه / لمدة يومين",
      features: [
        "تجربة الأدوات المتاحة",
        "واجهة عربية على Windows",
        "التعرف على أدوات المنصات",
        "بدون بطاقة ائتمانية",
      ],
      href: "/auth/register",
      cta: "جرّب مجانًا",
    },
    {
      title: "الاشتراك السنوي",
      description: "اشتراك واحد لأدوات Sky Pro",
      price: homeOffer.annualPrice.toLocaleString("ar-EG"),
      period: "جنيه مصري / سنويًا",
      features: [
        "جميع أدوات المنصات المتاحة",
        "تفعيل البرنامج على جهاز واحد",
        "إدارة حسابات متعددة",
        "جدولة الحملات والتصدير",
        "تحديثات خلال مدة الاشتراك",
        "دعم فني باللغة العربية",
      ],
      href: "/auth/register",
      cta: "ابدأ تجربتك الآن",
    },
    {
      title: "للفرق والأجهزة الإضافية",
      description: "خلّينا نراجع احتياج فريقك",
      price: "تواصل معنا",
      period: "التكلفة حسب عدد الأجهزة",
      features: [
        "مراجعة عدد الأجهزة المطلوبة",
        "توضيح خيارات التفعيل",
        "المساعدة في إعداد البرنامج",
        "تواصل مباشر مع الدعم",
      ],
      href: homeOffer.whatsapp,
      cta: "اسأل عن اشتراك فريقك",
    },
  ];
  return (
    <section id="pricing" className={`${styles.shell} ${styles.section}`}>
      <SectionHeading
        label="اختار بداية مناسبة"
        title="خطة واضحة، وأدوات في متناولك"
      >
        جرّب يومين مجانًا، وبعدها اختار الاشتراك المناسب لشغلك.
      </SectionHeading>
      <div className={styles.pricingGrid}>
        {plans.map((plan, index) => (
          <article
            key={plan.title}
            className={`${styles.priceCard} ${index === 1 ? styles.featuredPlan : ""}`}
          >
            {index === 1 && (
              <span className={styles.planBadge}>كل أدوات Sky Pro</span>
            )}
            <h3>{plan.title}</h3>
            <p>{plan.description}</p>
            <div
              className={`${styles.price} ${index === 2 ? styles.contactPrice : ""}`}
            >
              {plan.price}
            </div>
            <small>{plan.period}</small>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={16} />
                  {feature}
                </li>
              ))}
            </ul>
            <Action href={plan.href} secondary={index !== 1}>
              {plan.cta}
            </Action>
          </article>
        ))}
      </div>
      <p className={styles.pricingNote}>
        طرق الدفع المتاحة: فودافون كاش أو تحويل بنكي.{" "}
        <a href={homeOffer.whatsapp}>تواصل معنا لتفاصيل الدفع.</a>
      </p>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className={`${styles.shell} ${styles.section}`}>
      <SectionHeading label="الأسئلة الشائعة" title="كل ما تريد معرفته">
        إجابات واضحة تساعدك تختار وتبدأ.
      </SectionHeading>
      <div className={styles.faqLayout}>
        <div className={styles.questions}>
          {homeFaqs.map((faq) => (
            <details key={faq.question}>
              <summary>
                {faq.question}
                <ChevronDown size={17} />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
        <aside className={styles.supportCard}>
          <div className={styles.questionArt} aria-hidden="true">
            <MessageCircle size={58} />
            <span>؟</span>
          </div>
          <h3>لم تجد إجابتك؟</h3>
          <p>كلّم فريق الدعم، وهنساعدك تعرف الأداة المناسبة وتبدأ استخدامها.</p>
          <Action href={homeOffer.whatsapp} secondary>
            تواصل معنا
          </Action>
          <a
            href={`tel:${homeOffer.phone}`}
            dir="ltr"
            className={styles.supportPhone}
          >
            {homeOffer.phone}
          </a>
        </aside>
      </div>
    </section>
  );
}
