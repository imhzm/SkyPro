const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const names = ["facebook-friend-extraction-tool.png", "facebook-leads-data-export.png", "skypro-pro-subscription-card.png", "skypro-main-dashboard-live-data.png", "skypro-multi-platform-dashboard.png"];
(async () => {
  const origin = process.env.CHECK_ORIGIN || "http://localhost:3102", results = [];
  for (const name of names) {
    assert(fs.existsSync("source-media/restricted/" + name), "Original must be retained");
    assert(!fs.existsSync("public/images/app/" + name), "Original must not be public");
    const source = "/images/app/" + name;
    const direct = await fetch(origin + source); await direct.body?.cancel();
    assert.equal(direct.status, 404, name);
    const variants = [];
    for (const quality of [75, 90]) {
      const response = await fetch(origin + "/_next/image?url=" + encodeURIComponent(source) + "&w=640&q=" + quality);
      await response.body?.cancel();
      assert.equal(response.status, 400, "Legacy optimizer access must fail: " + name);
      variants.push({ quality, status: response.status });
    }
    results.push({ name, retainedOutsidePublic: true, originalStatus: direct.status, optimizedVariants: variants });
  }
  const report = { checkedAt: new Date().toISOString(), origin, results, passed: true,
    limitation: "Does not revoke historical Git, browser or external proxy copies; no license validity check or rotation was performed" };
  const output = process.env.CHECK_OUTPUT || "../.tmp/restricted-media.json";
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ originalsRetained: results.length, originalAndOptimizerRejections: results.length * 3, passed: true }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
