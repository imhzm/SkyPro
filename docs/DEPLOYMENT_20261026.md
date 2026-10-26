# SkyPro measurement/media deployment — 26 October 2026

The authorized routine measurement/media release is published at https://skypro.skywaveads.com/. It adds consent-aware GA4 instrumentation, truthful conversion handling and genuine Desktop settings captures for OLX and Google Maps while preserving the accepted design, twenty articles and established offer. Deployment is complete; the wider SEO growth objective remains open.

## Release identity and rollback

| Item | Verified value |
| --- | --- |
| Merged PR | https://github.com/imhzm/SkyPro/pull/19 |
| Exact source SHA | `c304ba3324fe1870dfd076b97930394ec855689f` |
| Web tree | `39701af155e2a2ad8895f6673e4986469d4dfdfe` |
| Linux build | `XhJNtDzT9PISf-ihLYOZY` |
| Runtime | `/var/www/skypro.skywaveads.com/releases/20261026-c304ba3/skypro-web` |
| Source fingerprint audit | 361 tracked web files; zero mismatches |
| Activation proof time | 25 October 23:45 UTC / 26 October 02:45 Cairo |
| Previous runtime | `/var/www/skypro.skywaveads.com/releases/20261024-a8a3560/skypro-web` |
| Rollback configuration | `/var/www/skypro.skywaveads.com/releases/20261026-c304ba3/rollback.config.cjs` |

The named PM2 `skypro` process uses the new cwd and Next executable; the public page exposes the matching build ID. The previous release is retained. The activation comparison records no PID/status changes across the other twenty PM2 services. These are activation-time process facts, not a claim about future process lifetimes.

Dependencies were reused without installation or Prisma generation; package lock and schema were unchanged. The release retains the existing environment target. Only the public GA4 ID `G-DNP0ZME36D` was supplied at build time. No production DB/schema/env/DNS/payment, Nginx, unrelated-project, real test-account or external test-mail changes were made.

## Build, HTTP and media verification

| Layer | Evidence and result |
| --- | --- |
| Linux build and TypeScript | Successful; exact source/build recorded |
| Contract/negative tests | 19 pass, 0 fail, 0 skipped, on the running loopback candidate |
| Live SEO/links | 45 public pages, 51 internal destinations, 8 noindex auth routes; no reported errors |
| Canonical/robots/sitemap/schema | Included in the live HTTP/SSR audit; sitemap has 45 URLs |
| Route inventory | No missing/unexpected page files; 18 platform IDs retained |
| Raster assets | 83 checked; zero transport/decode/byte, mapping or provenance failures |
| Restricted originals | Five retained outside public; fifteen direct/optimizer rejection cases pass |

The initial archive's CRLF fingerprint mismatch was rejected before activation, repaired using an LF-preserving exact Git export, and rechecked across all 361 files. The first aggregate test wrapper also ran a legacy HTTP-dependent test before a candidate server existed; the suite was rerun against the running loopback candidate and passed. Neither condition was treated as a successful verification or resolved by weakening the checks.

OLX now has an independent 1.31.8 settings hero; Maps has a genuine supporting settings image. Their captions establish settings only, with no claimed extraction or results. Five supporting galleries remain absent. The static media report intentionally does not certify full browser acceptance; use the separate scoped browser report below.

## Scoped live browser and measurement checks

The live-browser network report verifies zero Google scripts/collection before affirmative analytics consent, collector responses of 204 after consent, sanitized page locations/referrers, platform/gallery events, and zero further collection after withdrawal disables the loaded tag. The query/hash test sentinel is absent from transmitted URL/body data.

Live visual checks cover home at 1440×900 and 390×844, mobile menu disclosure, theme switching, OLX native-dialog image loading/body lock/original-size/Escape/focus restoration, and the Maps gallery at 390×844 without page overflow. The two new original images decode at 1602×835. Saved screenshots include `home-desktop.png`, `home-mobile.png`, `home-mobile-dark.png`, `olx-gallery-desktop.png` and `maps-gallery-mobile.png`.

This is change-specific live QA, not a repeated 180-case full-site matrix or a blanket accessibility certificate. Earlier local 24-case media coverage retains its own source/build scope. The final content addendum covers 39 rendered URLs on the final local production source: only OLX/Maps text changed, with all article bodies, H1s and self-canonicals retained.

The independent GA4 property's Realtime report displays 5 `page_view`, 2 `view_platform` and 2 `view_product_gallery` from our synthetic production QA. These are not customer visits, completed registrations or trial conversions. Genuine registration/email-activation transitions were tested only against the isolated local fixture, with external conversion collection blocked; production account creation was not attempted. Actual business trial counts remain unknown.

## Search provider refresh and remaining growth work

- GSC individual inspections confirm the home and `/guides/olx-demo-questions` indexed, successfully fetched by Googlebot Mobile, with indexing allowed and matching chosen canonical. Its aggregate dated 23 October still displays 0 indexed/38 excluded and conflicts with these newer inspections. Preserve both dated observations; a current whole-site indexed total is unknown, with two individual indexed URLs verified.
- GSC sitemap succeeds with 45 discovered URLs and a last read of 26 October. Its available Web performance chart for 23–24 October shows 0 clicks/0 impressions and empty query/page/country/device tables. CTR and rank are unavailable; the UI's position0 is not a measured rank.
- The aggregate's noindex examples are `/auth/login` and `/auth/register`; the alternate is `/platforms?q={search_term_string}`. These are expected exclusions, not reasons to remove noindex or canonical rules.
- Bing sitemap succeeds with 45 discovered URLs, last crawl/submit 25 October, zero errors/warnings. Search data is processing; AI Performance Beta has no data. Discovery is not proof of indexing or ranking.
- GSC Field CWV reports insufficient usage on both devices. A new official PageSpeed UI run on Oct26 succeeds despite the separate unauthenticated API returning 429: mobile performance 84, LCP 3.8s, TBT 40ms, CLS 0; desktop performance 99, LCP 0.8s, TBT 10ms, CLS 0.056. These are single-session Lighthouse lab measurements, not field p75 or INP. The mobile LCP is the product screenshot; the report also identifies duplicate external font stylesheets and render-blocking CSS. A targeted performance correction is under investigation, not included in this published source. Evidence: `live-measurement/official-ui-20261026/`; report https://pagespeed.web.dev/analysis/https-skypro-skywaveads-com/7oqqdujk16?form_factor=mobile.
- EG/SA/AE demand, difficulty, measured SERP intent/current ranks and business conversions remain open. The 47 editorial keyword candidates are not a completed demand baseline.
- Bing's exact commercial-phrase attempt for EG, SA and AE (three months, all languages/devices) reports insufficient trend data; no numeric volume/rank is inferred. The authorized Google Ads manager shows only a removed child account in Planner's active-account chooser. No new ad account/campaign/plan/payment or security change was made; `SOURCE_ACCESS.json` preserves these limits owner-locally.
- Two authorized editorial emails are confirmed sent; one submitted form's final delivery is unverified. No acquired link is verified or attributed to these inquiries. Five supporting galleries remain missing; four additional Desktop captures await manual login in the isolated test app. No fabricated screenshots/results or new article batch is authorized by those gaps.

## Evidence locations

Owner-local evidence root: `D:/SkyPro-seo-growth-20261024/`.

- `account-connection/production-20261026/`: deployment/source/build/preflight, service comparison, live route/SEO/media/restriction reports, 19-test log, `live-browser-measurement.json` and live screenshots.
- `account-connection/provider-refresh-20261026/`: current provider snapshots/screenshots and `PROVIDER_REFRESH.md/json`, preserving each report's date, scope and limitations.
- `content-measurement/candidate-editorial-addendum-20261026.json`: exact final-source content delta.
- `GAP_REPORT.md/json` and `CURRENT_CHECKPOINT_20261026.json`: ongoing requirement ledger. Detailed unresolved claim review stays owner-local and is not part of this public release record.
