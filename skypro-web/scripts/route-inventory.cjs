const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");

// Import the real TS data without booting Next or relying on duplicated IDs.
function loadData(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
  return mod.exports;
}
const expected = [
  "/",
  "/platforms",
  "/platforms/[id]",
  "/privacy",
  "/terms",
  "/security/policy",
  "/security/hall-of-fame",
  ...[
    "login",
    "register",
    "forgot-password",
    "reset-password",
    "verify-email",
    "email-change/confirm",
    "register-success",
    "callback",
  ].map((s) => `/auth/${s}`),
  ...["", "activity", "billing", "devices", "settings"].map(
    (s) => `/dashboard${s ? "/" + s : ""}`,
  ),
  ...[
    "",
    "users",
    "keys",
    "devices",
    "subscriptions",
    "billing",
    "invoices",
    "payments",
    "offers",
    "broadcast",
    "audit-log",
    "settings",
  ].map((s) => `/admin${s ? "/" + s : ""}`),
];
function scan(dir, leaf) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? scan(path.join(dir, e.name), leaf)
        : e.name === leaf
          ? [path.join(dir, e.name)]
          : [],
    );
}
function route(file, leaf) {
  return (
    "/" +
    path
      .relative("src/app", file)
      .replaceAll("\\", "/")
      .split("/")
      .filter((s) => s !== leaf && !s.startsWith("("))
      .join("/")
  );
}
async function inventory() {
  const origin = process.env.CHECK_ORIGIN;
  const output = process.env.CHECK_OUTPUT || "../route-inventory.json";
  const pages = scan("src/app", "page.tsx").map((f) => ({
    file: f.replaceAll("\\", "/"),
    route: route(f, "page.tsx"),
  }));
  const actual = pages.map((p) => p.route);
  const missing = expected.filter((r) => !actual.includes(r));
  const unexpected = actual.filter((r) => !expected.includes(r));
  const ids = loadData("src/data/platform-pages.ts").getPlatformIds();
  const expanded = pages.flatMap((p) =>
    p.route.includes("[id]")
      ? ids.map((id) => ({ ...p, route: p.route.replace("[id]", id) }))
      : [p],
  );
  const apis = scan("src/app", "route.ts").map((f) => ({
    file: f.replaceAll("\\", "/"),
    route: route(f, "route.ts"),
    methods: [
      ...fs
        .readFileSync(f, "utf8")
        .matchAll(
          /export (?:async )?function (GET|POST|PUT|PATCH|DELETE|HEAD)\b/g,
        ),
    ].map((m) => m[1]),
  }));
  const results = [];
  if (origin) {
    // Sequential requests avoid overwhelming authentication rate limits.
    for (const p of expanded
      .concat([
        { route: "/platforms/google-maps" },
        { route: "/platforms/google" },
        { route: "/platforms/send-emails" },
        { route: "/platforms/auto-point" },
      ])
      .filter((p, i, a) => a.findIndex((x) => x.route === p.route) === i)) {
      const r = await fetch(origin + p.route, { redirect: "manual" });
      const html = await r.text();
      const protectedRoute = /^\/(admin|dashboard)(\/|$)/.test(p.route);
      const redirectExpected =
        protectedRoute &&
        [302, 303, 307, 308].includes(r.status) &&
        /auth\/login/.test(r.headers.get("location") || "");
      const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
      const h1 = html
        .match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]
        ?.replace(/<[^>]+>/g, "");
      // Next serializes fallback trees into RSC even on successful pages.
      // Match rendered title/H1, not strings inside serialized error boundaries.
      const notFound =
        r.status === 404 ||
        /المنصة غير موجودة|الصفحة غير موجودة|404: This page could not be found/.test(
          `${title} ${h1}`,
        );
      const runtimeError =
        r.status >= 500 ||
        /Internal Server Error|Application error:|حدث خطأ غير متوقع/.test(
          `${title} ${h1}`,
        );
      results.push({
        route: p.route,
        status: r.status,
        location: r.headers.get("location"),
        title: html.match(/<title>([\s\S]*?)<\/title>/)?.[1],
        h1: html
          .match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]
          ?.replace(/<[^>]+>/g, ""),
        notFound,
        runtimeError,
        classification: redirectExpected
          ? "protected-guest-redirect"
          : notFound
            ? "missing"
            : runtimeError || r.status >= 500
              ? "runtime-error"
              : r.status === 200
                ? "rendered-public"
                : r.status >= 300 && r.status < 400
                  ? "redirect"
                  : "http-error",
      });
    }
  }
  const report = {
    createdAt: new Date().toISOString(),
    origin: origin || null,
    pageFiles: pages.length,
    expected,
    actual,
    missing,
    unexpected,
    platformIds: ids,
    expandedPages: expanded,
    apis,
    results,
  };
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify({
      pageFiles: pages.length,
      expanded: expanded.length,
      apiRoutes: apis.length,
      missing,
      unexpected,
      states: results.reduce(
        (a, r) => ((a[r.classification] = (a[r.classification] || 0) + 1), a),
        {},
      ),
    }),
  );
  if (missing.length || unexpected.length) process.exitCode = 1;
}
if (require.main === module)
  inventory().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
module.exports = { loadData, scan, route, expected };
