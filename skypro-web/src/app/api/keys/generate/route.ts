import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateKeysSchema } from '@/lib/validations'
import { generateApiKey } from '@/lib/utils'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { getClientIp, requireAdmin } from '@/lib/admin-security'
import { rejectLargeJson } from '@/lib/request-security'

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdmin(req, { stateChanging: true })
    if (guard.response) return guard.response

    const largePayload = rejectLargeJson(req, 16 * 1024)
    if (largePayload) return largePayload

    const parsed = generateKeysSchema.safeParse(await req.json())
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => e.message).join(', ')
      return NextResponse.json(errorResponse(errors), { status: 400 })
    }

    const { count, plan, durationDays, maxDevices } = parsed.data
    const keys = []
    for (let i = 0; i < count; i++) {
      const keyCode = generateApiKey()
      const key = await prisma.activationKey.create({
        data: {
          keyCode,
          plan,
          durationDays,
          maxDevices,
          status: 'available'
        }
      })
      keys.push(key)
    }

    await prisma.auditLog.create({
      data: {
        userId: parseInt(guard.session!.user.id),
        action: 'generate_keys',
        details: { count, plan, durationDays, maxDevices },
        ipAddress: getClientIp(req)
      }
    })

    return NextResponse.json(successResponse({ keys }, `تم إنشاء ${count} مفتاح بنجاح`))
  } catch (err) {
    console.error('Generate keys error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}
