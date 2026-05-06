const os = require('os')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { app } = require('electron')

const WEB_API_URL = 'https://skypro.skywaveads.com/api'
const SERVER_API_URL = 'https://skypro.skywaveads.com/sender-pro-api'
const OFFLINE_FALLBACK_ENABLED = process.env.SKYPRO_ALLOW_OFFLINE_KEY_FALLBACK === 'true'
const NETWORK_TIMEOUT_MS = 20_000
const INSTALL_ID_FILE = 'install-id'

function normalizeText(value, max = 256) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

async function fetchJson(url, options = {}) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:') {
    throw new Error('Refusing insecure API connection')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS)
  try {
    const response = await fetch(parsed.toString(), {
      ...options,
      signal: controller.signal,
    })
    const text = await response.text()
    const data = text ? JSON.parse(text) : {}
    return { response, data }
  } finally {
    clearTimeout(timeout)
  }
}

function getInstallId() {
  const userDataPath = app.getPath('userData')
  fs.mkdirSync(userDataPath, { recursive: true })
  const installIdPath = path.join(userDataPath, INSTALL_ID_FILE)
  try {
    const existing = fs.readFileSync(installIdPath, 'utf8').trim()
    if (/^[a-f0-9-]{32,64}$/i.test(existing)) return existing
  } catch {}

  const installId = crypto.randomUUID()
  fs.writeFileSync(installIdPath, installId, { encoding: 'utf8', mode: 0o600 })
  return installId
}

function generateDeviceFingerprint() {
  const components = [
    getInstallId(),
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || '',
    String(os.totalmem()),
  ]
  const raw = components.join('|')
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function getDeviceCapabilities() {
  return {
    fingerprint: generateDeviceFingerprint(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()[0]?.model || 'Unknown',
    cpuCores: os.cpus().length,
    ram: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
  }
}

function saveDeviceInfo(db, deviceInfo, activationKey) {
  if (!db) return
  try {
    const stmt = db.prepare(`INSERT OR IGNORE INTO devices (fingerprint, hostname, platform, arch, cpu, cpu_cores, ram, first_activation_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    stmt.run(
      deviceInfo.fingerprint,
      deviceInfo.hostname,
      deviceInfo.platform,
      deviceInfo.arch,
      deviceInfo.cpu,
      deviceInfo.cpuCores,
      deviceInfo.ram,
      activationKey
    )
    // Update last_seen
    db.prepare(`UPDATE devices SET last_seen = CURRENT_TIMESTAMP WHERE fingerprint = ?`).run(deviceInfo.fingerprint)
    console.log('Device info saved to local DB:', deviceInfo.fingerprint)
  } catch (e) {
    console.error('Failed to save device info:', e.message)
  }
}

function isKeyValid() {
  return { valid: false, message: 'التحقق المحلي معطل. يرجى الاتصال بالخادم.' }
}

function normalizeWebActivationResult(result, fallbackKey, fallbackDeviceId) {
  const resultData = result?.data || {}
  const keyData = resultData.key || resultData
  const keyCode = keyData.keyCode || keyData.key || fallbackKey
  const expiryDate = keyData.expiresAt || keyData.expiryDate || resultData.expiresAt || ''

  return {
    success: true,
    message: result.message || 'تم التحقق من الاشتراك بنجاح',
    data: {
      key: keyCode,
      status: keyData.status || resultData.status || 'active',
      expiryDate,
      expiresAt: expiryDate,
      deviceId: resultData.sessionId || keyData.deviceId || fallbackDeviceId,
      maxDevices: keyData.maxDevices || resultData.maxDevices,
    },
  }
}

function registerAuthIPC({ ipcm, bm, db }) {
  ipcm('activate-key', async (e, { key } = {}) => {
    key = normalizeText(key, 80)
    const deviceInfo = getDeviceCapabilities()
    const fingerprint = deviceInfo.fingerprint
    deviceInfo.fingerprint = fingerprint
    try {
      const { data: result } = await fetchJson(`${WEB_API_URL}/auth/verify-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceFingerprint: fingerprint, deviceInfo })
      })
      if (result.success) {
        saveDeviceInfo(db, deviceInfo, key)
        return normalizeWebActivationResult(result, key, fingerprint)
      }
      if (result.error) return { success: false, message: result.error }
    } catch (err) { console.error('Server verification failed:', err.message) }
    if (OFFLINE_FALLBACK_ENABLED) {
      const check = isKeyValid(key)
      if (check.valid) {
        saveDeviceInfo(db, deviceInfo, key)
        return { success: true, message: 'تم التفعيل بنجاح!', data: { key: check.key, status: 'active', expiryDate: check.expiryDate, deviceId: fingerprint } }
      }
    }
    return { success: false, message: 'فشل التحقق من الخادم. أعد المحاولة عند توفر اتصال.' }
  })

  ipcm('validate-key', async (e, { key } = {}) => {
    key = normalizeText(key, 80)
    const deviceInfo = getDeviceCapabilities()
    const fingerprint = deviceInfo.fingerprint
    deviceInfo.fingerprint = fingerprint
    try {
      const { data: result } = await fetchJson(`${WEB_API_URL}/auth/verify-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceFingerprint: fingerprint, deviceInfo })
      })
      if (result.success) {
        saveDeviceInfo(db, deviceInfo, key)
        return normalizeWebActivationResult(result, key, fingerprint)
      }
      if (result.error) return { success: false, message: result.error }
    } catch (err) { console.error('Server validation failed:', err.message) }
    if (OFFLINE_FALLBACK_ENABLED) {
      const check = isKeyValid(key)
      if (check.valid) {
        return { success: true, message: 'مفتاح التفعيل صالح!', data: { key: check.key, status: 'active', expiryDate: check.expiryDate, deviceId: fingerprint } }
      }
    }
    return { success: false, message: 'تعذر التحقق من المفتاح بدون اتصال بالخادم.' }
  })

  ipcm('check-key-status', async (e, { key } = {}) => {
    key = normalizeText(key, 80)
    try {
      const { data: result } = await fetchJson(`${WEB_API_URL}/keys/status?key=${encodeURIComponent(key)}`)
      if (result.success) return normalizeWebActivationResult(result, key, undefined)
    } catch (err) { console.error('Server key status failed:', err.message) }
    return { success: false, message: 'تعذر جلب حالة المفتاح بدون اتصال بالخادم.' }
  })

  ipcm('get-device-info', async () => {
    return getDeviceCapabilities()
  })

  ipcm('reset-device', async (e, { key, deviceId, token } = {}) => {
    key = normalizeText(key, 80)
    deviceId = normalizeText(deviceId, 256)
    token = normalizeText(token, 512)
    const deviceInfo = getDeviceCapabilities()
    const fingerprint = deviceId || deviceInfo.fingerprint
    try {
      const headers = { 'Content-Type': 'application/json' }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      const { data: result } = await fetchJson(`${WEB_API_URL}/auth/reset-device`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ key, deviceFingerprint: fingerprint })
      })
      if (result.success) return result
      if (result.error) return { success: false, message: result.error }
    } catch (err) { console.error('Server reset device failed:', err.message) }
    return { success: false, message: 'فشل الاتصال بالخادم' }
  })

  ipcm('login', async (e, { email, password, serial } = {}) => {
    email = normalizeText(email, 254).toLowerCase()
    password = typeof password === 'string' ? password.slice(0, 512) : ''
    serial = normalizeText(serial, 80).toUpperCase()
    const deviceInfo = getDeviceCapabilities()
    const deviceFingerprint = deviceInfo.fingerprint
    try {
      const { data: result } = await fetchJson(`${WEB_API_URL}/desktop/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, serial, deviceFingerprint, deviceInfo })
      })
      return result
    } catch (err) {
      console.error('Login IPC error:', err.message)
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  })
}

module.exports = { registerAuthIPC }
