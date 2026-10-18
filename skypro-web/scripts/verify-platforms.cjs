const assert = require("node:assert/strict"),
  fs = require("node:fs");
const { loadData } = require("./route-inventory.cjs");
const { platformPages, getPlatformIds } = loadData(
  "src/data/platform-pages.ts",
);
const { platformMedia } = loadData("src/data/platform-media.ts");
(async () => {
  const origin = process.env.CHECK_ORIGIN || "http://localhost:3102";
  const results = [];
  for (const id of getPlatformIds()) {
    const data = platformPages[id],
      media = platformMedia[id];
    assert(media, `No real media for ${id}`);
    for (const image of [media.hero, ...media.gallery])
      assert(
        fs.existsSync(`public/images/app/${image}.png`),
        `Missing image ${image}`,
      );
    const r = await fetch(origin + "/platforms/" + id);
    const html = await r.text();
    const title = html.match(/<title>(.*?)<\/title>/)?.[1];
    const h1 = html
      .match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1]
      ?.replace(/<[^>]+>/g, "");
    const schemas = [
      ...html.matchAll(
        /<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs,
      ),
    ].flatMap((m) => JSON.parse(m[1]));
    const entry = {
      id,
      status: r.status,
      title,
      h1,
      canonical: html.includes(
        `rel="canonical" href="https://skypro.skywaveads.com/platforms/${id}"`,
      ),
      noRatings: !JSON.stringify(schemas).includes("AggregateRating"),
      faq: schemaCount(schemas, "FAQPage"),
    };
    results.push(entry);
    assert.equal(r.status, 200, id);
    assert.equal(title, data.metaTitle, id);
    assert(h1?.includes(data.arabicName), id);
    assert(entry.canonical && entry.noRatings && entry.faq === 1, id);
  }
  const alias = await fetch(origin + "/platforms/google", {
    redirect: "manual",
  });
  assert.equal(alias.status, 308);
  assert(alias.headers.get("location")?.endsWith("/platforms/google-maps"));
  const absent = await fetch(origin + "/platforms/does-not-exist", {
    redirect: "manual",
  });
  const absentHtml = await absent.text();
  assert(
    absent.status === 404 || /<title>[^<]*(غير موجودة|404)/.test(absentHtml),
  );
  const list = await (await fetch(origin + "/platforms")).text();
  for (const id of getPlatformIds())
    assert(list.includes(`href="/platforms/${id}"`), `Undiscoverable ${id}`);
  fs.writeFileSync(
    process.env.CHECK_OUTPUT || "../.tmp/platform-verification.json",
    JSON.stringify(
      {
        origin,
        results,
        googleAlias: {
          status: alias.status,
          location: alias.headers.get("location"),
        },
        unknownPlatformStatus: absent.status,
        catalogContainsAllIds: true,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      platformsPassed: results.length,
      mediaValid: true,
      catalogLinks: true,
      googleAlias: 308,
      unknownPlatform: absent.status,
    }),
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
function schemaCount(schemas, type) {
  return schemas.filter((s) => s["@type"] === type).length;
}
