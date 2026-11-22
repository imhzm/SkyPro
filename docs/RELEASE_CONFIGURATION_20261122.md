# SkyPro merged release and runtime configuration — 22 November 2026

PR40 is merged and its exact source is built. Production activation remains pending because recoverable configuration and a runnable rollback are not yet established.

## Accepted source and build

- PR: https://github.com/imhzm/SkyPro/pull/40, merged 17:30:51 UTC.
- Source: `e776f21fe8e7c64f85254af1c8ab1c6e2f321eff`.
- Web tree: `86005e33b95a0e5b4d6cd95a72bcc48786f45742`, identical to the previously tested candidate.
- Linux build: `hF3gLn7kHN_iyJxif003I`, Node 24.16.0, fixture database only, official public GA4 ID.
- Verification: 384 source files before/after build, 48 contracts, 45 SEO pages, 51 internal links, eight noindex routes, callback noindex and insecure-origin rejection.
- Static media: 85 assets pass transport/decode/hash/provenance checks. Full browser media acceptance is separate; five supporting galleries remain unavailable.
- Archive: 7,590,840 bytes; SHA256 `0500f7860b84669df58761302498f2f088668e4870c3bd704e77adb959b18214`. All 1,380 compiled archive members independently read and hashed. Production secrets and fixture configuration excluded.
- Shared VPS build used an isolated `/var/tmp/skypro-e776f21-*` directory. Loopback 3139 is closed after verification. No named production service restarted. Desktop workflow paths were unchanged; no Actions run was returned for the merged SHA at the check.

The release includes consented registration/trial/download measurement, repeat platform visits, precise Cairo caching, product-copy corrections, brand icons and official guide references. These changes have individual browser/fixture evidence. Build and merge do not establish production behavior or GA4 receipt.

## Runtime evidence and narrowed configuration gap

Read-only checks at 17:33 UTC found source `d5a24f60a2d7a482bdeaa5f0d2bb301639c37998`, build `0cAlw9aUEbN0fuO18hTTv`, PM2 skypro PID 3687204, zero restarts and 22 services. The release `.env` symlink target and the previous `20261102-97a0eb8` rollback directory are absent. Current compiled files and dependencies remain present.

At 17:38 UTC, the anonymous `/api/auth/csrf` JSON token was matched to its handler cookie before comparing its hash in memory against the mode-600 project-root configuration. NEXTAUTH_SECRET matched; AUTH_SECRET is absent. No secret, token or authenticated user value was returned. This proves the Auth.js secret match, without proving every other JWT helper's loaded secret or the complete environment.

Owner-console read-only review under skywaveads@gmail.com found the publicly observed live OAuth client in the existing Sky Wave project. Its console name is SkyCRM. Its only authorized origin and callback are CRM URLs; the SkyPro callback is absent. Two existing secrets are enabled, and the console states their original values cannot be viewed or downloaded. No client setting or secret was changed.

At 17:44 UTC, the Google token endpoint returned HTTP 401 `deleted_client` for the root configuration's alternate client pair, using a deliberately invalid authorization code. A second request with a deliberately invalid secret returned the same error. No tokens were issued. This establishes that the alternate root client is deleted; it does not test end-to-end sign-in or identify who deleted it. Google's official error reference: https://developers.google.com/identity/protocols/oauth2/web-server#errors.

Do not copy the root Google pair into a new production release, restart the live service with incomplete configuration, change CRM, or restore a whole VPS backup across other projects.

## Owner credential handoff and remaining work

A new-client form is prepared but unsubmitted in Edge under the owner account:

- Name: SkyPro Web Production.
- Type: Web application.
- Authorized redirect: `https://skypro.skywaveads.com/api/auth/google/callback`.
- No browser JavaScript origin is needed for this server-side flow. AI-agent option remains unchecked.

Browser policy requires the owner to perform creation of the new authentication credential. The owner has been asked to click Create, download the JSON securely and provide its local path only. Do not request its contents in chat. No new credential has been created by the agent.

After the handoff: validate the new pair and redirect, complete the scoped runtime environment while preserving the matching session secret, restore and rehearse a runnable rollback, stage exact merged source/build, run production preflight, activate only SkyPro, and verify live source/build, roles and auth flows, consent/GA4 receipt and desktop/mobile views. No database migration or other-project mutation is authorized by this report. The full SEO growth goal remains active.

## Evidence locations

Owner-local root: `D:/SkyPro-seo-growth-20261024/release-measurement-20261122`.

`source.json`, `LINUX_ACCEPTANCE.json`, `linux-build-manifest.json`, `HOST_AFTER_MERGE_READONLY.json`, `SESSION_CONFIG_COMPARISON_CONFIRMED.json`, `GOOGLE_CONFIGURATION_AUDIT.json`, `ROOT_GOOGLE_PAIR_DIAGNOSTIC.json` and `GOOGLE_CLIENT_HANDOFF.jpg` retain the precise scopes and timestamps. No secret values are included in these reports.

The separately approved editorial follow-ups were sent once on 22 November inside the original AITnews and Saudi Shopper threads. The sends are verified; no editorial acceptance or acquired independent backlink is claimed. Durable project state is maintained in the existing Notion record: https://app.notion.com/p/40cbf843dfa08110933adf16e7f3a266.
