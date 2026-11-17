const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFile } = require("node:fs/promises");
const { test } = require("node:test");

test("immutable Cairo routes refer to the audited, content-fingerprinted files", async () => {
  const { default: config } = await import("../next.config.mjs");
  const cairo = require("../public/fonts/cairo/provenance.json");
  const assets = [cairo.stylesheet, ...cairo.files];
  const cairoRoutes = (await config.headers()).filter(({ source }) => source.startsWith("/fonts/cairo/"));
  assert.ok(assets.length > 1);
  assert.deepEqual(cairoRoutes.map(({ source }) => source).sort(), assets.map(({ publicPath }) => publicPath).sort());

  for (const { file, publicPath, sha256 } of assets) {
    assert.equal(publicPath, `/fonts/cairo/${file}`);
    assert.match(file, /^cairo-(?:v\d+|arabic|latin(?:-ext)?)-[0-9a-f]{12}\.(?:css|woff2)$/);
    const bytes = await readFile(`${__dirname}/../public${publicPath}`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), sha256);
    assert.ok(file.includes(`-${sha256.slice(0, 12)}.`));
    const route = cairoRoutes.find(({ source }) => source === publicPath);
    assert.deepEqual(route.headers, [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]);
  }
});
