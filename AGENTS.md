# Sky Pro project instructions

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
