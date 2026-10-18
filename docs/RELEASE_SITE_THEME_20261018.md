# Site-wide Sky Pro theme release candidate — 2026-10-18

User authorization: «ارفع ع الهوست». This authorizes publication of the current migration after QA, superseding the earlier preview-only gate. No CRM/desktop/DB schema changes are included.

## Implementation

The approved homepage composition remains the reference. Shared light/dark tokens, navigation, footer, theme persistence and mobile drawers now cover platform, public, authentication, customer and administration surfaces. Restored Google Maps, email and Auto Point platform data; Google Maps and OLX remain independent. Added the missing policy acknowledgements destination with no invented names. Public metadata/sitemap exclude private/authentication pages. Unverified ratings, reviews and quantified performance promises were removed.

Two functional regressions were demonstrated in local tests and repaired: the single-use email-change confirmation was blocked for logged-out recipients, and the admin impersonation session omitted the signed restore claims. The restore exemption now applies only to its exact DELETE endpoint, checks same origin, validates the original signed token and current active admin identity/password-change timestamp. Other admin operations remain forbidden to the impersonated user.

## Evidence before Linux build

- 32 page files / 49 expanded routes / 54 API route files; expected-versus-actual has no missing or unexpected pages. Baseline was 31 files / 45 expanded routes.
- Local isolated fixture: 14 account journeys and 20 admin flows passed, including real loopback STARTTLS delivery, 2FA/backup codes, token reuse rejection, billing record CRUD, exports, impersonation and restore. 44 visitor/customer admin mutation denials passed. Financial records are dummy local records, with no charge or transfer.
- TypeScript and ESLint pass. ESLint retains existing warnings; this is not a warning-free claim. Legal AST comparison preserves privacy/terms text and links except the approved phone substitution.
- Fixture startup attests socket, database, account and exact-schema grants; ignores inherited datasource/Node injection, rejects env conflicts/direct execution, and records zero connections to a local canary. Secrets and SMTP outbox remain outside the checkout.
- Live production configuration inspected read-only: annual 2000 EGP, 365 days, trial 2 days; no pricing settings override. Production auth secrets are compatible (values never exported).
- Development server compilation on Windows repeatedly exhausted available process/virtual memory. Broad HTTP reruns stopped after the visitor routes; these interrupted reruns are not passing evidence. Earlier 147 page / 50 API checks exist, but must be refreshed against the final built candidate.

## Remaining gates at this commit

Linux production build; final built-runtime route/API regressions; browser audit of all route families, themes, viewport widths and accessibility; reviewed evidence package (maximum 19 images/videos); PR/merge/exact-SHA activation and live visual/HTTP/PM2 verification. Keep the existing cfa2257 runtime available for rollback. Never use production fixture accounts or run database migrations.
