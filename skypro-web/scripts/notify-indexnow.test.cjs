const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), os = require("node:os");
const { SITE, ENDPOINT, KEY_LOCATION, buildPlan, publicReport, reserveReport, notify } = require("./notify-indexnow.cjs");
const key = "a".repeat(64);
const manifest = () => ({ version: 1, reviewedSource: "b".repeat(40), expectedBuildId: "reviewed-build",
  changeReason: "Relevant published guide links added to this platform page", urlList: [SITE + "/platforms/accounts"] });
function fixture(options = {}) {
  const calls = [];
  return { calls, fetcher: async (url, init = {}) => {
    calls.push({ url, init });
    if (init.method === "POST") {
      if (options.networkFailure) throw Error("simulated transport failure");
      return new Response(null, { status: options.providerStatus || 200 });
    }
    if (url === SITE + "/") return new Response(options.build || options.rootHtml || "reviewed-build", { headers: { "content-type": "text/html" } });
    if (url === KEY_LOCATION) return new Response(options.key || key + "\n", { headers: { "content-type": options.keyType || "text/plain" } });
    if (url === SITE + "/sitemap.xml") return new Response(`<urlset><url><loc>${options.sitemapUrl || SITE + "/platforms/accounts"}</loc></url></urlset>`, { headers: { "content-type": "application/xml" } });
    return new Response(options.html || `<html><head><link href='${url}' rel='canonical'><meta content='index, follow' name='robots'></head><body>Published page</body></html>`,
      { status: options.pageStatus || 200, headers: { "content-type": "text/html", ...(options.headers || {}) } });
  }};
}

test("private, foreign, credential, query, fragment and normalized URLs cannot enter an IndexNow payload", () => {
  for (const url of [SITE + "/auth/login", SITE + "/api/auth/me", SITE + "/admin", SITE + "/dashboard", SITE + "/guides/draft?token=secret", SITE + "/platforms/accounts#private",
    "https://skywaveads.com/platforms/accounts", "http://skypro.skywaveads.com/platforms/accounts", "https://user:password@skypro.skywaveads.com/platforms/accounts", SITE + "/platforms/../admin", SITE + "/platforms/%61ccounts"]) {
    assert.throws(() => buildPlan({ ...manifest(), urlList: [url] }, key));
  }
  assert.throws(() => buildPlan({ ...manifest(), urlList: [SITE + "/", SITE + "/"] }, key), /Duplicate/);
});

test("source/build/change information and a bounded nonempty changeset are mandatory", () => {
  for (const patch of [{ reviewedSource: "main" }, { expectedBuildId: "" }, { changeReason: "" }, { urlList: [] }, { urlList: Array(101).fill(SITE + "/") }]) {
    assert.throws(() => buildPlan({ ...manifest(), ...patch }, key));
  }
});

test("a successful notification uses one fixed endpoint after all public page checks and does not claim indexing", async () => {
  const plan = buildPlan(manifest(), key), f = fixture();
  const result = await notify(plan, f.fetcher);
  assert.equal(f.calls.filter(c => c.init.method === "POST").length, 1);
  assert.equal(f.calls.at(-1).url, ENDPOINT);
  assert.deepEqual(JSON.parse(f.calls.at(-1).init.body), { host: "skypro.skywaveads.com", key, keyLocation: KEY_LOCATION, urlList: manifest().urlList });
  assert.equal(result.outcome, "RECEIVED_NOT_INDEXING_PROOF");
  assert.equal(result.preflight.pages.length, 1);
  assert(!JSON.stringify(publicReport(plan, "plan")).includes(key));
});

test("the homepage self-canonical accepts the equivalent origin without a trailing slash", async () => {
  const plan = buildPlan({ ...manifest(), urlList: [SITE + "/"] }, key);
  const f = fixture({ sitemapUrl: SITE + "/", rootHtml: `<script>reviewed-build</script><link rel='canonical' href='${SITE}'>` });
  const result = await notify(plan, f.fetcher);
  assert.equal(result.accepted, true);
  assert.equal(result.preflight.pages[0].url, SITE + "/");
  assert.equal(f.calls.filter(c => c.init.method === "POST").length, 1);
});

test("a wrong build, missing/wrong key, wrong MIME, redirect or sitemap exclusion prevents every POST", async () => {
  for (const options of [{ build: "wrong-build" }, { key: "wrong-key" }, { keyType: "text/html" }, { pageStatus: 302 }, { sitemapUrl: SITE + "/platforms/whatsapp" }]) {
    const f = fixture(options);
    await assert.rejects(notify(buildPlan(manifest(), key), f.fetcher));
    assert.equal(f.calls.filter(c => c.init.method === "POST").length, 0);
  }
});

test("noindex headers/meta, missing or mismatched canonical and client refresh prevent notification", async () => {
  for (const options of [
    { headers: { "x-robots-tag": "noindex" } },
    { html: `<link rel='canonical' href='${manifest().urlList[0]}'><meta NAME='ROBOTS' CONTENT='noindex, follow'>` },
    { html: `<link rel='canonical' href='${manifest().urlList[0]}'><meta name='robots' content='none'>` },
    { html: "<h1>No canonical</h1>" },
    { html: `<link rel='canonical' href='${SITE}/'>` },
    { html: `<link rel='canonical' href='${manifest().urlList[0]}'><meta http-equiv='refresh' content='0;url=/auth/login'>` },
  ]) {
    const f = fixture(options);
    await assert.rejects(notify(buildPlan(manifest(), key), f.fetcher));
    assert.equal(f.calls.filter(c => c.init.method === "POST").length, 0);
  }
});

test("202 remains key-validation-pending and a quota rejection never causes an automatic retry", async () => {
  for (const [status, outcome] of [[202, "RECEIVED_KEY_VALIDATION_PENDING"], [429, "REJECTED_REVIEW_BEFORE_RETRY"]]) {
    const f = fixture({ providerStatus: status }), result = await notify(buildPlan(manifest(), key), f.fetcher);
    assert.equal(result.outcome, outcome);
    assert.equal(result.accepted, status === 202);
    assert.equal(f.calls.filter(c => c.init.method === "POST").length, 1);
  }
});

test("a failed POST transport is not automatically retried or recorded as accepted", async () => {
  const f = fixture({ networkFailure: true });
  await assert.rejects(notify(buildPlan(manifest(), key), f.fetcher), /transport failure/);
  assert.equal(f.calls.filter(c => c.init.method === "POST").length, 1);
});

test("an existing receipt cannot be overwritten, preserving an interrupted submission for review", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "skypro-indexnow-")), file = path.join(dir, "receipt.json");
  try {
    reserveReport(file);
    fs.writeFileSync(file, '{"outcome":"SENDING_REVIEW_IF_INTERRUPTED"}');
    assert.throws(() => reserveReport(file), /EEXIST/);
    assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).outcome, "SENDING_REVIEW_IF_INTERRUPTED");
  } finally { fs.unlinkSync(file); fs.rmdirSync(dir); }
});
