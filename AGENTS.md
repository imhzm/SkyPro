# Sky Pro project instructions

## Current published state — 2026-10-20
- User explicitly authorized this migration with «ارفع ع الهوست». PRs #10, #11, #12 and #13 merged. Live source SHA: 425ee34858ad995f555f9ec6be4ed75018005f61; web tree: 173c77f0a291c4dca29fbed58e886a7bb6830aa7; Next build: mCCE6DWU1BEkwJGjOqmLU.
- PM2 skypro runs releases/20261020-425ee34/skypro-web on loopback 3200, PID 395933 and zero restarts at activation. Previous b159a77 release is the rollback target. No DB migration or production fixture writes; 20 unrelated services retained their PIDs.
- Full build/TypeScript and lint passed (0 errors, 20 warnings). Exact source verification covered 291 files; public build ID matched. Live 50-route verification passed; local fixture tests cover 147 role/page responses, 50 APIs, 14 account journeys and 20 admin journeys including impersonation restoration.
- Scope, browser evidence, limitations and the unified 19-image review package are documented in docs/SITE_THEME_MIGRATION.md and docs/DEPLOYMENT_20261020.md. Earlier preview-only restrictions are historical and superseded by the user's hosting request. Desktop recovery and CRM remain out of scope.

## Active scope — full theme migration (2026-10-15)
- User supplied FULL WEBSITE RESTORATION & THEME MIGRATION brief. The deployed home is the approved visual reference; preserve its composition.
- Work in feat/site-theme-migration-20261015, based on 2e798e9. Restore navigation and Google Maps first, then platform pages, legal/public pages, authentication, customer and admin presentation. Preserve APIs, RBAC, DB schema/data and desktop source.
- Historical gate: a local Preview preceded publication. The later explicit hosting authorization below applies to this migration. No force push.
- Inventory all 31 page files and expand actual platform IDs. Test visitor/customer/admin roles against an isolated local fixture database; never create fixture accounts in production.
- One unified evidence ZIP, maximum 19 images/videos total. Preserve legal wording except approved contact details; report legal issues for review.

## Scope and history (2026-10-15)
- Source of truth: https://github.com/imhzm/SkyPro, main verified at d012c831ce5e81b8141c2c056a59bdc662c3624d.
- Current task: implement the supplied light/dark homepage references inside skypro-web. The user explicitly requests implementation of those references; use their composition as the approved direction.
- Official logo: public/images/skypro-logo.png. Real product captures: public/images/app/.
- Verified repository offer: EGP 2,000 annually, two-day free trial. No monthly USD tiers. Phone supplied by user: +201029934356.
- Existing Google recovery changes in D:/SkyPro-recovery-20261013/SkyPro-recovery belong to a separate task. Do not edit, stage, revert, or publish them.
- Isolated theme checkout: D:/SkyPro-theme-20261015, branch feat/home-theme-20261015. C: has no free space; keep dependencies and evidence on D:.
- Preserve authentication, admin, activation, billing, database, migrations, desktop app, other platform pages and existing consent behavior.
- Do not touch CRM, WhatsApp services, DNS, or other customer projects. Old VPS 147.79.66.116 is read-only. New VPS 187.124.168.251.
- Footer must say: تم التصميم بكل❤️بواسطة Sky Wave, with only Sky Wave linking to https://www.skywaveads.com/.
- Do not invent reviews, success metrics, compliance claims or prices. Unverified legacy social proof must not be repeated in the new home.
- Test both themes, Arabic RTL, keyboard interaction, persistent theme selection and 320/390/768/1024/1440/1920 widths. Capture desktop 1440x900 and mobile 390x844.
- Feature branch, checks/build, commit and reviewable PR. Production requires confirmed deployment authority and exact-SHA verification; do not claim deployment based on HTTP 200.
- Update docs/PROJECT_CONTEXT.md, docs/DECISIONS.md and docs/CHANGELOG.md with evidence and limitations after each stage.

## Production release — 2026-10-15
- User authorized publication: "ارفع ع الهوست". PR #8 merged; deployed SHA cfa2257b21da8820e1b123bef5bc9bd3ec3753ac, web tree 29b9dfc7ff081ce935d015a03da252ffa5e627a1.
- New VPS access verified using root with existing sky_deploy key. Do not print keys or environment values.
- PM2 skypro now runs /var/www/skypro.skywaveads.com/releases/20261015-cfa2257/skypro-web on 127.0.0.1:3200. The original checkout remains at d012c83 and is the rollback runtime and source of the unchanged .env symlink.
- Nginx, DB schemas/data, desktop recovery and other services were not changed. Deployment and rollback evidence: docs/DEPLOYMENT_20261015.md.


## Hosting authorization — 2026-10-18
User explicitly requested «ارفع ع الهوست» for the current site theme. Complete preflight QA, then commit/push/merge and deploy the exact SHA to the new VPS, preserving the existing release for rollback. This supersedes the earlier preview-only publication restriction; fixtures remain local only.
