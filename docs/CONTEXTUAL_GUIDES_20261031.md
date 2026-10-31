# Contextual platform guides — candidate, 31 October 2026

All 18 live platform pages had zero guide links in their main content. Visitors could inspect the tools but could not directly reach the preparation guide for that platform. This candidate adds 20 descriptive article links across 16 relevant platform pages, using the existing related-link presentation. Snapchat and Auto Point receive no generic replacement because no dedicated published guide currently fits.

The selection is explicit and limited to three articles per page. Each selected article already links to the matching product page. Runtime resolution includes published articles only; a data contract checks valid platforms, article references, distinct slugs and the product relationship. Existing article titles supply link text. The HTML contains ordinary followed anchors inside a labelled navigation region; the section sits after the platform FAQ and before the existing trial CTA.

This follows [Google's crawlable-link and descriptive-anchor guidance](https://developers.google.com/search/docs/crawling-indexing/links-crawlable). It does not claim improved ranks, indexing, conversions or resolution of every historical Ahrefs warning.

## Verification completed locally

- Isolated fixture attested; production build and TypeScript pass. Build `4FfuITAXlW1PIK3Ot44UK`, with the existing public GA4 ID supplied at build time.
- Targeted TypeScript/TSX lint: zero errors. Existing analytics, conversion, media and capture tests plus the new data contract: 18 pass. SEO fault-injection suite: 10 pass. Total: 28 tests, zero failures.
- Candidate HTTP/SSR audit: 45 public pages, 51 internal destinations and eight private noindex routes pass. This is zero browser comparisons, not a repeated 180-case visual suite.
- All 18 candidate platform pages were compared with freshly captured live baselines. Titles, descriptions, H1, canonical, original main text and original main anchors are preserved after removing the added guide section. The expected 20 article links appear across 16 pages, with no duplicate IDs.
- Fault injection confirms that a link outside main cannot satisfy contextual navigation, and generic labels or nofollow cannot pass the new check.
- Article bodies, metadata sources, pricing, auth, APIs, database schema and dependencies are unchanged. No CSS was added; the accepted related-link rules are reused.

Owner-local evidence: `D:/SkyPro-seo-growth-20261024/contextual-links-20261031/`, including live baseline, candidate comparisons, SEO audit, test log and build record. Preview: `http://127.0.0.1:3103` while its owned process is running.

## Pending acceptance

The native Windows Computer Use channel still fails with missing native pipe (`os error 2`). No browser window or input action was available. Exact desktop/mobile screenshots, all six responsive widths, light/dark appearance, focus order and live browser navigation have **not** been verified for this candidate. No alternate driver or fabricated visual proof was used.

Keep this change in a draft PR until browser acceptance is possible. Production remains source `9ed2311b1c55bbab348358d6d51338b036464695` / build `loG9s48t7K4qQulKD3b3l`; this candidate is not merged or deployed. Existing routine deployment authorization does not substitute for the missing QA evidence.
