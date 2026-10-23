const fs = require("node:fs");
const path = require("node:path");
const { loadData } = require("./route-inventory.cjs");
const { normalize, shingles, jaccard } = require("./audit-content-similarity.cjs");
const { guideArticles, publishedGuides, getPublishedGuide } = loadData("src/data/articles/index.ts");
const { productShots } = loadData("src/data/platform-media.ts");
const { getPlatformIds } = loadData("src/data/platform-pages.ts");
const plan = JSON.parse(fs.readFileSync("../docs/research/article-plan-20261022.json", "utf8"));
const validPaths = new Set(["/", "/platforms", "/auth/register", ...getPlatformIds().map(id => "/platforms/" + id)]);

function articleText(article) {
  return [...article.intro, ...article.sections.flatMap(section => [
    section.heading, ...section.paragraphs, ...(section.bullets || []),
    ...(section.table?.rows.flat() || []), ...(section.example?.paragraphs || []),
  ])].join("\n");
}
function audit() {
  const errors = [], cautions = [];
  const seen = new Set(), titles = new Set(), descriptions = new Set();
  const allSlugs = new Set(guideArticles.map(article => article.slug));
  const articles = guideArticles.map(article => {
    const fail = message => errors.push({ slug: article.slug, message });
    if (seen.has(article.slug) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) fail("Duplicate or unsafe slug");
    seen.add(article.slug);
    if (titles.has(article.title) || descriptions.has(article.description)) fail("Duplicate title or description");
    titles.add(article.title); descriptions.add(article.description);
    if (!article.title || !article.description || !article.intent || !article.primaryKeyword) fail("Missing editorial metadata");
    if (!productShots[article.coverShot] || !article.coverCaption) fail("Missing registered cover/caption");
    if (!article.author.name || !article.author.url || article.author.type !== "Organization") fail("Unverified author type");
    if (!article.sources.length) fail("No primary sources");
    const sourceIds = new Set(article.sources.map(source => source.id));
    for (const source of article.sources) if (!source.title || !source.href.startsWith("https://")) fail("Invalid source");
    const sectionIds = new Set();
    for (const section of article.sections) {
      if (!section.id || sectionIds.has(section.id) || !section.heading || !section.paragraphs.length) fail("Invalid/duplicate section");
      sectionIds.add(section.id);
      for (const id of section.sourceIds || []) if (!sourceIds.has(id)) fail("Unknown source reference: " + id);
      if (section.table?.rows.some(row => row.length !== section.table.columns.length)) fail("Invalid table cells");
    }
    if (!article.sections.some(section => section.example?.paragraphs.length)) fail("No original practical example");
    for (const slug of article.relatedSlugs) if (slug === article.slug || !allSlugs.has(slug)) fail("Unresolved related article: " + slug);
    for (const href of [article.cta.href, ...article.productLinks.map(link => link.href)])
      if (!validPaths.has(href.split("#")[0])) fail("Unknown internal destination: " + href);
    if (article.status === "draft" && (getPublishedGuide(article.slug) || publishedGuides.some(a => a.slug === article.slug))) fail("Draft leaked into public registry");
    if (article.status === "published" && !article.publishedAt) fail("Published date missing");
    if (article.status === "draft" && article.publishedAt) fail("Draft falsely labelled with publication date");
    const text = articleText(article), words = normalize(text).split(" ").length;
    if (/TODO|TBD|lorem ipsum|اكتب هنا|محتوى المقال هنا/i.test(text)) fail("Placeholder text");
    if (words < 350) cautions.push({ slug: article.slug, message: "Short draft requires depth review", words });
    return { slug: article.slug, title: article.title, status: article.status, words, sections: article.sections.length,
      examples: article.sections.filter(s => s.example).length, primarySources: article.sources.length,
      coverShot: article.coverShot, intent: article.intent, canonicalCandidate: "https://skypro.skywaveads.com/guides/" + article.slug,
      relatedSlugs: article.relatedSlugs };
  });
  const missing = plan.articles.filter(article => !allSlugs.has(article.slug)).map(article => article.slug);
  if (missing.length) errors.push({ message: "Planned articles absent", missing });
  const tokens = guideArticles.map(article => shingles(articleText(article)));
  const pairs = [];
  for (let i = 0; i < guideArticles.length; i++) for (let j = i + 1; j < guideArticles.length; j++) {
    const score = jaccard(tokens[i], tokens[j]);
    pairs.push({ a: guideArticles[i].slug, b: guideArticles[j].slug, score: Number(score.toFixed(4)) });
  }
  const highSimilarity = pairs.filter(pair => pair.score >= 0.8);
  if (highSimilarity.length) errors.push({ message: "Textually duplicated drafts require review", highSimilarity });
  return { createdAt: new Date().toISOString(), scope: "Authored data only; no frontend, schema, screenshot or publication acceptance inferred",
    bodyDrafts: articles.length, published: publishedGuides.length, totalWords: articles.reduce((n, a) => n + a.words, 0),
    articles, similarity: { method: "Arabic normalized 4-word shingle Jaccard", comparisons: pairs.length, highSimilarity,
      topPairs: pairs.sort((a, b) => b.score - a.score).slice(0, 10), intentReview: "REQUIRES_EDITORIAL_REVIEW" },
    errors, cautions, contentContractsPassed: !errors.length, finalAccepted: false,
    remainingGates: ["Final editorial/intent acceptance", "Final responsive/functional evidence review", "Owner Preview/publication approval"] };
}
if (require.main === module) {
  const report = audit(), output = process.env.CHECK_OUTPUT || "../.tmp/guide-content-audit.json";
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ bodyDrafts: report.bodyDrafts, published: report.published, words: report.totalWords,
    errors: report.errors, cautions: report.cautions, comparisons: report.similarity.comparisons, topPair: report.similarity.topPairs[0] }));
  if (report.errors.length) process.exitCode = 1;
}
module.exports = { audit, articleText };
