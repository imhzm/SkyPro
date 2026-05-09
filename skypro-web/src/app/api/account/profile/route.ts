import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rejectCrossSite,
  rejectLargeJson,
} from '@/lib/request-security'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 4 * 1024)
    if (largePayload) return largePayload

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(errorResponse('غير مصرح'), { status: 401 })
    }

    const ipAddress = getClientIp(req)
    const limit = checkRateLimit(`profile:user:${session.user.id}`, 10, 15 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const userId = Number(session.user.id)
    const body = await req.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : null

    if (!name) {
      return NextResponse.json(errorResponse('الاسم مطلوب'), { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { name },
    })

    await prisma.auditLog.create({
      data: { userId, action: 'profile_updated', details: { name }, ipAddress },
    })

    return NextResponse.json(successResponse({ name }, 'تم تحديث البيانات'))
  } catch (err) {
    console.error('Profile update error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
