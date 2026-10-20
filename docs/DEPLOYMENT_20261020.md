# SkyPro production release — 2026-10-20

## Current published state — 2026-10-20
- User explicitly authorized this migration with «ارفع ع الهوست». PRs #10, #11, #12 and #13 merged. Live source SHA: 425ee34858ad995f555f9ec6be4ed75018005f61; web tree: 173c77f0a291c4dca29fbed58e886a7bb6830aa7; Next build: mCCE6DWU1BEkwJGjOqmLU.
- PM2 skypro runs releases/20261020-425ee34/skypro-web on loopback 3200, PID 395933 and zero restarts at activation. Previous b159a77 release is the rollback target. No DB migration or production fixture writes; 20 unrelated services retained their PIDs.
- Full build/TypeScript and lint passed (0 errors, 20 warnings). Exact source verification covered 291 files; public build ID matched. Live 50-route verification passed; local fixture tests cover 147 role/page responses, 50 APIs, 14 account journeys and 20 admin journeys including impersonation restoration.
- Scope, browser evidence, limitations and the unified 19-image review package are documented in docs/SITE_THEME_MIGRATION.md and docs/DEPLOYMENT_20261020.md. Earlier preview-only restrictions are historical and superseded by the user's hosting request. Desktop recovery and CRM remain out of scope.

## Deployment and recovery
Target: https://skypro.skywaveads.com/ on new VPS 187.124.168.251. Repository: imhzm/SkyPro. Feature changes were tested, pushed and merged through PRs #10–13. The final release was created empty from exact merged SHA 425ee34858ad995f555f9ec6be4ed75018005f61 and built on Linux. Dependency lock/schema matched the tested candidate before independent hard links were used for installed packages; no package install or generator ran after linking.

Release path: /var/www/skypro.skywaveads.com/releases/20261020-425ee34. Existing environment symlink retained; no secrets are included in evidence. Nginx, DNS, DB schema, other projects and old VPS 147.79.66.116 were unchanged. Pricing read-back: EGP 2000 annually, two-day trial. Guest API responses: 401/403 as expected. Database health passed; public HTML contains this release's build ID.

Rollback configuration: /var/www/skypro.skywaveads.com/releases/20261020-425ee34/rollback.config.cjs, targeting the previous b159a773971df4f528e5b743e983959f7bbc69aa runtime. Use only the named skypro PM2 app, then verify process cwd, public build ID and route states; no database rollback is needed. Retained earlier deployments provide recovery history.

An earlier fdd64b6 activation automatically rolled back because its verification searched SSR HTML for a client-rendered control class. That was a verifier defect; it was corrected to use the public build ID before successful reactivation. The latest deployment passed the corrected verifier.

The final preflight reported about 14 GiB available on the VPS (86% used). No unrelated project files or backups were removed. Future deployment preflight must check disk capacity.

## Evidence and limits
The unified review package contains final-production/build.log, lint.log, legal-invariance.log, source-verification.json, deployment-verification.json and routes-live.json, plus local regression and browser reports. Production financial transactions, external Google OAuth and field Core Web Vitals/Search Console/Bing account reports were not exercised. Local admin payment tests use synthetic records and do not charge money. Full details: SITE_THEME_MIGRATION.md and packaged QA_REPORT.md.

The final 425ee34 activation also initially auto-rolled back because a new generic health assertion expected an ok/true value rather than the endpoint's actual operational enum. The corrected verifier requires health.status and health.services.database.status to equal operational. Reactivation passed all checks. No product repair or database mutation was involved in either verifier rollback.
