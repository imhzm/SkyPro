import bcrypt from 'bcryptjs'

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

/**
 * Generate a license key with 128-bit entropy (16 random bytes).
 * Format: SKY1-PRO2-XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX-YYYY
 * Each segment is 4 random bytes (8 hex chars), providing strong brute-force resistance.
 */
export function generateApiKey(): string {
  const prefix = 'SKY1-PRO2'
  const segment = () => randomHex(4).toUpperCase()
  const year = new Date().getFullYear() + 1
  return `${prefix}-${segment()}-${segment()}-${segment()}-${segment()}-${year}`
}

export function generateSessionId(): string {
  return randomHex(32)
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
