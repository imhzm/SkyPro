'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import {
  Key, Calendar, Monitor, Clock, ArrowUpRight,
  CheckCircle2, AlertCircle, XCircle, Download
} from 'lucide-react'
import CopyButton from '@/components/dashboard/CopyButton'
import RenewButton from '@/components/dashboard/RenewButton'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    trial:   { label: 'تجربة مجانية', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',     icon: <Clock className="w-3.5 h-3.5" /> },
    active:  { label: 'نشط',          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    expired: { label: 'منتهي',        color: 'text-red-400 bg-red-500/10 border-red-500/20',     icon: <XCircle className="w-3.5 h-3.5" /> },
    pending_email: { label: 'في انتظار التفعيل', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  }
  const cfg = map[status] ?? map['expired']
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function getDaysLeft(expiresAt: Date | null) {
  if (!expiresAt) return null
  const diff = expiresAt.getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default async function DashboardPage() {
  const session = await auth()
  // Layout already enforces auth, but re-check defensively for type safety.
  if (!session?.user?.id) redirect('/auth/login')

  const userId = Number(session.user.id)

  const [subscription, devices] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId },
      include: { key: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.device.findMany({
      where: { userId, isActive: true },
      orderBy: { lastSeenAt: 'desc' },
      take: 3,
    }),
  ])

  const serial   = subscription?.key?.keyCode ?? null
  const status   = subscription?.status ?? 'expired'
  const expiresAt = subscription?.expiresAt ?? null
  const daysLeft = getDaysLeft(expiresAt)
  const isExpired = daysLeft !== null && daysLeft === 0
  const isTrial  = status === 'trial'

  const expiryFormatted = expiresAt
    ? expiresAt.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'غير متاح'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
        <p className="text-slate-400 mt-1">إدارة اشتراكك وأجهزتك في SkyPro</p>
      </div>

      {/* Trial / Expiry Warning Banner */}
      {isTrial && daysLeft !== null && daysLeft <= 2 && !isExpired && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-amber-300 text-sm">
            تجربتك المجانية تنتهي خلال <strong>{daysLeft === 0 ? 'اليوم' : `${daysLeft} يوم`}</strong>. قم بترقية حسابك للاستمرار.
          </p>
          <RenewButton className="mr-auto shrink-0" />
        </div>
      )}
      {isExpired && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/25 rounded-2xl p-4">
          <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">
            انتهت صلاحية اشتراكك. جدّد الآن لاستعادة الوصول الكامل لبرنامج SkyPro.
          </p>
          <RenewButton className="mr-auto shrink-0" />
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Serial Key Card */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-2 bg-white/[0.03] border border-white/8 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/15 transition-all duration-700" />
          <div className="relative">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
              <Key className="w-4 h-4 text-sky-400" />
              السيريال كود (Serial Key)
            </div>
            {serial ? (
              <div className="flex items-center gap-3">
                <code className="text-sky-300 text-xl font-mono font-bold tracking-widest break-all flex-1">
                  {serial}
                </code>
                <CopyButton text={serial} />
              </div>
            ) : (
              <p className="text-slate-500 text-sm">لا يوجد سيريال مرتبط بحسابك حالياً. تواصل مع الدعم.</p>
            )}
            <p className="text-slate-500 text-xs mt-3">
              استخدم هذا الكود في تطبيق SkyPro على جهازك
            </p>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/15 transition-all duration-700" />
          <div className="relative">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
              <Calendar className="w-4 h-4 text-violet-400" />
              حالة الاشتراك
            </div>
            <StatusBadge status={status} />
            <p className="text-white font-semibold mt-3">{expiryFormatted}</p>
            <p className="text-slate-500 text-xs mt-1">
              {daysLeft !== null ? (isExpired ? 'الاشتراك منتهي' : `متبقي ${daysLeft} يوم`) : 'بدون تاريخ انتهاء'}
            </p>
          </div>
        </div>

        {/* Active Devices Card */}
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
            <Monitor className="w-4 h-4 text-emerald-400" />
            الأجهزة المتصلة
          </div>
          {devices.length > 0 ? (
            <div className="space-y-2">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-3 py-2">
                  <Monitor className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-white text-xs font-medium truncate">{d.deviceName ?? 'جهاز غير معروف'}</p>
                    <p className="text-slate-500 text-[11px] truncate">{d.osInfo ?? ''}</p>
                  </div>
                  <span className="mr-auto w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">لم تقم بتسجيل الدخول من أي جهاز بعد.</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="col-span-1 sm:col-span-2 bg-white/[0.03] border border-white/8 rounded-2xl p-6">
          <p className="text-slate-400 text-sm mb-4">إجراءات سريعة</p>
          <div className="flex flex-wrap gap-3">
            <RenewButton />
            <a
              href={process.env.DESKTOP_APP_DOWNLOAD_URL ?? '#'}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <Download className="w-4 h-4" />
              تحميل البرنامج
            </a>
            <a
              href="/dashboard/devices"
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all"
            >
              <Monitor className="w-4 h-4" />
              إدارة الأجهزة
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
