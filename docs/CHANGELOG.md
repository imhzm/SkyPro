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
