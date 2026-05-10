'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Activity, MapPin, Calendar, LogIn, Shield, Key, Monitor, RefreshCw } from 'lucide-react'

const ACTION_LABELS: Record<string, { label: string; tone: string }> = {
  login: { label: 'تسجيل دخول', tone: 'sky' },
  login_google: { label: 'تسجيل دخول بـ Google', tone: 'sky' },
  register: { label: 'إنشاء الحساب', tone: 'emerald' },
  register_google: { label: 'إنشاء بـ Google', tone: 'emerald' },
  password_changed: { label: 'تغيير كلمة المرور', tone: 'amber' },
  '2fa_enabled': { label: 'تفعيل 2FA', tone: 'emerald' },
  '2fa_disabled': { label: 'تعطيل 2FA', tone: 'red' },
  device_reset: { label: 'إعادة تعيين جهاز', tone: 'amber' },
  desktop_login: { label: 'دخول من Desktop', tone: 'sky' },
  email_changed: { label: 'تغيير البريد الإلكتروني', tone: 'amber' },
  account_self_deleted: { label: 'حذف الحساب', tone: 'red' },
}

const TONE_CLS: Record<string, string> = {
  sky: 'text-sky-300 bg-sky-500/10 border-sky-500/25',
  emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25',
  amber: 'text-amber-300 bg-amber-500/10 border-amber-500/25',
  red: 'text-red-300 bg-red-500/10 border-red-500/25',
  slate: 'text-slate-300 bg-slate-500/10 border-slate-500/25',
}

const ICON_FOR_ACTION: Record<string, React.ComponentType<{ className?: string }>> = {
  login: LogIn,
  login_google: LogIn,
  password_changed: Key,
  '2fa_enabled': Shield,
  '2fa_disabled': Shield,
  device_reset: RefreshCw,
  desktop_login: Monitor,
}

export default async function ActivityPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')
  const userId = Number(session.user.id)

  const events = await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">سجل النشاط</h1>
        <p className="text-slate-400 text-sm mt-1">
          آخر {events.length} حدث على حسابك. استخدم هذا السجل لاكتشاف أي نشاط مريب.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-10 text-center">
          <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">لا يوجد نشاط مسجل بعد.</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02] text-slate-400 text-xs">
              <tr>
                <th className="text-right px-4 py-3 font-semibold">الحدث</th>
                <th className="text-right px-4 py-3 font-semibold">التاريخ</th>
                <th className="text-right px-4 py-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const baseAction = e.action.startsWith('security:') ? e.action.slice(9) : e.action
                const meta = ACTION_LABELS[baseAction] ?? { label: baseAction, tone: 'slate' }
                const Icon = ICON_FOR_ACTION[baseAction] ?? Activity
                return (
                  <tr key={e.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg border ${TONE_CLS[meta.tone] ?? TONE_CLS.slate}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-white font-medium">{meta.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <time dateTime={e.createdAt.toISOString()}>
                          {e.createdAt.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                        </time>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {e.ipAddress ? (
                        <code className="font-mono text-xs flex items-center gap-1.5" dir="ltr">
                          <MapPin className="w-3 h-3" />
                          {e.ipAddress}
                        </code>
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-amber-500/[0.05] border border-amber-500/20 rounded-2xl p-5 text-sm text-slate-300">
        <strong className="text-amber-300">نصيحة:</strong> إذا رأيت نشاطاً لا تعرفه (تسجيل دخول من جهاز/IP غريب)،
        غيّر كلمة المرور فوراً وفعّل التحقق بخطوتين من{' '}
        <a href="/dashboard/settings" className="text-sky-400 hover:text-sky-300">الإعدادات</a>.
      </div>
    </div>
  )
}
