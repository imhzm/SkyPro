# Sky Pro project instructions

## Current published state — 2026-10-18
- User explicitly authorized the site-wide migration deployment with «ارفع ع الهوست». PR #10 merged; deployed e3778186c132cbfebf183d7007ba9ea016fd3683, web tree 8f5f4bb89fda37e75640422650a9914b0dcfd034, build M-jusBxFJa2qBtbI6hM8F.
- PM2 skypro runs releases/20261018-e377818/skypro-web on loopback 3200; the previous cfa2257 release remains available for rollback. No DB migrations or production fixture writes. Other 20 services retained their PIDs.
- Build/TypeScript/lint, built fixture route/account/admin tests and 50 live route checks pass. Full browser acceptance and the unified evidence ZIP remain in progress; do not mark the whole goal complete yet. See docs/DEPLOYMENT_20261018.md.
- Earlier preview-only restrictions below are historical and superseded by the current explicit hosting authorization. Desktop recovery and CRM remain out of scope.

## Active scope — full theme migration (2026-10-15)
- User supplied FULL WEBSITE RESTORATION & THEME MIGRATION brief. The deployed home is the approved visual reference; preserve its composition.
- Work in feat/site-theme-migration-20261015, based on 2e798e9. Restore navigation and Google Maps first, then platform pages, legal/public pages, authentication, customer and admin presentation. Preserve APIs, RBAC, DB schema/data and desktop source.
- New scope requires a local Preview for review BEFORE any further production deployment. Previous hosting authorization applied to the completed home release and does not authorize this migration. No force push.
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
