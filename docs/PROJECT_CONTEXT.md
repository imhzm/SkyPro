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
Both themes are implemented and verified locally with the production build on http://localhost:3101. The original lockfile resolved Next.js 16.3.1. A dependency audit subsequently found security advisories; reviewed versions are now Next.js/eslint-config-next 16.3.8, Nodemailer 10.0.16, sharp 0.35.5 and source-map-js 1.2.2. The production dependency audit now reports zero vulnerabilities. Review evidence is at D:/SkyPro-theme-evidence-20261015. No production deployment claimed. The live homepage was inspected and captured as a before image.

- Static page sections render on the server. Only the header/theme controls, existing auth menu and screenshot dialog need client state.
- Home Google Maps links use the existing combined /platforms/olx page. There is no standalone Google Maps page in the current route data; no broken URL was introduced.
- Shared auth disclosure now has an accessible name, outside-click/Escape handling and no timed blur dismissal. Mobile authenticated text uses home theme colors.
- No database or customer account was modified. Authenticated navbar tests use browser-only local response fixtures; they do not authenticate to protected endpoints.
- Shared marketing Footer/WhatsAppButton now use the supplied contact number, and the existing shared footer uses the mandatory exact Sky Wave signature. Their page layouts were retained.
- Nodemailer was upgraded in a separate review commit, with a type-only adapter import update and no runtime or TLS setting change. A real loopback STARTTLS SMTP regression verifies trusted certificate validation, pooled authenticated delivery, Arabic multipart mail, HTML-to-text fallback, rejected recipients and missing configuration. No external email was sent.
