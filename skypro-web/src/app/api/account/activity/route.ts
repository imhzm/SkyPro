import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { successResponse, errorResponse, getErrorMessage } from '@/lib/api'
import { checkRateLimit, getClientIp, rateLimitedResponse } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const ACTION_LABELS: Record<string, { label: string; icon: string; tone: string }> = {
  login: { label: 'تسجيل دخول', icon: 'log-in', tone: 'sky' },
  login_google: { label: 'تسجيل دخول عبر Google', icon: 'log-in', tone: 'sky' },
  register: { label: 'إنشاء الحساب', icon: 'user-plus', tone: 'emerald' },
  register_google: { label: 'إنشاء الحساب بـ Google', icon: 'user-plus', tone: 'emerald' },
  password_changed: { label: 'تغيير كلمة المرور', icon: 'key', tone: 'amber' },
  '2fa_enabled': { label: 'تفعيل التحقق بخطوتين', icon: 'shield-check', tone: 'emerald' },
  '2fa_disabled': { label: 'تعطيل التحقق بخطوتين', icon: 'shield-off', tone: 'red' },
  device_reset: { label: 'إعادة تعيين جهاز', icon: 'refresh-cw', tone: 'amber' },
  desktop_login: { label: 'دخول من تطبيق Desktop', icon: 'monitor', tone: 'sky' },
  verify_email: { label: 'تأكيد البريد الإلكتروني', icon: 'check', tone: 'emerald' },
  resend_verification_email: { label: 'إعادة إرسال رابط التحقق', icon: 'mail', tone: 'sky' },
  profile_updated: { label: 'تحديث البيانات الشخصية', icon: 'user', tone: 'sky' },
  account_self_deleted: { label: 'حذف الحساب', icon: 'trash', tone: 'red' },
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(errorResponse('غير مصرح'), { status: 401 })
    }
    const userId = Number(session.user.id)
    const ip = getClientIp(req)

    const rateLimit = checkRateLimit(`activity:${userId}`, 60, 60 * 60 * 1000)
    if (!rateLimit.allowed) return rateLimitedResponse(rateLimit.retryAfter)

    const limit = Math.min(50, Math.max(5, parseInt(req.nextUrl.searchParams.get('limit') || '15', 10)))

    const events = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        ipAddress: true,
        details: true,
        createdAt: true,
      },
    })

    const enriched = events.map((e) => {
      // Strip __chain meta from details (security implementation detail)
      const rawDetails = (e.details as Record<string, unknown> | null) ?? {}
      const details: Record<string, unknown> = { ...rawDetails }
      delete details.__chain

      // Strip "security:" prefix used by notifySecurityEvent
      const baseAction = e.action.startsWith('security:') ? e.action.slice(9) : e.action
      const meta = ACTION_LABELS[baseAction] ?? { label: baseAction, icon: 'activity', tone: 'slate' }

      return {
        id: e.id,
        action: baseAction,
        label: meta.label,
        icon: meta.icon,
        tone: meta.tone,
        ipAddress: e.ipAddress,
        createdAt: e.createdAt.toISOString(),
        relativeTime: relativeTime(e.createdAt),
      }
    })

    return NextResponse.json(successResponse({ events: enriched }))
  } catch (err) {
    console.error('Activity feed error:', err)
    return NextResponse.json(errorResponse(getErrorMessage(err)), { status: 500 })
  }
}

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `قبل ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `قبل ${h} ساعة`
  const d = Math.floor(h / 24)
  if (d < 7) return `قبل ${d} يوم`
  return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
}
