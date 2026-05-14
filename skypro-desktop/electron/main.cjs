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

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL)

const globals = require("./globals.cjs")
// let globals.db = null
// let globals.bm = null
// const globals.cancelFlags = new Map()
let jobIdCounter = 0
const ipcHandlers = {}
const SECRET_PREFIX = 'enc:v1:'
const SECRET_COLUMNS = {
  accounts: ['password'],
  proxies: ['password'],
  smtp_settings: ['password'],
}
const REMEMBERED_LOGIN_FILE = 'remembered-login.json'

// Auto updater logging
autoUpdater.autoDownload = false
autoUpdater.logger = console
autoUpdater.on('checking-for-update', () => console.log('Checking for update...'))
autoUpdater.on('update-available', (info) => console.log('Update available.', info))
autoUpdater.on('update-not-available', (info) => console.log('Update not available.', info))
autoUpdater.on('error', (err) => console.log('Error in auto-updater. ' + err))
autoUpdater.on('download-progress', (progressObj) => {
  let log_message = `Download speed: ${progressObj.bytesPerSecond}`
  log_message += ` - Downloaded ${progressObj.percent}%`
  log_message += ` (${progressObj.transferred}/${progressObj.total})`
  console.log(log_message)
})
autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded', info)
  // Quit and install after 5 seconds
  // setTimeout(() => autoUpdater.quitAndInstall(), 5000)
})

// ==================== HELPERS ====================
function encryptSecret(value) {
  if (value === null || value === undefined || value === '') return value
  const text = String(value)
  if (text.startsWith(SECRET_PREFIX)) return text
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure local storage is not available. Refusing to save secrets in plaintext.')
  }
  return `${SECRET_PREFIX}${safeStorage.encryptString(text).toString('base64')}`
}

function decryptSecret(value) {
  if (value === null || value === undefined || value === '') return value
  const text = String(value)
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

function saveAccount(platform, username, password, status = 'active') {
  if (!globals.db) return
  globals.db.prepare('INSERT OR IGNORE INTO accounts (platform, username, password, status) VALUES (?, ?, ?, ?)')
    .run(platform, username, encryptSecret(password), status)
  globals.db.prepare('UPDATE accounts SET password = ?, status = ? WHERE platform = ? AND username = ?')
    .run(encryptSecret(password), status, platform, username)
}

function openExternalUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol === 'https:') {
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

function saveLeads(platform, source, data) {
  if (!Array.isArray(data) || !globals.db) return
  const stmt = globals.db.prepare('INSERT INTO leads (platform, name, email, phone, source, url, extra_data) VALUES (?, ?, ?, ?, ?, ?, ?)')
  data.forEach(item => {
    if (!item) return
    const name = item.name || item.username || item.title || ''
    if (!name && !item.phone && !item.email && !item.id) return
    const profile = item.profile || item.url || item.link || ''
    const userId = item.id || item.userId || item.user_id || ''
    const phone = item.phone || ''
    const email = item.email || ''
    const extraData = { ...item, userId }
    stmt.run(platform, name, email, phone, source, profile, JSON.stringify(extraData))
  })
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

ipcm('check-platform-session', async (e, { platform, headless = false }) => {
  try {
    const res = await globals.bm.launch({ headless, platform })
    if (!res.success) return { success: false, error: res.error }
    const sessionId = res.sessionId
    const page = globals.bm.getPage(sessionId)
    await page.waitForTimeout(2000)
    const url = page.url()

    // If fresh browser (about:blank), navigate to the platform first then check
    if (!url || url === 'about:blank') {
      const platformUrls = {
        facebook: 'https://www.facebook.com',
        instagram: 'https://www.instagram.com',
        twitter: 'https://x.com',
        x: 'https://x.com',
        linkedin: 'https://www.linkedin.com',
        pinterest: 'https://www.pinterest.com',
        threads: 'https://www.threads.net',
        reddit: 'https://www.reddit.com',
        snapchat: 'https://web.snapchat.com'
      }
      const targetUrl = platformUrls[platform] || 'https://www.google.com'
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})
      await page.waitForTimeout(3000)
    }

    // Platform-specific login detection
    let loggedIn = false
    const currentUrl = page.url()
    if (platform === 'facebook') {
      loggedIn = await page.evaluate(() => {
        return !!(document.querySelector('[data-testid="blue_bar"]') || document.querySelector('[role="navigation"]') || document.querySelector('div[role="main"]') || document.querySelector('[aria-label="Facebook"]') || document.querySelector('a[aria-label="Home"]') || document.querySelector('[data-pagelet="LeftRail"]'))
      }).catch(() => false)
    } else if (platform === 'instagram') {
      loggedIn = await page.evaluate(() => {
        return !!(document.querySelector('svg[aria-label="Home"]') || document.querySelector('a[href="/"]') || document.querySelector('[role="main"]') || document.querySelector('nav'))
      }).catch(() => false)
    } else if (platform === 'twitter' || platform === 'x') {
      loggedIn = await page.evaluate(() => {
        return !!(document.querySelector('a[href="/home"]') || document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]') || document.querySelector('[data-testid="AppTabBar_Home_Link"]') || document.querySelector('nav[role="navigation"]'))
      }).catch(() => false)
    } else if (platform === 'linkedin') {
      loggedIn = await page.evaluate(() => {
        return !!(document.querySelector('.global-nav') || document.querySelector('nav.global-nav') || document.querySelector('[data-test-global-nav]') || document.querySelector('.feed-identity-module'))
      }).catch(() => false)
    } else if (platform === 'pinterest') {
      loggedIn = await page.evaluate(() => {
        return !!(document.querySelector('[data-test-id="home-tab"]') || document.querySelector('header'))
      }).catch(() => false)
    } else if (platform === 'threads') {
      loggedIn = await page.evaluate(() => {
        return !!(document.querySelector('nav') || document.querySelector('a[href="/"]'))
      }).catch(() => false)
    } else if (platform === 'reddit') {
      loggedIn = await page.evaluate(() => {
        return !!(document.querySelector('header') || document.querySelector('[aria-label="Home"]') || document.querySelector('shreddit-app'))
      }).catch(() => false)
    } else if (platform === 'snapchat') {
      loggedIn = await page.evaluate(() => {
        return !!(document.querySelector('nav') || document.querySelector('[data-testid="primary-nav"]'))
      }).catch(() => false)
    }

    return { success: true, alreadyLoggedIn: loggedIn, sessionId, url: currentUrl }
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


function saveAccount(acc) {
  if (globals.db) {
    try {
      const safePassword = acc.password ? encryptSecret(acc.password) : acc.password
      globals.db.prepare("INSERT OR REPLACE INTO accounts (id, platform, username, password, status, cookies, proxy_id) VALUES (?, ?, ?, ?, ?, ?, ?)").run(acc.id, acc.platform, acc.username, safePassword, acc.status || 'active', acc.cookies || null, acc.proxy_id || null)
    } catch(e) {
      console.error('saveAccount error:', e.message)
    }
  }
}


// --- SOCIAL PLATFORMS LOADED VIA REQUIRE ---

function unprotectRow(row) {
  if (row && row.password) row.password = decryptSecret(row.password)
  return row
}

function getSender(event) {
  return event.sender
}

function sendProgress(sender, status, message) {
  if (sender && !sender.isDestroyed()) {
    sender.send('extraction-progress', { status, message })
  }
}

const helpers = {
  safeGoto, humanMouseMove, smartType, smartClick, smartActionClick, randomDelay, saveAccount,
  encryptSecret, decryptSecret, unprotectRow, getSender, sendProgress, saveLeads
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
    const rows = globals.db.prepare(sql).all(...params) || []
    return { success: true, data: unprotectRows(table, rows) }
  } catch (err) {
    return { success: false, error: 'فشل الاستعلام عن البيانات' }
  }
})

ipcm('db-insert', async (e, { table, data }) => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    validateTable(table)
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { success: false, error: 'Invalid data' }
    const safeData = protectRow(table, data)
    const keys = Object.keys(safeData)
    if (keys.length === 0) return { success: false, error: 'No data to insert' }
    for (const key of keys) validateColumn(table, key, { write: true })
    const placeholders = keys.map(() => '?').join(', ')
    const stmt = globals.db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`)
    const result = stmt.run(...keys.map(k => safeData[k]))
    return { success: true, id: result.lastInsertRowid }
  } catch (err) {
    return { success: false, error: 'فشل إدخال البيانات' }
  }
})

ipcm('db-delete', async (e, { table, id }) => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    validateTable(table)
    if (!Number.isInteger(id) || id < 1) return { success: false, error: 'Invalid id' }
    globals.db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id)
    return { success: true }
  } catch (err) {
    return { success: false, error: 'فشل حذف البيانات' }
  }
})

ipcm('db-update', async (e, { table, id, data }) => {
  try {
    if (!globals.db) return { success: false, error: 'قاعدة البيانات غير جاهزة' }
    validateTable(table)
    if (!Number.isInteger(id) || id < 1) return { success: false, error: 'Invalid id' }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { success: false, error: 'Invalid data' }
    const safeData = protectRow(table, data)
    const keys = Object.keys(safeData)
    if (keys.length === 0) return { success: false, error: 'No data to update' }
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
    return { success: false, error: 'فشل تحديث البيانات' }
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

ipcm('get-app-version', () => ({ success: true, version: app.getVersion() }))

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
    return { success: true, updateAvailable: !!result?.updateInfo?.version, version: result?.updateInfo?.version || app.getVersion() }
  } catch (err) {
    console.error('check-for-updates error:', err)
    return { success: false, error: 'فشل التحقق من التحديثات' }
  }
})

ipcm('install-update', async () => {
  try {
    autoUpdater.quitAndInstall()
    return { success: true }
  } catch (err) {
    console.error('install-update error:', err)
    return { success: false, error: 'فشل تثبيت التحديث' }
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
        clauses.push(`${f.column} ${op} ?`)
        params.push(f.value)
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
ipcm('run-tool', async (e, { platform, toolId, toolName, params, execute = false }) => {
  try {
    if (!execute) {
      if (globals.db) globals.db.prepare('INSERT INTO leads (platform, name, source, extra_data) VALUES (?, ?, ?, ?)')
        .run(platform, toolName || toolId, 'tool-saved', JSON.stringify({ toolId, params }))
      return { success: true, message: `تم حفظ أداة ${toolName || toolId} للتشغيل لاحقاً` }
    }

    if (platform === 'facebook') {
      if (toolId.includes('mention')) {
        return { success: false, error: 'ميزة المنشن غير مفعلة حالياً - سيتم تفعيلها قريباً', message: 'ميزة المنشن غير مفعلة حالياً' }
      }
    }

    if (globals.db) globals.db.prepare('INSERT INTO leads (platform, name, source, extra_data) VALUES (?, ?, ?, ?)')
      .run(platform, toolName || toolId, 'tool-run', JSON.stringify({ toolId, params, executed: true, status: 'queued' }))

    return { success: true, message: `تم تسجيل أداة ${toolName || toolId} - سيتم تنفيذها عند تفعيل الدعم الكامل` }
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
    icon: path.join(__dirname, '..', 'public', 'icon.png'),
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
          "img-src 'self' data: blob:; " +
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
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {})
    }, 5000)
  }
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('before-quit', () => {
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

