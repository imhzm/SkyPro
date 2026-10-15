# Sky Pro homepage theme

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
