import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { rejectCrossSite, rejectLargeJson, checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  expiresInDays: z.coerce.number().int().min(0).max(3650).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(errorResponse('غير مصرح'), { status: 401 })
    }
    const userId = Number(session.user.id)
    const ip = getClientIp(req)

    const limit = checkRateLimit(`api-keys-list:${userId}`, 30, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const keys = await prisma.userApiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, keyPrefix: true,
        lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true,
      },
    })

    return NextResponse.json(successResponse({ keys }))
  } catch (err) {
    console.error('API keys list error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite
    const largePayload = rejectLargeJson(req, 4 * 1024)
    if (largePayload) return largePayload

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(errorResponse('غير مصرح'), { status: 401 })
    }
    const userId = Number(session.user.id)
    const ip = getClientIp(req)

    const limit = checkRateLimit(`api-keys-create:${userId}`, 10, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const parsed = createSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(errorResponse(parsed.error.errors.map((e) => e.message).join(', ')), { status: 400 })
    }

    const activeCount = await prisma.userApiKey.count({ where: { userId, revokedAt: null } })
    if (activeCount >= 10) {
      return NextResponse.json(errorResponse('وصلت الحد الأقصى (10 مفاتيح). احذف مفتاحاً أولاً.'), { status: 400 })
    }

    // Generate: skp_live_<random>
    const random = crypto.randomBytes(24).toString('base64url')
    const fullKey = `skp_live_${random}`
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex')
    const keyPrefix = fullKey.slice(0, 12)

    const expiresAt = parsed.data.expiresInDays && parsed.data.expiresInDays > 0
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const created = await prisma.userApiKey.create({
      data: { userId, name: parsed.data.name, keyHash, keyPrefix, expiresAt },
      select: { id: true, name: true, keyPrefix: true, expiresAt: true, createdAt: true },
    })

    await prisma.auditLog.create({
      data: { userId, action: 'api_key_created', details: { id: created.id, name: created.name }, ipAddress: ip },
    })

    return NextResponse.json(successResponse(
      { ...created, fullKey },
      '🔑 احفظ المفتاح الآن — لن نُظهره مرة أخرى'
    ))
  } catch (err) {
    console.error('API key create error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(errorResponse('غير مصرح'), { status: 401 })
    }
    const userId = Number(session.user.id)
    const ip = getClientIp(req)

    const limit = checkRateLimit(`api-keys-delete:${userId}`, 20, 60 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const id = Number(req.nextUrl.searchParams.get('id') || 0)
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json(errorResponse('معرّف غير صالح'), { status: 400 })
    }

    const key = await prisma.userApiKey.findFirst({ where: { id, userId, revokedAt: null } })
    if (!key) {
      return NextResponse.json(errorResponse('المفتاح غير موجود'), { status: 404 })
    }

    await prisma.userApiKey.update({ where: { id: key.id }, data: { revokedAt: new Date() } })

    await prisma.auditLog.create({
      data: { userId, action: 'api_key_revoked', details: { id: key.id, name: key.name }, ipAddress: getClientIp(req) },
    })

    return NextResponse.json(successResponse(null, 'تم إلغاء المفتاح'))
  } catch (err) {
    console.error('API key delete error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
