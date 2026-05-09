import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hashPassword, verifyPassword } from '@/lib/utils'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rejectCrossSite,
  rejectLargeJson,
} from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const STRONG_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/

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

    const ipAddress = getClientIp(req)
    const limit = checkRateLimit(`password-change:user:${session.user.id}`, 5, 15 * 60 * 1000)
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfter)

    const userId = Number(session.user.id)
    const body = await req.json().catch(() => null)
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword || !newPassword) {
      return NextResponse.json(errorResponse('كلمة المرور الحالية والجديدة مطلوبتان'), { status: 400 })
    }

    if (!STRONG_RE.test(newPassword)) {
      return NextResponse.json(
        errorResponse('كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل وتشمل حرفاً كبيراً، صغيراً، ورقماً'),
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    })

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        errorResponse('هذا الحساب لا يستخدم كلمة مرور — استخدم Google لتسجيل الدخول'),
        { status: 400 }
      )
    }

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json(errorResponse('كلمة المرور الحالية غير صحيحة'), { status: 401 })
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(errorResponse('يجب أن تختلف كلمة المرور الجديدة عن الحالية'), { status: 400 })
    }

    const newHash = hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'password_changed', ipAddress },
    })

    return NextResponse.json(successResponse(null, 'تم تغيير كلمة المرور بنجاح'))
  } catch (err) {
    console.error('Password change error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
