import { getPublishedGuide } from "./articles/index";

// Curated preparation guides, not a site-wide link block. A product link in each
// selected article establishes its relation to the corresponding platform.
export const platformGuideSlugs: Readonly<Record<string, readonly string[]>> = {
  facebook: ["facebook-task-inputs"],
  whatsapp: ["whatsapp-message-test", "contact-list-quality-check"],
  instagram: ["instagram-task-brief"],
  twitter: ["x-search-or-message-task"],
  telegram: ["telegram-group-channel-task"],
  "telegram-premium": ["telegram-group-channel-task"],
  linkedin: ["linkedin-outreach-brief"],
  pinterest: ["pinterest-board-content-brief"],
  reddit: ["reddit-community-checklist"],
  tiktok: ["tiktok-video-task-checklist"],
  threads: ["threads-account-task-review"],
  olx: ["olx-demo-questions"],
  security: ["session-problem-support-brief"],
  accounts: [
    "name-and-add-platform-accounts",
    "multi-account-work-handover",
    "windows-or-cloud-marketing-tool",
  ],
  "google-maps": ["maps-data-task-evaluation"],
  "send-emails": ["smtp-test-message-checklist", "contact-list-quality-check"],
};

export function getPlatformGuides(platformId: string) {
  const slugs = Object.hasOwn(platformGuideSlugs, platformId)
    ? platformGuideSlugs[platformId]
    : [];
  return slugs.flatMap((slug) => {
    const article = getPublishedGuide(slug);
    return article ? [article] : [];
  });
}
