# Consented measurement candidate — 2026-10-24 Cairo

## Status and authority

This is a local candidate on `feat/consented-measurement-20261024`, based on merged PR #18 / `27ab2031c55f83442665b50b755b6962ca16bb46`. It is not deployed or collecting production events. The accepted application remains a8a3560/build qU1VvtZiTP5PhvRyshPUg plus the separately approved Google/Bing static proofs. Do not deploy the candidate until the real GA4 stream is identified, property settings are configured and browser/network/visual acceptance is complete.

The owner explicitly approved GA4 terms and data-processing terms for Egypt, account `SkyPro`, property `SkyPro Web`, Gmail `skywaveads@gmail.com`, team size 1–10, Egypt timezone and EGP. Optional account data-sharing boxes were disabled in the prepared wizard. The final Accept action was not executed: after Edge restored its tabs the browser tool could not bind them, then its kernel initialization failed. The user confirms the extension is connected; do not diagnose this as a disconnected extension or repeat approvals. Check existing account/property state before creating anything if the wizard no longer survives.

Search Console ownership is explicitly proven in the saved official UI. Its sitemap processed successfully with 45 discovered URLs. The home index inspection reported not indexed / unknown URL; a separate live test reported available to Google and eligible to be indexed. Those are different scopes. Whole-site performance and indexing counts were processing at the last actual account read; current refreshed data cannot be inferred from public HTTP.

Bing's owner-approved XML proof was deployed from exact merged SHA 27ab203, with matching 85-byte HTTPS hash. Verify redirected to the exact site's Home page, but the document stayed blank before control failed. Dashboard verification, Bing sitemap submission and Bing report availability remain unproven. All 20 unrelated PM2 process identities stayed unchanged during each static proof activation. The application build/source, environment, DNS, DB and payments were preserved.

## Candidate changes

- Cover actual `/guides` CTA clicks; classify trial/download/WhatsApp/telephone/email actions with exact protocol/host checks. Do not send destination contact data or form values.
- Require an actual successful registration HTTP response containing the committed user ID and pending-verification state before `complete_registration`. This event means a created account, not an active trial.
- Add `trial_activated` only after the verify-email endpoint reports its successful activation transaction. No response token, email, serial, user ID or form value is sent to Analytics. No backend, DB schema or transaction was changed.
- Strict affirmative analytics consent; stop loaded Google tags using Google's per-measurement disable flag and a denied consent update when preferences are withdrawn or the visitor enters protected routes. Advertising storage, user data and personalization remain denied.
- Manual sanitized pageviews on allowed public/trial routes with query/hash removed from location/referrer and private customer/admin routes excluded. Disable automatic config pageviews; the real GA4 stream must also have browser-history Enhanced Measurement disabled before activation, to prevent duplicate/raw-URL pageviews.
- Reopen the existing cookie preferences from the existing privacy cookie section. Initialize reopened toggles from stored choices, move focus into the dialog and return it to the opener on save/reject. Existing legal claim wording is unchanged.

## Event meaning

| Event | Trigger | Meaning |
| --- | --- | --- |
| `view_platform` | Rendered platform route with consent/provider | Viewed a unit; not used the Windows feature |
| `view_product_gallery` | Open a real product image | Image viewed; no execution result implied |
| `click_trial` | Click same-site registration link | Interest only |
| `start_registration` | First input within the actual registration form | Form started; no values collected |
| `complete_registration` | Backend-confirmed created account | Pending email verification, not active trial |
| `trial_activated` | Backend-confirmed email verification/activation | Active trial flow confirmed; client delivery can still be blocked |
| `click_download` | Official download host or same-origin download | Download click, not completed installation |
| `click_whatsapp` | HTTPS `wa.me` link | Contact click, not a sent message |
| `click_contact` | Telephone/email link | Contact click, no contact value transmitted |

Do not map button clicks to purchase or trial success. No actual production conversions are established by mocks, unit tests or the candidate preview.

## Verification completed

- Ten tests (six product analytics contracts plus four content-capture regressions) pass, including consent rejection/malformed values/provider failure, PII omission, guide scope, destination lookalikes, response truth checks, revocation and protected-route/page URL privacy.
- TypeScript passes. Targeted lint: 0 errors / 1 pre-existing verify-email full-navigation warning.
- Isolated fixture production webpack build passes, including TypeScript and 89 generated outputs. Candidate build `_So3loysw3w7wY8GFxKGA`; no real GA4 ID configured. This is not a final connected-provider build.
- Loopback candidate `http://127.0.0.1:3103` responds correctly on eight HTTP/SSR cases: home, guides, article, platform, privacy, register, verify-email and guest admin redirect. Auth noindex and the preference reopen button's SSR presence pass. Port 3102 was already owned by an existing Next preview and was left running; the first attempted start's EADDRINUSE is retained, not counted as a running new process.

Still required: actual browser cookie/preference state, rejection/withdrawal network checks, SPA deduplication, image/CTA/form traces, genuine backend-confirmed trial path in isolated fixture, 1440×900 and 390×844 screenshots, actual GA4 stream/Realtime or DebugView receipt, strict property settings, exact-source deployment and live QA. Do not claim these from SSR or unit tests. New candidate is not published.

## Separate factual/legal issue

Review identified factual discrepancies and unverified broad promises in legacy privacy text. The legal-copy preservation instruction remains applicable, so no silent legal rewrite or backend behavior change is bundled into measurement. The concrete evidence/correction table is kept in the owner's local artifact `D:/SkyPro-seo-growth-20261024/CONTENT_CLAIMS_REVIEW.md`; content honesty remains open pending that separate review. Detailed unresolved findings are not copied into this public repository.

References used for implementation: [Google privacy controls](https://developers.google.com/tag-platform/security/guides/privacy), [consent updates](https://developers.google.com/tag-platform/security/guides/consent), [manual pageviews and history settings](https://developers.google.com/analytics/devguides/collection/ga4/views), and installed Next 16.3.8 Script/environment documentation. Browser blocker evidence and all QA artifacts are in `D:/SkyPro-seo-growth-20261024/account-connection/`. No browser cookie/credential extraction, another browser driver, external support report or unrelated service mutation was used.
