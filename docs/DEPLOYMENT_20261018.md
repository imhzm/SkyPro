# Sky Pro site-wide theme deployment — 2026-10-18

Owner instruction: «ارفع ع الهوست». Release: https://skypro.skywaveads.com/. PR: https://github.com/imhzm/SkyPro/pull/10 (merged).

## Source and activation evidence

- Exact deployed merge SHA: `e3778186c132cbfebf183d7007ba9ea016fd3683`.
- Web tree: `8f5f4bb89fda37e75640422650a9914b0dcfd034`.
- Production build ID: `M-jusBxFJa2qBtbI6hM8F`.
- New VPS: `187.124.168.251`; release `/var/www/skypro.skywaveads.com/releases/20261018-e377818/skypro-web`.
- GitHub source extracted into an empty release directory; all 291 tracked web files matched their Git blob hashes after building. The lockfile matches the separately installed and Prisma-generated candidate dependency tree. Final release dependencies use independent hard links, not an external node_modules symlink (Turbopack rejects that symlink).
- PM2 `skypro` was recreated with the explicit release executable/cwd and loopback `127.0.0.1:3200`. Activation report: `ACTIVATED_AND_HTTP_VERIFIED`; PID 178972 and zero restarts at activation. PM2 state saved. Twenty other service PIDs remained identical.
- Existing `.env` remains the original file through a symlink. No migrations, customer fixtures, real payments, outbound production test email, Nginx, DNS, desktop or CRM changes.

## Checks

- Linux production build and TypeScript pass. Local TypeScript and lint pass; ESLint has 19 warnings, zero errors. Production dependency audit: zero vulnerabilities. Loopback mail regression passes with TLS validation enabled, including rejection/missing-config cases.
- Final local built-runtime fixture: 147 page responses across visitor/customer/admin, 50 API checks, six form checks, 20 admin flows and 44 admin mutation denials pass. Fourteen account journeys also passed on the built candidate; the final follow-up changes presentation/focus and callback routing. No real charge or transfer occurred.
- Final Linux loopback preview and public production: 50 route checks, including 32 public/auth responses, 17 correct protected guest redirects and the permanent Google alias redirect. All 18 platform metadata/media/catalog checks pass. Unknown platform returns 404.
- Production SEO/link audit: 24 indexable pages have unique titles/descriptions, expected canonicals, one H1 and social metadata. Thirty unique internal links checked without HTTP errors. Authentication pages carry noindex and private/auth routes are absent from the public sitemap.
- Public unauthenticated `/api/auth/me` returns 401 and `/api/admin/stats` returns 403. Web/database health operational. Pricing read-only verification: 2000 EGP / 365 days, trial 2 days; no DB setting override.
- Privacy/terms AST text/link comparison against 2e798e9 passes with only the approved contact-number substitution. Shared tokens preserve the approved home composition, legal text and real screenshots. Unsupported ratings/reviews/statistics and performance guarantees were removed from platform presentation.

Evidence root: `D:/SkyPro-site-theme-evidence-20261015`. Browser captures and the consolidated maximum-19-image ZIP are still being finalized; provisional and incorrectly sized/captioned captures must not be treated as acceptance evidence. The site is deployed; full visual acceptance/packaging remains an active goal.

## Rollback

Previous live release remains `/var/www/skypro.skywaveads.com/releases/20261015-cfa2257/skypro-web`. The generated rollback configuration preserves its cwd/executable/arguments.

```bash
pm2 delete skypro
pm2 start /var/www/skypro.skywaveads.com/releases/20261018-e377818/rollback.config.cjs --only skypro
pm2 save
curl -fsS https://skypro.skywaveads.com/api/health
```

Verify PM2 cwd, old build ID and expected public/protected behavior. No database rollback is needed. Do not restart unrelated services.

## Limits and search guidance

No real customer/admin production login or payment was exercised; write flows use the local fixture only. Search Console/Bing private reports and field p75 Core Web Vitals were not available or claimed. VPS free disk space was about 1.3 GiB at final build; broader server cleanup was not authorized or performed.

Reviewed official [Google guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), [Bing guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a), and [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots). Public server-rendered content, accurate metadata and crawlability support discovery; neither indexing nor AI citations are guaranteed. Existing crawler opt-in preferences are preserved; no llms.txt or fabricated schema shortcut was introduced.
