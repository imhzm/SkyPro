import bcrypt from 'bcryptjs'
import { createHmac, createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12)
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash)
}

export function generateApiKey(): string {
  const prefix = 'SKY1-PRO2'
  const segment = () => randomHex(4).toUpperCase()
  const year = new Date().getFullYear()
  return `${prefix}-${segment()}-${segment()}-${segment()}-${segment()}-${year}`
}

export function generateSessionId(): string {
  return randomHex(32)
}

export function signSessionToken(payload: { userId: number; keyId: number; deviceId: number | string; fingerprint: string }): string {
  const secret = process.env.NEXTAUTH_SECRET || ''
  if (!secret) throw new Error('NEXTAUTH_SECRET not configured')
  const nonce = randomHex(16)
  const data = `${payload.userId}:${payload.keyId}:${payload.deviceId}:${payload.fingerprint}`
  const hmacInput = `${data}:${nonce}`
  const hmac = createHmac('sha256', secret).update(hmacInput).digest('hex')
  return `${nonce}:${data}.${hmac}`
}

export function verifySessionToken(token: string, expectedUserId: number): boolean {
  const secret = process.env.NEXTAUTH_SECRET || ''
  if (!secret || !token) return false
  try {
    const dotIndex = token.lastIndexOf('.')
    if (dotIndex === -1) return false
    const left = token.slice(0, dotIndex)
    const providedHmac = token.slice(dotIndex + 1)
    const colonIndex = left.indexOf(':')
    if (colonIndex === -1) return false
    const nonce = left.slice(0, colonIndex)
    const data = left.slice(colonIndex + 1)
    const expectedHmac = createHmac('sha256', secret).update(`${data}:${nonce}`).digest('hex')
    if (!cryptoTimingSafeEqual(providedHmac, expectedHmac)) return false
    const parts = data.split(':')
    if (parts.length < 4) return false
    const tokenUserId = parseInt(parts[0], 10)
    return Number.isFinite(tokenUserId) && tokenUserId === expectedUserId
  } catch {
    return false
  }
}

function cryptoTimingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return require('crypto').timingSafeEqual(bufA, bufB)
}

export function encryptToken(plaintext: string): string {
  const secret = process.env.NEXTAUTH_SECRET || ''
  if (!secret) throw new Error('NEXTAUTH_SECRET not configured')
  const key = createHash('sha256').update(secret).digest()
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}.${authTag}.${encrypted}`
}

export function decryptToken(ciphertext: string): string | null {
  const secret = process.env.NEXTAUTH_SECRET || ''
  if (!secret) return null
  try {
    const key = createHash('sha256').update(secret).digest()
    const parts = ciphertext.split('.')
    if (parts.length !== 3) return null
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return null
  }
}

export function isKeyExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true
  return new Date() > new Date(expiresAt)
}

export function getTrialEndDate(): Date {
  const days = parseInt(process.env.DEFAULT_TRIAL_DAYS || '2')
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

export function getActivationExpiry(): Date {
  const days = parseInt(process.env.DEFAULT_KEY_DURATION_DAYS || '365')
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

/**
 * Generate a cryptographically-secure random password.
 * Guarantees at least 1 uppercase, 1 lowercase, 1 digit, and 1 special character.
 * Default length: 14 characters.
 */
export function generateRandomPassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'   // no I/O to avoid confusion
  const lower = 'abcdefghjkmnpqrstuvwxyz'     // no i/l/o
  const digits = '23456789'                    // no 0/1
  const special = '!@#$%&*?'
  const all = upper + lower + digits + special

  // Guarantee one from each required class
  const pick = (charset: string) => {
    const bytes = new Uint8Array(1)
    globalThis.crypto.getRandomValues(bytes)
    return charset[bytes[0] % charset.length]
  }

  const mandatory = [pick(upper), pick(lower), pick(digits), pick(special)]

  // Fill the rest from the full character set
  const remaining = length - mandatory.length
  const bytes = new Uint8Array(remaining)
  globalThis.crypto.getRandomValues(bytes)
  const extras = Array.from(bytes, (b) => all[b % all.length])

  // Shuffle all characters using Fisher-Yates
  const chars = [...mandatory, ...extras]
  for (let i = chars.length - 1; i > 0; i--) {
    const rnd = new Uint8Array(1)
    globalThis.crypto.getRandomValues(rnd)
    const j = rnd[0] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
