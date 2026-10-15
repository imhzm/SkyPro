# Homepage theme QA — 2026-10-15

## Scope
Source: imhzm/SkyPro. Base: d012c831ce5e81b8141c2c056a59bdc662c3624d. Branch: feat/home-theme-20261015. Isolated checkout: D:/SkyPro-theme-20261015.

This is a local production-build review, not a production release. Existing desktop recovery changes were not included.

## Requirements and evidence
| Requirement | Evidence |
| --- | --- |
| One home, shared components, two themes | HomeTheme.tsx, HomeHeader.tsx, Hero.tsx, HomeSections.tsx, HomeFooter.tsx, shared.tsx and home.module.css |
| Reference composition | Full desktop captures in both themes: hero, fact strip, ten marks, 4+6 platform previews, features, three steps, use cases, three offer cards, FAQ, CTA and footer |
| Official branding and real software | Existing SP logo and public/images/app captures; no replacement logo or synthetic dashboard |
| Actual pricing | EGP 2,000 annually and two-day trial, verified against repository pricing and live homepage; team/device requests use contact CTA |
| Contact | +201029934356, https://wa.me/201029934356 and tel:+201029934356 verified in rendered HTML |
| Required signature | Rendered footer says تم التصميم بكل❤️بواسطة Sky Wave; only Sky Wave in the signature is linked to https://www.skywaveads.com/ |
| All ten platforms | All ten cards have product screenshots and valid existing detail destinations; Google Maps uses the combined /platforms/olx page |
| Natural copy | Arabic copy reviewed with local Humanizer 3.1.0 guidance; no invented reviews, prices, rankings or success metrics |
| Responsive RTL | Final browser checks at 320, 390, 768, 1024, 1440 and 1920 in light and dark: no document horizontal overflow or out-of-bounds heading/paragraph/summary rectangles |
| Interaction | Theme toggle, persistence after reload, native FAQ open/close, real screenshot dialog, Escape and focus return, mobile navigation and section anchors |
| SEO | One H1, canonical, Arabic metadata, OG/Twitter, Organization/WebSite/SoftwareApplication/BreadcrumbList/Service/FAQPage JSON-LD; no AggregateRating in home HTML |

## Executed checks
- npm ci (existing lockfile), Prisma client generation only; no migration or DB write.
- Subsequent security audit: four affected production packages in the baseline (Next.js critical; Nodemailer, sharp and source-map-js high). Reviewed upgrades reduce the production dependency audit to zero vulnerabilities. See SECURITY_NOTES.md.
- Full audit including development tools: 11 remaining entries (9 high, 2 moderate) in the existing Tailwind/ESLint dependency trees. No forced Tailwind major migration or ESLint downgrade was performed.
- npx tsc --noEmit: exit 0. Production build also performs TypeScript checking.
- npx eslint . --quiet: exit 0. Existing font configuration warning remains in non-quiet lint.
- npm run build: exit 0; homepage statically generated. Existing Edge runtime deprecation remains for social images.
- Production-mode local server: next start on port 3101.
- HTTP checks: ten platform destinations, home, platform list, auth pages, legal/security pages, robots and sitemap return 200 with DENY frame protection.
- Guest access checks: /api/auth/me returns 401; /api/admin/stats returns 403; /admin and /dashboard redirect to login (307).
- Browser-only response fixtures: customer desktop points to /dashboard; admin desktop/mobile points to /admin; Tab keeps the disclosure open, Escape closes it and returns focus. Light mobile profile text is rgb(18,28,66), and logout is rgb(180,35,54). Interception was removed and the real guest state restored.
- Structured-data checks: one H1, canonical, phone/WhatsApp/signature present, annual software offer 2000 EGP, no AggregateRating.
- /opengraph-image returns 200 image/png and was visually inspected; an unsupported checkmark glyph was removed from the inherited image template.
- scripts/verify-mail-transport.cjs passes against a loopback SMTP server using STARTTLS and certificate validation. Two Arabic/text multipart messages are accepted locally; rejected recipients and missing settings return failures. No real provider, customer address or SMTP credentials are used.
- Axe WCAG 2 A/AA and WCAG 2.2 AA tags: zero detected violations in both desktop and mobile themes. 16 rules passed per run. Color contrast remains incomplete for 9 desktop and 74 mobile nodes due to styled/gradient contexts; screenshots and text/background tokens were reviewed manually. This is not a complete accessibility certification.

## Evidence location
D:/SkyPro-theme-evidence-20261015 contains screenshots, final responsive JSON, HTTP/schema JSON, four Axe reports, account-UI fixture results, build/lint/typecheck logs and the HTTP verification script. Desktop hero captures are 1440x900; mobile hero captures are 390x844. Full-page captures include all sections.

[Before: live desktop](review/before-live-desktop.jpg) · [Light desktop](review/light-desktop-hero.jpg) · [Dark desktop](review/dark-desktop-hero.jpg) · [Light mobile](review/light-mobile-hero.jpg) · [Dark mobile](review/dark-mobile-hero.jpg)

## Limits and release status
- The live site still has the previous home. Its exact deployed SHA has not been verified; no deployment success is claimed.
- Two available SSH identities were rejected by the new VPS. No server files, services, DB, DNS, CRM or WhatsApp systems were changed.
- Customer quotations with independent verification were unavailable, so the equivalent visual position contains useful product use cases. Verified quotations can replace them later.
- Browser UI fixture checks of account states do not prove real account login, billing, activation or provider delivery. Backend routes and DB schemas were not changed; the mail dependency upgrade has separate local SMTP regression coverage.
- The local preview does not have the production database configuration. Its health endpoint reports 503 in that environment; public-page QA does not certify database/service readiness.
- Search Console/Bing Webmaster and field Core Web Vitals are not connected here. No p75 performance or indexing/AI-visibility guarantee is made.
- Release after review must use the approved exact SHA and repeat live 1440x900 / 390x844 QA. Rollback is the prior verified release artifact/SHA; no database rollback is needed for this change.
