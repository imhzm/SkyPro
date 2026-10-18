import type { Metadata } from "next";
export const siteOrigin = "https://skypro.skywaveads.com";
export function publicMetadata(
  path: string,
  title: string,
  description: string,
  image = "/opengraph-image",
): Metadata {
  const url = siteOrigin + path;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      locale: "ar_EG",
      siteName: "Sky Pro",
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
