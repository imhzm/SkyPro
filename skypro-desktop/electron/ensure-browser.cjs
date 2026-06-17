// ensure-browser.cjs — auto-install the Playwright Chromium build on first run.
//
// The CI build packages the app WITHOUT bundling Chromium (npm ci runs with
// PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 to keep the installer small). So on a fresh
// machine launchPersistentContext() fails with:
//   "Executable doesn't exist at .../ms-playwright/chromium-XXXX/.../chrome.exe"
// This module downloads the EXACT Chromium revision the bundled Playwright
// expects, into the per-user ms-playwright cache, with progress broadcast to the
// renderer. It is idempotent and single-flight (concurrent callers share one run).

const { chromium } = require('playwright')
const fs = require('fs')
const { spawn } = require('child_process')
const { BrowserWindow } = require('electron')

let _installing = null

function broadcast(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      try { win.webContents.send('browser-install-status', payload) } catch { /* window gone */ }
    }
  }
}

/** True when the Chromium build Playwright expects is present on disk. */
function browserInstalled() {
  try {
    const execPath = chromium.executablePath()
    return !!execPath && fs.existsSync(execPath)
  } catch {
    // executablePath() can throw when nothing is installed yet — treat as missing.
    return false
  }
}

/** Resolve the Playwright install CLI shipped inside the app bundle.
 *  require.resolve('playwright/cli.js') throws ERR_PACKAGE_PATH_NOT_EXPORTED on
 *  modern Playwright (its "exports" map blocks arbitrary subpaths), so resolve
 *  the package.json (always exported) and join cli.js next to it. */
function resolveCliPath() {
  for (const pkg of ['playwright', 'playwright-core']) {
    try {
      const cliPath = path.join(path.dirname(require.resolve(`${pkg}/package.json`)), 'cli.js')
      if (fs.existsSync(cliPath)) return cliPath
    } catch { /* try next */ }
  }
  return null
}

/**
 * Ensure the Chromium build is installed. Returns { ok, alreadyInstalled?, error? }.
 * Never throws. Safe to call from multiple places — only one download runs.
 */
function ensureBrowser() {
  if (browserInstalled()) {
    return Promise.resolve({ ok: true, alreadyInstalled: true })
  }
  if (_installing) return _installing

  _installing = new Promise((resolve) => {
    const cli = resolveCliPath()
    if (!cli) {
      broadcast({ phase: 'error', message: 'تعذّر العثور على أداة تثبيت المتصفح' })
      resolve({ ok: false, error: 'playwright CLI not found in bundle' })
      _installing = null
      return
    }

    console.log('[ensureBrowser] Chromium missing — downloading via', cli)
    broadcast({ phase: 'start', percent: 0 })

    // Run the Playwright CLI under Electron's Node (ELECTRON_RUN_AS_NODE) so we
    // don't need a separate node binary in the packaged app. Installs the
    // revision that matches the bundled playwright version, into the default
    // per-user cache that launchPersistentContext() reads from.
    const child = spawn(process.execPath, [cli, 'install', 'chromium'], {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      windowsHide: true,
    })

    const onData = (buf) => {
      const text = buf.toString()
      const m = text.match(/(\d{1,3})%/)
      if (m) {
        const percent = Math.min(100, parseInt(m[1], 10))
        broadcast({ phase: 'downloading', percent })
      }
    }
    child.stdout.on('data', onData)
    child.stderr.on('data', onData)

    child.on('error', (err) => {
      console.error('[ensureBrowser] spawn error:', err.message)
      broadcast({ phase: 'error', message: 'فشل تشغيل تثبيت المتصفح' })
      resolve({ ok: false, error: err.message })
      _installing = null
    })

    child.on('close', (code) => {
      const ok = code === 0 && browserInstalled()
      if (ok) {
        console.log('[ensureBrowser] Chromium installed successfully')
        broadcast({ phase: 'done', percent: 100 })
        resolve({ ok: true })
      } else {
        console.error('[ensureBrowser] install failed, exit code', code)
        broadcast({ phase: 'error', message: 'فشل تثبيت المتصفح. تأكد من اتصال الإنترنت.' })
        resolve({ ok: false, error: `playwright install exited with code ${code}` })
      }
      _installing = null
    })
  })

  return _installing
}

module.exports = { ensureBrowser, browserInstalled }
