# SkyPro merged release and runtime configuration — 22 November 2026

PR40 is live as of24November2026. Production-configured preflight, rollback boot/restart, exact source/build, public SEO/static media and scoped browser acceptance pass. See DEPLOYMENT_20261124.md for the accepted activation, retained initial rollback and remaining limits. The dated recovery findings below document how this configuration was established.

## Accepted source and build

- PR: https://github.com/imhzm/SkyPro/pull/40, merged 17:30:51 UTC.
- Source: `e776f21fe8e7c64f85254af1c8ab1c6e2f321eff`.
- Web tree: `86005e33b95a0e5b4d6cd95a72bcc48786f45742`, identical to the previously tested candidate.
- Linux build: `hF3gLn7kHN_iyJxif003I`, Node 24.16.0, fixture database only, official public GA4 ID.
- Verification: 384 source files before/after build, 48 contracts, 45 SEO pages, 51 internal links, eight noindex routes, callback noindex and insecure-origin rejection.
- Static media: 85 assets pass transport/decode/hash/provenance checks. Full browser media acceptance is separate; five supporting galleries remain unavailable.
- Archive: 7,590,840 bytes; SHA256 `0500f7860b84669df58761302498f2f088668e4870c3bd704e77adb959b18214`. All 1,380 compiled archive members independently read and hashed. Production secrets and fixture configuration excluded.
- The build used owner-local WSL Linux in an isolated `/var/tmp/skypro-e776f21-*` directory, with evidence written to `/mnt/d`. Its loopback 3139 listener was checked absent on the local WSL host on 23 November. No named production service restarted. Desktop workflow paths were unchanged; no Actions run was returned for the merged SHA at the check.

The release includes consented registration/trial/download measurement, repeat platform visits, precise Cairo caching, product-copy corrections, brand icons and official guide references. These changes have individual browser/fixture evidence. Build and merge do not establish production behavior or GA4 receipt.

## Runtime evidence and narrowed configuration gap

Read-only checks at 17:33 UTC found source `d5a24f60a2d7a482bdeaa5f0d2bb301639c37998`, build `0cAlw9aUEbN0fuO18hTTv`, PM2 skypro PID 3687204, zero restarts and 22 services. The release `.env` symlink target and the previous `20261102-97a0eb8` rollback directory are absent. Current compiled files and dependencies remain present.

At 17:38 UTC, the anonymous `/api/auth/csrf` JSON token was matched to its handler cookie before comparing its hash in memory against the mode-600 project-root configuration. NEXTAUTH_SECRET matched; AUTH_SECRET is absent. No secret, token or authenticated user value was returned. This proves the Auth.js secret match, without proving every other JWT helper's loaded secret or the complete environment.

Owner-console read-only review under skywaveads@gmail.com found the publicly observed live OAuth client in the existing Sky Wave project. Its console name is SkyCRM. Its only authorized origin and callback are CRM URLs; the SkyPro callback is absent. Two existing secrets are enabled, and the console states their original values cannot be viewed or downloaded. No client setting or secret was changed.

At 17:44 UTC, the Google token endpoint returned HTTP 401 `deleted_client` for the root configuration's alternate client pair, using a deliberately invalid authorization code. A second request with a deliberately invalid secret returned the same error. No tokens were issued. This establishes that the alternate root client is deleted; it does not test end-to-end sign-in or identify who deleted it. Google's official error reference: https://developers.google.com/identity/protocols/oauth2/web-server#errors.

Do not copy the root Google pair into a new production release, restart the live service with incomplete configuration, change CRM, or restore a whole VPS backup across other projects.

## Staging and independent prerequisites — 23 November 2026

The exact accepted source/build is now staged at `/var/www/skypro.skywaveads.com/releases/20261122-e776f21`. Transfer hashes and all 384 source/1,380 compiled file hashes pass. Before staging, current rollback code independently matched all 372 source and 994 compiled files against the retained original manifests. Dependencies were hard-linked only after package, lockfile and Prisma schema identities matched; no installation, generation, migration or environment file was performed. The current runtime remains `d5a24f6`. All 22 PM2 identities match before and after staging.

A temporary Next server at loopback3213 booted this exact staged output with an explicitly isolated environment, placeholder session secret, an unreachable fixture DB on port9, and no Google/SMTP credentials. The 45-page SEO audit, 51 links, eight noindex routes, callback noindex, guest dashboard redirect and build-manifest response pass. The child was terminated and its listener is absent; production service identities remain unchanged. This proves the new VPS can boot the compiled runtime and serve its public routes. It does not establish production credentials, real sign-in, Google callback completion, mail delivery or GA4 receipt.

Existing root configuration structural checks on 22 November matched the approved site URLs and trial/device/price/currency/duration defaults and confirmed a read-only SkyPro database connection. The persisted Desktop-signature sample after this live process started returned zero eligible rows, so that check adds no proof of its signing-secret match. On 23 November, the existing root SMTP credentials authenticated to their existing Hostinger SMTP destination with TLS certificate validation. No mail was sent; delivery is unproven.

At 01:41 UTC on 23 November, two loopback calls to the existing internal welcome-mail route independently checked the actual loaded NEXTAUTH_SECRET. A deliberately invalid secret returned403/Unauthorized; the existing root secret passed that guard and the empty body returned400/Missing welcome email data, before mail dispatch. No user session or email was created. Together with the independent Auth.js CSRF comparison, this resolves the loaded-secret value mismatch concern. It does not test every existing user session or replace post-configuration auth acceptance. `LOADED_SESSION_SECRET_20261123.json` preserves the sanitized result and route-source hash. Recovery can use independently verified root values and the new dedicated Google client; finding the original missing environment file itself is not a prerequisite.

Evidence: `HOST_STAGING_20261123.json`, `ISOLATED_HOST_ACCEPTANCE_20261123.json`, `RUNTIME_PREREQUISITES.json` and `SMTP_CONFIGURATION_VERIFY_20261123.json` under the owner-local evidence root. The temporary stage upload is `/var/tmp/skypro-stage-e776f21-jO0aqw`; it contains reviewed source/build artifacts and sanitized manifests, not a full VPS backup or production environment. Initial isolated staging had only its tracked `.env.example`; the later approved configuration stage linked the protected runtime environment described below.

## Approved client and runtime configuration — 23 November 2026

After the owner's explicit action-time confirmation, the agent created the separate client in the approved Sky Wave project under skywaveads@gmail.com:

- Name: SkyPro Web Production.
- Type: Web application.
- Authorized redirect: `https://skypro.skywaveads.com/api/auth/google/callback`.
- No browser JavaScript origin is needed for this server-side flow. AI-agent option remains unchecked.

The initial instruction requiring the owner to perform creation/download personally was unnecessary. Creation of a separate OAuth client falls under action-time confirmation for new security-sensitive access. That confirmation was received; creation and download are complete. The JSON is held in a restricted local directory outside the public repository. No secret is included in reports, Notion, screenshots or this repository. The existing CRM and payment clients and shared audience/branding are unchanged.

Google's official audience documentation exempts identity-only `openid email profile` requests from testing trusted-user-list and seven-day authorization restrictions: https://support.google.com/cloud/answer/15549945. These are the exact scopes in SkyPro's current custom login route; the generic creation-dialog testing notice does not require changing the shared project's audience for this flow.

The new client pair returned `invalid_grant` for a deliberately invalid code; a deliberately invalid secret returned `invalid_client`. No tokens were issued. The candidate now links a new mode-600 runtime environment inside a mode-700 project directory. Re-parsing proves every original root configuration value except GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET is preserved, and an independent live CSRF comparison verifies the session secret. The original root file and current live environment link are unchanged. Activation and rollback configs are prepared outside application source. `GOOGLE_CLIENT_CREATED_20261123.json`, `GOOGLE_CLIENT_CREATED_20261123.jpg` and `RUNTIME_CONFIGURATION_ACCEPTANCE_20261123.json` retain the sanitized evidence.

The first production-configured preflight stopped before starting a preview because available memory was below the unchanged 1GiB guard. Its precise observation is in `PRODUCTION_CONFIG_PREFLIGHT_20261123_ATTEMPT1.json`. No activation or unrelated-process mutation occurred. Do not lower the guard merely to pass or stop another project's processes within this task.

Next: when resource guards pass, complete production-configured preflight and runnable rollback rehearsals using the prepared environment, activate only SkyPro, and verify live source/build, roles and auth flows, consent/GA4 receipt and desktop/mobile views. End-to-end Google sign-in is not established by the synthetic-code diagnostic. No database migration or other-project mutation is authorized by this report. The full SEO growth goal remains active; its measurement checkpoint is in `docs/GROWTH_CHECKPOINT_20261123.md`.

## Evidence locations

Owner-local root: `D:/SkyPro-seo-growth-20261024/release-measurement-20261122`.

`source.json`, `LINUX_ACCEPTANCE.json`, `linux-build-manifest.json`, `HOST_AFTER_MERGE_READONLY.json`, `SESSION_CONFIG_COMPARISON_CONFIRMED.json`, `GOOGLE_CONFIGURATION_AUDIT.json`, `ROOT_GOOGLE_PAIR_DIAGNOSTIC.json` and `GOOGLE_CLIENT_HANDOFF.jpg` retain the precise scopes and timestamps. No secret values are included in these reports.

The separately approved editorial follow-ups were sent once on 22 November inside the original AITnews and Saudi Shopper threads. The sends are verified; no editorial acceptance or acquired independent backlink is claimed. Durable project state is maintained in the existing Notion record: https://app.notion.com/p/40cbf843dfa08110933adf16e7f3a266.
