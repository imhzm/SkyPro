const fs = require("node:fs");
const path = require("node:path");
const { loadData } = require("./route-inventory.cjs");
const { platformPages, getPlatformIds } = loadData("src/data/platform-pages.ts");
const { platformImage } = loadData("src/data/platform-media.ts");
const { publishedGuides } = loadData("src/data/articles/index.ts");
const { getProductShot } = loadData("src/data/platform-media.ts");
const site = "https://skypro.skywaveads.com";
const sameUrl = (a, b) => { try { return new URL(a).href === new URL(b).href; } catch { return false; } };
function decode(value = "") {
  return value.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => String.fromCodePoint(n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n)))
    .replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}
const text = value => decode(value.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m => [m[1].toLowerCase(), decode(m[2] ?? m[3])]));
}
function flattenSchemas(value) {
  return (Array.isArray(value) ? value : [value]).flatMap(node => [node, ...(node["@graph"] ? flattenSchemas(node["@graph"]) : [])]);
}
function inspectHTML(html) {
  const markup = html.replace(/<script\b[^>]*>.*?<\/script>/gs, "").replace(/<style\b[^>]*>.*?<\/style>/gs, "");
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map(m => decode(m[1]));
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map(m => attributes(m[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map(m => attributes(m[0]));
  const schemas = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
    .flatMap(m => flattenSchemas(JSON.parse(m[1])));
  const visible = text(html.replace(/<script\b[^>]*>.*?<\/script>/gs, "").replace(/<style\b[^>]*>.*?<\/style>/gs, ""));
  return { title: text(html.match(/<title>(.*?)<\/title>/s)?.[1] || ""),
    h1: [...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gs)].map(m => text(m[1])),
    descriptions: metas.filter(m => m.name === "description").map(m => m.content),
    canonicals: links.filter(l => l.rel === "canonical").map(l => l.href),
    robots: metas.filter(m => m.name === "robots").map(m => m.content),
    ogImages: metas.filter(m => m.property === "og:image").map(m => m.content),
    twitterImages: metas.filter(m => m.name === "twitter:image").map(m => m.content),
    alternates: links.filter(l => l.hreflang), schemas, visible,
    anchors: [...html.matchAll(/<a\b([^>]*)>(.*?)<\/a>/gs)].map(m => ({ ...attributes(m[1]), label: text(m[2]) })),
    ids: new Set(ids), duplicateIds: [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))] };
}
function validatePage(page, options) {
  const issues = [], expected = options.expected;
  if (page.duplicateIds.length) issues.push("DUPLICATE_ID");
  if (page.h1.length !== 1) issues.push("H1_COUNT");
  if (page.canonicals.length !== 1 || !sameUrl(page.canonicals[0], site + options.route)) issues.push("CANONICAL");
  if (page.descriptions.length !== 1 || !page.descriptions[0]) issues.push("DESCRIPTION");
  if (!page.title) issues.push("TITLE");
  if (options.private && !page.robots.some(r => /\bnoindex\b/i.test(r))) issues.push("PRIVATE_INDEXABLE");
  if (!options.private && page.robots.some(r => /\bnoindex\b/i.test(r))) issues.push("PUBLIC_NOINDEX");
  if (!options.private) {
    const validSocialImage = values => values.length > 0 && values.every(value => {
      try { return new URL(value).protocol === "https:"; } catch { return false; }
    });
    if (!validSocialImage(page.ogImages)) issues.push("PUBLIC_OG_IMAGE");
    if (!validSocialImage(page.twitterImages)) issues.push("PUBLIC_TWITTER_IMAGE");
  }
  if (expected) {
    if (page.title !== expected.metaTitle || page.h1[0] !== expected.heroTitle || page.descriptions[0] !== expected.metaDescription) issues.push("DATA_METADATA_MISMATCH");
    const faq = page.schemas.filter(s => s["@type"] === "FAQPage");
    const actual = faq[0]?.mainEntity?.map(q => ({ question: q.name, answer: q.acceptedAnswer?.text }));
    if (faq.length !== 1 || JSON.stringify(actual) !== JSON.stringify(expected.faq)) issues.push("FAQ_SCHEMA_MISMATCH");
    if (expected.faq.some(f => !page.visible.includes(f.question) || !page.visible.includes(f.answer))) issues.push("FAQ_NOT_VISIBLE");
    const webpage = page.schemas.find(s => s["@type"] === "WebPage");
    if (webpage?.url !== site + options.route || webpage?.description !== expected.metaDescription) issues.push("WEBPAGE_SCHEMA_MISMATCH");
    const images = options.image ? [site + options.image] : [];
    if (JSON.stringify(page.ogImages) !== JSON.stringify(images) || JSON.stringify(page.twitterImages) !== JSON.stringify(images)) issues.push("WRONG_SOCIAL_IMAGE");
  }
  if (options.guide) {
    const guide = options.guide, schema = page.schemas.filter(s => s["@type"] === "Article");
    if (page.title !== guide.title + " | Sky Pro" || page.h1[0] !== guide.title || page.descriptions[0] !== guide.description) issues.push("GUIDE_METADATA_MISMATCH");
    if (schema.length !== 1 || schema[0].headline !== guide.title || schema[0].description !== guide.description
      || schema[0].mainEntityOfPage?.["@id"] !== site + options.route || schema[0].datePublished !== guide.publishedAt
      || schema[0].dateModified !== guide.updatedAt || schema[0].author?.name !== guide.author.name) issues.push("ARTICLE_SCHEMA_MISMATCH");
    if (!page.visible.includes(guide.author.name)) issues.push("ARTICLE_AUTHOR_NOT_VISIBLE");
    if (guide.intro.some(p => !page.visible.includes(p)) || guide.sections.some(s => !page.visible.includes(s.heading) || s.paragraphs.some(p => !page.visible.includes(p)))) issues.push("ARTICLE_BODY_NOT_VISIBLE");
    const cover = getProductShot(guide.coverShot);
    if (JSON.stringify(page.ogImages) !== JSON.stringify([site + cover.src]) || JSON.stringify(page.twitterImages) !== JSON.stringify([site + cover.src])) issues.push("WRONG_ARTICLE_IMAGE");
  }
  if (page.schemas.some(s => /AggregateRating|Review/.test(String(s["@type"])))) issues.push("UNVERIFIED_SOCIAL_PROOF_SCHEMA");
  if (options.route !== "/" && page.schemas.some(s => s["@type"] === "SoftwareApplication")) issues.push("SOFTWARE_SCHEMA_ON_NONPRODUCT_PAGE");
  if (page.alternates.length) issues.push("UNREVIEWED_LANGUAGE_ALTERNATE");
  if (options.rendered) {
    const rendered = options.rendered;
    if (page.title !== rendered.title || page.h1[0] !== rendered.h1 || page.canonicals[0] !== rendered.canonical || page.descriptions[0] !== rendered.description || JSON.stringify(page.ogImages) !== JSON.stringify(rendered.ogImages)) issues.push("SSR_BROWSER_MISMATCH");
  }
  return issues;
}
function validateAnchor(anchor) {
  return !anchor.href || /^\s*(?:javascript:|#\s*$)/i.test(anchor.href) ? "BROKEN_CTA" : null;
}
async function audit() {
  const origin = process.env.CHECK_ORIGIN || "http://localhost:3102";
  const renderedPath = process.env.RENDERED_CONTENT;
  const rendered = renderedPath ? JSON.parse(fs.readFileSync(renderedPath, "utf8")) : [];
  const routes = ["/", "/platforms", "/privacy", "/terms", "/security/policy", "/security/hall-of-fame", ...getPlatformIds().map(id => "/platforms/" + id), "/guides", ...publishedGuides.map(article => "/guides/" + article.slug)];
  const errors = [], pages = [], internal = new Set(), sourcePages = new Map();
  async function request(route) { return fetch(origin + route, { redirect: "manual", signal: AbortSignal.timeout(10000) }); }
  for (const route of routes) {
    const response = await request(route), html = await response.text(), page = inspectHTML(html);
    sourcePages.set(route, page);
    const id = route.split("/")[2], expected = platformPages[id];
    const issues = validatePage(page, { route, expected, image: expected ? platformImage(id) : null,
      guide: publishedGuides.find(article => route === "/guides/" + article.slug), rendered: rendered.find(r => r.path === route) });
    if (response.status !== 200) issues.push("HTTP_STATUS_" + response.status);
    for (const anchor of page.anchors) {
      const issue = validateAnchor(anchor); if (issue) issues.push(issue);
      if (anchor.href?.startsWith("/") && !anchor.href.startsWith("//")) internal.add(anchor.href);
      if (anchor.href?.startsWith("#") && !page.ids.has(anchor.href.slice(1))) issues.push("MISSING_LOCAL_ANCHOR:" + anchor.href);
    }
    for (const issue of issues) errors.push({ route, issue });
    pages.push({ route, status: response.status, title: page.title, h1: page.h1, canonical: page.canonicals,
      description: page.descriptions, schemaTypes: page.schemas.map(s => s["@type"]), ogImages: page.ogImages,
      twitterImages: page.twitterImages, ssrBrowserCompared: rendered.some(r => r.path === route), issues });
  }
  const canonicalGroups = new Map();
  for (const page of pages) for (const canonical of page.canonical) {
    const group = canonicalGroups.get(canonical) || []; group.push(page.route); canonicalGroups.set(canonical, group);
  }
  for (const [canonical, paths] of canonicalGroups) if (paths.length > 1) errors.push({ canonical, paths, issue: "DUPLICATE_CANONICAL" });
  const internalLinks = [];
  for (const href of [...internal].sort()) {
    const url = new URL(href, site), route = url.pathname + url.search;
    const response = await request(route); const status = response.status, type = response.headers.get("content-type");
    // Only HTML bodies need fragment checks; cancel binary download responses.
    let target = sourcePages.get(url.pathname);
    if (url.hash && !target && /text\/html/i.test(type || "")) target = inspectHTML(await response.text());
    else await response.body?.cancel();
    const issues = [];
    if (status < 200 || status >= 400) issues.push("BROKEN_INTERNAL_LINK");
    if (url.hash && target && !target.ids.has(decodeURIComponent(url.hash.slice(1)))) issues.push("MISSING_TARGET_ANCHOR");
    internalLinks.push({ href, status, contentType: type, issues });
    for (const issue of issues) errors.push({ href, issue });
  }
  const privatePages = [];
  for (const route of ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password", "/auth/verify-email", "/auth/register-success", "/auth/callback", "/auth/email-change/confirm"]) {
    const response = await request(route), page = inspectHTML(await response.text());
    const noindex = page.robots.some(r => /\bnoindex\b/i.test(r)) || /noindex/i.test(response.headers.get("x-robots-tag") || "");
    privatePages.push({ route, status: response.status, robots: page.robots, noindex });
    if (!noindex) errors.push({ route, issue: "PRIVATE_INDEXABLE" });
  }
  const sitemapResponse = await request("/sitemap.xml"), sitemap = await sitemapResponse.text();
  const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => decode(m[1]));
  if (sitemapResponse.status !== 200 || sitemapUrls.length !== routes.length || routes.some(route => !sitemapUrls.includes(site + route))) errors.push({ issue: "SITEMAP_ROUTE_MISMATCH" });
  if (sitemapUrls.some(url => /\/(?:auth|admin|dashboard)(?:\/|$)/.test(new URL(url).pathname))) errors.push({ issue: "PRIVATE_SITEMAP_URL" });
  const robotsResponse = await request("/robots.txt"), robots = await robotsResponse.text();
  const requiredDisallows = ["/admin", "/api", "/dashboard", "/auth/callback", "/auth/verify-email", "/auth/reset-password"];
  if (robotsResponse.status !== 200 || requiredDisallows.some(route => !robots.includes("Disallow: " + route))) errors.push({ issue: "ROBOTS_PRIVATE_RULE_MISSING" });
  return { createdAt: new Date().toISOString(), origin, pages, internalLinks, privatePages,
    sitemap: { status: sitemapResponse.status, urls: sitemapUrls, lastmodCount: [...sitemap.matchAll(/<lastmod>/g)].length },
    robots: { status: robotsResponse.status, requiredDisallows, note: "Rules are not an auth boundary or an indexing guarantee" },
    errors, passed: !errors.length, limits: ["Authenticated dashboard/admin metadata covered by role fixture checks separately", "Rendered comparison uses the saved actual DOM supplied to this run", "No GSC/Bing index or search appearance claim"] };
}
if (require.main === module) audit().then(report => {
  const output = process.env.CHECK_OUTPUT || "../.tmp/web-seo-audit.json";
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ pages: report.pages.length, internalLinks: report.internalLinks.length,
    privatePages: report.privatePages.length, ssrBrowserComparisons: report.pages.filter(p => p.ssrBrowserCompared).length, errors: report.errors, passed: report.passed }));
  if (report.errors.length) process.exitCode = 1;
}).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { inspectHTML, validatePage, validateAnchor };
