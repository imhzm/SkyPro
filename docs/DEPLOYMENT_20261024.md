# SkyPro recovery release — 2026-10-24 Cairo

Owner approved publication with «اعتماد النشر» for reviewed candidate f19df6bf2d0d6e9fd7231957bf26ab6291559213 / PR #15. The approved review ZIP hash was f31538970da6a741a2b326a2203254f62be82bde74e19527cb791adb61662f7f. The final unified ZIP is updated with live evidence after deployment, retaining its 19-media limit.

## Exact identity

- Live source: a8a3560430c40d357d1a5c4c37776454f4accc97, merged PR https://github.com/imhzm/SkyPro/pull/15.
- Web tree: cea8e3f07d6725d2b04b5dfcbe1b2c8826b9c969, identical to the tested/reviewed candidate.
- Linux build: qU1VvtZiTP5PhvRyshPUg. All 351 tracked web files match Git blobs after building.
- Release: /var/www/skypro.skywaveads.com/releases/20261024-a8a3560/skypro-web on new VPS 187.124.168.251, loopback 3200, named PM2 skypro.
- Activation PID 1062154, online/0 restarts; still unchanged at post-browser verification. These process values are time-specific.

## Build and activation

Host preflight had about 8.3GiB disk free and constrained memory. Used a low-priority Linux webpack build with NODE_OPTIONS max-old-space-size=768. TypeScript/build pass. Full source lint has 0 errors/21 warnings; Windows had 0/20. Additional Linux warning is an unused pre-existing opengraph eslint-disable, not a source error.

Package manifest, lockfile and Prisma schema match the prior release byte-for-byte. Dependencies were reused by independent hard links; no npm install or Prisma generation ran afterwards. The existing environment symlink target was retained unchanged. No DB migration, auth/RBAC/payment source change or production fixture was performed.

A candidate ran only on 127.0.0.1:3211 for health, route, media, SEO and negative checks before activation. Only skypro was stopped/started into the new release. Public HTML build identity, process cwd/script, operational DB/web health and published guide verified immediately. All 20 other PM2 services retained their PIDs/status. The temporary candidate process was stopped only after cwd/ownership verification.

## Live QA

- 34 page files, 70 expanded pages, 54 API routes inventoried; 53 public guest states, 17 protected redirects, one Google alias redirect; no missing/unexpected states.
- 45 public SEO pages, 51 internal destinations, 8 noindex auth routes; all pass. Separate 45-page actual DOM/SSR comparison passes. Initial collector-shape and root canonical-property diagnostics were preserved; actual canonical raw attribute matches SSR, while browser href resolves the root trailing slash equivalently. No product code or acceptance rule was weakened.
- 79 public rasters pass HTTP/MIME/decode/hash/mapping; 29 exact lossless-source-pixel tests and 15 restricted direct/optimizer rejection checks pass. Five restricted originals stay outside public and outside delivery.
- Browser media matrix: every 45 public routes at 1440x900 and 390x844, both themes = 180 cases; zero document overflow/unloaded images/decode failures.
- Original-size gallery renders a 1599px source at 1599px, locks body, closes with Escape, restores opener focus; reverse/forward Tab stays inside. Mobile navigation disclosure opens/closes with correct aria-expanded/controlled panel, Escape restores focus. Actual theme toggle persists across reload.
- Fresh live home/section/pricing/footer, catalog, all platform, guide/article/table/gallery captures and continuous website/gallery video are recorded with hashes. Explicit 2000 EGP annual offer, two-day trial and mandatory footer signature retained.
- Earlier isolated role suite (147 page responses, 50 APIs, 6 forms, 14 account journeys, 20 admin journeys, 44 mutation denials) retains its phase-D scope. It is not a repeated final-revision production auth/payment test. No real payment, external OAuth or external test mail was performed.

## Rollback and limits

Previous runtime /var/www/skypro.skywaveads.com/releases/20261020-425ee34/skypro-web is retained. The new release rollback.config.cjs restores that exact previous named PM2 app configuration; no DB rollback is needed. Activation had automatic rollback on failed health/source/build/route verification; no rollback was needed. Nginx, DNS, DB/schema/env, Desktop/CRM/ERP and unrelated projects were unchanged. About 7.7GiB disk remained after deployment. No full VPS backup or unrelated cleanup was created.

OLX independent screenshot and six supporting galleries remain unavailable and honestly disclosed. Video shows the website/gallery, not Windows operation results. GSC/Bing/GA4/Planner are unconnected; rank/volume/traffic/conversion metrics and field p75/INP are unverified. PSI returned quota HTTP429; local load samples are explicitly warm-cache lab observations, not Lighthouse/field results. Authority materials are prepared research only; no outreach, submission or acquired backlink claimed.

Evidence: D:/SkyPro-web-recovery-evidence-20261022/final-production plus the unified SkyPro-web-review-20261024.zip on Windows. Historical Preview evidence remains correctly labelled by phase; the final after-images/video come from the live site.
