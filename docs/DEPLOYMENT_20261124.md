# SkyPro measurement release — 24 November 2026

PR40 source `e776f21fe8e7c64f85254af1c8ab1c6e2f321eff`, web tree `86005e33b95a0e5b4d6cd95a72bcc48786f45742`, Linux build `hF3gLn7kHN_iyJxif003I` is live at https://skypro.skywaveads.com/. Activation acceptance completed at 01:44:42 UTC. Named PM2 `skypro` runs `/var/www/skypro.skywaveads.com/releases/20261122-e776f21/skypro-web`, PID2367567, online with zero restarts at the acceptance snapshot. Later documentation commits do not change this application source identity.

The release includes consented registration/trial and Windows download measurement, same-session Google conversion receipts, repeat platform visits, Cairo asset caching, product-copy corrections, brand icons and official guide references. This is an incremental release of the accepted design.

## Configuration and host scope

The action-time-approved separate SkyPro Web Production Google client is created, securely downloaded and validated with an invalid-code/bad-secret differential. Its sole callback is the SkyPro callback. The protected runtime configuration preserves the independently validated root values and session secret, replacing only the two Google values. The existing CRM/payment clients and shared Google audience/branding are unchanged. A local Windows DPAPI configuration backup was verified in memory; no secret appears in the repository or reports.

The owner expressly excluded a hosting upgrade and WhatsApp interruption and requested tuning the current host. A bounded runtime swap-allowance adjustment and incremental inactive-memory reclaim allowed the unchanged deployment resource guard to pass. There was no paid plan change, global sysctl change, session stop, container restart or database-data/application change. Container/browser identities, recorded session states and OOM counters were checked separately. This is resource headroom management, not a correction of WhatsApp application's memory growth. Detailed resource/session observations remain owner-private. Docker recreation would require reviewing the original resource configuration; no Compose/application source was edited.

## Acceptance and rollback

- Exact Git source and Linux package verification pass: 384 source and 1,380 compiled files, both before activation and after public audits. Current rollback source/build independently match 372 source and 994 compiled files.
- The earlier Linux build passed TypeScript, 48 contracts and the SEO audit with the official public GA4 measurement ID. Build evidence remains tied to source e776f21, not the documentation branch.
- Production-configured candidate boot at loopback3213 passed health with a read-only `SELECT 1` database probe, Google client/callback/scopes, preserved anonymous CSRF secret, expected build, guest dashboard redirect and 45 SEO pages/51 destinations/eight noindex routes.
- The retained d5a24f6 rollback booted at loopback3214 and was restarted successfully with the same protected configuration. Owned previews closed and service identities remained unchanged.
- The first activation passed local/public health, Google start, CSRF, SEO, media, restricted-media and exact-file checks but failed the final resource guard. Automatic rollback actually restored the old build and passed health, Google-start and CSRF checks. Its report is preserved. It was not declared a successful release.
- The second activation retained the same 1GiB memory/disk thresholds and added a bounded wait requiring three consecutive passing resource samples. It passed exact-file checks, local/public health and auth-start checks, the live 45-page SEO/51-link/eight-noindex audit, all 85 static media transport/decode/hash/provenance contracts, and 15 restricted-media checks. All 21 other PM2 service identities remained unchanged. PM2 state was saved.

The d5a24f6 source/build and its explicit protected rollback configuration remain available. No migration, fixture account, external test mail, payment, DNS or Nginx change was performed. Five authentic supporting galleries remain unavailable; passing static media checks does not establish their completion. Resource headroom varies with live activity; a later warm-image snapshot was below the deployment admission threshold, with no new OOM or changed session/service identities. Any future deployment must pass fresh guards.

## Live browser evidence

Edge inspected the live homepage in Arabic RTL at1440×900 and390×844, in dark and light appearances. Neither tested viewport had horizontal document overflow. The mobile menu opens and closes with Escape and returns focus. The native dialog gallery opens, loads the original1599px image, closes with Escape and returns focus. The existing authenticated admin header remained visible. The footer retains the exact approved signature and Sky Wave destination. The original theme was restored and temporary viewport overrides were reset.

| Capture | Exact pixels | SHA-256 |
| --- | --- | --- |
| home-live-desktop-1440x900-20261124.png | 1440×900 | 5ec7aff4071081438ac4250db01e853cc27e2bf9925fed5d7025a3765856dba1 |
| home-live-mobile-390x844-20261124.png | 390×844 | 6cc7b4fb62e2b0a2c83117e00cf9404c1d4a80beb3c38d77ec5bde0315491230 |

Captures are original CDP PNGs, without resizing or edits. The exact mobile capture uses `captureBeyondViewport=true`; native browser capture was382×827 and is retained separately. An initial gallery image selector only matched explicit role attributes; checking the actual native `dialog` confirmed the original image loaded. This smoke check is not a new full-site/RBAC/WCAG certification. Actual Google user sign-in and GA4 conversion receipt remain separate unproven checks; no new account was created for this release audit.

## Evidence and remaining goal

Owner-local root: `D:/SkyPro-seo-growth-20261024/release-measurement-20261122/`. Files include `PRODUCTION_CONFIG_PREFLIGHT_20261124.json`, both `DEPLOYMENT_ACCEPTANCE_20261124_ATTEMPT*.json`, `SEO_LIVE_20261124.json`, `MEDIA_LIVE_20261124.json`, `RESTRICTED_LIVE_20261124.json`, `BROWSER_LIVE_20261124.json`, `LIVE_SCREENSHOTS_20261124.json` and `POST_DEPLOYMENT_PRESERVATION_20261124.json`.

The full SEO growth objective stays active. Qualified organic acquisition, country commercial volume/difficulty/rank evidence, independently earned links, field p75 CWV and five owner-deferred Desktop galleries are not established by this deployment. Current private metrics and decisions remain in the existing Notion project record: https://app.notion.com/p/40cbf843dfa08110933adf16e7f3a266.
