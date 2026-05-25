'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, Ban, CreditCard, DollarSign, Key, Monitor, RefreshCw, ShieldCheck, Users } from 'lucide-react'

interface Stats {
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  deletedUsers: number
  totalKeys: number
  availableKeys: number
  activeKeys: number
  suspendedKeys: number
  expiredKeys: number
  revokedKeys: number
  activeDevices: number
  inactiveDevices: number
  totalSubscriptions: number
  activeSubscriptions: number
  trialSubscriptions: number
  suspendedSubscriptions: number
  totalRevenue: number
  monthlyRevenue: number
  recentUsers: Array<{ id: number; email: string; name: string | null; status: string; createdAt: string }>
  recentAuditLogs: Array<{
    id: number
    action: string
    createdAt: string
    user: { email: string; name: string | null } | null
  }>
  autoExpire?: { expiredKeys: number; expiredSubscriptions: number; disabledDevices: number }
  generatedAt?: string
}

// Auto-refresh interval bumped from 15s → 60s. With 19+ parallel Prisma
// queries on every request, 15s was hammering the DB unnecessarily.
// 60s is still real-time enough for an admin dashboard while reducing
// load by 4×. Users can always click the manual refresh button.
const REFRESH_INTERVAL_MS = 60_000

const statusLabel: Record<string, string> = {
  active: 'نشط',
  suspended: 'محظور',
  deleted: 'محذوف'
}

const actionLabel: Record<string, string> = {
  login: 'تسجيل دخول',
  register: 'تسجيل مستخدم',
  register_google: 'تسجيل Google',
  create_user: 'إنشاء مستخدم',
  update_user: 'تحديث مستخدم',
  suspend_user: 'حظر مستخدم',
  activate_user: 'فك حظر',
  delete_user: 'حذف مستخدم',
  admin_generate_keys: 'إنشاء مفاتيح',
  admin_reset_device: 'إعادة تعيين جهاز',
  admin_revoke_key: 'إلغاء مفتاح',
  admin_update_key: 'تحديث مفتاح',
  admin_grant_access: 'فتح اشتراك لعميل',
  update_subscription: 'تحديث اشتراك',
  update_setting: 'تحديث إعداد',
  bulk_update_settings: 'تحديث إعدادات',
  create_invoice: 'إنشاء فاتورة',
  update_invoice: 'تحديث فاتورة',
  create_payment: 'تسجيل دفعة',
  update_payment: 'تحديث دفعة',
  hard_delete_user: 'حذف نهائي لمستخدم',
  auto_expire_sweep: 'انتهاء سيريالات تلقائي',
  create_offer: 'إضافة عرض',
  update_offer: 'تحديث عرض',
  delete_offer: 'حذف عرض',
}

function statusBadge(status: string) {
  if (status === 'active') return 'admin-badge-success'
  if (status === 'suspended' || status === 'deleted') return 'admin-badge-danger'
  return 'admin-badge-warning'
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState('')
  const liveRef = useRef(true)

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' })
      const data = await res.json()
      if (data?.success) {
        setStats(data.data)
        setLastUpdated(new Date())
        setError('')
      } else {
        setError(data?.error || 'فشل تحميل البيانات')
      }
    } catch {
      setError('فشل الاتصال بالخادم')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
    // Live auto-refresh every 15s, but pause when the tab is hidden.
    const tick = () => {
      if (liveRef.current && !document.hidden) load(false)
    }
    const handle = setInterval(tick, REFRESH_INTERVAL_MS)
    const onVis = () => {
      if (!document.hidden) load(false)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(handle)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
      </div>
    )
  }

  if (!stats) {
    return <div className="py-20 text-center text-slate-500">فشل تحميل البيانات</div>
  }

  const cards = [
    {
      label: 'المستخدمون',
      value: stats.totalUsers,
      icon: Users,
      color: 'from-sky-500 to-blue-600',
      sub: `${stats.activeUsers} نشط / ${stats.suspendedUsers} محظور`
    },
    {
      label: 'المفاتيح',
      value: stats.totalKeys,
      icon: Key,
      color: 'from-emerald-500 to-green-600',
      sub: `${stats.activeKeys} مفعل / ${stats.availableKeys} متاح / ${stats.suspendedKeys} محظور`
    },
    {
      label: 'الأجهزة',
      value: stats.activeDevices,
      icon: Monitor,
      color: 'from-violet-500 to-purple-600',
      sub: `${stats.inactiveDevices} غير نشط`
    },
    {
      label: 'الاشتراكات',
      value: stats.totalSubscriptions,
      icon: CreditCard,
      color: 'from-amber-500 to-orange-600',
      sub: `${stats.activeSubscriptions} نشط / ${stats.trialSubscriptions} تجريبي / ${stats.suspendedSubscriptions} معلق`
    },
    {
      label: 'الإيراد الإجمالي',
      value: `${stats.totalRevenue.toLocaleString('ar-EG')} ج.م`,
      icon: DollarSign,
      color: 'from-rose-500 to-pink-600',
      sub: `${stats.monthlyRevenue.toLocaleString('ar-EG')} ج.م شهريًا`
    },
    {
      label: 'حالة النظام',
      value: stats.suspendedUsers + stats.suspendedKeys + stats.revokedKeys,
      icon: Activity,
      color: 'from-indigo-500 to-indigo-600',
      sub: `${stats.expiredKeys} مفتاح منتهي / ${stats.deletedUsers} حساب محذوف`
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-slate-400">
            ملخص التشغيل، الحسابات، المفاتيح، الاشتراكات، وآخر أحداث النظام.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{
              background: 'rgba(34, 197, 94, 0.10)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              color: '#86efac',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: '#22c55e',
                boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                animation: 'sw-pulse 2s ease-in-out infinite',
              }}
            />
            مباشر
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-slate-500">
              آخر تحديث: {lastUpdated.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="admin-btn-secondary !py-1.5 flex items-center gap-2"
            title="تحديث الآن"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            تحديث
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Auto-expire summary (only shown when something actually expired in last fetch) */}
      {stats.autoExpire && (stats.autoExpire.expiredKeys > 0 || stats.autoExpire.expiredSubscriptions > 0) && (
        <div
          className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2"
          style={{
            background: 'rgba(245, 158, 11, 0.10)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            color: '#fcd34d',
          }}
        >
          <Activity size={14} />
          تم تنظيف تلقائي:
          <strong className="text-amber-200">{stats.autoExpire.expiredKeys}</strong> مفتاح منتهي ·
          <strong className="text-amber-200">{stats.autoExpire.expiredSubscriptions}</strong> اشتراك منتهي ·
          <strong className="text-amber-200">{stats.autoExpire.disabledDevices}</strong> جهاز معطّل
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="admin-card">
            <div className="mb-3 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${card.color} shadow-lg`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-400">{card.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            <div className="mt-1 text-xs text-slate-500">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="admin-card">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <h2 className="text-lg font-bold text-white">آخر المستخدمين</h2>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الحالة</th>
                  <th>تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="font-medium text-white">{user.name || 'بدون اسم'}</div>
                      <div className="mt-1 text-xs text-slate-400" dir="ltr">{user.email}</div>
                    </td>
                    <td>
                      <span className={statusBadge(user.status)}>{statusLabel[user.status] || user.status}</span>
                    </td>
                    <td className="text-slate-500">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-card">
          <div className="mb-4 flex items-center gap-2">
            <Ban size={18} className="text-red-400" />
            <h2 className="text-lg font-bold text-white">آخر أحداث الأدمن</h2>
          </div>
          <div className="space-y-3">
            {stats.recentAuditLogs.map((log) => (
              <div key={log.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">{actionLabel[log.action] || log.action}</span>
                  <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
                </div>
                <div className="mt-1 truncate text-xs text-slate-400" dir="ltr">
                  {log.user?.email || 'system'}
                </div>
              </div>
            ))}
            {stats.recentAuditLogs.length === 0 && (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
                لا توجد أحداث مسجلة.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatusStrip label="حسابات محظورة" value={stats.suspendedUsers} tone="danger" />
        <StatusStrip label="مفاتيح محظورة أو ملغية" value={stats.suspendedKeys + stats.revokedKeys} tone="warning" />
        <StatusStrip label="اشتراكات معلقة" value={stats.suspendedSubscriptions} tone="info" />
      </div>
    </div>
  )
}

function StatusStrip({ label, value, tone }: { label: string; value: number; tone: 'danger' | 'warning' | 'info' }) {
  const toneClass = {
    danger: 'border-red-500/20 bg-red-500/10 text-red-300',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    info: 'border-sky-500/20 bg-sky-500/10 text-sky-300'
  }[tone]

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="text-sm opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value.toLocaleString('ar-EG')}</div>
    </div>
  )
}
