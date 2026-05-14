import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage, successResponse } from '@/lib/api'
import { generateSessionId, signSessionToken, getActivationExpiry, isKeyExpired, verifyPassword } from '@/lib/utils'
import { checkRateLimit, getClientIp, rateLimitedResponse, rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const ACCOUNT_SUSPENDED_MESSAGE = 'تم حظر حسابك من SkyPro. تم إيقاف الدخول إلى البرنامج، يرجى مراجعة بريدك الإلكتروني أو التواصل مع الدعم.'
const ACCOUNT_INACTIVE_MESSAGE = 'الحساب غير نشط. تواصل مع الدعم الفني.'

const desktopLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('بريد إلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(128, 'كلمة المرور طويلة جداً'),
  serial: z.string().trim().min(1, 'السيريال مطلوب').max(64, 'السيريال غير صالح'),
  deviceFingerprint: z.string().trim().min(8, 'بصمة الجهاز مطلوبة').max(256, 'بصمة الجهاز طويلة جداً'),
  deviceInfo: z.object({
    hostname: z.string().max(255).optional(),
    platform: z.string().max(120).optional(),
    arch: z.string().max(120).optional(),
    cpu: z.string().max(255).optional(),
    cpuCores: z.number().int().min(1).max(512).optional(),
    ram: z.string().max(120).optional(),
    gpu: z.string().max(255).optional(),
    screenResolution: z.string().max(80).optional()
  }).strict().optional()
})

export async function POST(req: NextRequest) {
  try {
    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const ipAddress = getClientIp(req)
    const ipLimit = checkRateLimit(`desktop-login:ip:${ipAddress}`, 30, 15 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)

    const parsed = desktopLoginSchema.safeParse(await req.json())
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { email, password, serial, deviceFingerprint, deviceInfo } = parsed.data
    const emailLimit = checkRateLimit(`desktop-login:email:${email}`, 12, 15 * 60 * 1000)
    if (!emailLimit.allowed) return rateLimitedResponse(emailLimit.retryAfter)

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(errorResponse('بيانات تسجيل الدخول غير صحيحة'), { status: 401 })
    }

    if (user.status === 'suspended') {
      return NextResponse.json(errorResponse(ACCOUNT_SUSPENDED_MESSAGE), { status: 403 })
    }

    if (user.status !== 'active') {
      return NextResponse.json(errorResponse(ACCOUNT_INACTIVE_MESSAGE), { status: 403 })
    }

    const activationKey = await prisma.activationKey.findUnique({
      where: { keyCode: serial },
      include: { devices: true }
    })

    if (!activationKey || (activationKey.userId && activationKey.userId !== user.id)) {
      return NextResponse.json(errorResponse('بيانات تسجيل الدخول غير صحيحة'), { status: 401 })
    }

    if (activationKey.status === 'suspended') {
      return NextResponse.json(errorResponse(ACCOUNT_SUSPENDED_MESSAGE), { status: 403 })
    }

    if (activationKey.status === 'revoked') {
      return NextResponse.json(errorResponse('تم إلغاء هذا السيريال'), { status: 403 })
    }

    if (activationKey.status === 'expired' || isKeyExpired(activationKey.expiresAt)) {
      return NextResponse.json(errorResponse('انتهت صلاحية هذا السيريال'), { status: 403 })
    }

    if (!['active', 'available', 'assigned'].includes(activationKey.status)) {
      return NextResponse.json(errorResponse('هذا السيريال غير متاح للاستخدام حالياً'), { status: 403 })
    }

    const activeDevices = activationKey.devices.filter((device) => device.isActive)
    const existingDevice = activeDevices.find((device) => device.deviceFingerprint === deviceFingerprint)
    const inactiveDevice = activationKey.devices.find((device) => !device.isActive && device.deviceFingerprint === deviceFingerprint)

    const otherActiveDevice = activeDevices.find((d) => d.deviceFingerprint !== deviceFingerprint)

    let deviceId: number | string = existingDevice?.id || inactiveDevice?.id || ''
    const sessionId = signSessionToken({
      userId: user.id,
      keyId: activationKey.id,
      deviceId: deviceId || deviceFingerprint,
      fingerprint: deviceFingerprint
    })

    await prisma.$transaction(async (tx) => {
      if (!activationKey.userId || activationKey.status === 'available' || activationKey.status === 'assigned') {
        await tx.activationKey.update({
          where: { id: activationKey.id },
          data: {
            userId: user.id,
            status: 'active',
            activatedAt: activationKey.activatedAt || new Date(),
            expiresAt: activationKey.expiresAt || getActivationExpiry()
          }
        })
      }

      if (existingDevice) {
        await tx.device.update({
          where: { id: existingDevice.id },
          data: { lastSeenAt: new Date() }
        })
      } else if (inactiveDevice) {
        if (activeDevices.length >= activationKey.maxDevices) {
          throw new Error(`DEVICE_LIMIT:${activationKey.maxDevices}`)
        }

        await tx.device.update({
          where: { id: inactiveDevice.id },
          data: { isActive: true, lastSeenAt: new Date() }
        })
      } else {
        if (activeDevices.length >= activationKey.maxDevices) {
          throw new Error(`DEVICE_LIMIT:${activationKey.maxDevices}`)
        }

        const device = await tx.device.create({
          data: {
            userId: user.id,
            keyId: activationKey.id,
            deviceFingerprint,
            deviceName: deviceInfo?.hostname,
            osInfo: deviceInfo?.platform ? `${deviceInfo.platform} ${deviceInfo.arch || ''}`.trim() : undefined,
            cpuInfo: deviceInfo?.cpu,
            ramInfo: deviceInfo?.ram,
            gpuInfo: deviceInfo?.gpu,
            screenResolution: deviceInfo?.screenResolution
          }
        })
        deviceId = device.id
      }

      const logDetails: Record<string, string | number | boolean | object | null> = {
        keyId: activationKey.id,
        deviceId: deviceId || deviceFingerprint,
        fingerprint: deviceFingerprint.slice(0, 16) + '...'
      }

      if (otherActiveDevice && !existingDevice) {
        logDetails.warning = 'NEW_DEVICE_ON_ACTIVE_KEY'
        logDetails.existingDevices = activeDevices.map(d => ({ id: d.id, fp: d.deviceFingerprint.slice(0, 16) + '...' }))
      }
      logDetails.token = sessionId

      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'desktop_login',
          details: logDetails as any,
          ipAddress
        }
      })
    })

    return NextResponse.json(successResponse({
      token: sessionId,
      email: user.email,
      role: user.role === 'admin' ? 'admin' : 'customer',
      key: activationKey.keyCode,
      status: 'active',
      expiryDate: activationKey.expiresAt?.toISOString() || '',
      deviceId: String(deviceId || deviceFingerprint)
    }, 'تم تسجيل الدخول بنجاح'))
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.startsWith('DEVICE_LIMIT:')) {
      const limit = message.split(':')[1]
      return NextResponse.json(errorResponse(`تم تجاوز الحد الأقصى للأجهزة (${limit}). أعد تعيين جهاز أولاً`), { status: 403 })
    }

    console.error('Desktop login error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
