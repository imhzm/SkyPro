/**
 * Shared two-factor (TOTP + single-use backup codes) verification used by BOTH
 * login paths (web NextAuth credentials + desktop login route).
 *
 * Secrets are stored per the schema: `twoFactorSecret` (base32, plaintext) and
 * `twoFactorBackupCodes` (JSON array of SHA-256 hashes). A backup code is
 * single-use, so the caller must persist `remainingBackupCodes` when one is used.
 */
import { verifyTOTP, hashBackupCode } from '@/lib/totp'

export interface TwoFactorCheck {
  ok: boolean
  usedBackupCode: boolean
  /** When a backup code was consumed, the remaining hashes to persist. */
  remainingBackupCodes?: string[]
}

export function checkTwoFactorCode(
  code: string,
  secret: string | null | undefined,
  backupCodesJson: string | null | undefined
): TwoFactorCheck {
  const cleaned = (code || '').trim()
  if (!cleaned) return { ok: false, usedBackupCode: false }

  // 1) Primary path: time-based OTP from the authenticator app.
  if (secret && verifyTOTP(secret, cleaned)) {
    return { ok: true, usedBackupCode: false }
  }

  // 2) Fallback: single-use backup code (stored hashed). Consume on match.
  if (backupCodesJson) {
    try {
      const hashes: unknown = JSON.parse(backupCodesJson)
      if (Array.isArray(hashes) && hashes.length > 0) {
        const inputHash = hashBackupCode(cleaned)
        const idx = hashes.findIndex((h) => h === inputHash)
        if (idx !== -1) {
          const remaining = (hashes as string[]).filter((_, i) => i !== idx)
          return { ok: true, usedBackupCode: true, remainingBackupCodes: remaining }
        }
      }
    } catch {
      // malformed backup-code blob → treat as no match
    }
  }

  return { ok: false, usedBackupCode: false }
}
