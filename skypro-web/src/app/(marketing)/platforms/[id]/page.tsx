import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getPlatformIds, getPlatformPage } from "@/data/platform-pages";
import { platformImage } from "@/data/platform-media";
import { PlatformPageContent } from "@/components/marketing/PlatformPageContent";
import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { WhatsAppButton } from "@/components/marketing/WhatsAppButton";
const origin = "https://skypro.skywaveads.com";
interface Props {
  params: Promise<{ id: string }>;
}
export const dynamicParams = false;
export function generateStaticParams() {
  return getPlatformIds().map((id) => ({ id }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = getPlatformPage(id);
  if (!data)
    return {
      title: "المنصة غير موجودة",
      robots: { index: false, follow: true },
    };
  return {
    title: { absolute: data.metaTitle },
    description: data.metaDescription,
    alternates: { canonical: origin + "/platforms/" + id },
    openGraph: {
      type: "website",
      locale: "ar_EG",
      siteName: "Sky Pro",
      title: data.metaTitle,
      description: data.metaDescription,
      url: origin + "/platforms/" + id,
      images: [
        {
          url: platformImage(id),
          alt: "واجهة " + data.arabicName + " في Sky Pro",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: data.metaTitle,
      description: data.metaDescription,
      images: [platformImage(id)],
    },
  };
}
export default async function PlatformPage({ params }: Props) {
  const { id } = await params;
  if (id === "google") permanentRedirect("/platforms/google-maps");
  const data = getPlatformPage(id);
  if (!data) notFound();
  const url = origin + "/platforms/" + id;
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": url + "#webpage",
      url,
      name: data.metaTitle,
      description: data.metaDescription,
      inLanguage: "ar-EG",
      about: { "@id": origin + "#software" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "الرئيسية", item: origin },
        {
          "@type": "ListItem",
          position: 2,
          name: "جميع المنصات",
          item: origin + "/platforms",
        },
        { "@type": "ListItem", position: 3, name: data.arabicName, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: data.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schemas).replace(/</g, "\u003c"),
        }}
      />
      <PlatformPageContent data={data} />
      <Footer />
      <WhatsAppButton />
    </>
  );
}
