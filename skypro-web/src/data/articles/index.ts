import { evaluationGuides } from "./evaluation";
import { accountGuides } from "./accounts";
import { communicationGuides } from "./communication";
import { socialWorkflowGuides } from "./social-workflows";
import { socialContentGuides } from "./social-content";
import { dataEvaluationGuides } from "./data-evaluation";

export type { GuideArticle, GuideSection } from "./types";

// Drafts are excluded from public lists, route generation and the sitemap.
export const guideArticles = [
  ...evaluationGuides,
  ...accountGuides,
  ...communicationGuides,
  ...socialWorkflowGuides,
  ...socialContentGuides,
  ...dataEvaluationGuides,
];
export const publishedGuides = guideArticles.filter((article) => article.status === "published");
export function getPublishedGuide(slug: string) {
  return publishedGuides.find((article) => article.slug === slug);
}
