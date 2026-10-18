// Real HTTP/auth/RBAC checks against the isolated fixture DB and loopback app.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { scan, route, loadData, expected } = require("./route-inventory.cjs");
const origin = process.env.CHECK_ORIGIN || "http://localhost:3102";
const target = new URL(origin),
  db = new URL(process.env.DATABASE_URL || "");
require("./theme-fixture-runtime.cjs").requireFixture();
assert(
  ["localhost", "127.0.0.1"].includes(target.hostname) &&
    ["localhost", "127.0.0.1"].includes(db.hostname) &&
    db.pathname === "/skypro_theme_fixture",
  "Local fixture only",
);
const meta = JSON.parse(
  fs.readFileSync(path.resolve("../.tmp/theme-fixture-meta.json"), "utf8"),
);
class Client {
  constructor(role) {
    this.role = role;
    this.cookies = new Map();
  }
  async request(url, options = {}) {
    const fixtureIp = `192.0.2.${10 + ([...this.role].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 200)}`;
    const headers = {
      origin,
      "sec-fetch-site": "same-origin",
      "x-forwarded-for": fixtureIp,
      cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      ...options.headers,
    };
    const response = await fetch(origin + url, {
      ...options,
      headers,
      redirect: "manual",
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";"),
        split = pair.indexOf("="),
        name = pair.slice(0, split),
        value = pair.slice(split + 1);
      if (value) this.cookies.set(name, value);
      else this.cookies.delete(name);
    }
    return response;
  }
  async json(url, method = "GET", body) {
    const r = await this.request(url, {
      method,
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, body: await r.json() };
  }
  async login(email, password = "ThemeFixture42!Local", code = "") {
    const csrf = await this.json("/api/auth/csrf");
    assert.equal(csrf.status, 200);
    const r = await this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      body: new URLSearchParams({
        csrfToken: csrf.body.csrfToken,
        email,
        password,
        code,
        callbackUrl: origin + "/dashboard",
      }),
    });
    await r.text();
    return this.json("/api/auth/me");
  }
}
const report = {
  origin,
  localOnly: true,
  createdAt: new Date().toISOString(),
  routes: [],
  apis: [],
  forms: [],
};
const output = process.env.CHECK_OUTPUT || "../.tmp/site-verification.json";
const record = () => fs.writeFileSync(output, JSON.stringify(report, null, 2));
async function verifySite() {
  const data = loadData("src/data/platform-pages.ts"),
    pageFiles = scan("src/app", "page.tsx");
  const actual = pageFiles.map((f) => route(f, "page.tsx"));
  assert.deepEqual(
    actual.slice().sort(),
    expected.slice().sort(),
    "Expected page files differ from actual routes",
  );
  const pages = actual.flatMap((r) =>
    r === "/platforms/[id]"
      ? data.getPlatformIds().map((id) => "/platforms/" + id)
      : [r],
  );
  const visitor = new Client("visitor"),
    customer = new Client("customer"),
    admin = new Client("admin");
  for (const client of [customer, admin]) {
    const auth = await client.login(meta.users[client.role].email);
    assert.equal(auth.status, 200);
    assert.equal(
      auth.body.data.role,
      client.role === "admin" ? "admin" : "user",
    );
  }
  const suspended = new Client("suspended");
  assert.equal((await suspended.login(meta.users.suspended.email)).status, 401);
  const badPassword = new Client("invalid-password");
  assert.equal(
    (await badPassword.login(meta.users.other.email, "WrongFixture42!")).status,
    401,
  );
  report.forms.push({
    name: "credentials-login",
    customer: true,
    admin: true,
    suspendedRejected: true,
    incorrectPasswordRejected: true,
  });
  record();
  const exemptAuth = [
    "/auth/callback",
    "/auth/verify-email",
    "/auth/reset-password",
    "/auth/email-change/confirm",
  ];
  for (const client of [visitor, customer, admin]) {
    for (const page of pages) {
      const r = await client.request(page),
        html = await r.text(),
        location = r.headers.get("location");
      const title = html.match(/<title>(.*?)<\/title>/s)?.[1] || "";
      const shouldRedirect =
        (/^\/(dashboard|admin)/.test(page) && client.role === "visitor") ||
        (page.startsWith("/admin") && client.role === "customer") ||
        (page.startsWith("/auth/") &&
          !exemptAuth.includes(page) &&
          client.role !== "visitor");
      const result = {
        role: client.role,
        route: page,
        status: r.status,
        location,
        title,
        serverError: r.status >= 500,
      };
      report.routes.push(result);
      record();
      if (shouldRedirect) {
        assert(
          [302, 303, 307, 308].includes(r.status),
          `${client.role} ${page} must redirect`,
        );
        assert(location, `${page} redirect target missing`);
      } else {
        assert.equal(r.status, 200, `${client.role} ${page}`);
        assert(
          !/غير موجودة|Internal Server Error|Application error/.test(title),
          `${page} error title`,
        );
      }
    }
    console.log(`${client.role}: ${pages.length} page responses verified`);
  }
  const adminGets = scan("src/app/api/admin", "route.ts")
    .filter((f) =>
      /export async function GET\(/.test(fs.readFileSync(f, "utf8")),
    )
    .map((f) => route(f, "route.ts").replace("[id]", String(meta.keyId)));
  for (const endpoint of adminGets) {
    const url =
      endpoint === "/api/admin/export" ? endpoint + "?type=users" : endpoint;
    for (const client of [visitor, customer, admin]) {
      const r = await client.request(url),
        contentType = r.headers.get("content-type") || "";
      const content = await r.text();
      report.apis.push({
        role: client.role,
        route: url,
        status: r.status,
        contentType,
      });
      record();
      assert.equal(
        r.status,
        client.role === "admin" ? 200 : 403,
        `${client.role} ${url}`,
      );
      if (client.role === "admin" && contentType.includes("json"))
        assert.equal(JSON.parse(content).success, true, url);
    }
  }
  for (const endpoint of [
    "/api/account/activity",
    "/api/account/notifications",
    "/api/account/api-keys",
    `/api/account/invoices/${meta.invoiceId}/download`,
  ]) {
    const allowed = await customer.request(endpoint),
      denied = await visitor.request(endpoint);
    await allowed.arrayBuffer();
    await denied.arrayBuffer();
    report.apis.push(
      { role: "customer", route: endpoint, status: allowed.status },
      { role: "visitor", route: endpoint, status: denied.status },
    );
    record();
    assert.equal(allowed.status, 200, endpoint);
    assert.equal(denied.status, 401, endpoint + " guest");
  }
  const other = new Client("other");
  assert.equal((await other.login(meta.users.other.email)).status, 200);
  const foreign = await other.request(
    `/api/account/invoices/${meta.invoiceId}/download`,
  );
  assert([403, 404].includes(foreign.status));
  report.forms.push({
    name: "invoice-ownership",
    crossAccountAccessRejected: true,
  });
  const invalidProfile = await customer.json("/api/account/profile", "PATCH", {
    name: "",
  });
  assert.equal(invalidProfile.status, 400);
  const profile = await customer.json("/api/account/profile", "PATCH", {
    name: "عميل اختبار — تم الحفظ",
  });
  assert.equal(profile.status, 200);
  assert(profile.body.success);
  assert.equal(
    (await customer.json("/api/auth/me")).body.data.name,
    "عميل اختبار — تم الحفظ",
  );
  await customer.json("/api/account/profile", "PATCH", {
    name: "عميل اختبار محلي",
  });
  report.forms.push({
    name: "profile-save",
    invalidRejected: true,
    persistedAndReadBack: true,
  });
  const wrongSetting = await admin.json("/api/admin/settings", "POST", {
    key: "key_price",
    value: "-1",
  });
  assert.equal(wrongSetting.status, 400);
  const settings = await admin.json("/api/admin/settings", "POST", {
    settings: {
      key_price: "2000",
      key_currency: "EGP",
      key_duration_days: "365",
      trial_days: "2",
      max_devices: "1",
      max_resets_per_year: "2",
    },
  });
  assert.equal(settings.status, 200);
  assert(settings.body.success);
  const saved = await admin.json("/api/admin/settings");
  assert.equal(saved.body.data.key_price, "2000");
  assert.equal(saved.body.data.trial_days, "2");
  report.forms.push({
    name: "settings-save",
    invalidRejected: true,
    annualPrice: 2000,
    trialDays: 2,
  });
  const rejected = await customer.json("/api/admin/settings", "POST", {
    key: "key_price",
    value: "1",
  });
  assert.equal(rejected.status, 403);
  report.forms.push({ name: "admin-mutation-rbac", customerRejected: true });
  const csrf = await admin.request("/api/admin/settings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://example.invalid",
      "sec-fetch-site": "cross-site",
    },
    body: JSON.stringify({ key: "key_price", value: "1" }),
  });
  assert.equal(csrf.status, 403);
  report.forms.push({ name: "cross-site-mutation", rejected: true });
  const health = await visitor.json("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.services.database.status, "operational");
  report.databaseOperational = true;
  const sitemap = await (await visitor.request("/sitemap.xml")).text();
  assert(!/\/(?:auth|dashboard|admin)\//.test(sitemap));
  for (const id of data.getPlatformIds())
    assert(sitemap.includes("/platforms/" + id));
  report.sitemapPublicOnly = true;
  report.success = true;
  record();
  console.log(
    JSON.stringify({
      success: true,
      pageChecks: report.routes.length,
      apiChecks: report.apis.length,
      formChecks: report.forms.length,
      dbOperational: true,
    }),
  );
}
if (require.main === module)
  verifySite().catch((e) => {
    report.success = false;
    report.error = e.message;
    record();
    console.error(e.message);
    process.exitCode = 1;
  });
module.exports = { Client, origin, meta };
