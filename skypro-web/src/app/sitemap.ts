import type { MetadataRoute } from "next";
import { getPlatformIds } from "@/data/platform-pages";
import { publishedGuides } from "@/data/articles";

const SITE_URL = "https://skypro.skywaveads.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // Omit lastModified until an actual per-page content revision is available.
  // A build timestamp is not evidence that every page changed.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/platforms`,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/security/policy`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/security/hall-of-fame`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const platformRoutes: MetadataRoute.Sitemap = getPlatformIds().map((id) => ({
    url: `${SITE_URL}/platforms/${id}`,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...platformRoutes,
    { url: `${SITE_URL}/guides`, lastModified: "2026-10-23", changeFrequency: "weekly", priority: 0.7 },
    ...publishedGuides.map(article => ({ url: `${SITE_URL}/guides/${article.slug}`, lastModified: article.updatedAt,
      changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
