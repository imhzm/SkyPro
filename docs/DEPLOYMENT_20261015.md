# Sky Pro production release — 2026-10-15

User authorization: "ارفع ع الهوست". Live: https://skypro.skywaveads.com/.

## Exact source and runtime
- Merged PR: https://github.com/imhzm/SkyPro/pull/8.
- Deployed SHA: cfa2257b21da8820e1b123bef5bc9bd3ec3753ac.
- Web tree: 29b9dfc7ff081ce935d015a03da252ffa5e627a1, identical to locally tested implementation commit 6270918571b4f0be4e0d5f4c92d4ffc3bf715efd.
- Git objects fetched directly from GitHub on 187.124.168.251; verified web tree and extracted with git archive. The running original checkout was not checked out or reset.
- Release: /var/www/skypro.skywaveads.com/releases/20261015-cfa2257/skypro-web.
- Linux build ID: 7AjnvkA1jSbEvyhtJ9EnK. npm ci, Prisma client generation, Next.js 16.3.8 build and production dependency audit succeeded (zero runtime vulnerabilities).
- PM2 name: skypro. Explicit executable and cwd point to this release; listening on 127.0.0.1:3200. Process online, zero restarts at final inspection; PM2 state saved.
- .env is a symlink to the unchanged original skypro-web/.env. No credentials copied locally; no migrations, customer-data writes, external mail, DNS or Nginx changes. Other PM2 services were not restarted.

## Activation and verification
- Existing site and DB were operational before activation. A loopback preview on 127.0.0.1:3201 passed 23 route checks, 25 asset checks, matching home schema and DB SELECT 1 health check.
- First PM2 startOrRestart retained the previous script path; live content checks detected the previous homepage and triggered rollback. Corrected activation recreated only the named skypro process with the explicit release config. Final output: ACTIVATED_AND_HTTP_VERIFIED.
- Public checks: 19 public routes return 200; /api/auth/me returns 401; /api/admin/stats returns 403; /admin and /dashboard redirect guests to login. Phone, WhatsApp, exact footer signature, one H1, canonical and 2,000 EGP annual offer verified. No AggregateRating in new home schema.
- Live health reports operational web and database. SMTP authentication/TLS verification passes using the actual Nodemailer 10.0.16 transport; no email sent.
- Browser: both themes at 320/390/768/1024/1440/1920; no document horizontal overflow or out-of-bounds heading/paragraph/summary rectangles. Theme persists on reload; mobile menu/pricing anchor, screenshot dialog/Escape/focus return and native FAQ work. No browser console errors observed during these checks.
- Production screenshots: light/dark desktop 1440x900 and mobile 390x844, plus actual annual pricing. Saved under D:/SkyPro-theme-evidence-20261015/production.
- Loopback preview stopped after activation. Temporary partial upload removed; no full backup created on VPS.

## Rollback
The original runtime remains /var/www/skypro.skywaveads.com/skypro-web, git SHA d012c831ce5e81b8141c2c056a59bdc662c3624d, build ID fDPixRaS1QSQgTrmUd7jS. It was exercised by the automatic rollback. Its untracked historical files and existing env were preserved.

Authorized operator rollback commands on the new VPS:
```bash
pm2 delete skypro
pm2 start /var/www/skypro.skywaveads.com/releases/20261015-cfa2257/rollback.config.cjs --only skypro
pm2 save
curl -fsS https://skypro.skywaveads.com/api/health
```
Verify PM2 cwd/executable, expected old homepage and public/protected routes. No DB rollback is needed.

## Remaining limits
No real customer login, payment, activation or end-to-end mail delivery was exercised; no test account or payment was created. SMTP verification proves connectivity/authentication, not recipient inbox delivery. Eleven existing development dependency audit entries remain as documented in SECURITY_NOTES.md; runtime audit is clean. Search Console/Bing reports and field Core Web Vitals were not measured. Later documentation-only commits do not change the deployed web tree or deployed SHA above.

## Live captures
[Light desktop](review/live-light-desktop.jpg) · [Dark desktop](review/live-dark-desktop.jpg) · [Light mobile](review/live-light-mobile.jpg) · [Dark mobile](review/live-dark-mobile.jpg)
