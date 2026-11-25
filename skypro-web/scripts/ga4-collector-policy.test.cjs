const assert = require("node:assert/strict");
const { test } = require("node:test");

test("the site policy permits GA4 regional collectors without broadening script sources", async () => {
  const { default: config } = await import("../next.config.mjs");
  const routes = await config.headers();
  const site = routes.find(({ source }) => source === "/:path*");
  const header = site.headers.find(({ key }) => key === "Content-Security-Policy");
  const directives = Object.fromEntries(header.value.split(";").map((part) => {
    const [name, ...sources] = part.trim().split(/\s+/);
    return [name, sources];
  }));

  const expectedCollectors = [
    "https://*.google-analytics.com",
    "https://analytics.google.com",
    "https://*.analytics.google.com",
  ];
  const analyticsHosts = directives["connect-src"].filter((source) => /analytics/.test(source));
  assert.deepEqual(analyticsHosts.sort(), expectedCollectors.sort());

  for (const directive of ["connect-src", "script-src", "script-src-elem"]) {
    assert(!directives[directive].some((source) => ["*", "https:", "https://*.google.com", "https://*.g.doubleclick.net"].includes(source)));
  }
  for (const directive of ["script-src", "script-src-elem"]) {
    assert(!directives[directive].some((source) => expectedCollectors.includes(source)));
  }
});
