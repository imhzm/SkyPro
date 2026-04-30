# سيندر برو - Agent Guide

## Project Overview

**سيندر برو (Sender Pro)** is a professional Arabic-language desktop marketing automation application built with Electron + React + TypeScript + Tailwind CSS v4. It automates browser interactions across 18+ social platforms using Playwright.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + Vite
- **Backend (Main Process)**: Electron 41 + Node.js + Playwright
- **Database**: Local SQLite (better-sqlite3) + Hostinger MySQL (for activation keys)
- **Browser Automation**: Playwright with Chrome
- **State Management**: Zustand
- **Icons**: Lucide React

## Architecture

```
sender-pro-desktop/
├── electron/
│   ├── main.cjs          # Electron main process + Playwright automation + IPC handlers
│   └── preload.cjs       # Secure bridge between main and renderer
├── src/
│   ├── main.tsx          # React entry
│   ├── App.tsx           # Router with auth guard
│   ├── index.css         # Tailwind theme + custom utilities
│   ├── types/            # Shared TypeScript types
│   ├── data/             # Platform definitions
│   ├── hooks/            # Reusable hooks (usePlatform)
│   ├── stores/           # Zustand stores
│   ├── services/         # API, database, browser services
│   ├── components/
│   │   ├── layout/       # Layout, Sidebar, Header
│   │   └── common/       # ActivationPage, ProxyManager, CampaignScheduler, AntiBanSystem
│   └── modules/          # 20+ platform modules
│       ├── dashboard/
│       ├── facebook/
│       ├── whatsapp/
│       ├── instagram/
│       ├── twitter/
│       ├── linkedin/
│       ├── telegram/
│       ├── tiktok/
│       ├── pinterest/
│       ├── snapchat/
│       ├── threads/
│       ├── reddit/
│       ├── google/
│       ├── send-emails/
│       ├── auto-point/
│       ├── security/
│       ├── account/
│       ├── accounts/
│       └── other-tools/
├── sender-pro-api/       # PHP API for Hostinger
└── dist/release/         # Desktop build output
```

## Build Commands

```bash
# Development
npm run dev

# Production build (renderer only)
npm run build

# Full desktop build
npm run build:desktop
```

## Key Configuration

### Activation Keys (Local Fallback)
- File: `src/services/api/activation.ts`
- Toggle: `USE_LOCAL_VALIDATION = true/false`
- Valid keys: `SKY1-PRO2-0001-2026` through `SKY1-PRO2-0010-2026`
- Price: 2,000 EGP/year
- Expiry: 2027-04-23

### Hostinger API (Production)
- Server: `http://147.79.66.116/sender-pro-api`
- Files: `sender-pro-api/*.php`
- Upload manually via SCP/SFTP to `/var/www/html/sender-pro-api/`
- SSH: `root@147.79.66.116` / `Newjoker2k333`

### Database (SQLite)
- File: `data/senderpro.db` (created at runtime)
- Tables: accounts, leads, campaigns, smtp_settings, proxies

## Playwright Automation

### Browser Manager Features
- Anti-detection (stealth user agent, viewport, WebGL, plugins)
- Proxy support per session
- Headless/headed toggle per tool
- Session persistence (cookies, localStorage)

### Implemented Automations
- **Facebook**: login, search, extract (likers, comments, members, friends), post to groups, send messages
- **WhatsApp**: launch, send messages, extract groups, filter numbers
- **Instagram**: login, extract followers/comments/hashtag, auto-follow, send messages, mention
- **Twitter**: login, tweet, extract followers, schedule tweet, follow, retweet, mention
- **LinkedIn**: login, search, extract companies, send messages
- **Telegram**: login, send messages, extract members, add users
- **Google Maps**: business extraction
- **OLX**: listing extraction
- **Proxy Manager**: test real proxies
- **Campaign Scheduler**: DB persistence

## IPC Channels (Renderer <-> Main)

### Authentication
- `activate-key` / `validate-key` / `check-key-status`

### Browser Automation
- `launch-browser`, `close-browser`, `browser-status`
- `facebook-*`, `whatsapp-*`, `instagram-*`, `twitter-*`, `linkedin-*`, `telegram-*`
- `tiktok-*`, `pinterest-*`, `snapchat-*`, `threads-*`, `reddit-*`
- `google-*`, `send-emails-*`, `auto-point-*`

### Data Management
- `db-query`, `db-get`, `db-run`, `db-all`
- `export-csv`, `export-excel`
- `save-proxy`, `get-proxies`, `test-proxy`
- `save-campaign`, `get-campaigns`, `delete-campaign`

## Styling

### Tailwind CSS v4 Custom Utilities
- `.card` — white card with shadow
- `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger` — button variants
- `.input-field`, `.textarea-field`, `.select-field` — form controls
- `.label-field` — form labels
- `.table-container`, `.data-table` — table styling
- `.badge`, `.badge-success`, `.badge-danger`, `.badge-warning` — status badges
- `.tool-card` — tool grid card

## Code Conventions

- All UI text in **Arabic**
- Use `usePlatform()` hook for consistent state management
- IPC calls go through `window.electronAPI.*`
- Error handling: `try/catch` with `showMsg()` pattern
- Loading states via `loading` boolean + `Loader2` spinner

## Important Notes

1. **SSH Upload Blocked**: Automated SCP to Hostinger fails in this environment due to interactive password prompts. Upload `sender-pro-api.zip` manually via SFTP/SCP.
2. **Windows Build**: `signAndEditExecutable: false` is set to avoid symlink privilege issues.
3. **Playwright Selectors**: Facebook/Instagram/Twitter selectors may need updates as platforms change their DOM.
4. **Chunk Size Warning**: Vite warns about >500KB JS chunk — this is normal for a large app.
