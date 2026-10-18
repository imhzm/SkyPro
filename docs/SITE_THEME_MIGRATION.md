# Full-site theme migration — active preview work

## Scope
User brief: attachment 4f8ac920-819d-4949-9aa7-ddc93320c934/pasted-text-1.txt. Approved home is the visual reference. Complete platform/public/auth/customer/admin theme migration with real functionality and local three-role verification. Preview review is required before any additional production deployment; the existing cfa2257 home release remains live.

Branch: feat/site-theme-migration-20261015, based on 2e798e9. Workspace: D:/SkyPro-theme-20261015. Isolated local MySQL-compatible fixture database and loopback STARTTLS outbox; no production fixtures, mail or data writes. Evidence: D:/SkyPro-site-theme-evidence-20261015. Preview: http://localhost:3102.

## Completed verification so far
- Baseline: 31 page files, 45 expanded pages, 54 API route files. Production visitor audit: 28 rendered public/auth pages and 17 protected redirects; four referenced platform destinations were missing (Google Maps, Google alias, email, Auto Point).
- Google Maps, email and Auto Point existed in historical commit 75e883c and lost their data in 9ef0a6b. Restored IDs with current module-source review and corrected unsupported historical copy. OLX is independent. Google alias returns HTTP 308 to Google Maps.
- Shared tokens, header/footer and cross-page anchors. No other surface imports the home's CSS module. Both approved home themes consume the shared variables.
- Platform gate: 18 real IDs, all images present, all detail pages/canonicals/FAQ schemas verified, catalog exposes all IDs, unknown ID returns 404. Unverified ratings/testimonials/statistics/comparisons removed.
- Found a broken legal-policy link to /security/hall-of-fame. Added a truthful empty acknowledgements page and sitemap entry; no invented researcher identities or altered legal promises.
- Current local inventory: 32 page files, 49 expanded pages. Real HTTP/session tests: 147 page responses across visitor/customer/admin and 50 API authorization/read checks passed. Credentials login, suspended/wrong-password rejection, invoice ownership, profile persistence, settings validation/save and CSRF rejection passed. SMTP and additional form journeys, browser-wide audit and final production build are still pending.
- Initial TypeScript checks pass. Final build/lint/TypeScript results will be recorded after all presentation fixes.

## In progress and acceptance gates
Review legal wording invariance/contact update, all auth flow states, form labels, mobile drawers/focus and tables. Exercise local registration/verification/reset/account/admin forms. Check all page renders, links, images, hydration, both themes, RTL and responsive behavior. Capture each page type in desktop/mobile light/dark and package a single ZIP with at most 19 images/videos. Create a reviewable PR and Preview, with explicit remaining limits; do not deploy this migration before review approval.
