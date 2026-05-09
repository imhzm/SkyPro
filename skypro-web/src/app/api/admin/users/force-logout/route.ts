import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const schema = z.object({
  userId: z.coerce.number().int().positive(),
})

/**
 * POST /api/admin/users/force-logout
 *
 * Forces all active sessions of a target user to be invalidated by bumping
 * their passwordChangedAt timestamp. This works because the JWT callback in
 * lib/auth.ts compares token.iat against passwordChangedAt and rejects older
 * tokens. The user keeps their password — they just need to log in again.
 *
 * Use cases:
 *  - Suspected account compromise
 *  - User reports lost device
 *  - After admin makes sensitive permission changes
 */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 4 * 1024)
    if (largePayload) return largePayload

    const parsed = schema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json(errorResponse('userId غير صالح'), { status: 400 })
    }

    const { userId } = parsed.data
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    })
    if (!target) {
      return NextResponse.json(errorResponse('المستخدم غير موجود'), { status: 404 })
    }

    await prisma.user.update({
      where: { id: target.id },
      data: { passwordChangedAt: new Date() },
    })

    await prisma.auditLog.create({
      data: {
        userId: Number(guard.session?.user.id),
        action: 'admin_force_logout',
        details: { targetUserId: target.id, targetEmail: target.email },
        ipAddress: getClientIp(req),
      },
    })

    return NextResponse.json(successResponse(
      { userId: target.id },
      `تم إنهاء جلسات ${target.email} بنجاح`
    ))
  } catch (err) {
    console.error('Force logout error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
