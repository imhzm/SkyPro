const test = require("node:test");
const assert = require("node:assert/strict");
const { inspectHTML, validatePage, validateAnchor } = require("./audit-web-seo.cjs");
const { loadData } = require("./route-inventory.cjs");
const { platformPages } = loadData("src/data/platform-pages.ts");
const { platformImage } = loadData("src/data/platform-media.ts");
let original;
test.before(async () => {
  const response = await fetch((process.env.CHECK_ORIGIN || "http://localhost:3102") + "/platforms/facebook");
  assert.equal(response.status, 200);
  original = inspectHTML(await response.text());
});
const options = () => ({ route: "/platforms/facebook", expected: platformPages.facebook, image: platformImage("facebook") });
const clone = () => structuredClone(original);
test("actual SSR page passes before fault injection", () => assert.deepEqual(validatePage(original, options()), []));
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
