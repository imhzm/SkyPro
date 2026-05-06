import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/lib/api'

const MAX_BUCKETS = 10000
const buckets = new Map<string, { count: number; resetAt: number }>()

function envList(name: string): string[] {
  return (process.env[name] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

/**
 * Only trust proxy headers (X-Forwarded-For, X-Real-IP, etc.)
 * when explicitly enabled. Default is FALSE for security.
 * Set TRUST_PROXY_HEADERS=true only when behind a trusted reverse proxy.
 */
function trustProxyHeaders(): boolean {
  const value = (process.env.TRUST_PROXY_HEADERS || '').trim().toLowerCase()
  // Default is false, only true if explicitly 'true' or '1'
  return value === 'true' || value === '1'
}

function cleanHeaderValue(value: string | null): string | null {
  const cleaned = value?.split(',')[0]?.trim()
  if (!cleaned || cleaned.toLowerCase() === 'unknown') return null
  return cleaned.slice(0, 128)
}

function safeOrigin(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.origin
  } catch {
    return null
  }
}

function trustedOrigins(req?: NextRequest): Set<string> {
  const origins = new Set<string>()
  for (const value of [
    process.env.NEXTAUTH_URL,
    process.env.APP_URL,
    ...envList('ALLOWED_ORIGINS'),
  ]) {
    const origin = safeOrigin(value)
    if (origin) origins.add(origin)
  }

  if (req && origins.size === 0) {
    const host = cleanHeaderValue(req.headers.get('host'))
    if (host) {
      origins.add(`https://${host}`)
      if (process.env.NODE_ENV !== 'production') origins.add(`http://${host}`)
    }

    if (trustProxyHeaders()) {
      const forwardedHost = cleanHeaderValue(req.headers.get('x-forwarded-host'))
      if (forwardedHost) origins.add(`https://${forwardedHost}`)
    }
  }

  return origins
}

export function getClientIp(req: { headers: Headers }): string {
  if (trustProxyHeaders()) {
    return cleanHeaderValue(req.headers.get('cf-connecting-ip'))
      || cleanHeaderValue(req.headers.get('x-real-ip'))
      || cleanHeaderValue(req.headers.get('x-forwarded-for'))
      || '0.0.0.0'
  }

  return '0.0.0.0'
}

export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const host = req.headers.get('host')
  const forwardedHost = trustProxyHeaders() ? req.headers.get('x-forwarded-host') : null
  const fetchSite = req.headers.get('sec-fetch-site')

  if (fetchSite && !['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    return false
  }

  if (!origin) return true

  try {
    const originUrl = new URL(origin)
    if (!['http:', 'https:'].includes(originUrl.protocol)) return false
    if (process.env.NODE_ENV === 'production' && originUrl.protocol !== 'https:') return false
    const configuredOrigins = trustedOrigins()
    if (configuredOrigins.size > 0) return configuredOrigins.has(originUrl.origin)
    if (trustedOrigins(req).has(originUrl.origin)) return true
    return originUrl.host === host || (!!forwardedHost && originUrl.host === forwardedHost)
  } catch {
    return false
  }
}

export function rejectCrossSite(req: NextRequest): NextResponse | null {
  if (sameOrigin(req)) return null
  return NextResponse.json(errorResponse('تم رفض الطلب لأسباب أمنية'), { status: 403 })
}

export function rejectLargeJson(req: NextRequest, maxBytes = 64 * 1024): NextResponse | null {
  const contentLength = Number(req.headers.get('content-length') || '0')
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return NextResponse.json(errorResponse('حجم الطلب أكبر من المسموح'), { status: 413 })
  }
  return null
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const normalizedKey = key.slice(0, 250)
  const current = buckets.get(normalizedKey)

  if (!current || current.resetAt <= now) {
    if (buckets.size > MAX_BUCKETS) pruneBuckets(now)
    buckets.set(normalizedKey, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfter: 0 }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    }
  }

  current.count += 1
  return { allowed: true, remaining: limit - current.count, retryAfter: 0 }
}

export function rateLimitedResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(errorResponse('طلبات كثيرة جداً. حاول لاحقاً.'), {
    status: 429,
    headers: { 'Retry-After': String(retryAfterSeconds) }
  })
}

function pruneBuckets(now: number) {
  buckets.forEach((value, key) => {
    if (value.resetAt <= now) buckets.delete(key)
  })
}
