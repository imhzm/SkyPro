# Facebook Tools Overhaul — Progress & Plan

> Continue-from-anywhere doc. Captures the 35-bug Facebook overhaul status so
> work can resume on any device. Last updated: 2026-06-17 (v1.31.0).

## ⚠️ The key insight

The 35-bug manual-review list + junk CSVs reflected the **OLD INSTALLED BUILD**.
The fixes were committed to `main` but never rebuilt/deployed, so the app on disk
kept showing old behaviour. Live tests of the **current source** (read-only
Playwright harness against the real FB profile, app closed) prove most tools are
already correct. v1.31.0 is the first build that ships all of it.

## How to verify a tool live (read-only harness)

1. Close the SkyPro app (it locks the Chromium profile). Confirm: no
   `SingletonLock`/`lockfile` in `%APPDATA%/SenderPro/browser-profiles/facebook`,
   no `electron`/`SenderPro` process.
2. Create a throwaway `_h.cjs` at repo `skypro-desktop/`:
   `require('./electron/ipc/social.cjs')(ipcm, helpers)` with
   `globals.bm = { getPage: () => page }` and mock helpers
   (`safeGoto, randomDelay, sendProgress, saveLeads, getSender, smartType,
   smartClick, smartActionClick, humanMouseMove, encryptSecret, decryptSecret,
   unprotectRow, saveAccount`). Launch
   `chromium.launchPersistentContext('%APPDATA%/SenderPro/browser-profiles/facebook', { headless:false, locale:'ar-SA' })`.
   `require('electron')` returns a path string in plain node — harmless.
3. Call the real handler, report COUNTS + truncated samples (never message text).
   Delete `_h.cjs` after.

Build checks (CLAUDE.md): `npx tsc -b`, `npx eslint . --quiet`, `npm test`
(bindings + sanitizer + security). All green as of this commit.

## Status by bug

Legend: ✅ live-verified on current source · 🟢 code-complete + build-checked ·
🧪 needs the user's live test (send tools — real side effects, can't auto-run) ·
👤 needs a real data source the dev account lacks.

| # | Tool | Status | Notes |
|---|------|--------|-------|
| 0 | Export naming | 🟢 | `${tool}_${YYYY-MM-DD}_${HHMMSS}.csv` |
| 1 | Extract friends | ✅ | Was 2000 for <500 friends; canonical-id dedup + real-count cap → 439 unique, ends correctly |
| 2 | Post likers/engagers junk | ✅ | Sanitizer now blocks relative-times/hashtags/admin-nav |
| 3 | Pretty popups (not alert) | 🟢 | Promise-based `ConfirmProvider` replaces every native `confirm()` |
| 4 | Comment extraction | 🟢 | Fixed `page.evaluate` 2-arg bug; live-verified earlier |
| 5 | Group members → /members | ✅ | Navigates `/groups/{gid}/members`, 80 real members, junk=0 |
| 6 | Page followers | 🟢 | Sanitizer routing; list-close handling |
| 7 | Page messengers | ✅ | Empty inbox no longer returns nav tabs as junk (avatar-required). Populated case 👤 (needs a page WITH messages) |
| 8 | Profile messengers | 🟢 | Scrolls past 18 (scrollable ancestor) |
| 9 | Reviews | ✅ | Returns pageId + clean reviews, admin-nav junk=0 |
| 10 | Phones from comments | 🟢 | Needs re-check at scale |
| 11 | Remove post-details | ✅ | Fully removed incl. dead refs |
| 12 | Extract groups | 🟢 | search-groups broad sweep |
| 13 | Join groups | 🟢 | Completes join + stop button |
| 14 | Advanced search | 🟢 | Needs re-check |
| 15 | Search pages (extract too) | 🟢 | Now extracts, not just searches |
| 16 | Extract my groups | ✅ | 25 clean groups |
| 17 | Extract sharers | 🟢 | |
| 18 | Login re-types password | 🟢 | `c_user` cookie detection |
| 19 | Remove active-friends | ✅ | Fully removed |
| 20 | Detect open groups | 🟢 | bidi-strip + main page |
| 21 | Remove demographic analysis | ✅ | Fully removed |
| 22 | Post to groups | 🧪 | Composer + dialog-scoped |
| 23 | Share post | 🧪 | |
| 24 | Auto-reply (was self-comment) | 🧪 | Article-scoped reply box |
| 25 | Like→Follow pages | 🧪 | Relabeled + Follow selectors |
| 26 | Comment on pages | 🧪 | Improved selectors |
| 27 | Comment on posts (NEW) | 🧪 | Full feature added |
| 28 | Invite friends skip limit | 🧪 | No 50 cap; scroll to limit |
| 29 | Page-like invites | 🧪 | Covered by 28 fix |
| 30 | Links → IDs | 🟢 | Pages + profiles entity id |
| 31 | Delete friends | 🧪 | Opens Friends menu first |
| 32 | Profile/page messages | 🧪 | Dialog-scoped composer |
| 33 | Add-to-group-chat + create-group-chat (NEW) | 🧪 | Both wired end-to-end |
| 34 | Page-send does DM not comment | 🧪 | Dialog-scoped |
| 35 | Users → IDs | 🟢 | Correct entity id |

Cross-cutting: live first-by-first streaming + STOP button (jobId +
`globals.cancelFlags`) on every long-running tool; root-cause scroll fix
(`document.scrollingElement`); sanitizer bidi-strip.

## Remaining work

1. **Send/action tools (🧪)** — user verifies with throwaway content/account
   (post/share/messages/join/delete/invite/comment/auto-reply/chat). Report any
   that misbehave with the page/post URL used → fix selectors.
2. **Page messengers populated case (👤)** — re-verify on a page that actually
   receives messages.
3. Re-check at scale: phones-from-comments (10), advanced search (14).

## Build & deploy (see also the deploy runbook)

- Build: `cd skypro-desktop && npm run build:desktop` (afterPack flips Electron
  fuses). Installer → `skypro-desktop/release/`.
- Deploy: scp `SkyPro Setup X.Y.Z.exe` + `.blockmap` + `latest.yml` to the
  downloads server, write `version.json`, repoint `latest`/`latest.exe` symlinks.
  `app-update.yml` has no `publisherName` (signature check skipped → auto-update
  works).
