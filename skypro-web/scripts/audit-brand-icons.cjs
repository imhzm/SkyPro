const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { loadData } = require('./route-inventory.cjs');
const root = path.resolve(__dirname, '..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function audit() {
  process.chdir(root);
  const manifest = loadData('src/app/manifest.ts').default();
  const proof = JSON.parse(fs.readFileSync('public/images/brand-icons-provenance.json', 'utf8'));
  assert.equal(hash(fs.readFileSync(proof.source)), proof.sourceSha256);
  assert(fs.readFileSync('src/app/layout.tsx', 'utf8').includes(manifest.description), 'Use approved existing description');
  assert(!/رقم\s*1|بضغطة|18\+/.test(manifest.name + ' ' + manifest.description), 'Unsupported legacy claim');
  const origin = process.env.CHECK_ORIGIN;
  if (origin) assert.equal(new URL(origin).origin, origin);
  const rows = [];
  for (const icon of manifest.icons) {
    assert(/^\/[a-z0-9/.-]+\.(png|ico)$/.test(icon.src));
    const file = 'public' + icon.src;
    const bytes = fs.readFileSync(file);
    const record = proof.outputs.find(row => row.path === file);
    assert(record, 'Unregistered generated icon');
    assert.equal(hash(bytes), record.sha256);
    if (icon.type === 'image/png') {
      const meta = await sharp(bytes).metadata();
      assert.equal(meta.width, meta.height, 'Manifest icons must be square');
      assert.equal(icon.sizes, meta.width + 'x' + meta.height, 'Declared dimensions differ from actual image');
      assert.equal(record.purpose, icon.purpose || 'any');
      if (icon.purpose === 'maskable') {
        const b = record.contentBounds;
        assert(Math.hypot(b.width / 2, b.height / 2) <= meta.width * 0.4);
        assert.equal((await sharp(bytes).stats()).channels[3].min, 255, 'Maskable canvas must be opaque');
      }
    } else {
      assert.equal(icon.type, 'image/x-icon');
      assert.equal(bytes.readUInt16LE(0), 0);
      assert.equal(bytes.readUInt16LE(2), 1);
      const count = bytes.readUInt16LE(4), sizes = [];
      assert.equal(count, 2);
      for (let n = 0; n < count; n++) {
        const at = 6 + n * 16, length = bytes.readUInt32LE(at + 8), offset = bytes.readUInt32LE(at + 12);
        assert(offset >= 6 + count * 16 && offset + length <= bytes.length);
        const meta = await sharp(bytes.subarray(offset, offset + length)).metadata();
        assert.equal(meta.width, bytes[at] || 256);
        assert.equal(meta.height, bytes[at + 1] || 256);
        sizes.push(meta.width + 'x' + meta.height);
      }
      assert.equal(icon.sizes, sizes.join(' '));
    }
    let remote = null;
    if (origin) {
      const response = await fetch(origin + icon.src, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
      const data = Buffer.from(await response.arrayBuffer());
      assert.equal(response.status, 200, icon.src + ' missing');
      assert((response.headers.get('content-type') || '').startsWith('image/'));
      assert.equal(hash(data), record.sha256);
      remote = { status: response.status, bytesMatch: true };
    }
    rows.push({ src: icon.src, sizes: icon.sizes, purpose: icon.purpose || 'any', sha256: record.sha256, remote });
  }
  for (const [file, size] of [['src/app/icon.png', 512], ['src/app/apple-icon.png', 180], ['public/favicon.png', 32]]) {
    const bytes = fs.readFileSync(file), meta = await sharp(bytes).metadata();
    assert.equal(meta.width, size); assert.equal(meta.height, size);
    assert.equal(hash(bytes), proof.outputs.find(row => row.path === file).sha256);
  }
  if (origin) {
    const response = await fetch(origin + '/manifest.webmanifest', { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), manifest);
  }
  const report = { at: new Date().toISOString(), origin: origin || null, sourceUnchanged: true,
    manifestCopyMatchesApprovedLayout: true, icons: rows, browserMetadataImagesValidated: 3,
    maskableGeometryAndOpacityVerified: true, passed: true };
  if (process.env.CHECK_OUTPUT) fs.writeFileSync(process.env.CHECK_OUTPUT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, icons: rows.length, browserMetadataImages: 3, httpChecked: !!origin }));
}
audit().catch(error => { console.error(error.message); process.exitCode = 1; });
