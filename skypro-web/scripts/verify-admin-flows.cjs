const assert = require("node:assert/strict"),
  fs = require("node:fs");
const { Client, origin, meta } = require("./verify-site.cjs");
const { scan, route } = require("./route-inventory.cjs");
const prisma = require("./theme-fixture-runtime.cjs").client(),
  report = {
    origin,
    localOnly: true,
    realPayments: false,
    checks: [],
    mutationDenials: [],
  };
const output =
  process.env.CHECK_OUTPUT || "../.tmp/admin-flow-verification.json";
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2));
function pass(name, details = {}) {
  report.checks.push({ name, passed: true, ...details });
  save();
  console.log(name + ": passed");
}
async function expect(client, url, method, body, status = 200) {
  const result = await client.json(url, method, body);
  assert.equal(
    result.status,
    status,
    `${method} ${url}: ${JSON.stringify(result.body)}`,
  );
  assert(result.body.success, `${method} ${url}`);
  return result.body.data;
}
async function main() {
  const admin = new Client("admin-form-fixture"),
    customer = new Client("customer-form-fixture"),
    visitor = new Client("visitor-form-fixture");
  assert.equal((await admin.login(meta.users.admin.email)).status, 200);
  assert.equal((await customer.login(meta.users.customer.email)).status, 200);
  for (const file of scan("src/app/api/admin", "route.ts")) {
    const endpoint = route(file, "route.ts").replace(
      "[id]",
      String(meta.keyId),
    );
    const methods = [
      ...fs
        .readFileSync(file, "utf8")
        .matchAll(/export async function (POST|PUT|PATCH|DELETE)\(/g),
    ].map((m) => m[1]);
    for (const method of methods)
      for (const client of [visitor, customer]) {
        const r = await client.json(endpoint, method, {});
        assert.equal(r.status, 403, `${client.role} ${method} ${endpoint}`);
        report.mutationDenials.push({
          role: client.role,
          method,
          endpoint,
          status: r.status,
        });
        save();
      }
  }
  pass("all-admin-mutations-reject-visitor-and-customer", {
    checks: report.mutationDenials.length,
  });
  const email = `admin-created-${Date.now()}@theme-fixture.invalid`;
  const created = await expect(admin, "/api/admin/users", "POST", {
    name: "مستخدم اختبار إداري محلي",
    email,
    sendEmail: true,
  });
  const userId = created.user.id;
  assert(created.emailSent);
  pass("admin-create-user-and-local-welcome-email");
  const listed = await admin.json(
    "/api/admin/users?search=" + encodeURIComponent(email),
  );
  assert.equal(listed.status, 200);
  assert(JSON.stringify(listed.body).includes(email));
  await expect(admin, "/api/admin/users", "PUT", {
    id: userId,
    name: "تم تحديث مستخدم الاختبار",
    maxDevices: 3,
  });
  assert.equal(
    (await prisma.user.findUnique({ where: { id: userId } })).name,
    "تم تحديث مستخدم الاختبار",
  );
  pass("user-search-and-update");
  await expect(admin, "/api/admin/users", "PUT", {
    id: userId,
    status: "suspended",
    suspensionReason: "اختبار محلي فقط",
  });
  assert.equal(
    (await prisma.user.findUnique({ where: { id: userId } })).status,
    "suspended",
  );
  await expect(admin, "/api/admin/users", "PUT", {
    id: userId,
    status: "active",
  });
  assert.equal(
    (await prisma.user.findUnique({ where: { id: userId } })).status,
    "active",
  );
  pass("user-suspend-and-reactivate");
  const keys = await expect(admin, "/api/admin/keys", "POST", {
    userId,
    count: 2,
    plan: "pro",
    durationDays: 30,
    maxDevices: 2,
  });
  assert.equal(keys.keys.length, 2);
  const keyId = keys.keys[0].id,
    secondKeyId = keys.keys[1].id;
  await expect(admin, `/api/admin/keys/${keyId}`, "PUT", {
    maxDevices: 3,
    plan: "pro",
    expiresAt: new Date(Date.now() + 31 * 86400000).toISOString(),
  });
  assert.equal(
    (await prisma.activationKey.findUnique({ where: { id: keyId } }))
      .maxDevices,
    3,
  );
  pass("activation-key-generate-and-update");
  const grant = await expect(admin, "/api/admin/users/grant-access", "POST", {
    userId,
    type: "paid",
    price: 2000,
    currency: "EGP",
    plan: "pro",
    durationDays: 365,
    maxDevices: 1,
    createInvoice: true,
    markPaid: true,
    paymentMethod: "bank_transfer",
    notes: "سجل تجريبي محلي بلا دفع فعلي",
    sendEmail: true,
  });
  const subscription = await prisma.subscription.findUnique({
    where: { id: grant.subscription.id },
  });
  assert.equal(subscription.status, "active");
  assert.equal(subscription.amount, 2000);
  assert(grant.invoice && grant.payment);
  pass("grant-access-transaction", {
    amount: 2000,
    currency: "EGP",
    realCharge: false,
  });
  await expect(admin, "/api/admin/subscriptions", "PUT", {
    id: subscription.id,
    status: "suspended",
    autoRenew: false,
  });
  assert.equal(
    (await prisma.subscription.findUnique({ where: { id: subscription.id } }))
      .status,
    "suspended",
  );
  await expect(admin, "/api/admin/subscriptions", "PUT", {
    id: subscription.id,
    status: "active",
  });
  pass("subscription-status-update");
  const invoice = await expect(
    admin,
    "/api/admin/invoices",
    "POST",
    {
      userId,
      subscriptionId: subscription.id,
      subtotal: 100,
      taxAmount: 14,
      discountAmount: 4,
      currency: "EGP",
      notes: "فاتورة اختبار محلية فقط",
    },
    201,
  );
  assert.equal(invoice.totalAmount, 110);
  await expect(admin, "/api/admin/invoices", "PUT", {
    id: invoice.id,
    status: "issued",
    notes: "تمت مراجعة سجل الاختبار",
  });
  assert.equal(
    (await prisma.invoice.findUnique({ where: { id: invoice.id } })).status,
    "issued",
  );
  pass("invoice-create-calculate-and-update");
  const payment = await expect(
    admin,
    "/api/admin/payments",
    "POST",
    {
      userId,
      subscriptionId: subscription.id,
      invoiceId: invoice.id,
      provider: "fixture",
      providerRef: "fixture-" + Date.now(),
      amount: 110,
      currency: "EGP",
      method: "bank_transfer",
      status: "paid",
    },
    201,
  );
  assert.equal(
    (await prisma.invoice.findUnique({ where: { id: invoice.id } })).status,
    "paid",
  );
  await expect(admin, "/api/admin/payments", "PUT", {
    id: payment.id,
    status: "refunded",
  });
  assert.equal(
    (await prisma.payment.findUnique({ where: { id: payment.id } })).status,
    "refunded",
  );
  pass("payment-record-and-status", { realTransfer: false });
  const offer = await expect(admin, "/api/admin/offers", "POST", {
    title: "عرض اختبار محلي غير منشور",
    description: "سجل لمراجعة النموذج فقط",
    externalUrl: "https://example.invalid/theme-fixture",
    isActive: false,
    sortOrder: 99,
    imageUrl: null,
    badge: "اختبار",
  });
  await expect(admin, "/api/admin/offers", "POST", {
    id: offer.id,
    title: "عرض اختبار معدل غير منشور",
    externalUrl: "https://example.invalid/theme-fixture",
    isActive: false,
  });
  const publicOffers = await visitor.json("/api/offers");
  assert(
    !JSON.stringify(publicOffers.body).includes("عرض اختبار معدل غير منشور"),
  );
  await expect(admin, "/api/admin/offers", "DELETE", { id: offer.id });
  assert.equal(
    await prisma.offer.findUnique({ where: { id: offer.id } }),
    null,
  );
  pass("inactive-offer-create-update-remove", { hiddenFromPublic: true });
  const broadcast = await expect(
    admin,
    "/api/admin/notifications/broadcast",
    "POST",
    {
      title: "إشعار اختبار محلي",
      body: "مخصص لمستخدم الاختبار وحده",
      audience: "specific",
      userIds: [userId],
      type: "info",
      link: origin + "/dashboard",
    },
  );
  assert.equal(broadcast.delivered, 1);
  assert(
    await prisma.notification.findFirst({
      where: { userId, title: "إشعار اختبار محلي" },
    }),
  );
  pass("targeted-notification");
  const device = await prisma.device.create({
    data: {
      userId,
      keyId,
      deviceFingerprint: "admin-fixture-device-" + Date.now(),
      deviceName: "جهاز اختبار إداري",
      isActive: true,
    },
  });
  await expect(admin, "/api/admin/devices?id=" + device.id, "DELETE");
  assert.equal(
    (await prisma.device.findUnique({ where: { id: device.id } })).isActive,
    false,
  );
  pass("device-reset-local-fixture");
  await expect(admin, "/api/admin/users/bulk", "POST", {
    ids: [userId],
    action: "suspend",
    reason: "اختبار محلي",
  });
  assert.equal(
    (await prisma.user.findUnique({ where: { id: userId } })).status,
    "suspended",
  );
  await expect(admin, "/api/admin/users/bulk", "POST", {
    ids: [userId],
    action: "activate",
  });
  assert.equal(
    (await prisma.user.findUnique({ where: { id: userId } })).status,
    "active",
  );
  pass("bulk-user-state-actions");
  const impersonator = new Client("admin-impersonation-fixture");
  assert.equal((await impersonator.login(meta.users.admin.email)).status, 200);
  await expect(impersonator, "/api/admin/users/impersonate", "POST", {
    userId,
  });
  assert.equal((await impersonator.json("/api/auth/me")).body.data.id, userId);
  assert.equal((await impersonator.json("/api/admin/stats")).status, 403);
  assert.equal(
    (
      await impersonator.json("/api/admin/users", "PUT", {
        id: userId,
        name: "must not change",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await impersonator.request("/api/admin/users/impersonate", {
        method: "DELETE",
        headers: {
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          origin: "https://example.invalid",
        },
      })
    ).status,
    403,
  );
  const originalCookie = impersonator.cookies.get("sp_impersonation");
  impersonator.cookies.set("sp_impersonation", "tampered");
  assert.equal(
    (await impersonator.json("/api/admin/users/impersonate", "DELETE")).status,
    403,
  );
  impersonator.cookies.set("sp_impersonation", originalCookie);
  await expect(impersonator, "/api/admin/users/impersonate", "DELETE");
  assert.equal(
    (await impersonator.json("/api/auth/me")).body.data.role,
    "admin",
  );
  pass("impersonation-and-admin-restore", { targetCannotReadAdminApi: true });
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordChangedAt: true },
  });
  await expect(admin, "/api/admin/users/force-logout", "POST", { userId });
  const after = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordChangedAt: true },
  });
  assert(
    after.passwordChangedAt &&
      (!before.passwordChangedAt ||
        after.passwordChangedAt >= before.passwordChangedAt),
  );
  pass("force-logout-request-and-revocation-timestamp");
  await expect(admin, "/api/admin/users/resend-welcome", "POST", { userId });
  pass("resend-welcome-local-mail");
  for (const type of [
    "users",
    "subscriptions",
    "devices",
    "keys",
    "audit-log",
    "newsletter",
  ]) {
    const r = await admin.request("/api/admin/export?type=" + type);
    assert.equal(r.status, 200);
    assert((r.headers.get("content-type") || "").includes("text/csv"));
    assert((await r.text()).length > 0);
  }
  pass("six-csv-exports");
  const audit = await admin.json("/api/admin/audit-log");
  assert.equal(audit.status, 200);
  assert(audit.body.success);
  const integrity = await admin.json("/api/admin/audit-log/verify");
  assert.equal(integrity.status, 200);
  assert(integrity.body.success);
  pass("audit-list-and-integrity-report");
  await expect(admin, "/api/admin/keys/" + secondKeyId, "DELETE");
  const deletedKey = await prisma.activationKey.findUnique({
    where: { id: secondKeyId },
  });
  assert(!deletedKey || deletedKey.status === "revoked");
  pass("activation-key-revoke");
  await expect(admin, "/api/admin/users?id=" + userId, "DELETE");
  assert.equal(
    (await prisma.user.findUnique({ where: { id: userId } })).status,
    "deleted",
  );
  pass("disposable-user-soft-delete", { historyRetained: true });
  report.success = true;
  save();
  console.log(
    JSON.stringify({
      success: true,
      flows: report.checks.length,
      mutationDenials: report.mutationDenials.length,
      localOnly: true,
      realPayments: false,
    }),
  );
}
main()
  .catch((e) => {
    report.success = false;
    report.error = e.message;
    save();
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
