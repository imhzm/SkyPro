# SkyPro full-site migration — 2026-10-20

The approved home is the visual reference. The user's later «ارفع ع الهوست» authorized this full migration. Source: imhzm/SkyPro; isolated checkout D:/SkyPro-theme-20261015. Desktop recovery and CRM remain separate and unchanged. Current deployment identity and rollback: DEPLOYMENT_20261020.md.

## Inventory and causes

| Issue | Established cause | Delivered behavior |
| --- | --- | --- |
| Google Maps | Historical platform definition removed; home linked Maps to OLX | Independent /platforms/google-maps; /platforms/google redirects 308; OLX retains its own route |
| Email / Auto Point | Missing definitions prevented generated destinations | Restore /platforms/send-emails and /platforms/auto-point with real media |
| Acknowledgements | Existing link had no page | /security/hall-of-fame renders an honest empty state |
| Inner-page navigation | Home-only anchors | Root-qualified anchors, catalog and shared help/legal links |
| Inconsistent themes | Home-scoped colors and hardcoded backgrounds | Shared --sp tokens, prepaint persistence/sync, header/footer/toolbar |
| Logged-out email confirmation | Account proxy blocked token flow | Exact POST exception; expiry, single-use and origin checks retained |
| Impersonation restore 403 | Admin proxy rejected impersonated USER | Exact DELETE validates signed original admin cookie, identity/status/password timestamp; unrelated admin APIs remain denied |
| Password/copy/tables | Small targets, unnamed controls, inaccessible scrolling | 44px eye controls, named copy actions and named focusable table regions |
| Legal hero / loading | Dark background mixed with light-theme text | Shared tokens; legal prose invariant except approved phone |
| Confirmation mobile width | Decorative 400px glow expanded layout viewport | Positioned auth screen and clipped decorative layer; compare scrollWidth with clientWidth |

Before: 31 page files / 45 expanded pages / 54 APIs. After: 32 page files / 49 expanded pages / 54 APIs. Expected versus actual has no missing/unexpected page files. Four restored destinations explain expansion; Google alias makes 50 live route responses. Unknown platform returns 404.

Migrated: home token integration; catalog and 18 platform pages; privacy/terms/security policy/acknowledgements; eight auth pages and states; five customer pages; twelve admin pages; loading/not-found/error boundaries and shared navigation/footer. Exact migrated file list, inventories and Git diff are packaged.

## Content and SEO

Official logo and existing product captures; EGP2000 annually / two-day trial verified. Maps media shows its real menu, not fabricated extraction results. Removed invented ratings/testimonials/performance promises. Phone/WhatsApp +201029934356. Footer: «تم التصميم بكل❤️بواسطة Sky Wave», only Sky Wave links to https://www.skywaveads.com/.

Legal prose/link AST invariance against 2e798e9 passes except approved phone substitution. This preserves wording rather than certifying legacy legal assertions. Public unique metadata/canonical/social data/matching schema checked; sitemap contains 24 public indexable URLs, excluding auth/private. Thirty unique internal links checked without broken destinations. Public crawler permissions retained; no ranking/indexing/AI citation guarantees.

## Verification

- Linux build includes TypeScript and passes. Full ESLint: 0 errors, 20 warnings. Recorded runtime dependency audit: 0 vulnerabilities.
- Attested isolated MariaDB/STARTTLS SMTP: 147 role/page responses, 50 APIs, six form checks, 14 account journeys and 20 admin journeys pass. Includes registration/email/reset/token reuse, API keys, 2FA/backups, email change, disposable soft deletion, user/key/access/subscription/invoice/dummy-payment/offer/notification/device/bulk/impersonation/export/audit endpoints. Forty-four visitor/customer mutation denials pass.
- Fixture isolation rejects conflicting environment, inherited datasource/Node injection and direct writes; exact socket/grants attested, zero canary contacts. No production fixture or test-mail writes.
- Browser: all 32 public/auth routes in two sizes and themes on live release; five customer routes (20 combinations) and twelve admin routes (48) on synthetic local fixture. Representative families checked at 320/390/768/1024/1440/1920. Compare document scrollWidth/clientWidth; expected desktop scrollbar gutters are not defects. Auth Suspense states are rerun after hydration.
- Real axe findings and corrected-page reruns retained. Customer drawer focus entry/wrapping/Escape/return/body-lock cleanup and password visibility exercised. Incomplete gradient contrast checks received visual/CSS review; no blanket WCAG certification.
- Final live deployment verifies 50 route states, 18 platforms/media, alias308/unknown404, guest401/403, database health, public build ID and tracked source hashes, plus unchanged 20 unrelated service PIDs.

## Evidence and remaining limits

One ZIP contains 19 PNGs: 12 contact sheets joining native desktop1440×900/mobile390×844 for six families in both themes, four raw catalog frames, two genuine before frames and one Facebook after. Private frames clearly say LOCAL SYNTHETIC FIXTURE. Source pixels are retained, with no AI generation or UI retouching. Provenance/hashes distinguish older identical component captures from final publication.

External Google OAuth, real production account/payment mutations, field p75 CWV and Search Console/Bing account reports were not exercised. Local force_logout test establishes the request and stored timestamp, not immediate revocation of an existing JWT. Audit test exercises its report endpoint, not complete chain integrity. Desktop extraction/recovery is outside scope. Legacy legal assertions remain unverified substantively; lint warnings remain. Route/browser checks and representative images complement each other rather than claiming every possible state was photographed.
