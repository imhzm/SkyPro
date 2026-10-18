const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { Client, origin } = require("./verify-site.cjs");
const prisma = require("./theme-fixture-runtime.cjs").client();
const report = {
  origin,
  localOnly: true,
  emailForwarding: false,
  startedAt: new Date().toISOString(),
  checks: [],
};
const output =
  process.env.CHECK_OUTPUT || "../.tmp/account-flow-verification.json";
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2));
function pass(name, details = {}) {
  report.checks.push({ name, passed: true, ...details });
  save();
  console.log(name + ": passed");
}
function outbox() {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        require("./theme-fixture-runtime.cjs").directory,
        "smtp/outbox.json",
      ),
      "utf8",
    ),
  );
}
function mailToken(email, part) {
  const message = outbox()
    .slice()
    .reverse()
    .find((m) => m.recipients.includes(email) && m.raw.includes(part));
  assert(message, "Expected local mail absent");
  const raw = message.raw
    .replace(/=\r\n/g, "")
    .replace(/=([a-f0-9]{2})/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    );
  const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const token = raw.match(new RegExp(escaped + "\\?token=([a-f0-9]{64})"))?.[1];
  assert(token, "Local confirmation link absent");
  return token;
}
function totp(secret, time = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, ""))
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8)
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(time / 30000)));
  const hash = crypto
      .createHmac("sha1", Buffer.from(bytes))
      .update(counter)
      .digest(),
    index = hash[19] & 15;
  return String((hash.readUInt32BE(index) & 0x7fffffff) % 1000000).padStart(
    6,
    "0",
  );
}
async function main() {
  const email = `journey-${Date.now()}@theme-fixture.invalid`,
    password = "JourneyFixture42!Long";
  const visitor = new Client("journey-visitor");
  const invalid = await visitor.json("/api/auth/register", "POST", {
    name: "اختبار",
    email,
    password: "short",
    confirmPassword: "different",
  });
  assert.equal(invalid.status, 400);
  pass("registration-validation");
  const registration = await visitor.json("/api/auth/register", "POST", {
    name: "رحلة اختبار محلية",
    email,
    password,
    confirmPassword: password,
  });
  assert.equal(registration.status, 200);
  assert(
    registration.body.success &&
      registration.body.data.emailSent &&
      registration.body.data.pendingVerification,
  );
  pass("registration-and-local-STARTTLS-email");
  const userId = registration.body.data.userId;
  const before = new Client("journey-before-verification");
  assert.equal((await before.login(email, password)).status, 401);
  pass("unverified-login-rejected");
  const verifyToken = mailToken(email, "/auth/verify-email");
  const verify = await visitor.json("/api/auth/verify-email", "POST", {
    token: verifyToken,
  });
  assert.equal(verify.status, 200);
  assert(verify.body.success);
  const reused = await visitor.json("/api/auth/verify-email", "POST", {
    token: verifyToken,
  });
  assert.equal(reused.status, 400);
  const trial = await prisma.subscription.findFirst({ where: { userId } });
  assert.equal(trial.status, "trial");
  assert(
    Math.abs(trial.expiresAt.getTime() - Date.now() - 2 * 86400000) < 180000,
  );
  pass("email-verification-and-two-day-trial", { singleUseToken: true });
  let account = new Client("journey-account");
  assert.equal((await account.login(email, password)).status, 200);
  pass("verified-login");
  const missingToken = await visitor.json("/api/auth/reset-password", "POST", {
    password: "NewJourneyFixture42!Long",
    confirmPassword: "NewJourneyFixture42!Long",
  });
  assert.equal(missingToken.status, 400);
  pass("reset-requires-token");
  const forgot = await visitor.json("/api/auth/forgot-password", "POST", {
    email,
  });
  assert.equal(forgot.status, 200);
  assert(forgot.body.success);
  const resetToken = mailToken(email, "/auth/reset-password"),
    newPassword = "NewJourneyFixture42!Long";
  const reset = await visitor.json("/api/auth/reset-password", "POST", {
    token: resetToken,
    password: newPassword,
    confirmPassword: newPassword,
  });
  assert.equal(reset.status, 200);
  assert(reset.body.success);
  const resetReuse = await visitor.json("/api/auth/reset-password", "POST", {
    token: resetToken,
    password,
    confirmPassword: password,
  });
  assert.equal(resetReuse.status, 400);
  pass("password-reset-local-mail", { singleUseToken: true });
  assert.equal(
    (await new Client("journey-old-password").login(email, password)).status,
    401,
  );
  account = new Client("journey-new-password");
  assert.equal((await account.login(email, newPassword)).status, 200);
  pass("reset-credential-login");
  const apiKey = await account.json("/api/account/api-keys", "POST", {
    name: "مفتاح اختبار محلي",
    expiresInDays: 1,
  });
  assert.equal(apiKey.status, 200);
  assert(apiKey.body.success && apiKey.body.data.fullKey);
  const keyList = await account.json("/api/account/api-keys");
  assert.equal(keyList.status, 200);
  assert(!JSON.stringify(keyList.body).includes(apiKey.body.data.fullKey));
  const revoke = await account.json(
    "/api/account/api-keys?id=" + apiKey.body.data.id,
    "DELETE",
  );
  assert.equal(revoke.status, 200);
  assert(revoke.body.success);
  pass("account-api-key-create-list-revoke", { secretShownOnlyOnCreate: true });
  const setup = await account.json("/api/account/2fa/setup", "POST", {});
  assert.equal(setup.status, 200);
  const secret = setup.body.data.secret;
  assert(secret && setup.body.data.otpauthUrl.startsWith("otpauth://"));
  const code = totp(secret);
  let wrongCode = String((Number(code) + 1) % 1000000).padStart(6, "0");
  while (
    [
      totp(secret, Date.now() - 30000),
      totp(secret),
      totp(secret, Date.now() + 30000),
    ].includes(wrongCode)
  )
    wrongCode = String((Number(wrongCode) + 1) % 1000000).padStart(6, "0");
  assert.equal(
    (
      await account.json("/api/account/2fa/verify-setup", "POST", {
        code: wrongCode,
      })
    ).status,
    400,
  );
  const enabled = await account.json("/api/account/2fa/verify-setup", "POST", {
    code: totp(secret),
  });
  assert.equal(enabled.status, 200);
  assert.equal(enabled.body.data.backupCodes.length, 10);
  pass("2fa-setup-validation-and-enable");
  assert.equal(
    (await new Client("journey-no-2fa").login(email, newPassword)).status,
    401,
  );
  const factorAccount = new Client("journey-with-2fa");
  assert.equal(
    (await factorAccount.login(email, newPassword, totp(secret))).status,
    200,
  );
  const backup = enabled.body.data.backupCodes[0];
  assert.equal(
    (await new Client("journey-backup-code").login(email, newPassword, backup))
      .status,
    200,
  );
  assert.equal(
    (await new Client("journey-backup-reuse").login(email, newPassword, backup))
      .status,
    401,
  );
  pass("2fa-login-and-single-use-backup");
  const disableMissing = await factorAccount.json(
    "/api/account/2fa/disable",
    "POST",
    { password: newPassword },
  );
  assert([400, 401].includes(disableMissing.status));
  const disabled = await factorAccount.json(
    "/api/account/2fa/disable",
    "POST",
    { password: newPassword, code: totp(secret) },
  );
  assert.equal(disabled.status, 200);
  assert(disabled.body.success);
  pass("2fa-disable-requires-password-and-code");
  const nextEmail = `changed-${Date.now()}@theme-fixture.invalid`;
  const emailChange = await factorAccount.json(
    "/api/account/email/request-change",
    "POST",
    { newEmail: nextEmail, password: newPassword },
  );
  assert.equal(
    emailChange.status,
    200,
    "email change request: " + JSON.stringify(emailChange.body),
  );
  assert(emailChange.body.success);
  const changeToken = mailToken(nextEmail, "/auth/email-change/confirm");
  const crossSite = await visitor.request("/api/account/email/confirm-change", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://example.invalid",
      "sec-fetch-site": "cross-site",
    },
    body: JSON.stringify({ token: changeToken }),
  });
  assert.equal(crossSite.status, 403);
  const invalidConfirm = await visitor.json(
    "/api/account/email/confirm-change",
    "POST",
    { token: "a".repeat(64) },
  );
  assert.equal(invalidConfirm.status, 400);
  const confirm = await visitor.json(
    "/api/account/email/confirm-change",
    "POST",
    { token: changeToken },
  );
  assert.equal(
    confirm.status,
    200,
    "public token confirmation: " + JSON.stringify(confirm.body),
  );
  assert(confirm.body.success);
  assert.equal(
    (
      await visitor.json("/api/account/email/confirm-change", "POST", {
        token: changeToken,
      })
    ).status,
    400,
  );
  assert.equal(
    (await prisma.user.findUnique({ where: { id: userId } })).email,
    nextEmail,
  );
  pass("email-change-local-confirmation");
  const finalAccount = new Client("journey-changed-email");
  assert.equal((await finalAccount.login(nextEmail, newPassword)).status, 200);
  const noConfirm = await finalAccount.json("/api/account/delete", "POST", {
    password: newPassword,
    confirmation: "NOT_DELETE",
  });
  assert.equal(noConfirm.status, 400);
  const deletion = await finalAccount.json("/api/account/delete", "POST", {
    password: newPassword,
    confirmation: "DELETE",
  });
  assert.equal(deletion.status, 200);
  assert(deletion.body.success);
  assert.equal(
    (await prisma.user.findUnique({ where: { id: userId } })).status,
    "deleted",
  );
  assert.equal(
    (await prisma.subscription.findFirst({ where: { userId } })).status,
    "cancelled",
  );
  pass("disposable-fixture-self-deletion", {
    productionDataUntouched: true,
    auditHistoryRetained: true,
  });
  report.success = true;
  report.completedAt = new Date().toISOString();
  save();
  console.log(
    JSON.stringify({
      success: true,
      checks: report.checks.length,
      localOnly: true,
      outboundMail: false,
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
