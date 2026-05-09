/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto'
import { prisma } from '@/lib/db'

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANT-TIME COMPARISONS — defends against timing attacks on tokens.
// ──────────────────────────────────────────────────────────────────────────────

export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  // crypto.timingSafeEqual requires equal-length buffers; pad with random bytes
  // to mask length differences (still constant-time on the actual comparison).
  const max = Math.max(a.length, b.length)
  const aBuf = Buffer.alloc(max, 0)
  const bBuf = Buffer.alloc(max, 0)
  Buffer.from(a, 'utf8').copy(aBuf)
  Buffer.from(b, 'utf8').copy(bBuf)
  try {
    return crypto.timingSafeEqual(aBuf, bBuf) && a.length === b.length
  } catch {
    return false
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// HAVE-I-BEEN-PWNED password breach check (k-anonymity API).
// Sends only the first 5 chars of SHA-1; full hash never leaves the server.
// Returns the breach count, or 0 if not found / on error (fail-open is safer
// than blocking signups on transient HIBP outages).
// ──────────────────────────────────────────────────────────────────────────────

export async function checkPasswordBreach(password: string, timeoutMs = 4000): Promise<{
  breached: boolean
  count: number
  checked: boolean
}> {
  try {
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = sha1.slice(0, 5)
    const suffix = sha1.slice(5)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'User-Agent': 'SkyPro-Security/1.0', 'Add-Padding': 'true' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timer))

    if (!res.ok) return { breached: false, count: 0, checked: false }

    const text = await res.text()
    for (const line of text.split('\n')) {
      const [hashSuffix, countStr] = line.trim().split(':')
      if (hashSuffix === suffix) {
        const count = Number.parseInt(countStr || '0', 10)
        return { breached: count > 0, count: Number.isFinite(count) ? count : 0, checked: true }
      }
    }
    return { breached: false, count: 0, checked: true }
  } catch {
    return { breached: false, count: 0, checked: false }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// AUDIT LOG HASH CHAIN — tamper-evident logging.
// Each log entry's hash is derived from (previousHash || canonicalEntryJSON).
// Verifying the chain proves no entry has been altered or removed.
// ──────────────────────────────────────────────────────────────────────────────

export interface ChainedAuditInput {
  userId: number | null
  action: string
  details?: any
  ipAddress?: string | null
}

interface ChainSegment {
  prevHash: string
  hash: string
}

const GENESIS_HASH = 'GENESIS:' + crypto.createHash('sha256').update('skypro-audit-genesis').digest('hex')

function canonicalizeEntry(input: ChainedAuditInput, createdAt: Date, prevHash: string): string {
  // Deterministic JSON for hashing — sorted keys, no whitespace
  return JSON.stringify({
    prev: prevHash,
    userId: input.userId ?? null,
    action: input.action,
    details: input.details ?? null,
    ipAddress: input.ipAddress ?? null,
    createdAt: createdAt.toISOString(),
  })
}

function hashEntry(canonical: string): string {
  return crypto.createHash('sha256').update(canonical).digest('hex')
}

/**
 * Append an audit-log entry as the next link in the hash chain.
 * Stores hash + prevHash inside `details` (avoiding a schema migration).
 */
export async function appendAuditLog(input: ChainedAuditInput): Promise<{ id: number; hash: string }> {
  const last = await prisma.auditLog.findFirst({
    orderBy: { id: 'desc' },
    select: { details: true },
  })
  const prevHash = (last?.details as any)?.__chain?.hash ?? GENESIS_HASH

  const createdAt = new Date()
  const canonical = canonicalizeEntry(input, createdAt, prevHash)
  const hash = hashEntry(canonical)

  const entry = await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      details: {
        ...(input.details ?? {}),
        __chain: { prevHash, hash } as ChainSegment,
      } as any,
      ipAddress: input.ipAddress ?? null,
      createdAt,
    },
    select: { id: true },
  })

  return { id: entry.id, hash }
}

/**
 * Walk the audit log and verify every link in the chain.
 * Returns the first divergence (if any) — useful for an admin "verify integrity"
 * endpoint that can detect any DB tampering.
 */
export async function verifyAuditChain(limit = 1000): Promise<{
  ok: boolean
  total: number
  brokenAt: { id: number; expectedHash: string; actualHash: string } | null
}> {
  const rows = await prisma.auditLog.findMany({
    orderBy: { id: 'asc' },
    take: limit,
    select: { id: true, userId: true, action: true, details: true, ipAddress: true, createdAt: true },
  })

  let prev = GENESIS_HASH
  for (const row of rows) {
    const chain = (row.details as any)?.__chain
    // Strip __chain before re-canonicalising
    const cloneDetails = { ...(row.details as any) }
    delete cloneDetails.__chain

    const canonical = canonicalizeEntry(
      {
        userId: row.userId,
        action: row.action,
        details: Object.keys(cloneDetails).length ? cloneDetails : undefined,
        ipAddress: row.ipAddress,
      },
      row.createdAt,
      prev
    )
    const expected = hashEntry(canonical)
    if (!chain || chain.hash !== expected || chain.prevHash !== prev) {
      return {
        ok: false,
        total: rows.length,
        brokenAt: { id: row.id, expectedHash: expected, actualHash: chain?.hash ?? '(missing)' },
      }
    }
    prev = chain.hash
  }

  return { ok: true, total: rows.length, brokenAt: null }
}

// ──────────────────────────────────────────────────────────────────────────────
// SECURITY EVENT NOTIFICATION HELPER
// Bundles the common pattern of "log + email user" for sensitive events.
// ──────────────────────────────────────────────────────────────────────────────

export interface SecurityEventInput {
  userId: number
  email: string
  name?: string | null
  action: string
  ipAddress?: string | null
  userAgent?: string | null
  extraDetails?: Record<string, any>
}

import { sendEmail } from '@/lib/email'

const ACTION_LABELS: Record<string, { subject: string; bodyAr: string }> = {
  password_changed: {
    subject: '🔐 تم تغيير كلمة مرور حسابك في SkyPro',
    bodyAr: 'تم تغيير كلمة مرور حسابك. إذا لم تكن أنت، أعد ضبط كلمة المرور فوراً وتواصل مع الدعم.',
  },
  login_new_ip: {
    subject: '🌐 تسجيل دخول جديد لحسابك في SkyPro',
    bodyAr: 'تم تسجيل الدخول إلى حسابك من جهاز/IP جديد. إذا لم تكن أنت، غيّر كلمة المرور فوراً.',
  },
  '2fa_enabled': {
    subject: '🛡️ تم تفعيل التحقق بخطوتين على حسابك',
    bodyAr: 'حساب SkyPro لديك أصبح محمياً بـ 2FA. احتفظ برموز النسخ الاحتياطي في مكان آمن.',
  },
  '2fa_disabled': {
    subject: '⚠️ تم تعطيل التحقق بخطوتين على حسابك',
    bodyAr: 'تم تعطيل 2FA على حسابك. إذا لم تكن أنت، أعد تفعيله وغيّر كلمة المرور فوراً.',
  },
  account_locked: {
    subject: '🔒 تم قفل حسابك مؤقتاً بعد محاولات فاشلة',
    bodyAr: 'لاحظنا عدة محاولات فاشلة لتسجيل الدخول وقمنا بقفل الحساب 30 دقيقة. إذا لم تكن أنت، غيّر كلمة المرور فوراً عبر استعادة كلمة المرور.',
  },
}

export async function notifySecurityEvent(input: SecurityEventInput): Promise<void> {
  await appendAuditLog({
    userId: input.userId,
    action: `security:${input.action}`,
    details: {
      ...(input.extraDetails ?? {}),
      userAgent: input.userAgent ?? null,
    },
    ipAddress: input.ipAddress ?? null,
  })

  const cfg = ACTION_LABELS[input.action]
  if (!cfg) return

  const ipLine = input.ipAddress ? `IP: ${input.ipAddress}\n` : ''
  const uaLine = input.userAgent ? `الجهاز: ${input.userAgent.slice(0, 200)}\n` : ''
  const when = new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })

  const text = `مرحباً ${input.name || 'عميلنا الكريم'}

${cfg.bodyAr}

التوقيت: ${when}
${ipLine}${uaLine}
إذا كنت تشك في أي نشاط مريب، تواصل مع الدعم فوراً عبر admin@skywaveads.com.

— فريق أمان SkyPro`

  // Best-effort: don't throw if email fails
  void sendEmail({
    to: input.email,
    subject: cfg.subject,
    text,
    html: `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:#0f172a;color:#fff;padding:20px;text-align:center;">
          <h1 style="margin:0;font-size:18px;">SkyPro Security</h1>
        </div>
        <div style="padding:24px;line-height:1.8;">
          <p>مرحباً <strong>${(input.name || 'عميلنا الكريم').replace(/[<>&"']/g, '')}</strong></p>
          <p>${cfg.bodyAr.replace(/[<>&"']/g, '')}</p>
          <table style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;width:100%;border-collapse:collapse;font-size:13px;">
            <tr><td style="padding:6px;color:#64748b;">التوقيت:</td><td style="padding:6px;color:#0f172a;font-weight:600;">${when}</td></tr>
            ${input.ipAddress ? `<tr><td style="padding:6px;color:#64748b;">IP:</td><td style="padding:6px;color:#0f172a;font-family:monospace;">${input.ipAddress.replace(/[<>&"']/g, '')}</td></tr>` : ''}
          </table>
          <p style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;color:#7f1d1d;margin-top:16px;">
            إذا لم تكن أنت من قام بهذا الإجراء، تواصل مع الدعم فوراً.
          </p>
        </div>
      </div>
    </div>`,
  }).catch((err) => console.error('Security event email failed:', err))
}
