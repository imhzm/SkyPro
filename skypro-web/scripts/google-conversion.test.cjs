const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');

const origin = 'https://skypro.example.test';
const user = { id: 42, email: 'synthetic@example.test', role: 'user', status: 'active' };
const secret = 'isolated-google-conversion-fixture';
const environment = {
  NODE_ENV: 'production', NEXTAUTH_URL: origin, NEXTAUTH_SECRET: secret,
  GOOGLE_CLIENT_ID: 'fixture-client', GOOGLE_CLIENT_SECRET: 'fixture-secret',
};

function load(file, modules = {}, globals = {}) {
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  const run = new Function('require', 'exports', ...Object.keys(globals), outputText);
  run((name) => modules[name] ?? require(name), exports, ...Object.values(globals));
  return exports;
}

async function fixture({ existing = true, existingKey = true, role = 'user', transactionError = false } = {}) {
  const analytics = load('src/lib/product-analytics.ts');
  const jwt = await import('next-auth/jwt');
  const receipt = load('src/lib/google-conversion-receipt.ts', {
    'next-auth/jwt': jwt, './product-analytics': analytics,
  }, { process: { env: environment } });
  const logs = [];
  const db = {
    user: { findUnique: async () => existing ? { ...user, role } : null, create: async () => user, update: async () => user },
    activationKey: { findFirst: async () => existingKey ? { id: 1 } : null, create: async () => ({ id: 1, keyCode: 'fixture-key' }) },
    subscription: { create: async () => ({ id: 1 }) },
    auditLog: { create: async ({ data }) => { logs.push(data.action); } },
    $transaction: async (work) => {
      if (transactionError) throw new Error('Fixture transaction failed');
      return work(db);
    },
  };
  const checked = new Set();
  const guards = {
    getClientIp: () => 'fixture', sameOrigin: (req) => req.headers.get('origin') === origin,
    checkRateLimit: (key) => {
      if (!key.startsWith('google-conversion:')) return { allowed: true };
      const allowed = !checked.has(key);
      checked.add(key);
      return { allowed };
    },
  };
  const modules = {
    'next-auth/jwt': jwt, '@/lib/google-conversion-receipt': receipt, '@/lib/product-analytics': analytics,
    '@/lib/db': { prisma: db }, '@/lib/request-security': guards,
    '@/lib/utils': {
      generateApiKey: () => 'fixture-key', getTrialEndDate: () => new Date(Date.now() + 86400000),
      hashPassword: () => 'fixture-hash', generateRandomPassword: () => 'fixture-password',
    },
    '@/lib/email': { sendEmail: async () => ({ success: true }), generateWelcomeEmail: () => '', generateWelcomeEmailText: () => '' },
  };
  const callback = load('src/app/api/auth/google/callback/route.ts', modules, {
    process: { env: environment }, console: { log() {}, error() {} },
    fetch: async (url) => {
      if (url === 'https://oauth2.googleapis.com/token') return { ok: true, json: async () => ({ access_token: 'fixture-token' }) };
      assert.equal(url, 'https://www.googleapis.com/oauth2/v2/userinfo');
      return { ok: true, json: async () => ({ email: user.email, verified_email: true }) };
    },
  });
  const { NextRequest } = require('next/server');

  return {
    logs, receipt,
    callback: (consent = 'a', target = '/dashboard') => callback.GET(new NextRequest(
      `${origin}/api/auth/google/callback?code=fixture&state=fixture_state`, {
        headers: { cookie: `g_oauth_state=${encodeURIComponent(`fixture_state|${target}`)}; cookie_consent=${consent}` },
      },
    )),
    consume: (token, { consent = 'a', account = String(user.id), sourceOrigin = origin } = {}) => {
      const { POST } = load('src/app/api/auth/google/conversion/route.ts', {
        ...modules, '@/lib/auth': { auth: async () => ({ user: { ...user, id: account } }) },
      }, { process: { env: environment } });
      return POST(new NextRequest(`${origin}${analytics.GOOGLE_CONVERSION_ENDPOINT}`, {
        method: 'POST', headers: { origin: sourceOrigin, 'sec-fetch-site': 'same-origin', cookie: `${receipt.GOOGLE_CONVERSION_COOKIE}=${token}; cookie_consent=${consent}` },
      }));
    },
  };
}

test('a consented Google account creation supplies the committed registration and trial once', async () => {
  const s = await fixture({ existing: false });
  const callback = await s.callback('a', '/dashboard/activity?section=history');
  assert.equal(callback.headers.get('location'), `${origin}/auth/callback?google_conversion=1`);
  assert.deepEqual(s.logs, ['register_google']);
  const cookie = callback.cookies.get(s.receipt.GOOGLE_CONVERSION_COOKIE);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  assert.equal(cookie.path, '/api/auth/google/conversion');
  assert.equal(cookie.maxAge, 90);
  const wrongAccount = await s.consume(cookie.value, { account: '43' });
  assert.equal(wrongAccount.status, 204);
  const delivered = await s.consume(cookie.value);
  assert.deepEqual(await delivered.json(), { target: '/dashboard/activity?section=history', registrationCompleted: true, trialActivated: true });
  assert.equal(delivered.cookies.get(s.receipt.GOOGLE_CONVERSION_COOKIE).maxAge, 0);
  assert.deepEqual(await (await s.consume(cookie.value)).json(), { target: '/dashboard/activity?section=history', registrationCompleted: false, trialActivated: false });
});

test('ordinary sign-in remains direct while a trial issued to an existing account excludes registration', async () => {
  const login = await fixture();
  const plain = await login.callback();
  assert.equal(plain.headers.get('location'), `${origin}/dashboard`);
  assert.equal(plain.cookies.has(login.receipt.GOOGLE_CONVERSION_COOKIE), false);
  assert.deepEqual(login.logs, ['login_google']);

  const trial = await fixture({ existingKey: false });
  const conversion = await trial.callback();
  const token = conversion.cookies.get(trial.receipt.GOOGLE_CONVERSION_COOKIE).value;
  assert.deepEqual(await (await trial.consume(token)).json(), { target: '/dashboard?welcome=1', registrationCompleted: false, trialActivated: true });
  assert.deepEqual(trial.logs, ['login_google', 'google_trial_activation_created']);
});

test('refusal, withdrawal, and an uncommitted Google registration do not deliver conversions', async () => {
  const denied = await fixture({ existing: false });
  const direct = await denied.callback('m');
  assert.equal(direct.headers.get('location'), `${origin}/dashboard?welcome=1`);
  assert.equal(direct.cookies.has(denied.receipt.GOOGLE_CONVERSION_COOKIE), false);
  assert.deepEqual(denied.logs, ['register_google']);

  const later = await fixture({ existing: false });
  const callback = await later.callback();
  const token = callback.cookies.get(later.receipt.GOOGLE_CONVERSION_COOKIE).value;
  assert.deepEqual(await (await later.consume(token, { consent: '' })).json(), { target: '/dashboard?welcome=1', registrationCompleted: false, trialActivated: false });

  const failure = await fixture({ existing: false, transactionError: true });
  await assert.rejects(failure.callback(), /Fixture transaction failed/);
  assert.deepEqual(failure.logs, []);
});

test('consented Google conversion dispatch includes only the event and public method metadata', async () => {
  const browser = new EventTarget();
  const calls = [];
  let allowed = true;
  Object.assign(browser, {
    location: { origin, pathname: '/auth/callback', search: '?google_conversion=1' },
    setTimeout, clearTimeout, gtag: (...args) => { calls.push(args); args[2].event_callback?.(); },
  });
  const api = load('src/lib/product-analytics.ts', {}, { window: browser, localStorage: { getItem: () => JSON.stringify({ analytics: allowed }) } });
  assert.equal(api.trackPageView(''), false);
  await api.trackGoogleConversions(true, true);
  assert.deepEqual(calls.map(([, name, { method, page_location }]) => [name, method, page_location]), [
    ['complete_registration', 'google', `${origin}/auth/callback`],
    ['trial_activated', 'google', `${origin}/auth/callback`],
  ]);
  allowed = false;
  await api.trackGoogleConversions(true, true);
  assert.equal(calls.length, 2);
});
