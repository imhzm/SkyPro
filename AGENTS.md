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
