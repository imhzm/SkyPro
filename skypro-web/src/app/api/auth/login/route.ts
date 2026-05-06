import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { loginSchema } from '@/lib/validations'
import { verifyPassword, generateSessionId } from '@/lib/utils'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import {
  checkRateLimit,
  getClientIp,
  rateLimitedResponse,
  rejectCrossSite,
  rejectLargeJson,
} from '@/lib/request-security'

export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 16 * 1024)
    if (largePayload) return largePayload

    const ip = getClientIp(req)
    const ipLimit = checkRateLimit(`web-login:ip:${ip}`, 20, 15 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const body = await req.json()
    const parsed = loginSchema.safeParse(body)

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { email, password } = parsed.data
    const emailLimit = checkRateLimit(`web-login:email:${email}`, 10, 15 * 60 * 1000)
    if (!emailLimit.allowed) return rateLimitedResponse(emailLimit.retryAfter)

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !user.passwordHash) {
      return NextResponse.json(errorResponse('بيانات الدخول غير صحيحة'), { status: 401 })
    }

    if (user.status !== 'active') {
      return NextResponse.json(errorResponse('الحساب غير نشط. تواصل مع الدعم الفني'), { status: 403 })
    }

    if (!user.emailVerifiedAt) {
      return NextResponse.json(errorResponse('يرجى تأكيد البريد الإلكتروني أولاً'), { status: 403 })
    }

    const isValid = verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(errorResponse('بيانات الدخول غير صحيحة'), { status: 401 })
    }

    const sessionId = generateSessionId()
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        ipAddress: ip
      }
    })

    const response = NextResponse.json(successResponse({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      sessionId
    }, 'تم تسجيل الدخول بنجاح'))

    response.cookies.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/'
    })

    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
