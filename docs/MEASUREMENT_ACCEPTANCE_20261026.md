# Measurement candidate acceptance — 26 October 2026

This continues the 25 October connection checkpoint. The candidate is not yet deployed. Existing production authorization covers the approved routine measurement/media changes; publish only after the final exact-source build and deployment preflight, preserving rollback and other services.

| Layer | Evidence and result | Scope |
| --- | --- | --- |
| GA4 receipt | The correct SkyPro property Realtime displays the synthetic `page_view`; collector acknowledges 204 | Local QA, not business traffic/conversions |
| Consent/network | Seven saved checks pass, including no pre-consent request, sanitized query/hash, one guide SPA pageview and withdrawal suppression | Production build on loopback |
| Private route | SPA navigation to login keeps the loaded provider but sets its disable flag; event count stays 2 before/after | Production build on loopback |
| Media | 24 geometry/image/keyboard cases across 320/390/768/1024/1440/1920 and both themes pass; actual originals are 1602×835; eight final viewport PNGs have checked 390×844 or 1440×900 dimensions | Two new reviewed captures only; earlier full-site baseline is separate |
| Registration | A real isolated fixture account is created with pending verification/subscription, and `complete_registration` appears once without `trial_activated` | Next development mode, same source, dedicated loopback DB and non-forwarding `.invalid` SMTP |
| Activation | Fixture DB changes to verified/active, trial subscription and active key. One successful activation response and one sanitized `trial_activated` collector attempt are recorded after the client guard | Collector is blocked for these synthetic conversion tests; no business conversion is claimed |
| Strict Mode regression | Original development mount emitted duplicate verification requests (500/200). A component ref now prevents repeated verification effects; server stdout records one 200 request for the subsequent case | Frontend guard only; no backend/schema change |

The production HTTP fixture correctly rejects registration because production requires an HTTPS Origin. That failed registration produces no completed conversion. The real fixture journey therefore runs in development mode rather than weakening the production origin check or bypassing certificate warnings. The unchanged backend transaction is verified independently in the isolated DB.

The browser event buffer was truncated in the final activation observation; it is not used to assert complete request coverage. The preserved server stdout supplies the full request chronology, and the before/after DB inspections independently prove the final state. The brief verification success view was missed during automated lookup; the resulting login page visibly confirms successful email verification. Do not describe a missed transient heading as an asserted test.

Generic tab screenshots initially scaled the host surface, and a first CDP capture used document y=0 after scrolling. Those rejected images were replaced. Final captures use the actual visual viewport pageX/pageY, explicit dimensions and unscaled PNG output; pixel dimensions and actual rendered content were checked. No product screenshot pixels were reconstructed or generated.

Local evidence: `D:/SkyPro-seo-growth-20261024/account-connection/` (Realtime, private-route, fixture traces, server log, DB states) and `desktop-media-handoff/media-gallery-verified.json` (media matrix, exact capture metadata). Previously recorded source/build Rnu5LxiIA5P3OWDVmHz6J predates the small verification-effect guard; the final build identity must be recorded after that change before publication.

Growth remains open: five supporting galleries, country demand/rank baselines, field CWV, acquired links and actual commercial trial counts are not established by these tests. The two authorized sent inquiries and one unconfirmed form submission remain accurately scoped in the outreach ledger.
