const fs = require("node:fs");
const { loadData } = require("./route-inventory.cjs");
const { guideArticles } = loadData("src/data/articles/index.ts");
const { platformPages } = loadData("src/data/platform-pages.ts");
const countries = {
  EG: ["برنامج إدارة حسابات السوشيال ميديا", "برنامج تسويق إلكتروني للكمبيوتر", "برنامج إدارة حسابات التواصل الاجتماعي", "برنامج إدارة أكثر من حساب سوشيال ميديا", "أدوات التسويق الإلكتروني", "برنامج إدارة فيسبوك من الكمبيوتر", "برنامج إدارة حسابات إنستجرام", "برنامج إدارة حسابات متعددة", "برنامج تسويق إلكتروني عربي", "برنامج سوشيال ميديا للويندوز"],
  SA: ["برنامج إدارة حسابات التواصل الاجتماعي للشركات", "برنامج إدارة السوشيال ميديا السعودية", "أدوات التسويق الإلكتروني للشركات السعودية", "برنامج تسويق إلكتروني عربي", "برنامج إدارة حسابات التواصل للشركات", "برنامج إدارة عدة حسابات تواصل اجتماعي", "برنامج تسويق للكمبيوتر", "أدوات تنظيم التسويق عبر المنصات"],
  AE: ["برنامج إدارة حسابات التواصل الاجتماعي الإمارات", "برنامج إدارة السوشيال ميديا للشركات", "برنامج تسويق إلكتروني عربي", "أدوات إدارة منصات التواصل الاجتماعي", "برنامج إدارة حسابات التواصل للكمبيوتر", "Arabic social media management software", "Windows social media management tool", "Social media tools for businesses UAE"],
};
const longTail = [
  ["كيفية إدارة عدة حسابات تواصل اجتماعي من برنامج واحد", "/guides/name-and-add-platform-accounts"],
  ["أفضل طريقة لتنظيم حسابات التواصل لفريق تسويق", "/guides/multi-account-work-handover"],
  ["برنامج عربي لإدارة أدوات التسويق من الكمبيوتر", "/"],
  ["برنامج إدارة حسابات التواصل للشركات الصغيرة", "/"],
  ["كيفية اختيار برنامج إدارة حسابات التواصل الاجتماعي", "/guides/software-or-social-media-agency"],
  ["مقارنة برامج إدارة أدوات السوشيال ميديا", "/guides/windows-or-cloud-marketing-tool"],
  ["أدوات إدارة حسابات التواصل للويندوز", "/platforms"],
];
function target(keyword) {
  if (keyword.includes("فيسبوك")) return "/platforms/facebook";
  if (keyword.includes("إنستجرام")) return "/platforms/instagram";
  if (keyword.startsWith("أدوات")) return "/platforms";
  if (keyword === "برنامج إدارة حسابات متعددة") return "/platforms/accounts";
  return "/";
}
function record(keyword, country, targetUrl, informational = false) {
  const language = /^[A-Za-z]/.test(keyword) ? "en" : "ar";
  const englishGap = language === "en";
  const broad = keyword === "أدوات التسويق الإلكتروني" || keyword === "برنامج إدارة حسابات متعددة";
  return { keyword, country, language, searchIntent: informational ? "Informational evaluation/setup" : "Commercial investigation; software/service ambiguity must be filtered",
    targetUrl, currentRank: "NOT_VERIFIED", searchVolume: "NOT_VERIFIED", keywordDifficulty: "NOT_VERIFIED",
    competitiveSERP: { status: "NOT_VERIFIED_FOR_THIS_EXACT_KEYWORD", relatedMarketEvidence: "organic-markets-20261022.json", caveat: "Related query observations are not exact-keyword rankings or geolocated tracking" },
    opportunity: englishGap ? "No English landing page or verified English support; validate demand and scope before translation" : broad ? "Broad or accounting/service intent can dilute fit; use explicit social platform and Windows context" : "Match the actual Windows product/task and direct the reader to one canonical destination",
    priority: englishGap || broad ? "P3_VALIDATE_FIT" : informational ? "P2_SUPPORTING_GUIDE" : "P1_PRODUCT_FIT",
    priorityBasis: "Editorial fit and conversion proximity only; no invented traffic, volume, difficulty or rank score",
    relatedKeywords: englishGap ? ["Arabic social media management software", "Windows social media management tool"] : ["برنامج تسويق إلكتروني عربي", "برنامج سوشيال ميديا للويندوز"].filter(k => k !== keyword),
    conversionIntent: informational ? "Read useful guide, then evaluate related product task" : "Understand product requirements, inspect genuine images, then evaluate trial",
    validationStatus: "OWNER_SEED_CANDIDATE_NOT_MEASURED_DEMAND" };
}
const keywordRecords = Object.entries(countries).flatMap(([country, keywords]) => keywords.map(keyword => record(keyword, country, target(keyword))))
  .concat(Object.keys(countries).flatMap(country => longTail.map(([keyword, url]) => record(keyword, country, url, url.startsWith("/guides/")))));
const urlMap = [
  { url: "/", primaryIntent: "Overall Sky Pro Windows product and actual trial/annual offer", type: "Commercial product", ownership: "One shared Arabic product page; no copied country pages" },
  { url: "/platforms", primaryIntent: "Discover and filter currently documented platform tools", type: "Commercial catalog", ownership: "Catalog discovery, not a copy of each detail page" },
  ...Object.values(platformPages).map(p => ({ url: "/platforms/" + p.id, primaryIntent: p.heroTitle, type: "Platform product detail", ownership: "Current visible tools, requirements and genuine platform media; no assumed operation outcome" })),
  { url: "/guides", primaryIntent: "Discover practical evaluation and preparation guides", type: "Editorial catalog", ownership: "Article discovery rather than broad product claims" },
  ...guideArticles.map(a => ({ url: "/guides/" + a.slug, primaryIntent: a.intent, primaryKeyword: a.primaryKeyword, type: "Informational guide", productDestinations: a.productLinks.map(l => l.href), ownership: "Answer the practical question; link to commercial detail instead of repeating its landing copy" })),
];
const intentReviews = [
  { pages: ["/", "/platforms"], classification: "Legitimate Separate Page", reason: "Overall product/offer versus platform discovery/filtering" },
  { pages: ["/platforms/google", "/platforms/google-maps"], classification: "Duplicate URL", decision: "Existing 308 alias verified; retain canonical Google Maps route" },
  { pages: ["/platforms/google-maps", "/platforms/olx"], classification: "Legitimate Separate Page", reason: "Different services/tasks; independent missing-OLX state, no shared Google screenshot" },
  { pages: ["/platforms/telegram", "/platforms/telegram-premium"], classification: "Intent Overlap", decision: "Keep distinct product units and explicitly explain Premium requirements; never imply a paid Telegram subscription is supplied" },
  { pages: ["/platforms/instagram", "/platforms/threads"], classification: "Legitimate Separate Page", reason: "Different product units, account/task context and source images" },
  { pages: ["/platforms/accounts", "/platforms/security"], classification: "Legitimate Separate Page", reason: "Account naming/input form versus session interval settings; no invented security certification" },
  { pages: ["/guides/name-and-add-platform-accounts", "/guides/multi-account-work-handover"], classification: "Legitimate Separate Page", reason: "Choose/name an account before a task versus transfer evidence/status between people" },
  { pages: ["/guides/whatsapp-message-test", "/guides/contact-list-quality-check", "/guides/smtp-test-message-checklist"], classification: "Legitimate Separate Page", reason: "Single consented WhatsApp message, list provenance/quality and SMTP-provider test are different workflows" },
  { pages: ["/guides/software-or-social-media-agency", "/guides/windows-or-cloud-marketing-tool", "/guides/two-day-trial-checklist"], classification: "Legitimate Separate Page", reason: "Buy a tool versus hire work; device/team requirements; actual trial evaluation plan" },
  { pages: ["All platform details", "Their related guides"], classification: "Intentional Shared Component", reason: "Product pages document tool availability; guides provide preparation/evaluation worksheets. Shared navigation and product-image references are intentional, not evidence of duplicate main text." },
];
const result = { reviewDate: "2026-10-23", status: "EDITORIAL_MAPPING_WITH_EXPLICIT_MEASUREMENT_GAPS", markets: Object.keys(countries),
  measurement: { GSC: "NOT_CONNECTED", KeywordPlanner: "NOT_CONNECTED", GA4: "NOT_CONFIGURED_ON_LIVE_BASELINE", Trends: "NOT_VERIFIED", internalSearchLogs: "NOT_AVAILABLE", actualConversions: "NOT_VERIFIED" },
  methods: ["Three saved Google browser country-hint observations", "Additional country-worded web searches and primary vendor page inspection", "Owner seed terms and actual product/content intent review"],
  keywords: keywordRecords, urlMap, intentReviews,
  policy: ["One primary destination per intent cluster", "Do not claim cloud scheduling/team approval as SkyPro features", "English keywords are validation gaps, not English pages", "No country offices, SAR/AED offers or hreflang alternates invented", "Do not infer keyword cannibalization from text similarity alone"],
  ongoingVerification: "Use authorized GSC/Bing/analytics data after connection to revise priorities and compare impressions, clicks, actual trials and qualified registrations by country; no ranking guarantee" };
fs.writeFileSync("../docs/research/keyword-url-map-20261023.json", JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ keywords: keywordRecords.length, canonicalIntentDestinations: urlMap.length, reviewedIntentGroups: intentReviews.length, measuredDemandClaimed: false }));
