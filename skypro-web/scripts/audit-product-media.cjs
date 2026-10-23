const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const manifest = require('../src/data/product-media-manifest.json');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function inspectImage(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const type = response.headers.get('content-type') || '';
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok || !type.startsWith('image/')) throw Error(`Invalid image response: ${response.status} ${type}`);
  const meta = await sharp(bytes).metadata();
  const stats = await sharp(bytes).stats();
  if (!meta.width || !meta.height || (meta.channels === 4 && stats.channels[3].max === 0)) throw Error('Empty or fully transparent image');
  return { status: response.status, type, width: meta.width, height: meta.height,
    bytes: bytes.length, sha256: hash(bytes), decode: 'passed' };
}

function validatePlatformMapping(platforms, shots) {
  const issues = [];
  for (const [id, media] of Object.entries(platforms)) {
    if (!media.hero && media.status !== 'missing-independent-capture') issues.push(`${id}: unexplained missing hero`);
    if (media.hero && media.gallery.includes(media.hero)) issues.push(`${id}: hero repeated in supporting gallery`);
    for (const key of [media.hero, ...media.gallery].filter(Boolean)) {
      if (!shots[key]) issues.push(`${id}: unregistered shot ${key}`);
      else if (shots[key].platform !== id) issues.push(`${id}: wrong platform image ${key}`);
    }
  }
  return issues;
}
function scanRaster(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? scanRaster(file) : /\.(png|webp|avif|jpe?g|gif)$/i.test(entry.name) ? [file] : [];
  });
}

async function audit() {
  const origin = process.env.CHECK_ORIGIN || 'https://skypro.skywaveads.com';
  if (new URL(origin).origin !== origin) throw Error('Use an origin without path');
  const output = process.env.CHECK_OUTPUT;
  if (!output) throw Error('CHECK_OUTPUT required');
  const { platforms: platformMedia, shots } = manifest;
  const assets = [];
  for (const file of scanRaster('public')) {
    const bytes = fs.readFileSync(file), meta = await sharp(bytes).metadata();
    const src = '/' + path.relative('public', file).replaceAll('\\', '/');
    let remote;
    try { remote = await inspectImage(origin + src.split('/').map(encodeURIComponent).join('/')); }
    catch (error) { remote = { error: error.message }; }
    const curated = Object.values(shots).find(shot => shot.src === src), localSha256 = hash(bytes);
    assets.push({ src, localWidth: meta.width, localHeight: meta.height, localSha256, remote,
      sourceBytesMatch: !remote.error && remote.sha256 === localSha256,
      role: curated ? 'curated-product' : src.startsWith('/images/app/') ? 'retained-original' : 'other-public-asset',
      visualIdentity: curated ? 'REVIEWED_IN_SOURCE_INVENTORY' : 'SEPARATE_REFERENCED_USAGE_REVIEW',
      manifestMatch: curated ? curated.sha256 === localSha256 && curated.width === meta.width && curated.height === meta.height : null });
  }
  const platforms = Object.entries(platformMedia).map(([id, media]) => ({ id, hero: media.hero,
    gallery: media.gallery, galleryCount: media.gallery.length, caption: media.caption,
    heroFileExists: media.hero ? assets.some(asset => asset.src === shots[media.hero]?.src) : null,
    geometry: media.hero ? assets.find(asset => asset.src === shots[media.hero]?.src) : null,
    heroIdentityStatus: !media.hero ? media.status : shots[media.hero]?.platform === id ? 'MATCHES_REVIEWED_PLATFORM' : 'WRONG_PLATFORM' }));
  const heroGroups = {}, hashes = {};
  for (const [id, media] of Object.entries(platformMedia)) if (media.hero) (heroGroups[media.hero] ||= []).push(id);
  for (const asset of assets) (hashes[asset.localSha256] ||= []).push(asset.src);
  const mappingIssues = validatePlatformMapping(platformMedia, shots);
  const transportFailures = assets.filter(asset => asset.remote.error || !asset.sourceBytesMatch);
  const provenanceFailures = assets.filter(asset => asset.manifestMatch === false);
  const staticContractPassed = !transportFailures.length && !provenanceFailures.length && !mappingIssues.length;
  const report = { createdAt: new Date().toISOString(), origin,
    scope: 'Every public raster, including retained originals, branding and curated assets. Static transport/decode/hash/mapping only; browser lazy/srcset/CSS/OG and viewport gates remain separate.',
    assets, platforms, duplicateHeroMappings: Object.entries(heroGroups).filter(([, ids]) => ids.length > 1),
    duplicateAssetBytes: Object.values(hashes).filter(group => group.length > 1), mappingIssues, provenanceFailures,
    summary: { assets: assets.length, platforms: platforms.length, withoutGallery: platforms.filter(p => !p.galleryCount).length,
      transportOrDecodeOrByteFailures: transportFailures.length,
      wrongPlatformImages: platforms.filter(p => p.heroIdentityStatus === 'WRONG_PLATFORM').length,
      missingIndependentCapture: platforms.filter(p => p.heroIdentityStatus === 'missing-independent-capture').map(p => p.id),
      mappingIssues: mappingIssues.length, provenanceFailures: provenanceFailures.length, staticContractPassed,
      browserAcceptance: 'PENDING_SEPARATE_BROWSER_REPORT', accepted: false } };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.summary));
  if (!staticContractPassed) process.exitCode = 1;
}
if (require.main === module) audit().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { inspectImage, validatePlatformMapping };
