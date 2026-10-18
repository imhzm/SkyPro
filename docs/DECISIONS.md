# Decisions — 2026-10-15

- Treat both user-provided references as the requested art direction. Build one semantic homepage with CSS variables for light/dark, not duplicate page trees.
- Keep the reference order and density: hero, fact strip, ten platform marks, four large then six smaller platform cards, features, three steps, social-proof-shaped use cases, pricing, FAQ, final CTA and footer.
- Use actual Sky Pro screenshots instead of the synthetic dashboard from the reference. Show the screenshot unchanged inside a laptop presentation. Preserve the official SP logo.
- Show free trial, annual EGP offer and team enquiry as three pricing cards. Only the annual paid offer has a verified price; no invented popularity ranking.
- Verified customer quotations are unavailable. Use three product use cases in the same visual position, with no fabricated quotes, stars or identities.
- Restrict redesign styles to the home CSS module. Reuse existing auth menu behavior and consent; leave other pages visually intact.
- Scope is an existing homepage redesign, not a new site; no unsolicited blog/CMS/dashboard or twenty-article expansion.
- Use locally available Humanizer 3.1.0 guidance for embedded Arabic copy review. Source: D:/agent-tools/humanizer/SKILL.md.
- Reuse the existing abstract wave background, encoded to 65 KB WebP. Add a dark overlay under copy to keep the headline and body legible. Do not use generated mock dashboards as product evidence.
- Use SVG marks from the already installed Simple Icons 16.23.0 (CC0), plus the project's existing LinkedIn mark and multicolor Maps treatment. No new runtime dependency.
- Map the Google Maps card to the existing combined Google Maps/OLX page instead of creating a nonexistent route or expanding other-page content.
- Correct the shared account disclosure's name and keyboard behavior, and apply scoped light-theme fixes for its mobile customer/admin states. Keep server authentication and authorization untouched.

## SEO references checked
- https://developers.google.com/search/docs/appearance/ai-features
- https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c
- https://developers.openai.com/api/docs/bots

Use crawlable, useful visible content and matching structured data. Do not use unsupported review schema or promise AI inclusion. Webmaster reports require connected accounts, which are not available in this task.

## Authorized publication — 2026-10-15
- Publish the merged GitHub SHA in a separate release, preserving the original runtime for rollback and linking its existing environment file without copying secrets locally.
- Build on Linux with the locked dependencies; verify on loopback port 3201 before moving only PM2 skypro to port 3200. Preserve Nginx and all unrelated services.
- PM2 startOrRestart retained the previous executable path on the first activation; automatic HTTP verification rejected the old home and restored the old process. Recreate only the named skypro process from the explicit release config for activation and rollback. The corrected activation passed SHA/path, HTTP, DB and browser checks.
- SMTP verify connects/authenticates with TLS but sends no message and creates no customer/test account.
# 2026-10-18 — site-wide theme candidate

The user's explicit hosting request authorizes this migration after QA. Preserve the current live release until candidate checks pass. Use shared theme tokens and original product screenshots; preserve legal copy and desktop API contracts. Fix the demonstrated email confirmation and impersonation restore failures with narrowly scoped authorization checks. Fixture secrets/outbox stay outside Git and production. See RELEASE_SITE_THEME_20261018.md for current evidence and remaining gates.

