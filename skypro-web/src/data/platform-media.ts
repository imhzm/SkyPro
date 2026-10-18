export const platformMedia: Record<
  string,
  { hero: string; gallery: string[]; caption?: string }
> = {
  facebook: {
    hero: "facebook-marketing-tools",
    gallery: [
      "facebook-extract-data-panel",
      "facebook-broadcast-messages",
      "facebook-groups-publishing",
    ],
  },
  whatsapp: {
    hero: "whatsapp-marketing-tools-grid",
    gallery: [
      "whatsapp-session-launcher",
      "whatsapp-marketing-tools-dashboard",
    ],
  },
  instagram: {
    hero: "instagram-marketing-tools",
    gallery: ["instagram-extract-data-panel"],
  },
  twitter: { hero: "twitter-x-marketing-tools", gallery: [] },
  linkedin: { hero: "linkedin-b2b-tools-grid", gallery: [] },
  telegram: { hero: "telegram-marketing-suite", gallery: [] },
  "telegram-premium": { hero: "telegram-premium-exclusive-tools", gallery: [] },
  snapchat: { hero: "snapchat-marketing-tools", gallery: [] },
  pinterest: { hero: "pinterest-marketing-tools", gallery: [] },
  reddit: { hero: "reddit-community-marketing", gallery: [] },
  threads: { hero: "threads-marketing-tools", gallery: [] },
  tiktok: { hero: "tiktok-marketing-automation", gallery: [] },
  "google-maps": {
    hero: "google-maps-data-extraction",
    gallery: [],
    caption:
      "قائمة أدوات Google في البرنامج، وبداخلها خرائط جوجل وOLX كأداتين منفصلتين.",
  },
  olx: {
    hero: "google-maps-data-extraction",
    gallery: [],
    caption:
      "قائمة أدوات Google الفعلية، وتعرض مدخل أداة OLX. الصورة ليست شاشة نتائج إعلانات.",
  },
  "send-emails": { hero: "skypro-send-emails-smtp-tools", gallery: [] },
  "auto-point": { hero: "skypro-auto-point-automation", gallery: [] },
  accounts: { hero: "skypro-saved-accounts-manager", gallery: [] },
  security: { hero: "skypro-security-presets-config", gallery: [] },
};
export function platformImage(id: string) {
  return `/images/app/${platformMedia[id].hero}.png`;
}
export function platformCategory(id: string) {
  if (["google-maps", "olx"].includes(id)) return "data";
  if (["accounts", "security", "auto-point"].includes(id)) return "tools";
  if (id === "send-emails") return "email";
  return "social";
}
