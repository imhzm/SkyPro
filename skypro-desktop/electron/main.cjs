const { app, BrowserWindow, shell, ipcMain, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')
const { fileURLToPath } = require('url')
const { chromium } = require('playwright')
const Database = require('better-sqlite3')
const { autoUpdater } = require('electron-updater')
const { randomUA, randomDelay, getSecuritySettings, setDb } = require('./anti-ban.cjs')
const { initDatabase } = require('./db-init.cjs')
const BrowserManager = require('./browser-manager.cjs')
const { registerAuthIPC } = require('./ipc-auth.cjs')
const { sanitizeRecords, isJunkName } = require('./ipc/extraction-sanitizer.cjs')
const campaignRunner = require('./campaign-runner.cjs')

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)

const globals = require("./globals.cjs")
// let globals.db = null
// let globals.bm = null
// const globals.cancelFlags = new Map()
let jobIdCounter = 0
const ipcHandlers = {}
const SECRET_PREFIX = 'enc:v1:'
const PLAIN_PREFIX = 'plain:v1:'   // fallback when safeStorage unavailable
const SECRET_COLUMNS = {
  accounts: ['password'],
  proxies: ['password'],
  smtp_settings: ['password'],
}
const REMEMBERED_LOGIN_FILE = 'remembered-login.json'

// ==================== AUTO UPDATER ====================
// Aggressive update strategy: download in background as soon as available,
// install on next app launch. User just experiences "app updated itself".
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.allowDowngrade = false
autoUpdater.disableWebInstaller = true
autoUpdater.logger = console

function sendToAllWindows(channel, data) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  }
}

autoUpdater.on('checking-for-update', () => {
  console.log('[AutoUpdate] Checking for update...')
})

autoUpdater.on('update-available', (info) => {
  console.log('[AutoUpdate] Update available:', info.version)
  sendToAllWindows('update-status', {
    status: 'available',
    version: info.version,
    releaseDate: info.releaseDate,
  })
})

autoUpdater.on('update-not-available', (info) => {
  console.log('[AutoUpdate] Up to date:', info.version)
  sendToAllWindows('update-status', { status: 'not-available', version: info.version })
})

autoUpdater.on('error', (err) => {
  console.error('[AutoUpdate] Error:', err?.message || err)
  sendToAllWindows('update-status', { status: 'error', error: err?.message || 'Unknown error' })
})

autoUpdater.on('download-progress', (progress) => {
  sendToAllWindows('update-status', {
    status: 'downloading',
    percent: Math.round(progress.percent),
    transferred: progress.transferred,
    total: progress.total,
    bytesPerSecond: progress.bytesPerSecond,
  })
})

autoUpdater.on('update-downloaded', (info) => {
  console.log('[AutoUpdate] Downloaded:', info.version)
  sendToAllWindows('update-status', {
    status: 'downloaded',
    version: info.version,
  })
  // AGGRESSIVE INSTALL: as soon as the update is downloaded, prompt the
  // user via the renderer to install NOW (renderer shows a modal). If they
  // ignore it, autoInstallOnAppQuit handles it eventually. This solves the
  // "I keep my app open for days and never get updates" problem.
  // The renderer can call IPC 'apply-update-now' to trigger quitAndInstall.
})

// ==================== HELPERS ====================
// Policy for the plaintext-secret fallback when OS-level encryption (DPAPI /
// Keychain / libsecret) is unavailable. Defaults to ENABLED to preserve the
// v1.18 fix (otherwise accounts never save on DPAPI-less machines). Set
// SKYPRO_ALLOW_PLAINTEXT_SECRETS=0 to make missing OS encryption a HARD ERROR
// instead of silently degrading to unencrypted on-disk credentials.
const ALLOW_PLAINTEXT_SECRETS = (process.env.SKYPRO_ALLOW_PLAINTEXT_SECRETS ?? '1') !== '0'

function encryptSecret(value) {
  if (value === null || value === undefined || value === '') return value
  const text = String(value)
  // Already encrypted or already in fallback form — pass through unchanged.
  if (text.startsWith(SECRET_PREFIX) || text.startsWith(PLAIN_PREFIX)) return text
  // PRIMARY PATH: Electron safeStorage (OS-level encryption — DPAPI on Windows,
  // Keychain on macOS, libsecret on Linux). This is the secure default.
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return `${SECRET_PREFIX}${safeStorage.encryptString(text).toString('base64')}`
    } catch (err) {
      if (!ALLOW_PLAINTEXT_SECRETS) {
        throw new Error('SECRET_ENCRYPTION_UNAVAILABLE: OS encryption failed and plaintext fallback is disabled by policy')
      }
      console.error('[encryptSecret] SECURITY WARNING: safeStorage.encryptString failed:', err?.message, '— storing secret in PLAINTEXT on disk')
    }
  } else {
    if (!ALLOW_PLAINTEXT_SECRETS) {
      throw new Error('SECRET_ENCRYPTION_UNAVAILABLE: OS encryption is unavailable and plaintext fallback is disabled by policy')
    }
    console.error('[encryptSecret] SECURITY WARNING: safeStorage NOT available on this machine — storing secret in PLAINTEXT on disk')
  }
  // FALLBACK PATH (opt-out via SKYPRO_ALLOW_PLAINTEXT_SECRETS=0): store with an
  // explicit "this is plaintext" prefix. Added in v1.18 to fix a silent failure
  // mode where, on Windows machines without DPAPI (corp accounts, missing user
  // profile, certain VPN configs), the entire saveAccount flow threw and
  // accounts never saved. The fallback is now an EXPLICIT, logged policy rather
  // than a silent degradation.
  return `${PLAIN_PREFIX}${text}`
}

function decryptSecret(value) {
  if (value === null || value === undefined || value === '') return value
  const text = String(value)
  // Plaintext fallback prefix — strip and return raw text.
  if (text.startsWith(PLAIN_PREFIX)) return text.slice(PLAIN_PREFIX.length)
  // Not an encrypted value — return as-is (legacy plaintext from before v1.x).
  if (!text.startsWith(SECRET_PREFIX)) return text
  if (!safeStorage.isEncryptionAvailable()) return ''
  try {
    return safeStorage.decryptString(Buffer.from(text.slice(SECRET_PREFIX.length), 'base64'))
  } catch (err) {
    console.error('Failed to decrypt local secret:', err.message)
    return ''
  }
}

function emptyRememberedLogin() {
  return { email: '', password: '', serial: '', remember: false }
}

function normalizeRememberedLogin(input = {}) {
  return {
    email: typeof input.email === 'string' ? input.email.trim().slice(0, 254) : '',
    password: typeof input.password === 'string' ? input.password.slice(0, 512) : '',
    serial: typeof input.serial === 'string' ? input.serial.trim().toUpperCase().slice(0, 120) : '',
    remember: input.remember === true,
  }
}

function encryptRequiredSecret(value) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage is not available on this device')
  }
  const text = String(value)
  return `${SECRET_PREFIX}${safeStorage.encryptString(text).toString('base64')}`
}

function getRememberedLoginPath() {
  return path.join(app.getPath('userData'), REMEMBERED_LOGIN_FILE)
}

function readRememberedLogin() {
  try {
    const filePath = getRememberedLoginPath()
    if (!fs.existsSync(filePath)) return emptyRememberedLogin()
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const decrypted = decryptSecret(parsed.data || '')
    if (!decrypted) return emptyRememberedLogin()
    const data = normalizeRememberedLogin(JSON.parse(decrypted))
    return data.remember ? data : emptyRememberedLogin()
  } catch (err) {
    console.error('Failed to read remembered login:', err.message)
    return emptyRememberedLogin()
  }
}

function writeRememberedLogin(input) {
  const data = normalizeRememberedLogin(input)
  if (!data.remember) {
    clearRememberedLogin()
    return
  }
  const encrypted = encryptRequiredSecret(JSON.stringify(data))
  fs.writeFileSync(
    getRememberedLoginPath(),
    JSON.stringify({ data: encrypted, updatedAt: new Date().toISOString() }),
    { mode: 0o600 },
  )
}

function clearRememberedLogin() {
  try {
    fs.rmSync(getRememberedLoginPath(), { force: true })
  } catch (err) {
    console.error('Failed to clear remembered login:', err.message)
  }
}

function protectRow(table, data = {}) {
  const columns = SECRET_COLUMNS[table]
  if (!columns) return { ...data }
  const protectedData = { ...data }
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(protectedData, column)) {
      protectedData[column] = encryptSecret(protectedData[column])
    }
  }
  return protectedData
}

function unprotectRow(table, row) {
  const columns = SECRET_COLUMNS[table]
  if (!columns || !row) return row
  const unprotected = { ...row }
  for (const column of columns) {
    if (Object.prototype.hasOwnProperty.call(unprotected, column)) {
      unprotected[column] = decryptSecret(unprotected[column])
    }
  }
  return unprotected
}

function unprotectRows(table, rows) {
  return Array.isArray(rows) ? rows.map((row) => unprotectRow(table, row)) : []
}

function migrateStoredSecrets() {
  if (!globals.db || !safeStorage.isEncryptionAvailable()) return
  for (const [table, columns] of Object.entries(SECRET_COLUMNS)) {
    for (const column of columns) {
      const rows = globals.db.prepare(`SELECT id, ${column} FROM ${table} WHERE ${column} IS NOT NULL AND ${column} != '' AND ${column} NOT LIKE ?`).all(`${SECRET_PREFIX}%`)
      const update = globals.db.prepare(`UPDATE ${table} SET ${column} = ? WHERE id = ?`)
      const tx = globals.db.transaction((items) => {
        for (const item of items) update.run(encryptSecret(item[column]), item.id)
      })
      tx(rows)
    }
  }
}

// Save account row called from every platform login handler. MUST be
// fail-safe — a thrown exception here would kill the whole login IPC
// and return success:false to the renderer even though the user IS
// logged in (the Chrome session is open). We wrap every step in try/
// catch and log details for debugging but NEVER propagate exceptions.
//
// DEDUP STRATEGY (v1.21): if a `[connect-pending-*]` placeholder row exists
// for the same platform (created by the "ربط الحساب" UI flow), UPDATE that
// row in place instead of inserting a duplicate. This prevents the user
// from ending up with two rows after they save an empty placeholder then
// complete the login.
function saveAccount(platform, username, password, status = 'active') {
  if (!globals.db) { console.warn('saveAccount: db not ready'); return }
  const cleanPlatform = String(platform || '').trim()
  const cleanUsername = String(username || '').trim()
  if (!cleanPlatform || !cleanUsername) {
    console.warn(`saveAccount refused empty row (platform="${cleanPlatform}", username="${cleanUsername}")`)
    return
  }
  let encryptedPassword
  try {
    encryptedPassword = encryptSecret(password)
  } catch (err) {
    console.error('saveAccount: encryption failed unexpectedly:', err?.message)
    encryptedPassword = ''
  }
  try {
    // FIRST: look for a placeholder row created by the "ربط" UI flow.
    // Placeholders have username like `[connect-pending-1234567890]`.
    const placeholder = globals.db.prepare(
      "SELECT id FROM accounts WHERE platform = ? AND username LIKE '[connect-pending-%' LIMIT 1"
    ).get(cleanPlatform)

    if (placeholder?.id) {
      // Upgrade the placeholder to the real account. Use UPDATE so the
      // row ID stays stable (any UI selection state on this row survives).
      globals.db.prepare(
        'UPDATE accounts SET username = ?, password = ?, status = ? WHERE id = ?'
      ).run(cleanUsername, encryptedPassword, status, placeholder.id)
      console.log(`saveAccount: upgraded placeholder #${placeholder.id} → ${cleanPlatform}/${cleanUsername.substring(0, 30)}`)
      return
    }

    // Normal path: INSERT OR IGNORE on (platform, username) unique index.
    globals.db.prepare('INSERT OR IGNORE INTO accounts (platform, username, password, status) VALUES (?, ?, ?, ?)')
      .run(cleanPlatform, cleanUsername, encryptedPassword, status)
    // Then refresh password/status (the IGNORE clause skips update if
    // the row already exists, so we explicitly update here).
    globals.db.prepare('UPDATE accounts SET password = ?, status = ? WHERE platform = ? AND username = ?')
      .run(encryptedPassword, status, cleanPlatform, cleanUsername)
    console.log(`saveAccount: stored ${cleanPlatform}/${cleanUsername.substring(0, 30)}`)
  } catch (err) {
    console.error(`saveAccount: SQL failed (${cleanPlatform}/${cleanUsername.substring(0, 30)}):`, err?.message)
  }
}

function openExternalUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl)
    // https for web/WhatsApp support links; mailto opens the user's mail client (support email).
    if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      shell.openExternal(parsed.toString()).catch(() => {})
    }
  } catch {}
}

function isTrustedRendererUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol === 'file:') {
      const rendererRoot = path.resolve(__dirname, '..', 'dist', 'renderer')
      const filePath = path.resolve(fileURLToPath(parsed))
      const relative = path.relative(rendererRoot, filePath)
      return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
    }
    if (isDev && process.env.VITE_DEV_SERVER_URL) {
      return parsed.origin === new URL(process.env.VITE_DEV_SERVER_URL).origin
    }
  } catch {}
  return false
}

function isTrustedIpcSender(event) {
  const senderUrl = event.senderFrame?.url || event.sender?.getURL?.() || ''
  return isTrustedRendererUrl(senderUrl)
}

// Sources where we explicitly DO NOT want to apply the junk-name filter.
// These store records that legitimately have empty/numeric/non-name primary
// fields (phone-only extractions, post details, group analytics, etc.).
const NO_FILTER_SOURCES = new Set([
  'phone-numbers',           // phone-only records
  'group-analysis',          // group statistics
  'profile-analysis',        // profile statistics
  'users-to-ids',            // ID conversion
  'links-to-ids',            // link → ID conversion
  'page-reviews',            // reviews (text-based, not names)
  'trends',                  // Twitter trends
  'olx',                     // OLX listings
  'maps-extract',            // Google Maps businesses
  'search-tweets',           // tweet text content
  'hashtag-posts',           // hashtag posts (URL-keyed)
  'hashtag-pins',
  'pins',
  'cross-platform-groups',   // group links
  'bulk-groups',
  'mention',                 // mention results
  'join-groups',             // join-group results
  'add-to-group-chat',
  'delete-friends',
  'page-messages',
  'search-pages',            // pages (have followers count)
  'search-groups',
])

function saveLeads(platform, source, data) {
  if (!Array.isArray(data) || !globals.db) return

  // Apply the centralized junk-filter UNLESS this source is whitelisted.
  let cleanedData = data
  if (!NO_FILTER_SOURCES.has(source)) {
    try {
      cleanedData = sanitizeRecords(data, { platform, kind: source })
    } catch (err) {
      console.error('[saveLeads] sanitizer failed, falling back to raw:', err.message)
      cleanedData = data
    }
  }

  const stmt = globals.db.prepare('INSERT INTO leads (platform, name, email, phone, source, url, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?)')
  let inserted = 0
  cleanedData.forEach(item => {
    if (!item) return
    const name = item.name || item.username || item.title || ''
    if (!name && !item.phone && !item.email && !item.id && !item.userId) return
    // Final junk check (defense-in-depth) — only when sanitizer was skipped.
    if (NO_FILTER_SOURCES.has(source) === false && name && isJunkName(name)) return
    const profile = item.profile || item.url || item.link || ''
    const userId = item.id || item.userId || item.user_id || ''
    const phone = item.phone || ''
    const email = item.email || ''
    const extraData = { ...item, userId }
    stmt.run(platform, name, email, phone, source, profile, JSON.stringify(extraData))
    inserted++
  })
  if (inserted < data.length) {
    console.log(`[saveLeads] ${platform}/${source}: inserted ${inserted}/${data.length}`)
  }
}

async function safeClose(sessionId) {
  try { await globals.bm.close(sessionId) } catch (e) { console.error('safeClose error:', e.message) }
}





// ==================== IPC: SECURE LOCAL PREFERENCES ====================
ipcm('get-remembered-login', async () => {
  return { success: true, data: readRememberedLogin() }
})

ipcm('save-remembered-login', async (e, data) => {
  try {
    writeRememberedLogin(data)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to save remembered login' }
  }
})

ipcm('clear-remembered-login', async () => {
  clearRememberedLogin()
  return { success: true }
})

// ==================== IPC: BROWSER ====================
ipcm('launch-browser', async (e, options) => {
  try {
    return await globals.bm.launch(options)
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('close-browser', async (e, sessionId) => {
  try {
    return await globals.bm.close(sessionId)
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('close-all-browsers', async () => {
  try {
    return await globals.bm.closeAll()
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('get-browser-status', async (e, sessionId) => {
  try {
    return { success: true, active: globals.bm.getBrowser(sessionId) !== undefined }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// Selectors per platform — multiple fallbacks because social-media sites
// frequently rename their internal classes/data-testids. If ANY selector
// matches we consider the user logged in.
const LOGGED_IN_SELECTORS = {
  facebook: [
    '[data-pagelet="LeftRail"]',
    '[aria-label="Home"]',
    '[role="navigation"][aria-label]',
    '[data-testid="blue_bar"]',
    'div[role="main"]',
    '[aria-label="Account"]',
    '[aria-label="Your profile"]',
  ],
  instagram: [
    'svg[aria-label="Home"]',
    'a[href="/direct/inbox/"]',
    'a[href*="/accounts/edit/"]',
    '[role="menuitem"]',
    'nav[role="navigation"]',
    'main[role="main"]',
  ],
  twitter: [
    'a[href="/home"]',
    '[data-testid="SideNav_AccountSwitcher_Button"]',
    '[data-testid="AppTabBar_Home_Link"]',
    '[aria-label="Account menu"]',
    'a[aria-label="Profile"]',
    '[data-testid="primaryColumn"]',
  ],
  x: [
    'a[href="/home"]',
    '[data-testid="SideNav_AccountSwitcher_Button"]',
    '[data-testid="AppTabBar_Home_Link"]',
    '[aria-label="Account menu"]',
  ],
  linkedin: [
    '.global-nav',
    '[data-test-global-nav]',
    '.feed-identity-module',
    'div.feed-shared-news-module',
    'a[data-control-name="identity_profile_photo"]',
  ],
  pinterest: [
    '[data-test-id="home-tab"]',
    'div[data-test-id="header-profile"]',
    'a[data-test-id="header-avatar"]',
    'div[data-test-id="pin-grid"]',
  ],
  threads: [
    'nav[role="tablist"]',
    'a[href="/direct"]',
    'a[aria-label="Profile"]',
    'div[role="main"]',
  ],
  reddit: [
    'shreddit-app[user-logged-in="true"]',
    '[aria-label="User Menu"]',
    'button[aria-label="Open user account menu"]',
    'a[data-testid="user-drawer-button"]',
    '[data-testid="post-feed"]',
  ],
  snapchat: [
    '[data-testid="primary-nav"]',
    'nav[role="navigation"]',
    'div[data-testid="chat-list"]',
  ],
  tiktok: [
    '[data-e2e="profile-icon"]',
    '[data-e2e="recommend-list"]',
    '[data-e2e="nav-foryou"]',
  ],
  telegram: [
    '.im_page_wrap',
    '.chat-list',
    '#column-left',
  ],
}

const LOGGED_OUT_SELECTORS = {
  facebook: ['[data-testid="royal_login_form"]', 'form#login_form', 'input[name="login"]'],
  instagram: ['input[name="username"]', 'form[id="loginForm"]', 'a[href="/accounts/login/"]'],
  twitter: ['a[href="/login"]', 'a[href="/i/flow/login"]', '[data-testid="loginButton"]'],
  x: ['a[href="/login"]', 'a[href="/i/flow/login"]', '[data-testid="loginButton"]'],
  linkedin: ['form.login__form', 'input[name="session_key"]', 'a[href*="/login"]'],
}

const PLATFORM_URLS = {
  facebook: 'https://www.facebook.com',
  instagram: 'https://www.instagram.com',
  twitter: 'https://x.com',
  x: 'https://x.com',
  linkedin: 'https://www.linkedin.com',
  pinterest: 'https://www.pinterest.com',
  threads: 'https://www.threads.net',
  reddit: 'https://www.reddit.com',
  snapchat: 'https://web.snapchat.com',
  tiktok: 'https://www.tiktok.com',
  telegram: 'https://web.telegram.org',
}

/**
 * Faster, more reliable login detection — polls every 350ms instead of one
 * fixed 5s wait, returns as soon as we see a logged-in selector. Total
 * budget: 8 seconds (was 5s fixed + 0 polling = always 5s minimum).
 */
async function detectLoginState(page, platform) {
  const loggedInSel = LOGGED_IN_SELECTORS[platform] || []
  const loggedOutSel = LOGGED_OUT_SELECTORS[platform] || []
  const deadline = Date.now() + 8000

  while (Date.now() < deadline) {
    // Check logged-out indicators first (cheap, definitive negative).
    if (loggedOutSel.length > 0) {
      const isOut = await page.evaluate((sel) => sel.some((s) => !!document.querySelector(s)), loggedOutSel).catch(() => false)
      if (isOut) return false
    }
    // Then check logged-in indicators.
    if (loggedInSel.length > 0) {
      const isIn = await page.evaluate((sel) => sel.some((s) => !!document.querySelector(s)), loggedInSel).catch(() => false)
      if (isIn) return true
    }
    await page.waitForTimeout(350)
  }
  return false
}

ipcm('check-platform-session', async (e, { platform, profileId }) => {
  try {
    // CRITICAL UX FIX: this used to call bm.launch() — so the live-login poll
    // that runs every few seconds when a platform tab is open would SPAWN a
    // browser window unexpectedly. We now ONLY inspect an already-open session;
    // the browser appears strictly when the user clicks login. If no live
    // session exists we report "not logged in" without launching anything.
    const found = await globals.bm.findAliveSession(platform, profileId)
    if (!found) return { success: true, alreadyLoggedIn: false }

    const page = globals.bm.getPage(found.id)
    if (!page) return { success: true, alreadyLoggedIn: false }

    const loggedIn = await detectLoginState(page, platform)
    return { success: true, alreadyLoggedIn: loggedIn, sessionId: found.id, url: page.url() }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ==================== HUMAN BEHAVIOR HELPERS ====================
async function humanMouseMove(page, selector) {
  try {
    const box = await page.locator(selector).first().boundingBox()
    if (box) {
      const x = box.x + box.width / 2 + (Math.random() * 10 - 5)
      const y = box.y + box.height / 2 + (Math.random() * 10 - 5)
      await page.mouse.move(x, y, { steps: 5 + Math.floor(Math.random() * 5) })
      await page.waitForTimeout(200 + Math.random() * 300)
    }
  } catch (e) { console.error('humanMouseMove error:', e.message) }
}

async function smartType(page, selectors, value, label = '') {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel)
      if (el) {
        // Move mouse naturally to the element
        await humanMouseMove(page, sel)
        // Focus with a natural click
        await el.click()
        await page.waitForTimeout(400 + Math.random() * 600)
        // Triple-click to select all then type fresh (simulates human behavior)
        await page.keyboard.press('Control+a')
        await page.waitForTimeout(100 + Math.random() * 200)
        await page.keyboard.press('Delete')
        await page.waitForTimeout(200 + Math.random() * 300)
        // Type character by character with human-like delays
        for (const ch of value) {
          await page.keyboard.type(ch, { delay: 80 + Math.random() * 150 })
        }
        await page.waitForTimeout(300 + Math.random() * 400)
        return true
      }
    } catch (e) { /* selector failed, try next */ }
  }
  // Fallback: try Tab then type
  try {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(300 + Math.random() * 400)
    for (const ch of value) {
      await page.keyboard.type(ch, { delay: 80 + Math.random() * 150 })
    }
    return true
  } catch (e) { console.error(`smartType Tab fallback failed for ${label}:`, e.message) }
  console.error(`Could not type into ${label} field`)
  return false
}

async function smartClick(page, selectors, label = '') {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel)
      if (el) {
        await humanMouseMove(page, sel)
        await el.click()
        await page.waitForTimeout(300 + Math.random() * 500)
        return true
      }
    } catch (e) { /* selector click failed, try next */ }
  }
  try { await page.keyboard.press('Enter'); return true } catch (e) { console.error('smartClick Enter fallback failed:', e.message) }
  console.error(`Could not click ${label} button`)
  return false
}

async function smartActionClick(page, selectors, label = '') {
  for (const sel of selectors) {
    try {
      const el = await page.$(sel)
      if (el) {
        await humanMouseMove(page, sel)
        await el.click()
        await page.waitForTimeout(300 + Math.random() * 500)
        return true
      }
    } catch (e) { console.error(`smartActionClick ${label} failed:`, e.message) }
  }
  return false
}


async function safeGoto(page, url, options = {}) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000, ...options })
    return true
  } catch (e) {
    console.error(`safeGoto failed: ${url}`, e.message)
    return false
  }
}


// NOTE: a SECOND saveAccount(acc) used to live here and overrode the
// real saveAccount(platform, username, password) at line 216 via JS
// function-declaration hoisting. Every social.cjs login handler calls
// saveAccount with POSITIONAL args (platform, username, password) — but
// because the obj-arg version won, `acc` was a string, `acc.id/platform/
// username` were all undefined, better-sqlite3 threw on the binding, and
// the catch swallowed it silently. NO login was ever persisting an account
// row to the DB. Removed entirely — the positional-args version at line
// 216 is the only saveAccount now.


// --- SOCIAL PLATFORMS LOADED VIA REQUIRE ---

// CRITICAL BUG FIX (v1.22): there used to be a second `unprotectRow(row)`
// function declared here that overrode the proper `unprotectRow(table, row)`
// at line 212 via JS hoisting. The duplicate took only ONE arg, so when
// `unprotectRows(table, rows)` called `unprotectRow(table, row)` with TWO
// args, this duplicate received `table` (the STRING 'accounts') as `row`,
// returned it unchanged, and the entire account row became the literal
// string 'accounts'. Result: every column in the React state was undefined
// → UI showed "ربط مطلوب" + globe-icon-only platform, even though the DB
// had full data. The duplicate is now renamed for the helpers export.
function unprotectRowForHelpers(row) {
  if (row && row.password) row.password = decryptSecret(row.password)
  return row
}

function getSender(event) {
  return event.sender
}

// Unified live-streaming contract. Every extraction handler calls this as
// `sendProgress(sender, jobId, payload)` where payload is the rich object
// `{ type, count, total, data?, last?, ... }`. We FLATTEN the payload onto the
// event so a single renderer contract serves every consumption style:
//   - data.jobId === jobId   → job routing + concurrency isolation (two
//                              platforms can run at once without cross-talk)
//   - data.type === 'progress' && data.data → append incremental rows live
//   - data.last              → single incremental row (per-target handlers)
//   - data.status (= full payload) → progress-bar style (count/total)
// A rare string payload (legacy) is wrapped as { message } so nothing throws.
function sendProgress(sender, jobId, payload) {
  if (!sender || sender.isDestroyed()) return
  const body = (payload && typeof payload === 'object') ? payload : { message: payload }
  try {
    sender.send('extraction-progress', { ...body, jobId, status: body })
  } catch { /* sender torn down mid-send — safe to ignore */ }
}

const helpers = {
  safeGoto, humanMouseMove, smartType, smartClick, smartActionClick, randomDelay, saveAccount,
  encryptSecret, decryptSecret, unprotectRow: unprotectRowForHelpers, getSender, sendProgress, saveLeads
}
require("./ipc/social.cjs")(ipcm, helpers)

// ==================== IPC: SMTP EMAIL ====================
ipcm('send-smtp-email', async (e, { smtp, to, subject, body, attachments }) => {
  try {
    const nodemailer = require('nodemailer')
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.ssl === 'ssl' || smtp.port == 465,
      auth: { user: smtp.email, pass: smtp.password },
    })
    const info = await transporter.sendMail({
      from: `"SkyPro" <${smtp.email}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html: body,
      attachments: attachments || [],
    })
    return { success: true, message: 'تم الإرسال: ' + info.messageId }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('get-smtp-settings', async () => {
  if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
  try {
    const rows = globals.db.prepare('SELECT * FROM smtp_settings ORDER BY id DESC').all()
    return { success: true, data: unprotectRows('smtp_settings', rows) }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('delete-smtp-setting', async (e, { id }) => {
  if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
  if (!Number.isInteger(id) || id < 1) return { success: false, error: 'Invalid id' }
  try {
    globals.db.prepare('DELETE FROM smtp_settings WHERE id = ?').run(id)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ==================== IPC: SECURITY SETTINGS ====================
ipcm('get-security-settings', async (e) => {
  if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
  try {
    const rows = globals.db.prepare('SELECT * FROM security_settings ORDER BY id DESC LIMIT 1').all()
    if (rows.length > 0) return { success: true, data: rows[0] }
    return { success: true, data: { enabled: 1, randomDelays: 1, minDelay: 2000, maxDelay: 8000, maxActionsPerHour: 50, rotateUserAgent: 1, randomizeViewport: 1, useStealthMode: 1, maxRetries: 3 } }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('save-security-settings', async (e, settings) => {
  if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
  try {
    const saveTransaction = globals.db.transaction(() => {
      globals.db.exec('DELETE FROM security_settings')
      globals.db.prepare('INSERT INTO security_settings (enabled, randomDelays, minDelay, maxDelay, maxActionsPerHour, rotateUserAgent, randomizeViewport, useStealthMode, maxRetries) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
        settings.enabled ? 1 : 0,
        settings.randomDelays ? 1 : 0,
        settings.minDelay || 2000,
        settings.maxDelay || 8000,
        settings.maxActionsPerHour || 50,
        settings.rotateUserAgent ? 1 : 0,
        settings.randomizeViewport ? 1 : 0,
        settings.useStealthMode ? 1 : 0,
        settings.maxRetries || 3
      )
    })
    saveTransaction()
    return { success: true }
  } catch (err) {
    console.error('save-security-settings error:', err)
    return { success: false, error: 'فشل حفظ إعدادات الأمان' }
  }
})

// ==================== IPC: SCHEDULER ====================
ipcm('schedule-campaign', async (e, { name, platform, type, data, scheduledAt }) => {
  if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
  try {
    const stmt = globals.db.prepare('INSERT INTO campaigns (name, platform, type, status, results, scheduled_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)')
    const result = stmt.run(name, platform, type, 'pending', JSON.stringify(data), scheduledAt, JSON.stringify(data))
    return { success: true, id: result.lastInsertRowid }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('get-scheduled-campaigns', async () => {
  if (!globals.db) return { success: false, data: [], error: 'قاعدة البيانات غير جاهزة' }
  try {
    const rows = globals.db.prepare('SELECT * FROM campaigns ORDER BY id DESC').all()
    return { success: true, data: rows }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcm('delete-campaign', async (e, { id }) => {
  if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
  if (!Number.isInteger(id) || id < 1) return { success: false, error: 'Invalid id' }
  try {
    globals.db.prepare('DELETE FROM campaigns WHERE id = ?').run(id)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ==================== IPC: DB / EXPORT ====================
const ALLOWED_TABLES = ['leads', 'accounts', 'campaigns', 'proxies', 'smtp_settings']
const ALLOWED_TABLE_COLUMNS = {
  leads: ['id', 'platform', 'name', 'email', 'phone', 'source', 'url', 'extra_data', 'created_at'],
  accounts: ['id', 'platform', 'username', 'password', 'proxy', 'notes', 'status', 'cookies', 'proxy_id', 'created_at'],
  campaigns: ['id', 'name', 'platform', 'type', 'status', 'results', 'scheduled_at', 'data', 'created_at'],
  proxies: ['id', 'label', 'host', 'port', 'protocol', 'username', 'password', 'status', 'created_at'],
  smtp_settings: ['id', 'email', 'password', 'host', 'port', 'ssl', 'created_at'],
}
const READONLY_COLUMNS = ['id', 'created_at']
const ALLOWED_OPS = ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'IN']

function validateTable(table) {
  if (!ALLOWED_TABLES.includes(table)) throw new Error(`Invalid table: ${table}`)
  return table
}

function validateColumn(table, column, options = {}) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(column)) throw new Error(`Invalid column: ${column}`)
  if (!ALLOWED_TABLE_COLUMNS[table]?.includes(column)) throw new Error(`Invalid column for ${table}: ${column}`)
  if (options.write && READONLY_COLUMNS.includes(column)) throw new Error(`Column is read-only: ${column}`)
  return column
}

ipcm('db-query', async (e, { table, where, filters, limit }) => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    validateTable(table)
    let sql, params = []
    if (filters && Array.isArray(filters)) {
      const clauses = []
      for (const f of filters) {
        if (!f.column) return { success: false, error: 'Invalid column name' }
        validateColumn(table, f.column)
        const op = String(f.op || '').toUpperCase()
        if (!ALLOWED_OPS.includes(op)) return { success: false, error: 'Invalid operator' }
        if (op === 'IN') {
          if (!Array.isArray(f.value) || f.value.length === 0 || f.value.length > 100) return { success: false, error: 'Invalid IN filter' }
          const placeholders = f.value.map(() => '?').join(', ')
          clauses.push(`${f.column} IN (${placeholders})`)
          params.push(...f.value)
        } else {
          clauses.push(`${f.column} ${op} ?`)
          params.push(f.value)
        }
      }
      sql = clauses.length ? `SELECT * FROM ${table} WHERE ${clauses.join(' AND ')}` : `SELECT * FROM ${table}`
    } else if (where) {
      return { success: false, error: 'Raw where clauses are disabled. Use structured filters.' }
    } else {
      sql = `SELECT * FROM ${table}`
    }
    sql += ` ORDER BY id DESC`
    if (limit && Number.isInteger(Number(limit))) {
      const safeLimit = Math.min(Math.max(Number(limit), 1), 5000)
      sql += ` LIMIT ${safeLimit}`
    }
    let rows = globals.db.prepare(sql).all(...params) || []

    // For accounts queries: also purge any garbage rows that the user might
    // be looking at — invisible-char usernames, empty rows from old data,
    // legacy rows. Done at READ time so the user never sees them, even if
    // something snuck past the triggers + insert-time cleanup.
    if (table === 'accounts' && rows.length > 0) {
      const visibleRows = []
      const garbageIds = []
      for (const r of rows) {
        // A row is truly garbage iff: platform is junk OR ALL of (username,
        // notes, proxy) are junk. Rescue strategy: keep rows with platform +
        // at least one of username/notes/proxy filled.
        const platformBad = isGarbageUsername(r.platform)
        const usernameBad = isGarbageUsername(r.username)
        const notesBad = isGarbageUsername(r.notes)
        const proxyBad = isGarbageUsername(r.proxy)
        if (platformBad || (usernameBad && notesBad && proxyBad)) {
          garbageIds.push(r.id)
        } else {
          visibleRows.push(r)
        }
      }
      if (garbageIds.length > 0) {
        try {
          const ph = garbageIds.map(() => '?').join(',')
          const cleaned = globals.db.prepare(`DELETE FROM accounts WHERE id IN (${ph})`).run(...garbageIds)
          if (cleaned.changes > 0) console.log(`[db-query] read-time cleanup removed ${cleaned.changes} truly-empty account row(s)`)
        } catch (err) {
          console.warn('[db-query] read-time cleanup failed:', err.message)
        }
      }
      rows = visibleRows
    }

    return { success: true, data: unprotectRows(table, rows) }
  } catch (err) {
    return { success: false, error: 'فشل الاستعلام عن البيانات' }
  }
})

ipcm('db-insert', async (e, { table, data }) => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    validateTable(table)
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { success: false, error: 'بيانات غير صالحة (المتوقع كائن)' }

    // EXTRA GUARD for accounts: reject if platform or username is missing/junk.
    // The DB triggers catch most of this but invisible-char usernames slip
    // past TRIM(), so we run the JS-layer Unicode-safe check here too.
    if (table === 'accounts') {
      const u = String(data.username || '')
      const p = String(data.platform || '')
      if (isGarbageUsername(u) || isGarbageUsername(p)) {
        console.warn(`[db-insert] rejected accounts row: platform=${JSON.stringify(p)} username=${JSON.stringify(u)}`)
        return { success: false, error: 'المنصة واسم المستخدم مطلوبان (لا يمكن أن يكونا فارغين)' }
      }
    }

    const safeData = protectRow(table, data)
    const keys = Object.keys(safeData).filter((k) => safeData[k] !== undefined)
    if (keys.length === 0) return { success: false, error: 'لا توجد بيانات للإدخال' }
    for (const key of keys) validateColumn(table, key, { write: true })
    const placeholders = keys.map(() => '?').join(', ')
    const stmt = globals.db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`)
    const result = stmt.run(...keys.map(k => safeData[k]))

    // Opportunistic cleanup — only deletes TRULY empty rows (platform junk
    // OR all of username/notes/proxy are junk). Won't touch the row we just
    // inserted if it has valid platform + at least one of the rescue fields.
    if (table === 'accounts') {
      try {
        const rows = globals.db.prepare('SELECT id, platform, username, notes, proxy FROM accounts').all()
        const garbageIds = rows.filter((r) => {
          const platformBad = isGarbageUsername(r.platform)
          const usernameBad = isGarbageUsername(r.username)
          const notesBad = isGarbageUsername(r.notes)
          const proxyBad = isGarbageUsername(r.proxy)
          return platformBad || (usernameBad && notesBad && proxyBad)
        }).map((r) => r.id)
        if (garbageIds.length > 0) {
          const ph = garbageIds.map(() => '?').join(',')
          const cleaned = globals.db.prepare(`DELETE FROM accounts WHERE id IN (${ph})`).run(...garbageIds)
          if (cleaned.changes > 0) console.log(`[db-insert] post-insert cleanup removed ${cleaned.changes} garbage row(s)`)
        }
      } catch (err) {
        console.warn('[db-insert] post-insert cleanup failed:', err.message)
      }
    }

    return { success: true, id: result.lastInsertRowid }
  } catch (err) {
    // Surface the actual error so the renderer can show WHY the save failed
    // (previously this was masked behind a generic "فشل" message and the
    // user had no way to debug, e.g. when safeStorage is unavailable).
    console.error('db-insert error:', err)
    return { success: false, error: err?.message || 'فشل إدخال البيانات' }
  }
})

ipcm('db-delete', async (e, { table, id }) => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    validateTable(table)
    const numericId = Number(id)
    if (!Number.isInteger(numericId) || numericId < 1) {
      return { success: false, error: 'معرّف غير صالح' }
    }
    const result = globals.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(numericId)
    if (result.changes === 0) {
      return { success: false, error: 'السطر غير موجود (قد يكون محذوفاً بالفعل)' }
    }
    return { success: true, changes: result.changes }
  } catch (err) {
    console.error('db-delete error:', err)
    return { success: false, error: err?.message || 'فشل حذف البيانات' }
  }
})

// Bulk delete — pass an array of ids. Used by the "delete selected" UI.
ipcm('db-bulk-delete', async (e, { table, ids = [] }) => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    validateTable(table)
    const numericIds = (Array.isArray(ids) ? ids : [])
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 1)
    if (numericIds.length === 0) return { success: false, error: 'لم يتم تحديد أي صفوف' }
    const placeholders = numericIds.map(() => '?').join(', ')
    const result = globals.db.prepare(`DELETE FROM ${table} WHERE id IN (${placeholders})`).run(...numericIds)
    return { success: true, changes: result.changes, requested: numericIds.length }
  } catch (err) {
    console.error('db-bulk-delete error:', err)
    return { success: false, error: err?.message || 'فشل حذف البيانات' }
  }
})

// Aggressive garbage detector for account rows. A row is "garbage" if its
// platform/username has NO real content. The previous version had a long
// hand-curated allow-list of invisible chars to strip — that missed edge
// cases (control chars 0x00-0x08/0x0E-0x1F, replacement char 0xFFFD,
// IDS chars 0x2FF0-0x2FFB, etc.) and let some rows slip through into the
// user's table where they showed as "—" (empty).
//
// New approach: a row is real ONLY IF it contains AT LEAST ONE visible
// letter or digit (any script — Arabic, Latin, CJK, etc.). Everything
// else — pure whitespace, pure punctuation, pure control chars, pure
// invisible Unicode — is garbage. This is way more durable.
function isGarbageUsername(s) {
  if (s === null || s === undefined) return true
  const str = String(s).trim()
  if (!str) return true
  // Reject literal "undefined" / "null" / "NaN" strings (case-insensitive).
  if (/^(undefined|null|nan|none|n\/a|-+|—+|_+|\.+)$/i.test(str)) return true
  // Require at least one Unicode letter (\p{L}) or digit (\p{N}).
  // The /u flag is essential — without it, Arabic/CJK chars wouldn't match \p{L}.
  if (!/[\p{L}\p{N}]/u.test(str)) return true
  return false
}

// Targeted cleanup: delete every account row whose username is empty/whitespace.
// Done in JS layer (not raw SQL) so we can handle ALL Unicode whitespace,
// invisible characters, and any future weird patterns reliably.
ipcm('db-delete-empty-accounts', async () => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    const rows = globals.db.prepare('SELECT id, platform, username FROM accounts').all()

    const garbageIds = rows
      .filter((r) => isGarbageUsername(r.platform) || isGarbageUsername(r.username))
      .map((r) => r.id)
    if (garbageIds.length === 0) return { success: true, changes: 0 }
    const placeholders = garbageIds.map(() => '?').join(',')
    const result = globals.db.prepare(`DELETE FROM accounts WHERE id IN (${placeholders})`).run(...garbageIds)
    return { success: true, changes: result.changes, deletedIds: garbageIds }
  } catch (err) {
    console.error('db-delete-empty-accounts error:', err)
    return { success: false, error: err?.message || 'فشل حذف الحسابات الفارغة' }
  }
})

// Nuclear option: wipe ALL saved accounts. Used by "Delete All" button as
// the ultimate fallback when nothing else works.
ipcm('db-delete-all-accounts', async () => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    const result = globals.db.prepare('DELETE FROM accounts').run()
    return { success: true, changes: result.changes }
  } catch (err) {
    console.error('db-delete-all-accounts error:', err)
    return { success: false, error: err?.message || 'فشل حذف جميع الحسابات' }
  }
})

// Diagnostic: dumps a raw view of every account row so the user (or support)
// can see exactly what's in the DB, including hidden whitespace/encoding.
ipcm('db-debug-accounts', async () => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    // Full diagnostic dump — every column + length + hex for username/notes/
    // platform so we can spot invisible-char issues at a glance.
    const rows = globals.db.prepare(`
      SELECT
        id,
        platform,
        username,
        notes,
        proxy,
        status,
        cookies,
        proxy_id,
        created_at,
        LENGTH(platform) AS platform_len,
        LENGTH(username) AS username_len,
        LENGTH(notes) AS notes_len,
        LENGTH(proxy) AS proxy_len,
        HEX(SUBSTR(username, 1, 40)) AS username_hex,
        HEX(SUBSTR(notes, 1, 40)) AS notes_hex,
        HEX(SUBSTR(platform, 1, 40)) AS platform_hex,
        CASE WHEN password IS NULL OR password = '' THEN 0 ELSE 1 END AS has_password
      FROM accounts
      ORDER BY id DESC
      LIMIT 500
    `).all()
    return { success: true, data: rows }
  } catch (err) {
    return { success: false, error: err?.message || 'فشل الاستعلام' }
  }
})

// Aggressive force-clean: deletes any row where ALL of (username, notes,
// proxy) are empty/whitespace — meaning the row carries no useful info no
// matter how lenient we are about what counts as "real". Used by the
// "إصلاح قاعدة البيانات" diagnostic button.
ipcm('db-accounts-force-clean', async () => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    const rows = globals.db.prepare('SELECT id, platform, username, notes, proxy FROM accounts').all()
    const truly_empty = rows.filter((r) => {
      // A row is "truly empty" iff its platform OR username has no real
      // content AND its notes has no real content AND its proxy has no
      // real content. We allow ANY visible character (\p{L}/\p{N}) anywhere
      // to keep the row — only fully-empty rows are deleted.
      const hasRealContent = (s) => {
        if (s === null || s === undefined) return false
        return /[\p{L}\p{N}]/u.test(String(s))
      }
      // Platform AND username must be real (one or both garbage = delete).
      // Notes and proxy are "rescue" fields — if either has real content,
      // we keep the row IF platform is also real.
      const platformOK = hasRealContent(r.platform)
      const usernameOK = hasRealContent(r.username)
      const notesOK = hasRealContent(r.notes)
      const proxyOK = hasRealContent(r.proxy)
      // Delete iff platform is junk OR (username is junk AND notes is junk AND proxy is junk)
      return !platformOK || (!usernameOK && !notesOK && !proxyOK)
    }).map((r) => r.id)

    if (truly_empty.length === 0) return { success: true, changes: 0 }
    const ph = truly_empty.map(() => '?').join(',')
    const result = globals.db.prepare(`DELETE FROM accounts WHERE id IN (${ph})`).run(...truly_empty)
    console.log(`[db-accounts-force-clean] removed ${result.changes} truly-empty rows`)
    return { success: true, changes: result.changes, deletedIds: truly_empty }
  } catch (err) {
    console.error('db-accounts-force-clean error:', err)
    return { success: false, error: err?.message || 'فشل التنظيف' }
  }
})

ipcm('db-update', async (e, { table, id, data }) => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    validateTable(table)
    if (!Number.isInteger(id) || id < 1) return { success: false, error: 'معرّف غير صالح' }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { success: false, error: 'بيانات غير صالحة' }

    // EXTRA GUARD for accounts: reject empties on update too (e.g. user
    // clearing the username field). Triggers catch most but invisible-char
    // bypasses still slip through TRIM().
    if (table === 'accounts') {
      if (data.username !== undefined && isGarbageUsername(String(data.username || ''))) {
        return { success: false, error: 'اسم المستخدم لا يمكن أن يكون فارغاً' }
      }
      if (data.platform !== undefined && isGarbageUsername(String(data.platform || ''))) {
        return { success: false, error: 'المنصة لا يمكن أن تكون فارغة' }
      }
    }

    const safeData = protectRow(table, data)
    const keys = Object.keys(safeData).filter((k) => safeData[k] !== undefined)
    if (keys.length === 0) return { success: false, error: 'لا توجد بيانات للتحديث' }
    for (const key of keys) validateColumn(table, key, { write: true })
    const setClause = keys.map(k => `${k} = ?`).join(', ')
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`
    const values = keys.map(k => safeData[k])
    const stmt = globals.db.prepare(sql)
    const result = stmt.run(...values, id)
    if (result.changes === 0) {
      return { success: false, error: 'لم يتم العثور على السطر المطلوب' }
    }
    return { success: true, changes: result.changes }
  } catch (err) {
    console.error('db-update error:', err)
    return { success: false, error: err?.message || 'فشل تحديث البيانات' }
  }
})

// P2-31: Sanitize cell values to prevent CSV/Excel formula injection
function sanitizeExportCell(val) {
  const str = (val == null ? '' : val).toString()
  // Prefix dangerous characters that spreadsheets interpret as formulas
  if (/^[=+\-@\t\r]/.test(str)) return "'" + str
  return str
}

ipcm('export-csv', async (e, { filename, data, headers }) => {
  try {
    if (!data || data.length === 0) return { success: false, error: 'لا توجد بيانات للتصدير' }
    const { dialog } = require('electron')
    const result = await dialog.showSaveDialog({
      title: 'تصدير CSV',
      defaultPath: filename || `export-${Date.now()}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }, { name: 'All Files', extensions: ['*'] }]
    })
    if (result.canceled) return { success: false, error: 'تم الإلغاء' }
    const rows = [headers.join(','), ...data.map(row => headers.map(h => `"${sanitizeExportCell(row[h]).replace(/"/g, '""')}"`).join(','))]
    const content = '\uFEFF' + rows.join('\n')
    fs.writeFileSync(result.filePath, content, 'utf8')
    return { success: true, path: result.filePath }
  } catch (err) {
    console.error('export-csv error:', err)
    return { success: false, error: 'فشل تصدير الملف' }
  }
})

ipcm('export-excel', async (e, { filename, data, headers }) => {
  try {
    if (!data || data.length === 0) return { success: false, error: 'لا توجد بيانات للتصدير' }
    const { dialog } = require('electron')
    const result = await dialog.showSaveDialog({
      title: 'تصدير Excel',
      defaultPath: filename || `export-${Date.now()}.xls`,
      filters: [{ name: 'Excel Files', extensions: ['xls'] }, { name: 'All Files', extensions: ['*'] }]
    })
    if (result.canceled) return { success: false, error: 'تم الإلغاء' }
    const headerRow = '<tr>' + headers.map(h => `<th style="background:#2563eb;color:white;font-weight:bold;padding:8px;border:1px solid #ddd;">${sanitizeExportCell(h).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</th>`).join('') + '</tr>'
    const dataRows = data.map(row => '<tr>' + headers.map(h => `<td style="padding:8px;border:1px solid #ddd;">${sanitizeExportCell(row[h]).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('') + '</tr>').join('\n')
    const html = `<html><head><meta charset="utf-8"></head><body><table style="border-collapse:collapse;width:100%;font-family:Segoe UI,Arial;">${headerRow}${dataRows}</table></body></html>`
    fs.writeFileSync(result.filePath, '\uFEFF' + html, 'utf8')
    return { success: true, path: result.filePath }
  } catch (err) {
    console.error('export-excel error:', err)
    return { success: false, error: 'فشل تصدير الملف' }
  }
})

ipcm('get-app-version', () => ({ success: true, data: app.getVersion(), version: app.getVersion() }))

// ==================== WINDOW CONTROLS ====================
ipcMain.on('window:minimize', (event) => {
  if (!isTrustedIpcSender(event)) return
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.minimize()
})

ipcMain.on('window:toggle-maximize', (event) => {
  if (!isTrustedIpcSender(event)) return
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  }
})

ipcMain.on('window:close', (event) => {
  if (!isTrustedIpcSender(event)) return
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.close()
})

ipcm('check-for-updates', async () => {
  try {
    if (isDev) return { success: false, message: 'التحديثات غير متاحة في وضع التطوير' }
    const result = await autoUpdater.checkForUpdates()
    const updateAvailable = !!result?.updateInfo?.version && result.updateInfo.version !== app.getVersion()
    return {
      success: true,
      data: {
        updateAvailable,
        version: result?.updateInfo?.version || app.getVersion(),
        currentVersion: app.getVersion(),
      }
    }
  } catch (err) {
    console.error('[AutoUpdate] check-for-updates error:', err)
    return { success: false, error: err?.message || 'فشل التحقق من التحديثات' }
  }
})

ipcm('download-update', async () => {
  try {
    if (isDev) return { success: false, message: 'التحديثات غير متاحة في وضع التطوير' }
    await autoUpdater.downloadUpdate()
    return { success: true }
  } catch (err) {
    console.error('[AutoUpdate] download-update error:', err)
    return { success: false, error: err?.message || 'فشل تحميل التحديث' }
  }
})

ipcm('install-update', async () => {
  try {
    setTimeout(() => autoUpdater.quitAndInstall(false, true), 1000)
    return { success: true }
  } catch (err) {
    console.error('[AutoUpdate] install-update error:', err)
    return { success: false, error: err?.message || 'فشل تثبيت التحديث' }
  }
})

// P1-18: Bulk delete leads by platform in a single transaction
ipcm('clear-leads-by-platform', async (e, { platform }) => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    if (!platform || typeof platform !== 'string') return { success: false, error: 'منصة غير صالحة' }
    const cleanPlatform = platform.replace(/[^a-z0-9_-]/gi, '').slice(0, 50)
    const result = globals.db.prepare('DELETE FROM leads WHERE platform = ?').run(cleanPlatform)
    return { success: true, changes: result.changes }
  } catch (err) {
    console.error('clear-leads-by-platform error:', err)
    return { success: false, error: 'فشل مسح النتائج' }
  }
})

// P2-20: Efficient count query without fetching all rows
ipcm('db-count', async (e, { table, filters }) => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    validateTable(table)
    let sql = `SELECT COUNT(*) as count FROM ${table}`
    const params = []
    if (filters && Array.isArray(filters) && filters.length > 0) {
      const clauses = []
      for (const f of filters) {
        if (!f.column) return { success: false, error: 'Invalid column name' }
        validateColumn(table, f.column)
        const op = String(f.op || '').toUpperCase()
        if (!ALLOWED_OPS.includes(op)) return { success: false, error: 'Invalid operator' }
        // Mirror db-query: expand IN into per-value placeholders. Previously this
        // bound an array to a single `?`, so any IN filter silently returned 0.
        if (op === 'IN') {
          if (!Array.isArray(f.value) || f.value.length === 0 || f.value.length > 100) return { success: false, error: 'Invalid IN filter' }
          const placeholders = f.value.map(() => '?').join(', ')
          clauses.push(`${f.column} IN (${placeholders})`)
          params.push(...f.value)
        } else {
          clauses.push(`${f.column} ${op} ?`)
          params.push(f.value)
        }
      }
      sql += ` WHERE ${clauses.join(' AND ')}`
    }
    const row = globals.db.prepare(sql).get(...params)
    return { success: true, count: row?.count || 0 }
  } catch (err) {
    console.error('db-count error:', err)
    return { success: false, error: 'فشل عد السجلات' }
  }
})

// ==================== GENERIC TOOL RUNNER ====================
// Legacy generic tool runner. Real tools should call their dedicated IPC
// directly (e.g. `instagram-mention`). This fallback is kept ONLY for
// pre-existing campaign-scheduler entries — it no longer pretends to execute.
ipcm('run-tool', async (e, { platform, toolId, toolName, params, execute = false }) => {
  try {
    // Persist for audit so the user can see what was attempted.
    if (globals.db) {
      globals.db
        .prepare('INSERT INTO leads (platform, name, source, extra_data) VALUES (?, ?, ?, ?)')
        .run(platform, toolName || toolId, execute ? 'tool-run' : 'tool-saved', JSON.stringify({ toolId, params }))
    }
    // Surface the truth: caller should use the dedicated IPC. Returning false
    // is critical — previously this returned success with no execution, so
    // toasts said "✓" while nothing happened.
    return {
      success: false,
      error: `الأداة "${toolName || toolId}" بحاجة لاستدعاء IPC المخصص لها (electronAPI.${toolId.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}).`,
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ==================== SCHEDULER LOOP ====================
async function executeCampaign(task) {
  try {
    const data = JSON.parse(task.data || '{}')
    let result = { status: 'completed', message: 'تم التنفيذ' }

    switch (task.platform) {
      case 'twitter':
        if (data.text) {
          const acc = globals.db ? globals.db.prepare("SELECT * FROM accounts WHERE platform = 'twitter' ORDER BY id DESC LIMIT 1").get() : null
          if (acc) {
            result.message = 'تم جدولة التغريدة (تتطلب جلسة نشطة)'
          } else {
            result = { status: 'failed', message: 'لا يوجد حساب Twitter مسجل' }
          }
        }
        break
      case 'facebook':
        if (data.groups && data.message) {
          result.message = 'حملة Facebook مجدولة - تحتاج لتسجيل الدخول'
        }
        break
      case 'email':
        if (data.smtp && data.to) {
          const nodemailer = require('nodemailer')
          const transporter = nodemailer.createTransport({
            host: data.smtp.host,
            port: data.smtp.port,
            secure: data.smtp.ssl === 'ssl' || data.smtp.port == 465,
            auth: { user: data.smtp.email, pass: data.smtp.password },
          })
          await transporter.sendMail({
            from: `"SkyPro" <${data.smtp.email}>`,
            to: Array.isArray(data.to) ? data.to.join(', ') : data.to,
            subject: data.subject || 'رسالة مجدولة',
            html: data.body || '',
          })
          result.message = 'تم إرسال الإيميل المجدول'
        }
        break
      default:
        result.message = `حملة ${task.platform} مجدولة`
    }

    if (globals.db) globals.db.prepare("UPDATE campaigns SET status = ?, results = ? WHERE id = ?").run(result.status, JSON.stringify(result), task.id)
  } catch (err) {
    if (globals.db) globals.db.prepare("UPDATE campaigns SET status = 'failed', results = ? WHERE id = ?").run(JSON.stringify({ error: err.message }), task.id)
  }
}

let schedulerRunning = false

setInterval(async () => {
  if (!globals.db || schedulerRunning) return
  schedulerRunning = true
  try {
    const tasks = globals.db.prepare("SELECT * FROM campaigns WHERE status = 'pending' AND scheduled_at IS NOT NULL AND datetime(scheduled_at) <= datetime('now')").all()
    for (const task of tasks) {
      globals.db.prepare("UPDATE campaigns SET status = 'running' WHERE id = ?").run(task.id)
      try {
        await executeCampaign(task)
      } catch (err) {
        globals.db.prepare("UPDATE campaigns SET status = 'failed', results = ? WHERE id = ?")
          .run(JSON.stringify({ error: err.message }), task.id)
      }
    }
  } catch (e) { console.error('Scheduler error:', e.message) }
  finally { schedulerRunning = false }
}, 30000)

// ==================== WINDOW ====================
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600, height: 980, minWidth: 1240, minHeight: 760,
    frame: false,
    backgroundColor: '#001A3A', autoHideMenuBar: true, title: 'SkyPro',
    icon: path.join(__dirname, '..', 'public', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      webSecurity: true, allowRunningInsecureContent: false, webviewTag: false,
      devTools: isDev,
    },
  })
  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'renderer', 'index.html'))
  }
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc) => {
    console.error('Failed to load:', errorCode, errorDesc)
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalUrl(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isTrustedRendererUrl(url)) return
    event.preventDefault()
    openExternalUrl(url)
  })
  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) { app.quit() }
else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) { if (win.isMinimized()) win.restore(); win.focus() }
  })
}

app.whenReady().then(() => {
  const appDataPath = app.getPath('appData')
  const userDataPath = path.join(appDataPath, 'SenderPro')
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }
  app.setPath('userData', userDataPath)

  try {
    const dbPath = path.join(userDataPath, 'sender-pro.db')
    globals.db = new Database(dbPath)
    setDb(globals.db)
    initDatabase(globals.db)
    migrateStoredSecrets()
    console.log('Database opened:', dbPath)
  } catch (e) {
    console.error('Failed to open database:', e)
  }

  globals.bm = new BrowserManager()

  registerAuthIPC({ ipcm, bm: globals.bm, db: globals.db })

  createWindow()

  // Pre-download the Playwright Chromium build in the background on first run so
  // it's ready by the time the user opens a platform. The browser is NOT bundled
  // in the installer (keeps it small); this makes the app work on any new machine
  // without manual `npx playwright install`. Launch also guards on this.
  try {
    const { ensureBrowser, browserInstalled } = require('./ensure-browser.cjs')
    if (!browserInstalled()) {
      ensureBrowser().then((r) => {
        console.log('[startup] browser ensure result:', r?.ok ? 'ready' : `failed (${r?.error || 'unknown'})`)
      }).catch((e) => console.error('[startup] ensureBrowser threw:', e?.message))
    }
  } catch (e) {
    console.error('[startup] ensureBrowser setup failed:', e?.message)
  }

  // Content Security Policy
  const { session } = require('electron')
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; " +
          // Allow https: so admin-uploaded offer banners (any external CDN
          // — top4top.io, imgur, cloudflare-images, etc.) render in the
          // OffersSection. Without 'https:' the image is silently blocked
          // by CSP and only the gradient fallback shows even though the
          // imageUrl field is correctly populated from /api/offers.
          "img-src 'self' data: blob: https:; " +
          "connect-src 'self' https://skypro.skywaveads.com; " +
          "frame-ancestors 'none'; " +
          "base-uri 'self'; " +
          "form-action 'self'"
        ],
      },
    })
  })

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

  if (!isDev) {
    // Initial check 2s after window is shown (down from 10s — user wants snappy updates)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('[AutoUpdate] Startup check failed:', err?.message)
      })
    }, 2000)
    // Periodic re-check every 30 minutes while the app is open
    setInterval(() => {
      autoUpdater.checkForUpdates().catch((err) => {
        console.error('[AutoUpdate] Periodic check failed:', err?.message)
      })
    }, 30 * 60 * 1000)
  }

  // Start the campaign scheduler runner — polls every 30s for due tasks.
  campaignRunner.start(globals)
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => {
  campaignRunner.stop()
  if (globals.bm) { try { globals.bm.closeAll() } catch (e) { console.error('closeAll error:', e.message) } }
  if (globals.db) { try { globals.db.close(); globals.db = null } catch (e) { console.error('db.close error:', e.message) } }
})

function ipcm(channel, handler) {
  ipcHandlers[channel] = handler
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      if (!isTrustedIpcSender(event)) {
        return { success: false, error: 'Untrusted IPC sender' }
      }
      return await handler(event, ...args)
    } catch (err) {
      console.error(`IPC error [${channel}]:`, err)
      return { success: false, error: err.message || String(err) }
    }
  })
}

ipcMain.handle('cancel-extraction', (event, payload = {}) => {
  if (!isTrustedIpcSender(event)) return { success: false, error: 'Untrusted' }
  const jobId = typeof payload.jobId === 'string' ? payload.jobId.slice(0, 120) : ''
  if (jobId) globals.cancelFlags.set(jobId, true)
  return { success: true }
})

