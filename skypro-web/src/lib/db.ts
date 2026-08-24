import { PrismaClient } from '@prisma/client'
import { GENESIS_HASH, canonicalizeEntry, hashEntry } from '@/lib/audit-chain'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Audit hash-chain enforcement.
 *
 * EVERY prisma.auditLog.create anywhere in the codebase automatically gets a
 * `__chain` segment injected into `details`, linking it to the previous entry.
 * Callers never need to remember to chain — the integrity guarantee cannot be
 * bypassed by forgetting a helper call (finding F6 / "audit chain broken").
 *
 * Appends are serialized through an in-process promise queue so concurrent
 * requests cannot fork the chain. Deployment is single-instance (pm2 skypro);
 * if this ever becomes multi-instance, move the lock to Redis or a DB
 * advisory lock.
 */
const base = globalForPrisma.prisma ?? new PrismaClient()

let appendQueue: Promise<unknown> = Promise.resolve()

export const prisma = base.$extends({
  query: {
    auditLog: {
      async create({ args, query }) {
        const run = async () => {
          const data = { ...((args.data as Record<string, unknown>) ?? {}) } as Record<string, unknown>
          const detailsIn = (data.details ?? {}) as Record<string, unknown>

          // Pre-computed segments (backfill tooling) pass through untouched.
          if (detailsIn && typeof detailsIn === 'object' && '__chain' in detailsIn) {
            return query(args)
          }

          const last = await base.auditLog.findFirst({
            orderBy: { id: 'desc' },
            select: { details: true },
          })
          const prevHash =
            ((last?.details as Record<string, unknown>)?.['__chain'] as { hash?: string })?.hash ??
            GENESIS_HASH

          // The stored createdAt MUST equal the hashed createdAt — set it here
          // so DB-default timestamps can't diverge from the canonical form.
          const createdAt = data.createdAt instanceof Date ? data.createdAt : new Date()
          data.createdAt = createdAt

          const canonical = canonicalizeEntry(
            {
              userId: (data.userId as number | null) ?? null,
              action: String(data.action ?? ''),
              details: Object.keys(detailsIn).length ? detailsIn : undefined,
              ipAddress: (data.ipAddress as string | null) ?? null,
            },
            createdAt,
            prevHash
          )
          const hash = hashEntry(canonical)

          data.details = { ...detailsIn, __chain: { prevHash, hash } }
          ;(args as { data: unknown }).data = data

          return query(args)
        }

        const p = appendQueue.then(run, run)
        appendQueue = p.catch(() => {})
        return p
      },
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = base
