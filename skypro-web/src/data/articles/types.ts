export interface GuideSource {
  id: string;
  title: string;
  href: string;
}
export interface GuideSection {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  table?: { columns: string[]; rows: string[][] };
  example?: { title: string; paragraphs: string[] };
  sourceIds?: string[];
}
export interface GuideArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  intent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  author: { name: string; url: string; type: "Organization" };
  coverShot: string;
  coverCaption: string;
  intro: string[];
  sections: GuideSection[];
  sources: GuideSource[];
  relatedSlugs: string[];
  productLinks: { href: string; label: string }[];
  cta: { label: string; href: string; description: string };
}

export const guideAuthor = {
  name: "فريق Sky Wave",
  url: "https://www.skywaveads.com/",
  type: "Organization",
} as const;
