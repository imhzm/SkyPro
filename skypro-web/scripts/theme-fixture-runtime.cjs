// Private fixture settings live outside the checkout. No production env fallback.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const configPath = "D:/SkyPro-test-runtime/private/fixture.json";
function loadConfig() {
  for (const dir of [".", "prisma"])
    for (const name of fs.readdirSync(dir)) {
      assert(
        !/^\.env(?:\..*)?$/.test(name) || name === ".env.example",
        "Conflicting project env file",
      );
    }
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const db = new URL(config.DATABASE_URL);
  assert(
    db.protocol === "mysql:" &&
      db.hostname === "127.0.0.1" &&
      db.port === "33307" &&
      db.pathname === "/skypro_theme_fixture" &&
      db.username === "skypro_fixture" &&
      !db.search,
    "Dedicated local fixture datasource required",
  );
  return config;
}
function requireFixture() {
  const config = loadConfig();
  assert(
    config.THEME_FIXTURE_PROOF &&
      process.env.DATABASE_URL === config.DATABASE_URL &&
      process.env.THEME_FIXTURE_PROOF === config.THEME_FIXTURE_PROOF,
    "Use the fixture launcher",
  );
  return config;
}
function client() {
  const config = requireFixture();
  const { PrismaClient } = require("@prisma/client");
  return new PrismaClient({
    datasources: { db: { url: config.DATABASE_URL } },
  });
}
async function attest(config) {
  const connection = await require("mysql2/promise").createConnection(
    config.DATABASE_URL,
  );
  try {
    assert(
      ["127.0.0.1", "::ffff:127.0.0.1"].includes(
        connection.connection.stream.remoteAddress,
      ),
    );
    assert.equal(connection.connection.stream.remotePort, 33307);
    const [[row]] = await connection.query(
      "SELECT DATABASE() AS db, CURRENT_USER() AS account, @@port AS port",
    );
    assert.equal(row.db, "skypro_theme_fixture");
    assert.equal(row.account, "skypro_fixture@127.0.0.1");
    assert.equal(row.port, 33307);
    const [grants] = await connection.query("SHOW GRANTS");
    for (const row of grants) {
      const grant = Object.values(row)[0];
      assert(
        /^GRANT USAGE ON \*\.\*/.test(grant) ||
          /^GRANT ALL PRIVILEGES ON `skypro\\_theme\\_fixture`\.\*/.test(grant),
        "Fixture grants exceed exact schema",
      );
    }
  } finally {
    await connection.end();
  }
}
function childEnv(config) {
  const env = {};
  for (const name of [
    "PATH",
    "Path",
    "SystemRoot",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "TEMP",
    "TMP",
  ]) {
    if (process.env[name]) env[name] = process.env[name];
  }
  for (const name of [
    "DATABASE_URL",
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "AUTH_URL",
    "NEXTAUTH_URL",
    "APP_URL",
    "AUTH_TRUST_HOST",
    "TRUST_PROXY_HEADERS",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "TRIAL_DAYS",
    "MAX_DEVICES",
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "NODE_EXTRA_CA_CERTS",
    "THEME_FIXTURE_PROOF",
  ]) {
    if (config[name] !== undefined) env[name] = String(config[name]);
  }
  env.NEXT_TELEMETRY_DISABLED = "1";
  env.NODE_OPTIONS = "--max-old-space-size=2048";
  env.TEMP = "D:/SkyPro-test-runtime/temp";
  env.TMP = env.TEMP;
  fs.mkdirSync(env.TEMP, { recursive: true });
  if (process.env.CHECK_OUTPUT) env.CHECK_OUTPUT = process.env.CHECK_OUTPUT;
  return env;
}
function redact(message, config) {
  for (const name of [
    "DATABASE_URL",
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "SMTP_PASS",
    "THEME_FIXTURE_PROOF",
  ]) {
    if (config[name])
      message = message.split(String(config[name])).join("[redacted]");
  }
  return message
    .split(decodeURIComponent(new URL(config.DATABASE_URL).password))
    .join("[redacted]");
}
module.exports = {
  configPath,
  loadConfig,
  requireFixture,
  client,
  attest,
  childEnv,
  redact,
  directory: path.dirname(configPath),
};
