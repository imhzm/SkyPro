const test = require("node:test");
const assert = require("node:assert/strict");
const { inspectHTML, validatePage, validateAnchor } = require("./audit-web-seo.cjs");
const { loadData } = require("./route-inventory.cjs");
const { platformPages } = loadData("src/data/platform-pages.ts");
const { platformImage } = loadData("src/data/platform-media.ts");
const { getPlatformGuides } = loadData("src/data/platform-guides.ts");
let original;
test.before(async () => {
  const response = await fetch((process.env.CHECK_ORIGIN || "http://localhost:3102") + "/platforms/facebook");
  assert.equal(response.status, 200);
  original = inspectHTML(await response.text());
});
const options = () => ({ route: "/platforms/facebook", expected: platformPages.facebook, image: platformImage("facebook") });
const clone = () => structuredClone(original);
test("actual SSR page passes before fault injection", () => assert.deepEqual(validatePage(original, options()), []));

test("a guide link outside main cannot satisfy contextual navigation", () => {
  const guides = getPlatformGuides("facebook");
  assert.ok(guides.length);
  assert.deepEqual(validatePage(original, { ...options(), platformGuides: guides }), []);
  const page = clone();
  const href = "/guides/" + guides[0].slug;
  assert.ok(page.anchors.some(anchor => anchor.href === href));
  page.mainAnchors = page.mainAnchors.filter(anchor => anchor.href !== href);
  assert.ok(validatePage(page, { ...options(), platformGuides: guides }).includes("MISSING_CONTEXTUAL_GUIDE:" + guides[0].slug));
});

test("contextual links require the descriptive article title and a followed link", () => {
  const guides = getPlatformGuides("facebook");
  for (const mutation of [{ label: "اقرأ المزيد" }, { rel: "nofollow" }]) {
    const page = clone();
    const anchor = page.mainAnchors.find(link => link.href === "/guides/" + guides[0].slug);
    assert.ok(anchor);
    Object.assign(anchor, mutation);
    assert.ok(validatePage(page, { ...options(), platformGuides: guides }).includes("INVALID_CONTEXTUAL_GUIDE:" + guides[0].slug));
  }
});

test("public pages without platform-specific expectations still require social images", () => {
  const page = clone();
  page.ogImages = [];
  page.twitterImages = [];
  const issues = validatePage(page, { route: "/platforms/facebook" });
  assert(issues.includes("PUBLIC_OG_IMAGE"));
  assert(issues.includes("PUBLIC_TWITTER_IMAGE"));
});

test("public social images reject unsafe URLs and allow valid alternatives", () => {
  const alternatives = clone();
  alternatives.ogImages.push("https://skypro.skywaveads.com/opengraph-image");
  assert.deepEqual(validatePage(alternatives, { route: "/platforms/facebook" }), []);
  for (const url of ["javascript:alert(1)", "http://example.com/image.png", "/relative.png", "invalid"])
    for (const property of ["ogImages", "twitterImages"]) {
      const page = clone(); page[property] = [url];
      assert(validatePage(page, { route: "/platforms/facebook" }).includes(property === "ogImages" ? "PUBLIC_OG_IMAGE" : "PUBLIC_TWITTER_IMAGE"));
    }
});
test("duplicate/wrong canonicals fail independently of unique content", () => {
  const duplicate = clone(); duplicate.canonicals.push(duplicate.canonicals[0]);
  assert(validatePage(duplicate, options()).includes("CANONICAL"));
  const wrong = clone(); wrong.canonicals = ["https://skypro.skywaveads.com/platforms/instagram"];
  assert(validatePage(wrong, options()).includes("CANONICAL"));
});
test("private indexability cannot pass because content exists", async () => {
  const response = await fetch((process.env.CHECK_ORIGIN || "http://localhost:3102") + "/auth/login");
  const page = inspectHTML(await response.text());
  assert(!validatePage(page, { route: "/auth/login", private: true }).includes("PRIVATE_INDEXABLE"));
  page.robots = ["index, follow"];
  assert(validatePage(page, { route: "/auth/login", private: true }).includes("PRIVATE_INDEXABLE"));
});
test("FAQ hidden from visible HTML or changed only in schema fails", () => {
  const hidden = clone(); hidden.visible = hidden.visible.replace(platformPages.facebook.faq[0].answer, "");
  assert(validatePage(hidden, options()).includes("FAQ_NOT_VISIBLE"));
  const mismatch = clone(); mismatch.schemas.find(s => s["@type"] === "FAQPage").mainEntity[0].acceptedAnswer.text = "إجابة مخترعة";
  assert(validatePage(mismatch, options()).includes("FAQ_SCHEMA_MISMATCH"));
});
test("SSR/browser mismatch fails even with a valid SSR canonical", () => {
  const rendered = { title: original.title + " changed", h1: original.h1[0], canonical: original.canonicals[0], description: original.descriptions[0], ogImages: original.ogImages };
  assert(validatePage(original, { ...options(), rendered }).includes("SSR_BROWSER_MISMATCH"));
});
test("empty or javascript CTA fails; valid registration anchor passes", () => {
  for (const href of ["", "#", "javascript:void(0)"]) assert.equal(validateAnchor({ href }), "BROKEN_CTA");
  assert.equal(validateAnchor({ href: "/auth/register" }), null);
});
