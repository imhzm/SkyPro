import { Suspense } from 'react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import {
  Key, Calendar, Monitor, Clock, ArrowUpRight,
  CheckCircle2, AlertCircle, XCircle, Mail, Receipt,
  CreditCard, Sparkles, Shield, TrendingUp,
} from 'lucide-react'
import CopyButton from '@/components/dashboard/CopyButton'
import DesktopDownloadButton from '@/components/dashboard/DesktopDownloadButton'
import RenewButton from '@/components/dashboard/RenewButton'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import WelcomeModal from '@/components/dashboard/WelcomeModal'

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

  const [
    subscription,
    devices,
    allKeys,
    recentInvoices,
    recentPayments,
    totalSpentAgg,
    deviceCount,
  ] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId },
      include: { key: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.device.findMany({
      where: { userId, isActive: true },
      orderBy: { lastSeenAt: 'desc' },
      take: 5,
    }),
    prisma.activationKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, keyCode: true, status: true, expiresAt: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: { userId, status: 'paid' },
      orderBy: { paidAt: 'desc' },
      take: 4,
      select: {
        id: true,
        amount: true,
        currency: true,
        method: true,
        paidAt: true,
      },
    }),
    prisma.payment.aggregate({
      where: { userId, status: 'paid' },
      _sum: { amount: true },
    }),
    prisma.device.count({ where: { userId } }),
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

  const totalSpent = Math.round((totalSpentAgg._sum.amount || 0) * 100) / 100
  const totalSpentCurrency = recentPayments[0]?.currency || 'EGP'
  const maxDevices = subscription?.key?.maxDevices ?? 1
  const activeDevicesCount = devices.length

  return (
    <div className="space-y-8">
      {/* Welcome Modal — shown only once after first-time registration */}
      <Suspense fallback={null}>
        <WelcomeModal serial={serial} email={session.user.email ?? null} />
      </Suspense>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
        <p className="text-slate-400 mt-1">إدارة اشتراكك وأجهزتك في SkyPro</p>
      </div>

      {/* Email Verification Pending Banner */}
      {status === 'pending_email' && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-amber-300 font-bold text-sm mb-1">في انتظار تأكيد البريد الإلكتروني</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                أرسلنا رسالة تحتوي على رابط التأكيد وبيانات التفعيل إلى بريدك. يرجى فتح بريدك الوارد والضغط على رابط التأكيد لتفعيل حسابك.
              </p>
              <div className="mt-3 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <p className="text-amber-200 text-xs font-medium">
                  لم تجد الرسالة؟ راجع قسم البريد غير المرغوب فيه (Spam / Junk) — في أغلب الأحيان تصل الرسالة هناك.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <DesktopDownloadButton />
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

      {/* Account Summary Strip (new) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryStat
          label="إجمالي المدفوع"
          value={totalSpent > 0 ? `${totalSpent.toLocaleString('ar-EG')} ${totalSpentCurrency}` : '—'}
          icon={CreditCard}
          tone="emerald"
        />
        <SummaryStat
          label="مفاتيح التفعيل"
          value={`${allKeys.length}`}
          sub={allKeys.length > 0 ? `${allKeys.filter((k) => k.status === 'active').length} نشط` : 'لا يوجد'}
          icon={Key}
          tone="sky"
        />
        <SummaryStat
          label="الأجهزة المتاحة"
          value={`${activeDevicesCount} / ${maxDevices}`}
          sub={deviceCount > activeDevicesCount ? `${deviceCount - activeDevicesCount} غير نشط` : 'الكل نشط'}
          icon={Monitor}
          tone="violet"
        />
        <SummaryStat
          label="حالة الحساب"
          value={status === 'active' ? 'نشط ✓' : status === 'trial' ? 'تجريبي' : 'منتهي'}
          sub={daysLeft !== null && !isExpired ? `${daysLeft} يوم متبقي` : 'يحتاج تجديد'}
          icon={Shield}
          tone={status === 'active' ? 'emerald' : status === 'trial' ? 'amber' : 'red'}
        />
      </div>

      {/* Recent Invoices + Payments side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Invoices */}
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-violet-400" />
              <h3 className="text-white font-semibold text-sm">آخر الفواتير</h3>
            </div>
            <a href="/dashboard/billing" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              عرض الكل <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          {recentInvoices.length === 0 ? (
            <p className="text-slate-500 text-sm py-6 text-center">لا توجد فواتير بعد.</p>
          ) : (
            <div className="space-y-2">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
                    <Receipt size={14} className="text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white font-mono truncate" dir="ltr">
                      {inv.invoiceNumber}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {new Date(inv.createdAt).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-sm font-bold text-white" dir="ltr">
                      {inv.totalAmount.toLocaleString('ar-EG')} {inv.currency}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        inv.status === 'paid'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                          : inv.status === 'overdue'
                            ? 'bg-red-500/15 text-red-300 border border-red-500/25'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                      }`}
                    >
                      {inv.status === 'paid' ? 'مدفوعة' : inv.status === 'overdue' ? 'متأخرة' : 'صادرة'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-semibold text-sm">آخر المدفوعات</h3>
            </div>
            <a href="/dashboard/billing" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              عرض الكل <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-slate-500 text-sm py-6 text-center">لا توجد مدفوعات بعد.</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={14} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white font-medium truncate">{p.method || 'دفعة'}</div>
                    <div className="text-[10px] text-slate-500">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString('ar-EG') : '—'}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-emerald-400 flex-shrink-0" dir="ltr">
                    {p.amount.toLocaleString('ar-EG')} {p.currency}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Key History */}
      {allKeys.length > 1 && (
        <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <h3 className="text-white font-semibold text-sm">تاريخ مفاتيح التفعيل</h3>
          </div>
          <div className="space-y-2">
            {allKeys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center flex-shrink-0">
                  <Key size={14} className="text-sky-400" />
                </div>
                <code className="text-[11px] font-mono text-slate-300 flex-1 truncate" dir="ltr">
                  {k.keyCode}
                </code>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                    k.status === 'active'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25'
                      : k.status === 'expired' || k.status === 'revoked'
                        ? 'bg-red-500/15 text-red-300 border border-red-500/25'
                        : 'bg-slate-500/15 text-slate-400 border border-slate-500/25'
                  }`}
                >
                  {k.status === 'active' ? 'نشط' : k.status === 'expired' ? 'منتهي' : k.status === 'revoked' ? 'ملغي' : k.status}
                </span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString('ar-EG') : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <ActivityFeed limit={10} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Helper: summary stat card                                          */
/* ------------------------------------------------------------------ */
function SummaryStat({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ComponentType<{ className?: string }>
  tone: 'emerald' | 'sky' | 'violet' | 'amber' | 'red'
}) {
  const toneStyles = {
    emerald: { ring: 'border-emerald-500/25', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    sky:     { ring: 'border-sky-500/25',     bg: 'bg-sky-500/10',     text: 'text-sky-400' },
    violet:  { ring: 'border-violet-500/25',  bg: 'bg-violet-500/10',  text: 'text-violet-400' },
    amber:   { ring: 'border-amber-500/25',   bg: 'bg-amber-500/10',   text: 'text-amber-400' },
    red:     { ring: 'border-red-500/25',     bg: 'bg-red-500/10',     text: 'text-red-400' },
  }[tone]
  return (
    <div className={`bg-white/[0.03] border ${toneStyles.ring} rounded-xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${toneStyles.bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${toneStyles.text}`} />
        </div>
        <p className="text-[10.5px] text-slate-400 font-medium">{label}</p>
      </div>
      <p className="text-lg font-bold text-white tracking-tight">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  )
}
