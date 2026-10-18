const fs = require("node:fs");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const ts = require("typescript");
function prose(source) {
  const tree = ts.createSourceFile(
    "page.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const words = [];
  function walk(node) {
    if (ts.isJsxText(node)) words.push(node.getText(tree));
    if (
      ts.isJsxAttribute(node) &&
      ["title", "href"].includes(node.name.getText(tree)) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer)
    )
      words.push(node.initializer.text);
    ts.forEachChild(node, walk);
  }
  walk(tree);
  return words
    .join(" ")
    .replaceAll("+20 10 6789 4321", "+201029934356")
    .replaceAll("201067894321", "201029934356")
    .replace(/\s+/g, " ")
    .trim();
}
for (const slug of ["privacy", "terms"]) {
  const file = `skypro-web/src/app/(marketing)/${slug}/page.tsx`;
  const before = execFileSync("git", ["show", `2e798e9:${file}`], {
    encoding: "utf8",
  });
  assert.equal(
    prose(fs.readFileSync(file.slice(11), "utf8")),
    prose(before),
    `${slug}: legal copy changed`,
  );
}
console.log(
  "Privacy and terms text/link invariance passed; only approved phone substitution.",
);
