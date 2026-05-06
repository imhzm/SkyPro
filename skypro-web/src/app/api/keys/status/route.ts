import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const ACCOUNT_SUSPENDED_MESSAGE = 'تم حظر حسابك من SkyPro. تم إيقاف الدخول إلى البرنامج، يرجى مراجعة بريدك الإلكتروني أو التواصل مع الدعم.'

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const ipLimit = checkRateLimit(`key-status:ip:${ip}`, 60, 15 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const url = new URL(req.url)
    const key = url.searchParams.get('key')?.trim()

    if (!key) {
      return NextResponse.json(errorResponse('مفتاح التفعيل مطلوب'), { status: 400 })
    }

    if (key.length > 64) {
      return NextResponse.json(errorResponse('مفتاح التفعيل غير صالح'), { status: 400 })
    }

    const keyLimit = checkRateLimit(`key-status:key:${key}`, 30, 15 * 60 * 1000)
    if (!keyLimit.allowed) return rateLimitedResponse(keyLimit.retryAfter)

    const activationKey = await prisma.activationKey.findUnique({
      where: { keyCode: key },
      include: {
        devices: { where: { isActive: true } },
        user: { select: { status: true } }
      }
    })

    if (!activationKey) {
      return NextResponse.json(errorResponse('مفتاح التفعيل غير صالح'), { status: 404 })
    }

    if (activationKey.user?.status === 'suspended' || activationKey.status === 'suspended') {
      return NextResponse.json(errorResponse(ACCOUNT_SUSPENDED_MESSAGE), { status: 403 })
    }

    if (activationKey.user && activationKey.user.status !== 'active') {
      return NextResponse.json(errorResponse('الحساب غير نشط. تواصل مع الدعم الفني'), { status: 403 })
    }

    return NextResponse.json(successResponse({
      status: activationKey.status,
      valid: true
    }))
  } catch (err) {
    console.error('Key status error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
