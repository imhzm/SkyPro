// Explicitly local-only data, never a production seeder.
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const bcrypt = require("bcryptjs");
const url = new URL(process.env.DATABASE_URL || "");
assert(
  ["127.0.0.1", "localhost"].includes(url.hostname) &&
    url.pathname === "/skypro_theme_fixture",
  "Fixture database required",
);
const prisma = require("./theme-fixture-runtime.cjs").client();
const password = "ThemeFixture42!Local";
(async () => {
  const users = {};
  for (const [key, role, name, status] of [
    ["customer", "user", "عميل اختبار محلي", "active"],
    ["admin", "admin", "إدارة الاختبار المحلي", "active"],
    ["other", "user", "عميل اختبار ثانٍ", "active"],
    ["suspended", "user", "حساب اختبار موقوف", "suspended"],
  ]) {
    users[key] = await prisma.user.upsert({
      where: { email: `${key}@theme-fixture.invalid` },
      create: {
        email: `${key}@theme-fixture.invalid`,
        name,
        role,
        status,
        passwordHash: bcrypt.hashSync(password, 12),
        emailVerifiedAt: new Date(),
      },
      update: {
        name,
        role,
        status,
        passwordHash: bcrypt.hashSync(password, 12),
        emailVerifiedAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });
  }
  const userId = users.customer.id,
    expiresAt = new Date(Date.now() + 180 * 86400000);
  const key = await prisma.activationKey.upsert({
    where: { keyCode: "SKY1-PRO2-11111111-22222222-33333333-44444444-2026" },
    create: {
      keyCode: "SKY1-PRO2-11111111-22222222-33333333-44444444-2026",
      userId,
      status: "active",
      plan: "pro",
      durationDays: 365,
      maxDevices: 2,
      activatedAt: new Date(),
      expiresAt,
    },
    update: { userId, status: "active", expiresAt },
  });
  const subscription = await prisma.subscription.upsert({
    where: { keyId: key.id },
    create: {
      userId,
      keyId: key.id,
      status: "active",
      startedAt: new Date(),
      expiresAt,
      amount: 2000,
      currency: "EGP",
      paymentMethod: "bank_transfer",
    },
    update: { status: "active", expiresAt },
  });
  const device = await prisma.device.upsert({
    where: {
      deviceFingerprint_keyId: {
        deviceFingerprint: "theme-fixture-local-device",
        keyId: key.id,
      },
    },
    create: {
      userId,
      keyId: key.id,
      deviceFingerprint: "theme-fixture-local-device",
      deviceName: "جهاز اختبار محلي",
      osInfo: "Windows 11",
      isActive: true,
    },
    update: { isActive: true, resetCount: 0 },
  });
  const invoice = await prisma.invoice.upsert({
    where: { invoiceNumber: "THEME-FIXTURE-INV-001" },
    create: {
      userId,
      subscriptionId: subscription.id,
      invoiceNumber: "THEME-FIXTURE-INV-001",
      status: "paid",
      subtotal: 2000,
      totalAmount: 2000,
      currency: "EGP",
      paidAt: new Date(),
      notes: "بيانات تجريبية محلية فقط",
    },
    update: { status: "paid" },
  });
  let payment = await prisma.payment.findFirst({
    where: { providerRef: "theme-fixture-payment" },
  });
  if (!payment)
    payment = await prisma.payment.create({
      data: {
        userId,
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        provider: "fixture",
        providerRef: "theme-fixture-payment",
        status: "paid",
        amount: 2000,
        currency: "EGP",
        method: "bank_transfer",
        paidAt: new Date(),
      },
    });
  if (
    !(await prisma.auditLog.findFirst({
      where: { action: "theme_fixture_ready" },
    }))
  )
    await prisma.auditLog.create({
      data: {
        userId,
        action: "theme_fixture_ready",
        details: { localOnly: true },
        ipAddress: "127.0.0.1",
      },
    });
  if (
    !(await prisma.notification.findFirst({
      where: { title: "اختبار محلي فقط" },
    }))
  )
    await prisma.notification.create({
      data: {
        userId,
        title: "اختبار محلي فقط",
        body: "هذه بيانات معزولة لمراجعة الثيم؛ لا تخص أي عميل فعلي.",
        type: "info",
        link: "/dashboard/settings",
      },
    });
  for (const [settingKey, settingValue] of [
    ["key_price", "2000"],
    ["key_currency", "EGP"],
    ["key_duration_days", "365"],
    ["trial_days", "2"],
    ["max_devices", "1"],
    ["max_resets_per_year", "2"],
  ])
    await prisma.systemSetting.upsert({
      where: { settingKey },
      create: { settingKey, settingValue },
      update: {},
    });
  const meta = {
    localOnly: true,
    database: url.pathname.slice(1),
    users: Object.fromEntries(
      Object.entries(users).map(([k, u]) => [
        k,
        { id: u.id, email: u.email, role: u.role },
      ]),
    ),
    keyId: key.id,
    subscriptionId: subscription.id,
    deviceId: device.id,
    invoiceId: invoice.id,
    paymentId: payment.id,
  };
  fs.writeFileSync(
    path.resolve("../.tmp/theme-fixture-meta.json"),
    JSON.stringify(meta, null, 2),
  );
  console.log(
    JSON.stringify({
      localOnly: true,
      users: Object.keys(users),
      subscriptionAmount: 2000,
      fixturesReady: true,
    }),
  );
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
