import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const allowedSettingKeys = [
  'trial_days',
  'max_devices',
  'max_resets_per_year',
  'key_price',
  'key_currency',
  'key_duration_days'
] as const

const numericSettingKeys = new Set(['trial_days', 'max_devices', 'max_resets_per_year', 'key_price', 'key_duration_days'])

const settingSchema = z.object({
  key: z.enum(allowedSettingKeys),
  value: z.string().trim().min(1).max(40)
})

const bulkSettingsSchema = z.object({
  settings: z.record(z.enum(allowedSettingKeys), z.string().trim().min(1).max(40))
})

function validateSettingValue(key: string, value: string) {
  if (numericSettingKeys.has(key)) {
    const numberValue = Number(value)
    return Number.isFinite(numberValue) && numberValue > 0
  }

  if (key === 'key_currency') {
    return /^[A-Z]{3}$/.test(value)
  }

  return true
}

export async function GET() {
  try {
    const guard = await requireAdmin()
    if (guard.response) return guard.response

    const settings = await prisma.systemSetting.findMany({
      where: { settingKey: { in: [...allowedSettingKeys] } }
    })
    const map: Record<string, string> = {}
    settings.forEach((s) => { map[s.settingKey] = s.settingValue || '' })

    return NextResponse.json({ success: true, data: map })
  } catch (err) {
    console.error('Get settings error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 8 * 1024)
    if (largePayload) return largePayload

    const body = await req.json()

    const bulkParsed = bulkSettingsSchema.safeParse(body)
    if (bulkParsed.success) {
      const incomingSettings = Object.entries(bulkParsed.data.settings)
      for (const [key, value] of incomingSettings) {
        if (!validateSettingValue(key, value)) {
          return NextResponse.json(errorResponse(`قيمة الإعداد غير صحيحة: ${key}`), { status: 400 })
        }
      }

      await prisma.$transaction(
        incomingSettings.map(([key, value]) =>
          prisma.systemSetting.upsert({
            where: { settingKey: key },
            update: { settingValue: value },
            create: { settingKey: key, settingValue: value }
          })
        )
      )

      await prisma.auditLog.create({
        data: {
          userId: Number(guard.session?.user.id),
          action: 'bulk_update_settings',
          details: { updatedKeys: incomingSettings.map(([key]) => key) },
          ipAddress: getClientIp(req)
        }
      })

      return NextResponse.json({
        success: true,
        message: 'تم حفظ الإعدادات بنجاح',
        data: Object.fromEntries(incomingSettings)
      })
    }

    const parsed = settingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(errorResponse('إعداد غير صالح'), { status: 400 })
    }

    const { key, value } = parsed.data
    if (!validateSettingValue(key, value)) {
      return NextResponse.json(errorResponse('قيمة الإعداد غير صحيحة'), { status: 400 })
    }

    const setting = await prisma.systemSetting.upsert({
      where: { settingKey: key },
      update: { settingValue: value },
      create: { settingKey: key, settingValue: value }
    })

    await prisma.auditLog.create({
      data: {
        userId: Number(guard.session?.user.id),
        action: 'update_setting',
        details: { key, value },
        ipAddress: getClientIp(req)
      }
    })

    return NextResponse.json({ success: true, data: setting })
  } catch (err) {
    console.error('Save setting error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
