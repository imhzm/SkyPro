# Contextual platform guides — candidate, 31 October 2026

All 18 live platform pages had zero guide links in their main content. Visitors could inspect the tools but could not directly reach the preparation guide for that platform. This candidate adds 20 descriptive article links across 16 relevant platform pages, using the existing related-link presentation. Snapchat and Auto Point receive no generic replacement because no dedicated published guide currently fits.

The selection is explicit and limited to three articles per page. Each selected article already links to the matching product page. Runtime resolution includes published articles only; a data contract checks valid platforms, article references, distinct slugs and the product relationship. Existing article titles supply link text. The HTML contains ordinary followed anchors inside a labelled navigation region; the section sits after the platform FAQ and before the existing trial CTA.

This follows [Google's crawlable-link and descriptive-anchor guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). It does not claim improved ranks, indexing, conversions or resolution of every historical Ahrefs warning.

## Verification completed locally

- Isolated fixture attested; production build and TypeScript pass. Build `4FfuITAXlW1PIK3Ot44UK`, with the existing public GA4 ID supplied at build time.
- Targeted TypeScript/TSX lint: zero errors. Existing analytics, conversion, media and capture tests plus the new data contract: 18 pass. SEO fault-injection suite: 10 pass. Total: 28 tests, zero failures.
- Candidate HTTP/SSR audit: 45 public pages, 51 internal destinations and eight private noindex routes pass. This HTTP/SSR result is separate from the browser acceptance recorded below.
- All 18 candidate platform pages were compared with freshly captured live baselines. Titles, descriptions, H1, canonical, original main text and original main anchors are preserved after removing the added guide section. The expected 20 article links appear across 16 pages, with no duplicate IDs.
- Fault injection confirms that a link outside main cannot satisfy contextual navigation, and generic labels or nofollow cannot pass the new check.
- Article bodies, metadata sources, pricing, auth, APIs, database schema and dependencies are unchanged. No CSS was added; the accepted related-link rules are reused.

Owner-local evidence: `D:/SkyPro-seo-growth-20261024/contextual-links-20261031/`, including live baseline, candidate comparisons, SEO audit, test log and build record. Preview: `http://127.0.0.1:3103` while its owned process is running.

## Browser acceptance — 2 November 2026

Browser acceptance completed on 2 November 2026 for source f3052a4 / web tree16c1a287 / build4FfuITAXlW1PIK3Ot44UK. All18 platform routes passed216 DOM geometry/theme/link cases across320/390/768/1024/1440/1920 and light/dark, with zero overflow or clipped card text. Four inspected screenshots are exact1440x900 and390x844. Opening the first Accounts guide, returning, and Tab progression through the three guides to the existing trial CTA passed; visible3px focus outline confirmed. These are scoped browser checks, not a new full-site or WCAG certification. Historical native-pipe failures are superseded; no candidate web source changed. Production is still9ed2311 pending exact-SHA Linux build/preflight and live QA.

Owner-local proof: `browser-20261102/ACCEPTANCE.json`, six layout part files, `navigation-focus.json`, and four key screenshots. An initial mismatched surface-size capture was excluded; accepted screenshots use matching browser viewport and CDP dimensions at DPR1. The existing routine deployment approval remains valid. Merge and deploy only the reviewed web tree, with fresh resource/runtime guards and a9ed2311 rollback.
