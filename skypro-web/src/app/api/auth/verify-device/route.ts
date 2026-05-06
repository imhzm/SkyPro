import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyDeviceSchema } from '@/lib/validations'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { isKeyExpired, getActivationExpiry } from '@/lib/utils'
import { checkRateLimit, getClientIp, rateLimitedResponse, rejectLargeJson } from '@/lib/request-security'

const MAX_VERIFY_DEVICE_ATTEMPT_BUCKETS = 10000
const verifyDeviceAttempts = new Map<string, { count: number; lockedUntil: number }>()

const ACCOUNT_SUSPENDED_MESSAGE = 'تم حظر حسابك من SkyPro. تم إيقاف الدخول إلى البرنامج، يرجى مراجعة بريدك الإلكتروني أو التواصل مع الدعم.'

export async function POST(req: NextRequest) {
  try {
    const largePayload = rejectLargeJson(req, 32 * 1024)
    if (largePayload) return largePayload

    const ipAddress = getClientIp(req)
    const ipLimit = checkRateLimit(`verify-device:ip:${ipAddress}`, 60, 15 * 60 * 1000)
    if (!ipLimit.allowed) return rateLimitedResponse(ipLimit.retryAfter)
    const attempt = verifyDeviceAttempts.get(ipAddress)
    if (attempt && attempt.lockedUntil > Date.now()) {
      return NextResponse.json(errorResponse('طلبات كثيرة من نفس الشبكة. حاول لاحقًا.'), { status: 429 })
    }
    if (attempt && attempt.lockedUntil <= Date.now()) verifyDeviceAttempts.delete(ipAddress)

    const body = await req.json()
    const parsed = verifyDeviceSchema.safeParse(body)

    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { key, deviceFingerprint, deviceInfo } = parsed.data
    const keyLimit = checkRateLimit(`verify-device:key:${key.slice(0, 24)}`, 30, 15 * 60 * 1000)
    if (!keyLimit.allowed) return rateLimitedResponse(keyLimit.retryAfter)

    const activationKey = await prisma.activationKey.findUnique({
      where: { keyCode: key },
      include: {
        devices: true,
        user: { select: { id: true, status: true } }
      }
    })

    if (!activationKey) {
      incrementVerifyAttempts(ipAddress)
      return NextResponse.json(errorResponse('مفتاح التفعيل غير صالح'), { status: 404 })
    }

    if (activationKey.user?.status === 'suspended' || activationKey.status === 'suspended') {
      return NextResponse.json(errorResponse(ACCOUNT_SUSPENDED_MESSAGE), { status: 403 })
    }

    if (activationKey.user && activationKey.user.status !== 'active') {
      return NextResponse.json(errorResponse('الحساب غير نشط. تواصل مع الدعم الفني'), { status: 403 })
    }

    if (activationKey.status === 'revoked') {
      incrementVerifyAttempts(ipAddress)
      return NextResponse.json(errorResponse('تم إلغاء هذا المفتاح'), { status: 403 })
    }

    if (activationKey.status === 'expired' || isKeyExpired(activationKey.expiresAt)) {
      incrementVerifyAttempts(ipAddress)
      return NextResponse.json(errorResponse('انتهت صلاحية هذا المفتاح'), { status: 403 })
    }

    const existingDevice = activationKey.devices.find(
      (d) => d.deviceFingerprint === deviceFingerprint && d.isActive
    )
    const inactiveDevice = activationKey.devices.find(
      (d) => d.deviceFingerprint === deviceFingerprint && !d.isActive
    )
    const activeDevices = activationKey.devices.filter((d) => d.isActive)

    if (existingDevice) {
      await prisma.device.update({
        where: { id: existingDevice.id },
        data: { lastSeenAt: new Date() }
      })
      verifyDeviceAttempts.delete(ipAddress)

      return NextResponse.json(successResponse({
        sessionId: existingDevice.id.toString(),
        key: {
          keyCode: activationKey.keyCode,
          status: 'active',
          expiresAt: activationKey.expiresAt,
          maxDevices: activationKey.maxDevices
        }
      }, 'تم التحقق من الجهاز بنجاح'))
    }

    if (inactiveDevice) {
      if (activeDevices.length >= activationKey.maxDevices) {
        return NextResponse.json(errorResponse(
          `تم الوصول للحد الأقصى من الأجهزة (${activationKey.maxDevices}). يرجى إعادة تعيين جهاز من لوحة التحكم.`
        ), { status: 403 })
      }

      await prisma.device.update({
        where: { id: inactiveDevice.id },
        data: { isActive: true, lastSeenAt: new Date() }
      })
      verifyDeviceAttempts.delete(ipAddress)

      return NextResponse.json(successResponse({
        sessionId: inactiveDevice.id.toString(),
        key: {
          keyCode: activationKey.keyCode,
          status: 'active',
          expiresAt: activationKey.expiresAt,
          maxDevices: activationKey.maxDevices
        }
      }, 'تم إعادة تفعيل الجهاز بنجاح'))
    }

    if (activeDevices.length >= activationKey.maxDevices) {
      return NextResponse.json(errorResponse(
        `تم تجاوز الحد الأقصى للأجهزة (${activationKey.maxDevices}). يرجى إعادة تعيين جهاز أولاً`
      ), { status: 403 })
    }

    if (activationKey.status === 'available') {
      await prisma.activationKey.update({
        where: { id: activationKey.id },
        data: {
          status: 'active',
          activatedAt: new Date(),
          expiresAt: getActivationExpiry()
        }
      })
    }

    if (!activationKey.userId) {
      return NextResponse.json(errorResponse('المفتاح غير مرتبط بحساب. استخدم تسجيل الدخول عبر التطبيق أولاً.'), { status: 403 })
    }

    const device = await prisma.device.create({
      data: {
        userId: activationKey.userId,
        keyId: activationKey.id,
        deviceFingerprint,
        deviceName: deviceInfo?.hostname,
        osInfo: deviceInfo?.platform ? `${deviceInfo.platform} ${deviceInfo.arch}` : undefined,
        cpuInfo: deviceInfo?.cpu,
        ramInfo: deviceInfo?.ram,
        gpuInfo: deviceInfo?.gpu,
        screenResolution: deviceInfo?.screenResolution
      }
    })

    if (activationKey.userId) {
      await prisma.auditLog.create({
        data: {
          userId: activationKey.userId,
          action: 'device_verified',
          details: { deviceFingerprint, deviceId: device.id },
          ipAddress
        }
      })
    }
    verifyDeviceAttempts.delete(ipAddress)

    return NextResponse.json(successResponse({
      sessionId: device.id.toString(),
      key: {
        keyCode: activationKey.keyCode,
        status: 'active',
        expiresAt: activationKey.expiresAt || getActivationExpiry(),
        maxDevices: activationKey.maxDevices
      }
    }, 'تم تسجيل الجهاز بنجاح'))
  } catch (err) {
    console.error('Verify device error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

function incrementVerifyAttempts(ip: string) {
  if (verifyDeviceAttempts.size > MAX_VERIFY_DEVICE_ATTEMPT_BUCKETS) {
    const now = Date.now()
    verifyDeviceAttempts.forEach((value, key) => {
      if (value.lockedUntil <= now) verifyDeviceAttempts.delete(key)
    })
    if (verifyDeviceAttempts.size > MAX_VERIFY_DEVICE_ATTEMPT_BUCKETS) {
      verifyDeviceAttempts.clear()
    }
  }

  const attempt = verifyDeviceAttempts.get(ip) || { count: 0, lockedUntil: 0 }
  attempt.count++
  if (attempt.count >= 15) {
    attempt.lockedUntil = Date.now() + 15 * 60 * 1000
  }
  verifyDeviceAttempts.set(ip, attempt)
}
