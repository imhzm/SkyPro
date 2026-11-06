// Owner-operated publication tool. Not imported by the application or a cron job.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");

const SITE = "https://skypro.skywaveads.com";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const KEY_LOCATION = SITE + "/indexnow.txt";
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

function buildPlan(manifest, key) {
  assert(manifest?.version === 1, "Manifest version must be 1");
  assert(/^[a-f0-9]{40}$/.test(manifest.reviewedSource || ""), "Reviewed release SHA required");
  assert(/^[A-Za-z0-9_-]{1,100}$/.test(manifest.expectedBuildId || ""), "Expected published build ID required");
  assert(typeof manifest.changeReason === "string" && manifest.changeReason.trim().length >= 10
    && manifest.changeReason.length <= 500, "Describe the actual content change");
  assert(/^[a-f0-9]{64}$/.test(key), "Expected 64-character public verification key");
  assert(Array.isArray(manifest.urlList) && manifest.urlList.length > 0
    && manifest.urlList.length <= 100, "Supply 1–100 changed public URLs");
  const urlList = manifest.urlList.map((value, i) => {
    assert(typeof value === "string", "URL must be text at index " + i);
    let url;
    try { url = new URL(value); } catch { throw Error("Invalid URL at index " + i); }
    const publicPath = /^(?:\/|\/(?:privacy|terms)|\/security\/(?:policy|hall-of-fame)|\/(?:platforms|guides)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?)$/;
    assert(url.origin === SITE && !url.username && !url.password && !url.search && !url.hash
      && value === url.href && publicPath.test(url.pathname), "Noncanonical or nonpublic URL at index " + i);
    return value;
  });
  assert(new Set(urlList).size === urlList.length, "Duplicate URLs are not a content change");
  return {
    reviewedSource: manifest.reviewedSource,
    expectedBuildId: manifest.expectedBuildId,
    changeReason: manifest.changeReason.trim(),
    keyFingerprint: hash(key),
    payload: { host: new URL(SITE).host, key, keyLocation: KEY_LOCATION, urlList },
  };
}

function publicReport(plan, mode) {
  return {
    at: new Date().toISOString(), mode, site: SITE, endpoint: ENDPOINT,
    reviewedSource: plan.reviewedSource, expectedBuildId: plan.expectedBuildId,
    changeReason: plan.changeReason, keyLocation: KEY_LOCATION, keyFingerprint: plan.keyFingerprint,
    urlList: plan.payload.urlList,
    limits: ["Reviewed source SHA is operator-supplied; use the exact-source deployment acceptance first",
      "Only recently created/updated, published, self-canonical pages are supported by this tool",
      "Receipt or key verification does not prove crawling, indexing, ranking or AI inclusion"],
  };
}

function reserveReport(file) {
  // Existing/ambiguous receipts require review; a repeated command must not POST again.
  const fd = fs.openSync(file, "wx");
  fs.closeSync(fd);
}

function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .map(m => [m[1].toLowerCase(), (m[2] ?? m[3]).replace(/&amp;/g, "&")]));
}

async function getText(url, kind, maxBytes, fetcher) {
  const response = await fetcher(url, { redirect: "manual", credentials: "omit", signal: AbortSignal.timeout(15000) });
  assert(response.status === 200, kind + " HTTP status must be 200");
  const type = response.headers.get("content-type") || "";
  const mime = kind === "Key" ? /^text\/plain(?:;|$)/i : kind === "Sitemap" ? /\bxml\b/i : /^text\/html(?:;|$)/i;
  assert(mime.test(type), kind + " content type mismatch");
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    assert(size <= maxBytes, kind + " response exceeds limit");
    chunks.push(Buffer.from(chunk));
  }
  return { text: Buffer.concat(chunks).toString("utf8"), response };
}

async function preflight(plan, fetcher = fetch) {
  const root = await getText(SITE + "/", "Page", 2_000_000, fetcher);
  assert(root.text.includes(plan.expectedBuildId), "Published build differs from reviewed manifest");
  const key = await getText(KEY_LOCATION, "Key", 512, fetcher);
  assert(key.text.trim() === plan.payload.key, "Published key differs from local file");
  const sitemap = await getText(SITE + "/sitemap.xml", "Sitemap", 512_000, fetcher);
  const listed = new Set([...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, "&")));
  const pages = [];
  for (const url of plan.payload.urlList) {
    assert(listed.has(url), "Changed URL missing from current public sitemap");
    const page = await getText(url, "Page", 2_000_000, fetcher);
    const links = [...page.text.matchAll(/<link\b[^>]*>/gi)].map(m => attrs(m[0]));
    const canonicals = links.filter(a => a.rel?.toLowerCase() === "canonical");
    assert(canonicals.length === 1 && canonicals[0].href === url, "Changed page must be self-canonical");
    const metas = [...page.text.matchAll(/<meta\b[^>]*>/gi)].map(m => attrs(m[0]));
    assert(!metas.some(m => /^(robots|bingbot|googlebot)$/i.test(m.name || "") && /\b(?:noindex|none)\b/i.test(m.content || ""))
      && !/\b(?:noindex|none)\b/i.test(page.response.headers.get("x-robots-tag") || ""), "Changed page is noindex");
    assert(!metas.some(m => m["http-equiv"]?.toLowerCase() === "refresh"), "Changed page is a client redirect");
    pages.push({ url, status: 200, selfCanonical: true, noindex: false });
  }
  return { publishedBuildMatched: true, publishedKeyMatched: true, sitemapMembershipMatched: true, pages };
}

async function notify(plan, fetcher = fetch, beforePost = () => {}) {
  const checked = await preflight(plan, fetcher);
  beforePost(checked);
  // One endpoint, one request, no automatic retry or broad site resubmission.
  const response = await fetcher(ENDPOINT, {
    method: "POST", redirect: "manual", credentials: "omit", signal: AbortSignal.timeout(20000),
    headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(plan.payload),
  });
  if (response.body) await response.body.cancel().catch(() => {});
  return {
    preflight: checked, providerHttpStatus: response.status,
    outcome: response.status === 200 ? "RECEIVED_NOT_INDEXING_PROOF"
      : response.status === 202 ? "RECEIVED_KEY_VALIDATION_PENDING" : "REJECTED_REVIEW_BEFORE_RETRY",
    accepted: response.status === 200 || response.status === 202,
  };
}

async function main(argv) {
  const allowed = new Set(["--manifest", "--output", "--plan", "--check", "--submit"]);
  const opts = {}, modes = [];
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    assert(allowed.has(flag) && !Object.hasOwn(opts, flag), "Unknown or repeated argument");
    if (["--plan", "--check", "--submit"].includes(flag)) { modes.push(flag.slice(2)); opts[flag] = true; }
    else { assert(argv[i + 1] && !argv[i + 1].startsWith("--"), "Missing argument value"); opts[flag] = argv[++i]; }
  }
  assert(modes.length <= 1 && opts["--manifest"] && opts["--output"],
    "Usage: node scripts/notify-indexnow.cjs --manifest changes.json --output new-receipt.json [--plan|--check|--submit]");
  const mode = modes[0] || "plan";
  const manifest = JSON.parse(fs.readFileSync(opts["--manifest"], "utf8"));
  const key = fs.readFileSync(path.join(__dirname, "../public/indexnow.txt"), "utf8").trim();
  const plan = buildPlan(manifest, key), output = path.resolve(opts["--output"]);
  reserveReport(output);
  let report = { ...publicReport(plan, mode), outcome: "PLANNED_NO_NETWORK_OR_NOTIFICATION" }, attempted = false;
  const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  save();
  try {
    if (mode === "check") report = { ...report, preflight: await preflight(plan), outcome: "CHECKED_NO_NOTIFICATION" };
    if (mode === "submit") report = { ...report, ...await notify(plan, fetch, checked => {
      attempted = true; report = { ...report, preflight: checked, outcome: "SENDING_REVIEW_IF_INTERRUPTED" }; save();
    }) };
  } catch (error) {
    report = { ...report, outcome: attempted ? "UNKNOWN_REVIEW_BEFORE_RETRY" : "BLOCKED_BEFORE_NOTIFICATION", error: error.message };
    process.exitCode = 1;
  }
  save();
  if (mode === "submit" && !report.accepted) process.exitCode = 1;
  console.log(JSON.stringify({ mode, outcome: report.outcome, urls: plan.payload.urlList.length, output }));
}

if (require.main === module) main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { SITE, ENDPOINT, KEY_LOCATION, buildPlan, publicReport, reserveReport, preflight, notify };
