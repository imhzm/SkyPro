'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { Monitor, Cpu, Calendar } from 'lucide-react'
import DeviceResetButton from '@/components/dashboard/DeviceResetButton'

export default async function DevicesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const userId = Number(session.user.id)

  const [devices, key] = await Promise.all([
    prisma.device.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { lastSeenAt: 'desc' }],
    }),
    prisma.activationKey.findFirst({
      where: { userId, status: { in: ['active', 'available', 'assigned'] } },
      orderBy: { createdAt: 'desc' },
      select: { keyCode: true, maxDevices: true },
    }),
  ])

  const activeCount = devices.filter((d) => d.isActive).length
  const maxDevices = key?.maxDevices ?? 1

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">الأجهزة المتصلة</h1>
        <p className="text-slate-400 mt-1">
          {activeCount}/{maxDevices} جهاز نشط ضمن اشتراكك الحالي
        </p>
      </div>

      {devices.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-10 text-center">
          <Monitor className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">لم تسجّل دخولاً من أي جهاز بعد</p>
          <p className="text-slate-500 text-xs mt-1">
            استخدم بريدك الإلكتروني وكلمة المرور (أو السيريال) في تطبيق SkyPro Desktop.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {devices.map((d) => (
            <div
              key={d.id}
              className={`bg-white/[0.03] border rounded-2xl p-5 flex items-start gap-4 ${
                d.isActive ? 'border-emerald-500/20' : 'border-white/8 opacity-60'
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                d.isActive ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-slate-500/15 border border-slate-500/20'
              }`}>
                <Monitor className={`w-5 h-5 ${d.isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-white font-semibold text-sm truncate">
                    {d.deviceName || 'جهاز غير معروف'}
                  </h3>
                  {d.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      نشط
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 border border-slate-500/20 text-slate-400">
                      مفصول
                    </span>
                  )}
                </div>

                <p className="text-slate-500 text-xs mt-0.5">{d.osInfo || 'نظام تشغيل غير معروف'}</p>

                <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-500 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> {d.cpuInfo?.slice(0, 35) || '—'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> آخر استخدام: {new Date(d.lastSeenAt).toLocaleDateString('ar-EG')}
                  </span>
                  {d.resetCount > 0 && (
                    <span className="text-amber-400">{d.resetCount} مرة إعادة تعيين هذا العام</span>
                  )}
                </div>
              </div>

              {d.isActive && key && (
                <DeviceResetButton
                  keyCode={key.keyCode}
                  deviceFingerprint={d.deviceFingerprint}
                  resetCount={d.resetCount}
                  maxResets={d.maxResetsPerYear}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-sky-500/5 border border-sky-500/15 rounded-2xl p-5 text-sm text-slate-300 leading-relaxed">
        <strong className="text-sky-300">ملاحظة:</strong> يمكنك إعادة تعيين الجهاز حتى{' '}
        <strong>{devices[0]?.maxResetsPerYear ?? 2} مرات</strong> في السنة. إعادة التعيين تفصل الجهاز
        وتسمح لك بتسجيل الدخول من جهاز جديد.
      </div>
    </div>
  )
}
