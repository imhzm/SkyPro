const test = require("node:test");
const assert = require("node:assert/strict");
const { loadData } = require("./route-inventory.cjs");
const { getPlatformIds } = loadData("src/data/platform-pages.ts");
const { guideArticles } = loadData("src/data/articles/index.ts");
const { platformGuideSlugs, getPlatformGuides } = loadData("src/data/platform-guides.ts");

test("curated guide references resolve to distinct articles with the matching product relationship", () => {
  const platforms = new Set(getPlatformIds());
  for (const [platform, slugs] of Object.entries(platformGuideSlugs)) {
    assert.ok(platforms.has(platform), "Unknown platform: " + platform);
    assert.equal(new Set(slugs).size, slugs.length, "Repeated guide: " + platform);
    assert.ok(slugs.length > 0 && slugs.length <= 3);
    for (const slug of slugs) {
      const article = guideArticles.find(guide => guide.slug === slug);
      assert.ok(article, "Unknown article: " + slug);
      assert.ok(article.productLinks.some(link => link.href === "/platforms/" + platform), "Unrelated guide: " + platform + "/" + slug);
    }
    for (const article of getPlatformGuides(platform)) assert.equal(article.status, "published");
  }
  for (const unknown of ["unknown-platform", "toString", "__proto__"]) assert.deepEqual(getPlatformGuides(unknown), []);
});
