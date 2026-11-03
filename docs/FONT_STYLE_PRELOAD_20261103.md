# Cairo stylesheet preload — experiment held, 3 November 2026

Status: **HOLD — do not merge or deploy this experiment as a proven performance improvement.** The existing published release is not changed by this evaluation. The owner approved continuing browser QA in Edge after in-app navigation commands timed out.

## Scope and binding

The only application change is a root-layout `<link rel="preload" as="style">` for the existing hash-named Cairo stylesheet. Its original global import boundary, CSS ordering, font bytes, discrete weight descriptors, content, metadata, auth behavior and dependencies remain unchanged.

| Binding | Value |
| --- | --- |
| Candidate code commit | `1d266ac0231f01f5430f8fec81c3d600905aaa34` |
| Candidate web tree | `a6960833cbb1ab650e3c3c3301513c21ef2a1aee` |
| Windows Node version | `24.16.0` |
| Candidate webpack build | `Hin0l9jx2R-bjaIAhAQFd` |
| Local baseline webpack build | `4FfuITAXlW1PIK3Ot44UK` |
| Baseline web tree | `16c1a287ae719e93ce8e3eb20d06afd42f1931a4` |
| Last accepted published source | `97a0eb85aa147f70a8e9319db3ceddde4cb008c8` |
| Last accepted published Linux build | `41scv5ODoHr0oZSIgj2w5` |

The isolated baseline/candidate previews use ports3103/3104 and the already attested local fixture. No production fixture, new database seed, server deployment, environment change, DNS or unrelated service action occurred in this phase. Live acceptance of97a remains dated2November; this is not a new VPS/process inventory.

## Completed safety checks

- Build and TypeScript pass; targeted root-layout ESLint exits0. All28 existing contract tests pass against explicit `CHECK_ORIGIN=http://127.0.0.1:3104`.
- SEO audit:45 public pages,51 internal destinations and eight noindex auth pages pass, zero reported errors.
- Six SSR route pairs preserve main text, title, description, canonical and ordered stylesheet links. Five CSS files have identical byte hashes; three WOFF2 subsets and the Cairo stylesheet match their original hashes on both previews (eight transport checks).
- Browser comparison: six representative routes at390 and1440, light/dark, gives24 matching pairs. Home at320/768/1024/1920 adds four light-theme pairs:28 accepted pairs, no text, typography, wrapping, measured position, color or horizontal overflow differences.
- Early color differences were sampled during hydration/theme transitions. At1024 an auth-menu difference was caused by sampling one guest menu before its session check finished. Raw observations remain retained. Accepted repeats wait animations and the actual rendered guest links; no application code was changed to mask these observations.
- This is representative presentation QA, not a fresh authenticated account/admin suite, manual accessibility certification or the historical full-site180-case run.

Next renders duplicate font preload elements in the baseline already. The candidate also has two matching stylesheet preload elements. Browser resource timing shows **one Cairo CSS resource per navigation**, with1101 transferred bytes in each of the ten measured navigations. No duplicate-network-request claim follows from counting SSR tags.

## Performance evidence and decision

Five navigations per source were collected in two interleaved batches at390×844, with tab-scoped cache disabled, simulated150ms latency and200,000 download bytes/s. CPU and server image-cache/scheduling state were not controlled. All runs, including the slow first candidate, are retained.

| Cairo CSS timing from navigation start | Baseline | Candidate |
| --- | ---: | ---: |
| Median request start | 1036.2ms | 250.9ms |
| Median response end | 1271.1ms | 1209.3ms |
| Response-end range | 1129.2–1613.0ms | 948.0–2935.4ms |
| Initiator | CSS import | preload link |

Earlier discovery is demonstrated locally (median785.3ms). Completion is variable; the combined median difference is only61.8ms. The initial three-per-source sample suggested245.7ms, but that estimate changed after adding the next two samples. It is not an accepted user-visible speed improvement.

Four buffered LCP-observer attempts returned no entry within the500ms observation window. These are unavailable observations, not LCP=0. Document visibility was `visible`; no unsupported hidden-tab diagnosis is asserted. The official2November PSI baseline remains mobile89/LCP3609ms and desktop99/LCP604ms, with no field data. No new PSI, INP, CrUX/p75 or field-CWV pass is claimed.

The decision is to retain the one-line candidate for investigation without merging or deployment. A future acceptance needs a valid before/after paint/LCP comparison under a reproducible cold-load test, plus the usual exact-source Linux build, resource guards, rollback and live QA. Earlier stylesheet discovery alone does not justify publishing a performance claim.

Raw CDP exact screenshot capture timed out in Edge, including a supported clipped capture. Native observed screenshots were readable but cropped the viewport; they are labelled observed, not exact-size acceptance proof. Network throttling, cache-disable and device/viewport overrides were restored after QA. No broad browser cache was cleared.

## Evidence and continuation

Owner-local evidence directory: `D:/SkyPro-seo-growth-20261024/performance-followup-20261102/candidate/`. `EVALUATION.json` is the phase result; supporting files include `BUILD_RESULT.json`, `TRANSPORT_SSR.json`, `seo-candidate.json`, `contracts-final.log`, `BROWSER_ACCEPTANCE.json`, raw `BROWSER_LAYOUT_PAIRS.json`, `NETWORK_TRIALS.json` and `LOCAL_LCP_TRIALS.json`. Initial wrong-cwd lint/default-port test invocations were corrected; final checks use the web cwd and3104 explicitly.

The durable research/decision note remains [SkyPro Web — performance and purchase-intent research](https://app.notion.com/p/40cbf843dfa08110933adf16e7f3a266). Growth remains active: commercial keyword/rank evidence inEG/SA/AE, qualified conversions, earned links, field CWV and five authentic galleries remain open. Owner-deferred Desktop login remains deferred.
