# Change log

## 2026-10-15 — audit
- Restored a clean, isolated homepage worktree from verified GitHub main.
- Recorded scope, actual pricing/assets, design direction and production access limitations.

## 2026-10-15 — implementation and QA
- Added one modular RTL home with light/dark tokens, persistent/system theme selection and cross-tab synchronization.
- Implemented reference composition with real product screenshots, ten platform previews, features, three steps, use cases, verified pricing, native FAQ, CTA and footer.
- Added the supplied phone and direct WhatsApp/tel links; retained registration, existing account menu, email notice and cookie consent.
- Updated home metadata, matching JSON-LD and social preview copy; removed unsupported homepage ratings and safety/partner claims from shared software/social metadata.
- Fixed shared account disclosure keyboard behavior and light mobile account colors.
- Kept contact details consistent in the existing shared marketing footer/WhatsApp control and applied the required exact footer signature there as well.
- Passed build/type checks, full-repo ESLint, HTTP/structured-data checks and twelve responsive checks across both themes. Captured desktop/mobile review evidence. See QA_REPORT.md for precise coverage and limitations.

## 2026-10-15 — security audit remediation
- Audited runtime dependencies and verified upstream advisories affecting image optimization and email transport.
- Updated Next.js/eslint-config-next to 16.3.8, Nodemailer to 10.0.16, sharp to 0.35.5 and source-map-js to 1.2.2. Production dependency audit: zero vulnerabilities.
- Added a loopback-only STARTTLS SMTP regression test covering actual application email templates and transport success/failure behavior, with no external delivery.
- Corrected reduced-motion root scrolling with a CSS-module-aware selector instead of an assumed generated class name.

## Production — 2026-10-15
- User authorized hosting publication. PR #8 merged and exact SHA cfa2257b21da8820e1b123bef5bc9bd3ec3753ac deployed on the new VPS in a separate release, build ID 7AjnvkA1jSbEvyhtJ9EnK.
- Linux build/runtime audit, production DB health, SMTP authentication without mail, public/protected routes, six widths in both themes and live desktop/mobile screenshots verified. Original runtime preserved for rollback; no migrations, Nginx/DNS or unrelated service changes.
- See DEPLOYMENT_20261015.md for activation correction, evidence and remaining limits.
# 2026-10-18 — site-wide theme candidate

Restored missing platform routes/navigation, introduced shared light/dark surfaces for public/auth/customer/admin routes, corrected email-link access and admin restore, added isolated route/RBAC/account/admin verification. Publication is authorized; build/runtime/browser acceptance is still in progress. Details: RELEASE_SITE_THEME_20261018.md.

# 2026-10-18 — published site-wide theme

PR #10 merged; deployed e3778186c132cbfebf183d7007ba9ea016fd3683 after clean Linux build and source-hash/route checks. Public live QA passed 50 routes and guest API guards; 20 other PM2 services unchanged. Browser acceptance/evidence ZIP remains in progress. See DEPLOYMENT_20261018.md.


## 2026-10-20 — full-site migration published
- PR #10: shared tokens/navigation, 18 platform pages and restored destinations, public/auth/customer/admin themes, metadata and isolated regression harness. Corrected logged-out email confirmation and signed impersonation restoration without broadening other admin access.
- PR #11: 44px password visibility targets, named key copy controls and keyboard-accessible scrolling tables.
- PR #12: legal hero and loading-state colors use shared theme tokens; legal content invariance passes.
- Exact production SHA 425ee34858ad995f555f9ec6be4ed75018005f61, build mCCE6DWU1BEkwJGjOqmLU. Build/TypeScript pass; lint 0 errors / 20 warnings. Live 50-route check and 291-file source identity pass. See DEPLOYMENT_20261020.md and SITE_THEME_MIGRATION.md.

- PR #13 contains oversized auth glows within their positioned screen, clips only decorative layers and gives the reset form a semantic h1. Strict mobile checks compare scrollWidth to clientWidth.
