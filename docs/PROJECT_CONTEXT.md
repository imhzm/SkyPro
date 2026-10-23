# Sky Pro homepage theme

## Current published state — 2026-10-20
- User explicitly authorized this migration with «ارفع ع الهوست». PRs #10, #11, #12 and #13 merged. Live source SHA: 425ee34858ad995f555f9ec6be4ed75018005f61; web tree: 173c77f0a291c4dca29fbed58e886a7bb6830aa7; Next build: mCCE6DWU1BEkwJGjOqmLU.
- PM2 skypro runs releases/20261020-425ee34/skypro-web on loopback 3200, PID 395933 and zero restarts at activation. Previous b159a77 release is the rollback target. No DB migration or production fixture writes; 20 unrelated services retained their PIDs.
- Full build/TypeScript and lint passed (0 errors, 20 warnings). Exact source verification covered 291 files; public build ID matched. Live 50-route verification passed; local fixture tests cover 147 role/page responses, 50 APIs, 14 account journeys and 20 admin journeys including impersonation restoration.
- Scope, browser evidence, limitations and the unified 19-image review package are documented in docs/SITE_THEME_MIGRATION.md and docs/DEPLOYMENT_20261020.md. Earlier preview-only restrictions are historical and superseded by the user's hosting request. Desktop recovery and CRM remain out of scope.

## Active recovery — 2026-10-22

The owner approved the six product boards and explicitly approved revised guide V2 on Oct23. The product hero/catalog/details/gallery, 18-platform copy, 29 lossless media derivatives and consent-aware events are implemented. /guides and 20 original articles (about 9,342 words) are enabled in candidate Preview, not production. Phase-I checks pass on 45 public pages, 51 internal links and 8 noindex auth pages; 252 guide responsive cases pass in addition to the earlier 240 product-page cases. Five legacy screenshots with license/result/metric content were moved outside public; final phase-J runtime rejection checks are pending. Research includes 47 seed terms with explicit unverified metrics, 41 intent destinations and an honest outreach tracker with zero messages/links acquired. Final evidence/review and publication approval remain required. See [WEB_RECOVERY_20261022.md](WEB_RECOVERY_20261022.md). Oct20 production is unchanged.

## Audit — 2026-10-15
- Main repository is imhzm/SkyPro. The separate SkyProLandingPage repository is older (last push May 2026). Main was freshly fetched and still points to d012c83.
- Next.js 16.2.4 / React 18 / TypeScript / Tailwind / Prisma 5 / MySQL. Marketing is under src/app/(marketing), protected customer/admin areas are separate routes. Existing role-aware navbar calls /api/auth/me.
- Homepage previously composed 12 marketing components with fixed dark colors; no light theme. Marketing data and real platform screenshots are already checked in.
- Authentication, RBAC, email verification, activation, billing APIs, Prisma schema and desktop source are out of change scope. No data mutation or migrations are needed.
- Existing desktop publishing workflow runs only when desktop paths change on main. No web deployment workflow found. No open GitHub PRs/issues returned during audit.
- Homepage and root JSON-LD contain unsupported ratings and performance claims. New home must use visible, supported product facts and matching schema.
- robots.ts already allows Google/Bing/OAI search crawlers on public routes and disallows private areas. Sitemap includes home and platform pages. No new routes are needed.
- Price is EGP 2,000/year in current pricing, FAQ, software offer and billing code; trial defaults to two days. Team/device requests use contact CTA, not an invented tier price.
- Reusable official screenshots cover all ten requested platforms. Existing hero-dashboard.png depicts another brand, AURA, and must not be used.
- Existing cookies/analytics and registration email notice must be preserved.
- ChatGPT histories “فهم مشروع Sky Pro” and “تحسين ثيم الهوم” could not be read due to rate limiting. The prior Codex recovery chat confirms the repository and separate desktop scope.
- C: is full. Worktree created on D: without changing recovery work. First two SSH identities tried against the new VPS were rejected; production is not yet verified.

## Delivery status
Production: user explicitly authorized hosting publication on 2026-10-15. PR https://github.com/imhzm/SkyPro/pull/8 is merged. Deployed exact merge SHA: cfa2257b21da8820e1b123bef5bc9bd3ec3753ac. Release: /var/www/skypro.skywaveads.com/releases/20261015-cfa2257/skypro-web. Build ID: 7AjnvkA1jSbEvyhtJ9EnK. Web tree 29b9dfc7ff081ce935d015a03da252ffa5e627a1 matches tested commit 6270918571b4f0be4e0d5f4c92d4ffc3bf715efd. See DEPLOYMENT_20261015.md for activation, rollback and live verification.

Both themes are implemented and verified locally and on https://skypro.skywaveads.com. The original lockfile resolved Next.js 16.3.1. Reviewed versions are now Next.js/eslint-config-next 16.3.8, Nodemailer 10.0.16, sharp 0.35.5 and source-map-js 1.2.2. Production dependency audit: zero vulnerabilities. Evidence: D:/SkyPro-theme-evidence-20261015/production. Production DB health, SMTP authentication without sending mail, public/protected routes and six responsive widths in both themes passed. Earlier failed SSH attempts used the wrong user/key combinations; root with sky_deploy succeeded and was verified on the new VPS.

- Static page sections render on the server. Only the header/theme controls, existing auth menu and screenshot dialog need client state.
- Home Google Maps links use the existing combined /platforms/olx page. There is no standalone Google Maps page in the current route data; no broken URL was introduced.
- Shared auth disclosure now has an accessible name, outside-click/Escape handling and no timed blur dismissal. Mobile authenticated text uses home theme colors.
- No database or customer account was modified. Authenticated navbar tests use browser-only local response fixtures; they do not authenticate to protected endpoints.
- Shared marketing Footer/WhatsAppButton now use the supplied contact number, and the existing shared footer uses the mandatory exact Sky Wave signature. Their page layouts were retained.
- Nodemailer was upgraded in a separate review commit, with a type-only adapter import update and no runtime or TLS setting change. A real loopback STARTTLS SMTP regression verifies trusted certificate validation, pooled authenticated delivery, Arabic multipart mail, HTML-to-text fallback, rejected recipients and missing configuration. No external email was sent.


## Hosting authorization — 2026-10-18
User explicitly requested «ارفع ع الهوست» for the current site theme. Complete preflight QA, then commit/push/merge and deploy the exact SHA to the new VPS, preserving the existing release for rollback. This supersedes the earlier preview-only publication restriction; fixtures remain local only.
# Current deployment — 2026-10-18

The owner authorized hosting publication. PR #10 merged and e3778186c132cbfebf183d7007ba9ea016fd3683 is live at skypro.skywaveads.com. Exact source/build/PM2, rollback and verification evidence: DEPLOYMENT_20261018.md. Browser acceptance and the single maximum-19-image ZIP are still being finalized; publication does not imply the full goal is complete. Keep all fixture writes local and preserve the previous cfa2257 runtime.

