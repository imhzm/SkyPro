import type { Metadata } from "next";
import { getPlatformIds, getPlatformPage } from "@/data/platform-pages";
import { PlatformsListContent } from "@/components/marketing/PlatformsListContent";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { WhatsAppButton } from "@/components/marketing/WhatsAppButton";
const url = "https://skypro.skywaveads.com/platforms";
const title = "جميع المنصات والأدوات | Sky Pro";
const description =
  "استكشف أدوات فيسبوك وواتساب وإنستجرام وخرائط جوجل والبريد وباقي أدوات Sky Pro. صور فعلية، شرح الاستخدام، وتجربة مجانية لمدة يومين.";
export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: url },
  openGraph: {
    title,
    description,
    url,
    type: "website",
    locale: "ar_EG",
    images: [
      {
        url: "/images/app/skypro-multi-platform-dashboard.png",
        alt: "منصات وأدوات Sky Pro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/images/app/skypro-multi-platform-dashboard.png"],
  },
};
export default async function PlatformsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;
  const pages = getPlatformIds().map((id) => getPlatformPage(id)!);
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    itemListElement: pages.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.arabicName,
      url: url + "/" + p.id,
    })),
  };
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <PlatformsListContent
        key={query.q || ""}
        pages={pages}
        initialSearch={(query.q || "").slice(0, 120)}
      />
      <Footer />
      <WhatsAppButton />
    </>
  );
}
