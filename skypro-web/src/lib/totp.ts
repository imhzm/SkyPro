/**
 * RFC 6238 (TOTP) + RFC 4226 (HOTP) implementation using Node crypto only.
 * No external dependencies required. Compatible with Google Authenticator,
 * Authy, 1Password, Bitwarden, etc.
 */

import crypto from 'crypto'
import { timingSafeEqual } from '@/lib/security'

// RFC 4648 base32 alphabet (no padding)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function generateSecret(bytes = 20): string {
  // 20 bytes = 160 bits → 32 base32 chars (recommended for HMAC-SHA1)
  const buf = crypto.randomBytes(bytes)
  let bits = ''
  for (const byte of buf) {
    bits += byte.toString(2).padStart(8, '0')
  }
  let out = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0')
    out += BASE32_ALPHABET[parseInt(chunk, 2)]
  }
  return out
}

function base32Decode(secret: string): Buffer {
  const cleaned = secret.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '')
  let bits = ''
  for (const char of cleaned) {
    const value = BASE32_ALPHABET.indexOf(char)
    if (value === -1) throw new Error('Invalid base32 character')
    bits += value.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 7 < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

/**
 * Generates the 6-digit TOTP code for a given secret and timestamp.
 */
export function generateTOTP(secret: string, options?: { time?: number; step?: number; digits?: number }): string {
  const time = options?.time ?? Date.now()
  const step = options?.step ?? 30 // seconds
  const digits = options?.digits ?? 6

  const counter = Math.floor(time / 1000 / step)
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeBigUInt64BE(BigInt(counter))

  const key = base32Decode(secret)
  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest()

  // Dynamic truncation per RFC 4226
  const offset = hmac[hmac.length - 1] & 0x0f
  const truncated =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)

  const code = truncated % 10 ** digits
  return code.toString().padStart(digits, '0')
}

/**
 * Verifies a user-supplied TOTP code with ±window tolerance for clock drift.
 * Default window=1 → accepts current, previous, or next 30s slot.
 */
export function verifyTOTP(
  secret: string,
  code: string,
  options?: { window?: number; step?: number; digits?: number; time?: number }
): boolean {
  const window = options?.window ?? 1
  const step = options?.step ?? 30
  const digits = options?.digits ?? 6
  const time = options?.time ?? Date.now()

  if (typeof code !== 'string') return false
  const cleaned = code.trim().replace(/\s+/g, '')
  if (cleaned.length !== digits || !/^\d+$/.test(cleaned)) return false

  for (let i = -window; i <= window; i++) {
    const expected = generateTOTP(secret, { time: time + i * step * 1000, step, digits })
    if (timingSafeEqual(expected, cleaned)) return true
  }
  return false
}

/**
 * Constructs the otpauth:// URI for use in QR codes.
 * Issuer is the app name shown in the authenticator app.
 */
export function buildOTPAuthURL(args: {
  secret: string
  accountName: string
  issuer?: string
  digits?: number
  period?: number
}): string {
  const issuer = args.issuer ?? 'SkyPro'
  const params = new URLSearchParams({
    secret: args.secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(args.digits ?? 6),
    period: String(args.period ?? 30),
  })
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(args.accountName)}?${params.toString()}`
}

/**
 * Generates 10 single-use backup codes (8-character lowercase alphanumeric).
 * Returns plain codes (show once to user) and SHA-256 hashes (store in DB).
 */
export function generateBackupCodes(count = 10): { plain: string[]; hashes: string[] } {
  const plain: string[] = []
  const hashes: string[] = []
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(6).toString('base64url').slice(0, 8).toLowerCase()
    plain.push(code)
    hashes.push(crypto.createHash('sha256').update(code).digest('hex'))
  }
  return { plain, hashes }
}

export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toLowerCase()).digest('hex')
}
