import crypto from 'crypto'

// ──────────────────────────────────────────────────────────────────────────────
// AUDIT HASH CHAIN CORE — shared canonicalization + hashing.
// Used by the prisma extension in lib/db.ts (automatic chaining) and by
// lib/security.ts (verification). Kept dependency-free so any runtime can
// import it without pulling the client into edge/middleware bundles.
// ──────────────────────────────────────────────────────────────────────────────

export interface ChainedAuditInput {
  userId: number | null
  action: string
  details?: unknown
  ipAddress?: string | null
}

export interface ChainSegment {
  prevHash: string
  hash: string
}

export const GENESIS_HASH =
  'GENESIS:' + crypto.createHash('sha256').update('skypro-audit-genesis').digest('hex')

export function canonicalizeEntry(
  input: ChainedAuditInput,
  createdAt: Date,
  prevHash: string
): string {
  // Deterministic JSON for hashing — fixed key order, no whitespace.
  return JSON.stringify({
    prev: prevHash,
    userId: input.userId ?? null,
    action: input.action,
    details: input.details ?? null,
    ipAddress: input.ipAddress ?? null,
    createdAt: createdAt.toISOString(),
  })
}

export function hashEntry(canonical: string): string {
  return crypto.createHash('sha256').update(canonical).digest('hex')
}
