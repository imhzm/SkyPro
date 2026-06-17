// bundle-chromium.mjs — download Playwright's Chromium into ./.pw-browsers at
// BUILD time so electron-builder can ship it INSIDE the installer
// (build.extraResources → resources/pw-browsers). The packaged app points
// PLAYWRIGHT_BROWSERS_PATH at that folder (electron/main.cjs), so a freshly
// downloaded app runs immediately — NO first-run download, works fully offline.
//
// Why this is required: the app's Electron security fuses turn RunAsNode OFF and
// OnlyLoadAppFromAsar ON, and the Playwright CLI isn't reachable from inside the
// asar — so the old "download Chromium on first run" path is impossible in a
// packaged build. Bundling is the only way to ship a complete installer.
//
// Runs under plain Node during `npm run build:desktop` (before electron-builder).
// Idempotent: re-running just verifies/repairs the install.

import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const browsersDir = path.join(root, '.pw-browsers')

fs.mkdirSync(browsersDir, { recursive: true })

// Resolve the Playwright install CLI. NOTE: require.resolve('playwright/cli.js')
// throws ERR_PACKAGE_PATH_NOT_EXPORTED on modern Playwright (the package's
// "exports" map blocks arbitrary subpaths). package.json IS always resolvable,
// so resolve that and join cli.js (the package's bin entry) next to it.
let cli = null
for (const pkg of ['playwright', 'playwright-core']) {
  try {
    const cliPath = path.join(path.dirname(require.resolve(`${pkg}/package.json`)), 'cli.js')
    if (fs.existsSync(cliPath)) {
      cli = cliPath
      break
    }
  } catch {
    /* try next */
  }
}
if (!cli) {
  console.error('[bundle-chromium] Playwright CLI not found — run `npm install` first.')
  process.exit(1)
}

console.log('[bundle-chromium] Installing Chromium into', browsersDir)

// Install the EXACT Chromium revision the bundled Playwright expects, into the
// build-time browsers folder. PLAYWRIGHT_BROWSERS_PATH makes it self-contained;
// it overrides any PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD (skip only affects
// postinstall, not an explicit `playwright install`).
const res = spawnSync(process.execPath, [cli, 'install', 'chromium'], {
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersDir }
})

if (res.status !== 0) {
  console.error('[bundle-chromium] Chromium install failed (exit', res.status, ')')
  process.exit(res.status || 1)
}

// Sanity-check: a chromium-* folder must now exist so the installer isn't shipped
// half-empty. Fail the build loudly rather than produce a broken installer.
const installed = fs
  .readdirSync(browsersDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith('chromium'))
  .map((d) => d.name)

if (installed.length === 0) {
  console.error('[bundle-chromium] No chromium-* build found after install — aborting.')
  process.exit(1)
}

console.log('[bundle-chromium] Bundled browser builds:', installed.join(', '))
console.log('[bundle-chromium] Done — Chromium will ship inside the installer.')
