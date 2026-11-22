const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const compile = (path) => ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;

const route = compile('src/app/api/account/windows-download-click/route.ts');
const button = compile('src/components/dashboard/DesktopDownloadButton.tsx');
const analytics = compile('src/lib/product-analytics.ts');
const origin = 'https://skypro.example.test';
const activeUser = { id: '42', role: 'user', status: 'active' };

function routeFixture({ user = activeUser, allowed = true } = {}) {
  const logs = [];
  const exports = {};
  let authCalls = 0;
  vm.runInNewContext(route, {
    exports,
    Response,
    console: { info: (entry) => logs.push(JSON.parse(entry)) },
    require: (name) => ({
      '@/lib/auth': { auth: async () => { authCalls += 1; return user && { user }; } },
      '@/lib/product-analytics': { ANALYTICS_CONSENT_COOKIE: 'cookie_consent' },
      '@/lib/request-security': {
        sameOrigin: (req) => req.headers.get('origin') === origin,
        checkRateLimit: () => ({ allowed, retryAfter: 60 }),
        rateLimitedResponse: () => new Response(null, { status: 429 }),
      },
    })[name],
  });
  return {
    logs,
    get authCalls() { return authCalls; },
    async status({ consent = 'a', requestOrigin = origin, site = 'same-origin' } = {}) {
      const headers = new Headers({ 'sec-fetch-site': site });
      if (requestOrigin) headers.set('origin', requestOrigin);
      const response = await exports.POST({
        headers,
        cookies: { get: (name) => name === 'cookie_consent' && { value: consent } },
      });
      return response.status;
    },
  };
}

test('download receipt requires same origin and the affirmative analytics cookie', async () => {
  const fixture = routeFixture();
  for (const request of [{ requestOrigin: null }, { requestOrigin: 'null' }, { site: 'same-site' }]) {
    assert.equal(await fixture.status(request), 403);
  }
  for (const consent of ['', 'm', 'true', 'amo']) assert.equal(await fixture.status({ consent }), 204);
  assert.equal(fixture.authCalls, 0);
  assert.deepEqual(fixture.logs, []);
});

test('only an eligible account and allowed request produce a payload-free click receipt', async () => {
  const fixture = routeFixture();
  for (const consent of ['a', 'am']) assert.equal(await fixture.status({ consent }), 204);
  assert.equal(fixture.logs.length, 2);
  for (const log of fixture.logs) {
    assert.deepEqual(Object.keys(log).sort(), ['at', 'event']);
    assert.equal(log.event, 'click_download');
    assert.ok(Number.isFinite(Date.parse(log.at)));
  }
  const excluded = [null, { ...activeUser, role: 'admin' }, { ...activeUser, status: 'suspended' }, { ...activeUser, impersonatedBy: 1 }];
  for (const user of excluded) {
    const blocked = routeFixture({ user });
    assert.equal(await blocked.status(), user ? 204 : 401);
    assert.deepEqual(blocked.logs, []);
  }
  const limited = routeFixture({ allowed: false });
  assert.equal(await limited.status(), 429);
  assert.deepEqual(limited.logs, []);
});

test('the actual download link preserves navigation while sending a consented keepalive POST', () => {
  const installer = 'https://downloads.skywaveads.com/skypro/latest';
  const calls = [];
  const analyticsExports = {};
  let consent = false;
  vm.runInNewContext(analytics, {
    exports: analyticsExports,
    window: {},
    localStorage: { getItem: () => JSON.stringify({ analytics: consent }) },
  });
  const exports = {};
  vm.runInNewContext(button, {
    exports,
    fetch: (...args) => { calls.push(args); return Promise.reject(new Error('offline')); },
    require: (name) => ({
      react: { useState: (initial) => [initial === null ? installer : initial, () => {}], useEffect: () => {} },
      'react/jsx-runtime': { jsx: (tag, props) => ({ tag, props }), jsxs: (tag, props) => ({ tag, props }) },
      'lucide-react': {},
      '@/lib/product-analytics': analyticsExports,
    })[name],
  });
  const { tag, props } = exports.default();
  assert.equal(tag, 'a');
  assert.equal(props.href, installer);
  const event = { defaultPrevented: false, preventDefault: () => assert.fail('download blocked') };
  props.onClick(event);
  assert.equal(calls.length, 0);
  consent = true;
  props.onClick({ ...event, defaultPrevented: true });
  props.onAuxClick({ ...event, button: 2 });
  assert.equal(calls.length, 0);
  props.onClick(event);
  props.onAuxClick({ ...event, button: 1 });
  assert.equal(calls.length, 2);
  for (const [url, options] of calls) {
    assert.equal(url, '/api/account/windows-download-click');
    assert.deepEqual({ ...options }, { method: 'POST', keepalive: true, referrerPolicy: 'origin' });
  }
});
