import type { Metadata } from "next";
import { HomeTheme } from "@/components/marketing/home/HomeTheme";
import { homeFaqs, homeOffer } from "@/data/home-theme";

const SITE_URL = "https://skypro.skywaveads.com";
export const metadata: Metadata = {
  title: { absolute: "Sky Pro | إدارة حسابات وأدوات التسويق من مكان واحد" },
  description:
    "أدوات فيسبوك وواتساب وإنستجرام وخرائط جوجل ومنصات أخرى في تطبيق Windows بواجهة عربية. جرّب Sky Pro يومين مجانًا. الاشتراك السنوي ٢٬٠٠٠ جنيه.",
  alternates: { canonical: "/" },
  twitter: {
    card: 'summary_large_image',
    title: 'Sky Pro | حساباتك وأدوات التسويق في مكان واحد',
    description: 'برنامج Windows بواجهة عربية. جرّب أدوات Sky Pro يومين مجانًا، والاشتراك السنوي ٢٬٠٠٠ جنيه مصري.',
    images: ['/twitter-image'],
  },
  openGraph: {
    title: "Sky Pro | حساباتك وأدوات التسويق في مكان واحد",
    description:
      "اكتشف أدوات منصاتك من واجهة عربية واحدة. تجربة مجانية يومين واشتراك سنوي ٢٬٠٠٠ جنيه مصري.",
    url: SITE_URL,
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Sky Pro من Sky Wave",
      },
    ],
  },
};

const structuredData = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}#software`,
    name: "Sky Pro",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows",
    url: SITE_URL,
    description: "تطبيق Sky Pro على Windows لإدارة حسابات المنصات وأدوات التسويق بواجهة عربية.",
    inLanguage: "ar",
    publisher: { "@id": `${SITE_URL}#organization` },
    offers: { "@type": "Offer", price: homeOffer.annualPrice, priceCurrency: homeOffer.currency,
      availability: "https://schema.org/InStock", description: "اشتراك سنوي، مع تجربة مجانية يومين" },
    featureList: ["تطبيق Windows بواجهة عربية", "قوائم أدوات مستقلة للمنصات", "نموذج لإضافة حسابات المنصات وتسميتها"],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE_URL },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Sky Pro لإدارة حسابات وأدوات التسويق",
    serviceType: "Marketing software",
    provider: { "@id": `${SITE_URL}#organization` },
    url: SITE_URL,
    offers: [
      {
        "@type": "Offer",
        name: "الاشتراك السنوي",
        price: homeOffer.annualPrice,
        priceCurrency: homeOffer.currency,
        url: `${SITE_URL}/auth/register`,
      },
      {
        "@type": "Offer",
        name: "تجربة مجانية لمدة يومين",
        price: 0,
        priceCurrency: homeOffer.currency,
        url: `${SITE_URL}/auth/register`,
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: homeFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <HomeTheme />
    </>
  );
}
