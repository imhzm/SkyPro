import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { resetDeviceSchema } from '@/lib/validations'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { checkRateLimit, getClientIp, rateLimitedResponse, rejectCrossSite, rejectLargeJson } from '@/lib/request-security'
import { verifySessionToken } from '@/lib/utils'

async function getActor(req: NextRequest) {
  const session = await auth()
  if (session?.user?.id) {
    return {
      id: Number(session.user.id),
      role: session.user.role || 'user'
    }
  }

  const authHeader = req.headers.get('authorization')
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!bearer) return null

  const userIdStr = extractTokenUserId(bearer)
  if (!userIdStr) return null

  const userId = parseInt(userIdStr, 10)
  if (!Number.isFinite(userId)) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true }
  })

  if (!user || user.status !== 'active') return null

  return { id: user.id, role: user.role || 'user' }
}

function extractTokenUserId(token: string): string | null {
  try {
    const dotIndex = token.lastIndexOf('.')
    if (dotIndex === -1) return null
    const left = token.slice(0, dotIndex)
    const colonIndex = left.indexOf(':')
    if (colonIndex === -1) return null
    const data = left.slice(colonIndex + 1)
    const parts = data.split(':')
    return parts.length >= 4 ? parts[0] : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const ipAddress = getClientIp(req)
    const ipLimit = checkRateLimit(`reset-device:ip:${ipAddress}`, 20, 15 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const actor = await getActor(req)
    if (!actor) {
      return NextResponse.json(errorResponse('غير مصرح. يرجى تسجيل الدخول'), { status: 401 })
    }

    const body = await req.json()
    const parsed = resetDeviceSchema.safeParse(body)

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { key, deviceFingerprint } = parsed.data

    const activationKey = await prisma.activationKey.findUnique({
      where: { keyCode: key },
      include: { devices: true }
    })

    if (!activationKey) {
      return NextResponse.json(errorResponse('مفتاح التفعيل غير صالح'), { status: 404 })
    }

    if (!activationKey.userId) {
      return NextResponse.json(errorResponse('المفتاح غير مرتبط بحساب'), { status: 403 })
    }

    if (actor.role !== 'admin' && activationKey.userId !== actor.id) {
      return NextResponse.json(errorResponse('غير مصرح بإعادة تعيين هذا الجهاز'), { status: 403 })
    }

    const device = activationKey.devices.find(
      (d) => d.deviceFingerprint === deviceFingerprint && d.isActive
    )

    if (!device) {
      return NextResponse.json(errorResponse('الجهاز غير مسجل'), { status: 404 })
    }

    if (device.resetCount >= device.maxResetsPerYear) {
      return NextResponse.json(errorResponse(
        `تم تجاوز الحد الأقصى لإعادة التعيين (${device.maxResetsPerYear} مرات/سنة)`
      ), { status: 403 })
    }

    await prisma.device.update({
      where: { id: device.id },
      data: {
        isActive: false,
        resetCount: device.resetCount + 1
      }
    })

    if (activationKey.userId) {
      await prisma.auditLog.create({
        data: {
          userId: actor.id,
          action: 'device_reset',
          details: { keyCode: key, deviceFingerprint: deviceFingerprint.slice(0, 16) + '...', previousDeviceId: device.id, ownerUserId: activationKey.userId },
          ipAddress
        }
      })
    }

    return NextResponse.json(successResponse(null, 'تم إعادة تعيين الجهاز بنجاح. سجّل الدخول مرة أخرى'))
  } catch (err) {
    console.error('Reset device error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
