// Deterministic rendering of the existing official mark; no generated artwork.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const sourcePath = 'public/images/skypro-logo.png';
const expectedSourceHash = '7a1f6b38a6f85b1e25dde46d3650c66b4575b1a5183c365c7fd08a579c7574be';
const hash = data => crypto.createHash('sha256').update(data).digest('hex');

async function main() {
  const source = fs.readFileSync(path.join(root, sourcePath));
  assert.equal(hash(source), expectedSourceHash, 'Review a changed official logo before exporting icons');
  const meta = await sharp(source).metadata();
  assert.equal(meta.width, 576);
  assert.equal(meta.height, 722);
  const image = 'data:image/png;base64,' + source.toString('base64');
  const outputs = [];
  const rendered = new Map();
  async function render(size, purpose) {
    const key = size + ':' + purpose;
    if (rendered.has(key)) return rendered.get(key);
    // A maskable mark stays entirely inside the centered 80%-diameter safe circle.
    const fraction = purpose === 'maskable' ? 0.60 : 0.88;
    const height = size * fraction, width = height * meta.width / meta.height;
    const x = (size - width) / 2, y = (size - height) / 2;
    if (purpose === 'maskable') assert(Math.hypot(width / 2, height / 2) <= size * 0.4);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#060d1b"/><image href="${image}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/></svg>`;
    const bytes = await sharp(Buffer.from(svg)).ensureAlpha().png({ compressionLevel: 9 }).toBuffer();
    const result = { bytes, size, purpose, contentBounds: { x, y, width, height } };
    rendered.set(key, result);
    return result;
  }
  async function write(file, size, purpose = 'any') {
    const icon = await render(size, purpose);
    fs.writeFileSync(path.join(root, file), icon.bytes);
    outputs.push({ path: file, format: 'png', width: size, height: size, purpose,
      bytes: icon.bytes.length, sha256: hash(icon.bytes), contentBounds: icon.contentBounds });
  }
  await write('public/favicon.png', 32);
  await write('public/images/icon-192.png', 192);
  await write('public/images/icon-512.png', 512);
  await write('public/images/icon-maskable-192.png', 192, 'maskable');
  await write('public/images/icon-maskable-512.png', 512, 'maskable');
  await write('public/images/apple-touch-icon.png', 180);
  await write('src/app/icon.png', 512);
  await write('src/app/apple-icon.png', 180);
  const small = await Promise.all([16, 32].map(size => render(size, 'any')));
  const header = Buffer.alloc(6 + small.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(small.length, 4);
  let offset = header.length;
  small.forEach((icon, index) => {
    const i = 6 + index * 16;
    header[i] = icon.size;
    header[i + 1] = icon.size;
    header.writeUInt16LE(1, i + 4);
    header.writeUInt16LE(32, i + 6);
    header.writeUInt32LE(icon.bytes.length, i + 8);
    header.writeUInt32LE(offset, i + 12);
    offset += icon.bytes.length;
  });
  const ico = Buffer.concat([header, ...small.map(i => i.bytes)]);
  fs.writeFileSync(path.join(root, 'public/favicon.ico'), ico);
  outputs.push({ path: 'public/favicon.ico', format: 'ico', sizes: ['16x16', '32x32'], bytes: ico.length, sha256: hash(ico) });
  fs.writeFileSync(path.join(root, 'public/images/brand-icons-provenance.json'), JSON.stringify({
    version: 1, source: sourcePath, sourceSha256: expectedSourceHash,
    sourceWidth: meta.width, sourceHeight: meta.height, sourceUnchanged: true,
    rendering: 'SVG canvas, original embedded PNG, proportional fit, brand background #060d1b',
    renderer: { sharp: sharp.versions.sharp, vips: sharp.versions.vips },
    maskableSafeCircleRadiusFraction: 0.4, outputs,
  }, null, 2) + '\n');
  assert.equal(hash(fs.readFileSync(path.join(root, sourcePath))), expectedSourceHash);
  console.log(JSON.stringify({ sourceUnchanged: true, outputs: outputs.length, maskableSafeZoneVerified: true }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
