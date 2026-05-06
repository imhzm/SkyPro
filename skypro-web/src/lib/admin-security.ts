import { NextRequest, NextResponse } from 'next/server'
import type { Session } from 'next-auth'
import { auth } from '@/lib/auth'
import { errorResponse } from '@/lib/api'
import { checkRateLimit, getClientIp, rateLimitedResponse, sameOrigin } from '@/lib/request-security'

export { getClientIp }

type AdminSession = Session | null

interface AdminGuardResult {
  session: AdminSession
  response: NextResponse | null
}

export async function requireAdmin(req?: NextRequest, options: { stateChanging?: boolean } = {}): Promise<AdminGuardResult> {
  const session = await auth()

  if (!session?.user || session.user.role !== 'admin' || (session.user as { status?: string }).status !== 'active') {
    return {
      session,
      response: NextResponse.json(errorResponse('غير مصرح'), { status: 403 }),
    }
  }

  if (options.stateChanging && req && !sameOrigin(req)) {
    return {
      session,
      response: NextResponse.json(errorResponse('تم رفض الطلب لأسباب أمنية'), { status: 403 }),
    }
  }

  if (options.stateChanging && req) {
    const adminId = String(session.user.id || 'unknown')
    const limit = checkRateLimit(`admin:mutation:${adminId}:${getClientIp(req)}`, 120, 15 * 60 * 1000)
    if (!limit.allowed) {
      return {
        session,
        response: rateLimitedResponse(limit.retryAfter),
      }
    }
  }

  return { session, response: null }
}
