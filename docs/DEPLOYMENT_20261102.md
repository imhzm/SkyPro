# Contextual platform guides — published 2 November 2026

Visitors can now open the relevant preparation guides directly from 16 platform pages. The change adds 20 descriptive article links after the FAQ, using the accepted related-link presentation. All 18 platform pages retain their previous main copy, anchors and metadata; Snapchat and Auto Point receive no generic replacement links. [PR #28](https://github.com/imhzm/SkyPro/pull/28) is merged.

| Binding | Verified value |
| --- | --- |
| Published source | `97a0eb85aa147f70a8e9319db3ceddde4cb008c8` |
| Web tree | `16c1a287ae719e93ce8e3eb20d06afd42f1931a4` |
| Linux build | `41scv5ODoHr0oZSIgj2w5` |
| Runtime | `/var/www/skypro.skywaveads.com/releases/20261102-97a0eb8/skypro-web` |
| Activation accepted | 2026-11-02 21:11:42 UTC |
| Rollback source | `9ed2311b1c55bbab348358d6d51338b036464695` |

The public HTML build matches the runtime. All 369 tracked web files match the reviewed Git tree. PM2 runs the named SkyPro process from this release, online with zero restarts at acceptance. All 20 other PM2 service identities retained PID, status, cwd, script and restart count during activation. The previous release and the new release's `rollback.config.cjs` remain available.

## Build and publication

The VPS compiler resource guard stopped compilation before it started because available memory was below its 1GiB floor. The same merged source was built in an isolated owner-local Ubuntu24.04 WSL workspace on Linux x86_64 with the same Node `v24.16.0` as production. Clean lockfile installation, compilation and TypeScript passed; source hashes were checked before and after. No production secrets or database credentials were used in that build.

An initial local archive contained Windows CRLF conversions and was rejected before installation. A new archive with Git autocrlf disabled matched all 369 source files. The accepted compiled package excludes compiler cache and the unused standalone output. It contains 994 regular files, 29,046,669 uncompressed bytes; the compressed archive is 8,402,586 bytes with SHA256 `18e4d3af84167cd763950605bba0e3d402a780d0638fd8bb27664bdd2b3a0db9`. Its manifest is bound to the reviewed source and web tree. The server validated every archive entry and every extracted file before preflight.

Import required the exact uncompressed size plus a 1GiB activation reserve and an additional 256MiB. The existing 2.5GiB source staging/compiler guard and 1GiB activation guard were preserved. This avoids allocating a compiler cache on the VPS; it does not lower those existing thresholds. No package installation, generation, migration or compilation ran on production. Existing dependency files and schema hashes match; the existing environment target is reused.

## Acceptance

- Local candidate: build/TypeScript, targeted lint, 28 tests and 18 baseline comparisons pass. Original platform text, metadata and anchors are preserved after removing the new guide section.
- Candidate browser: 216 DOM geometry/theme/link cases across 18 routes × six widths × two themes pass. Four exact key screenshots were inspected; this is not 216 manually inspected screenshots.
- Linux loopback preflight: 28 contract/fault tests, route inventory, 45 SEO pages, 51 internal destinations, eight private noindex pages, 83 raster assets, 15 restricted-media checks and four font/CSS hashes pass.
- Production: the same HTTP/SSR/media/font checks pass with the published build. Health reports web and database operational. Original source file set is checked again after activation.
- Live browser: all 18 platform routes pass geometry, RTL and expected guide-link checks at 390×844/light after load. Accounts is inspected at desktop1440×900 and mobile390×844 in both themes. Opening its guide, returning, Tab order through three guides to the existing trial CTA and a visible3px focus outline pass. Home at both required dimensions is inspected.
- An initial public navigation geometry read occurred before loading finished and returned a zero-size link. Follow-up complete-state DOM and the screenshot showed the visible346×89.78 link. Accepted live smoke checks explicitly wait for page load; the early observation is retained separately.

No article body, pricing, authentication, API, payment, dependency, database/schema, environment, DNS or unrelated project change is part of this release. It is scoped acceptance, not a new whole-site account/RBAC suite or WCAG certification. Search ranking, indexing impact, qualified trials and field CWV are not established by these checks.

Owner-local proof: `D:/SkyPro-seo-growth-20261024/release-contextual-20261102/production/ACCEPTANCE.json`, named HTTP/test/import/service reports, `platform-smoke-390-light.json`, `navigation-focus.json` and six live JPEG screenshots. Candidate evidence remains under `contextual-links-20261031/browser-20261102/`. Earlier deployment reports retain their dated scope. The SEO Growth goal remains active; five authentic Desktop galleries remain owner-login dependent.
