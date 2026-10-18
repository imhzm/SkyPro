const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const fixture = require('./theme-fixture-runtime.cjs');
async function main() {
  const config = fixture.loadConfig();
  let contacts = 0;
  const canary = net.createServer(socket => { contacts++; socket.destroy(); });
  await new Promise(resolve => canary.listen(33308, '127.0.0.1', resolve));
  const oldUrl = process.env.DATABASE_URL;
  const oldOptions = process.env.NODE_OPTIONS;
  const cwd = process.cwd();
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'skypro-isolation-'));
  try {
    process.env.DATABASE_URL = 'mysql://canary:unused@127.0.0.1:33308/production_canary';
    process.env.NODE_OPTIONS = '--require=untrusted-canary.cjs';
    const child = fixture.childEnv(fixture.loadConfig());
    assert.equal(child.DATABASE_URL, config.DATABASE_URL);
    assert(!child.NODE_OPTIONS.includes('require'));
    assert.throws(() => fixture.requireFixture());
    fs.mkdirSync(path.join(directory, 'prisma'));
    fs.writeFileSync(path.join(directory, '.env.local'), 'DATABASE_URL=mysql://127.0.0.1:33308/canary');
    process.chdir(directory);
    assert.throws(() => fixture.loadConfig(), /Conflicting project env file/);
    process.chdir(cwd);
    await fixture.attest(config);
    assert.equal(contacts, 0);
    assert(!fixture.redact(config.DATABASE_URL, config).includes(config.DATABASE_URL));
    console.log(JSON.stringify({ success: true, inheritedDatasourceIgnored: true, injectedNodeOptionsIgnored: true, envConflictRejected: true, directMutationRejected: true, canaryContacts: contacts, localSocketAndPrivilegesAttested: true }));
  } finally {
    process.chdir(cwd);
    if (oldUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = oldUrl;
    if (oldOptions === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = oldOptions;
    fs.unlinkSync(path.join(directory, '.env.local'));
    fs.rmdirSync(path.join(directory, 'prisma'));
    fs.rmdirSync(directory);
    await new Promise(resolve => canary.close(resolve));
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
