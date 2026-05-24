import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { platforms } from '../../data/platforms'
import { getPlatformGradient } from '../../data/platformGradients'
import type { PlatformId } from '../../types'
import {
  Activity, Database, Users, Loader2, Sparkles,
  LayoutDashboard, BarChart3, TrendingUp, Clock, ChevronLeft,
  Facebook, MessageCircle, Instagram, Twitter, Linkedin, Send,
  Music, Pin, Ghost, MessageSquare, Search, Mail, Globe,
} from 'lucide-react'
import ModuleHeader, { HeaderChip } from '../../components/common/ModuleHeader'
import OffersSection from '../../components/common/OffersSection'

// Map platform IDs to their lucide icons for rich, professional display.
const PLATFORM_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  facebook: Facebook,
  whatsapp: MessageCircle,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  telegram: Send,
  tiktok: Music,
  pinterest: Pin,
  snapchat: Ghost,
  threads: MessageSquare,
  reddit: MessageSquare,
  'google-maps': Search,
  olx: Search,
  'send-emails': Mail,
  'auto-point': Globe,
}

interface PlatformBreakdown {
  platform: string
  leads: number
  accounts: number
  campaigns: number
}

interface RecentLead {
  id: number
  platform: string
  name: string
  source: string
  created_at?: string
}

export default function DashboardModule() {
  const { setActivePlatform } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({ leads: 0, accounts: 0, campaigns: 0, activeAccounts: 0 })
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [breakdown, setBreakdown] = useState<PlatformBreakdown[]>([])
  const [last7Days, setLast7Days] = useState<{ date: string; count: number }[]>([])
  const [appVersion, setAppVersion] = useState('—')
  const [browserReady, setBrowserReady] = useState<boolean>(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // List of real social platforms (skip dashboard + non-social)
  const socialPlatforms = useMemo(
    () => platforms.filter((p) => !['dashboard', 'accounts', 'settings', 'security', 'account'].includes(p.id)),
    [],
  )

  const loadData = useCallback(async () => {
    setRefreshing(true)
    try {
      // 1. Top-level counts
      const [leadsRes, accountsRes, campaignsRes, activeAccRes] = await Promise.all([
        window.electronAPI.dbCount({ table: 'leads', filters: [] }).catch(() => ({ success: false, count: 0 })),
        window.electronAPI.dbCount({ table: 'accounts', filters: [] }).catch(() => ({ success: false, count: 0 })),
        window.electronAPI.dbCount({ table: 'campaigns', filters: [] }).catch(() => ({ success: false, count: 0 })),
        window.electronAPI.dbCount({ table: 'accounts', filters: [{ column: 'status', op: '=', value: 'active' }] }).catch(() => ({ success: false, count: 0 })),
      ])

      setStats({
        leads: leadsRes.count || 0,
        accounts: accountsRes.count || 0,
        campaigns: campaignsRes.count || 0,
        activeAccounts: activeAccRes.count || 0,
      })

      // 2. Recent leads (10 most recent — IPC handler ORDER BY id DESC already)
      const recentLeadsRes = await window.electronAPI.dbQuery({ table: 'leads', filters: [], limit: 10 }).catch(() => ({ success: false, data: [] }))
      const leads = ((recentLeadsRes as { success?: boolean; data?: unknown[] }).data as RecentLead[]) || []
      setRecentLeads(leads)

      // 3. Per-platform breakdown — count leads/accounts per platform
      const platformIds = socialPlatforms.map((p) => p.id)
      const breakdownResults = await Promise.all(
        platformIds.map(async (pid) => {
          const [pLeads, pAcc, pCamp] = await Promise.all([
            window.electronAPI.dbCount({ table: 'leads', filters: [{ column: 'platform', op: '=', value: pid }] }).catch(() => ({ success: false, count: 0 })),
            window.electronAPI.dbCount({ table: 'accounts', filters: [{ column: 'platform', op: '=', value: pid }] }).catch(() => ({ success: false, count: 0 })),
            window.electronAPI.dbCount({ table: 'campaigns', filters: [{ column: 'platform', op: '=', value: pid }] }).catch(() => ({ success: false, count: 0 })),
          ])
          return { platform: pid, leads: pLeads.count || 0, accounts: pAcc.count || 0, campaigns: pCamp.count || 0 }
        }),
      )
      setBreakdown(breakdownResults)

      // 4. Last-7-day activity sparkline — group leads by created_at day
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const recentForChart = await window.electronAPI.dbQuery({ table: 'leads', filters: [], limit: 5000 }).catch(() => ({ success: false, data: [] }))
      const allLeads = ((recentForChart as { data?: unknown[] }).data as RecentLead[]) || []
      const buckets: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        buckets[key] = 0
      }
      allLeads.forEach((l) => {
        if (!l.created_at) return
        const key = l.created_at.slice(0, 10)
        if (key in buckets) buckets[key]++
      })
      setLast7Days(Object.entries(buckets).map(([date, count]) => ({ date, count })))

      // 5. App version (real from main) — IPC returns { success, version?, data? }
      const verRes = await window.electronAPI.getAppVersion().catch(() => null)
      if (verRes?.success) {
        const v = (verRes as { version?: string; data?: string }).version || (verRes as { data?: string }).data || ''
        if (v) setAppVersion(v)
      }

      setBrowserReady(true)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('[Dashboard] load error:', err)
    }
    setLoading(false)
    setRefreshing(false)
  }, [socialPlatforms])

  useEffect(() => {
    loadData()
    // Auto-refresh every 30 seconds for live feel
    const handle = window.setInterval(loadData, 30000)
    return () => window.clearInterval(handle)
  }, [loadData])

  const platformInfo = (pid: string) => platforms.find((p) => p.id === pid)
  const platformLabel = (pid: string) => platformInfo(pid)?.name || pid
  const platformColor = (pid: string) => platformInfo(pid)?.color || '#64748b'

  // KPI cards — primary metrics shown at top
  const statCards = [
    {
      label: 'إجمالي السجلات المستخرجة',
      value: stats.leads.toLocaleString('en'),
      icon: Database,
      gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
      sub: `${last7Days.reduce((a, b) => a + b.count, 0)} هذا الأسبوع`,
    },
    {
      label: 'الحسابات المحفوظة',
      value: stats.accounts.toLocaleString('en'),
      icon: Users,
      gradient: 'linear-gradient(135deg, #22c55e, #16a34a)',
      sub: `${stats.activeAccounts} نشط`,
    },
    {
      label: 'الحملات',
      value: stats.campaigns.toLocaleString('en'),
      icon: BarChart3,
      gradient: 'linear-gradient(135deg, #8B2CF5, #FF4FD8)',
      sub: 'مجدولة وفعالة',
    },
    {
      label: 'المنصات المدعومة',
      value: `${socialPlatforms.length}+`,
      icon: Globe,
      gradient: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)',
      sub: 'فيسبوك، واتساب، وأكثر',
    },
  ]

  // Most-active platforms by lead count
  const topPlatforms = useMemo(
    () =>
      [...breakdown]
        .filter((b) => b.leads > 0 || b.accounts > 0)
        .sort((a, b) => b.leads + b.accounts - (a.leads + a.accounts))
        .slice(0, 5),
    [breakdown],
  )

  const maxChartCount = Math.max(...last7Days.map((d) => d.count), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-3" style={{ color: '#0A6CF1' }} />
          <p className="text-secondary-500 text-sm">جاري تحميل البيانات الحية...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="لوحة التحكم"
        subtitle={`بيانات لحية من قاعدة بياناتك المحلية · آخر تحديث ${lastRefresh.toLocaleTimeString('ar-EG')}`}
        icon={LayoutDashboard}
        meta={
          <>
            <HeaderChip>{socialPlatforms.length}+ منصة</HeaderChip>
            <HeaderChip>{stats.leads.toLocaleString('en')} سجل مستخرج</HeaderChip>
            <HeaderChip>{stats.activeAccounts} حساب نشط</HeaderChip>
          </>
        }
        action={
          <button
            type="button"
            onClick={loadData}
            disabled={refreshing}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-1.5 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.20), rgba(255,255,255,0.08))', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}
            title="تحديث الإحصائيات الآن"
          >
            <Activity size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'جاري التحديث...' : 'تحديث الآن'}
          </button>
        }
      />

      {/* Offers / Ads */}
      <OffersSection />

      {/* ============= KPI CARDS ============= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-default"
            style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226,232,240,0.6)' }}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                style={{ background: stat.gradient }}
              >
                <stat.icon size={18} className="text-white" />
              </div>
              {stat.sub && (
                <span className="text-[10px] font-medium text-secondary-500 px-2 py-0.5 rounded-full bg-secondary-100">
                  {stat.sub}
                </span>
              )}
            </div>
            <div className="text-2xl font-extrabold text-secondary-900 tracking-tight">{stat.value}</div>
            <div className="text-[12px] text-secondary-600 mt-0.5 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ============= ROW: Activity chart + Top platforms ============= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 7-day activity sparkline */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226,232,240,0.6)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <TrendingUp size={14} className="text-emerald-600" />
                <h3 className="font-bold text-secondary-900 text-sm">نشاط آخر 7 أيام</h3>
              </div>
              <p className="text-[11px] text-secondary-500">عدد السجلات المستخرجة يومياً</p>
            </div>
            <div className="text-left">
              <div className="text-xl font-extrabold text-emerald-600">{last7Days.reduce((a, b) => a + b.count, 0)}</div>
              <div className="text-[10px] text-secondary-500">إجمالي الأسبوع</div>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-32">
            {last7Days.map((day, i) => {
              const heightPct = (day.count / maxChartCount) * 100
              const dayName = new Date(day.date).toLocaleDateString('ar-EG', { weekday: 'short' })
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group cursor-default">
                  <div className="text-[9px] font-semibold text-secondary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    {day.count}
                  </div>
                  <div className="w-full flex flex-col justify-end flex-1">
                    <div
                      className="w-full rounded-t-lg transition-all duration-500 group-hover:scale-110"
                      style={{
                        height: `${Math.max(heightPct, 4)}%`,
                        background: day.count > 0 ? 'linear-gradient(180deg, #10b981, #059669)' : 'rgba(148,163,184,0.2)',
                        boxShadow: day.count > 0 ? '0 4px 12px rgba(16,185,129,0.25)' : 'none',
                      }}
                    />
                  </div>
                  <div className="text-[10px] text-secondary-500 mt-1">{dayName}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top platforms by activity */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226,232,240,0.6)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <Sparkles size={14} className="text-violet-600" />
                <h3 className="font-bold text-secondary-900 text-sm">أنشط المنصات</h3>
              </div>
              <p className="text-[11px] text-secondary-500">ترتيب حسب البيانات + الحسابات</p>
            </div>
          </div>
          {topPlatforms.length === 0 ? (
            <div className="text-center py-10">
              <Activity size={28} className="mx-auto mb-2 text-secondary-300" />
              <p className="text-sm text-secondary-500">لا يوجد نشاط بعد — ابدأ بإضافة حساب أو استخراج بيانات</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {topPlatforms.map((p) => {
                const PIcon = PLATFORM_ICONS[p.platform] || Globe
                const gradient = getPlatformGradient(p.platform)
                const color = platformColor(p.platform)
                const total = p.leads + p.accounts
                const maxTotal = Math.max(...topPlatforms.map((tp) => tp.leads + tp.accounts), 1)
                const fillPct = (total / maxTotal) * 100
                return (
                  <button
                    key={p.platform}
                    onClick={() => setActivePlatform(p.platform as PlatformId)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl text-right transition-all hover:bg-secondary-50 hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                      style={{ background: gradient }}
                    >
                      <PIcon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-sm font-semibold text-secondary-900">{platformLabel(p.platform)}</span>
                        <span className="text-[11px] font-medium" style={{ color }}>
                          {p.leads} سجل · {p.accounts} حساب
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${fillPct}%`, background: gradient }}
                        />
                      </div>
                    </div>
                    <ChevronLeft size={14} className="text-secondary-400 flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============= ROW: Platforms grid + Recent activity + System status ============= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platforms grid */}
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226,232,240,0.6)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-secondary-900 text-sm mb-0.5">كل المنصات المتاحة</h2>
              <p className="text-[11px] text-secondary-500">انقر لفتح أي منصة والبدء فوراً</p>
            </div>
            <span className="badge badge-primary">{socialPlatforms.length} منصة</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {socialPlatforms.map((platform) => {
              const gradient = getPlatformGradient(platform.id)
              const PIcon = PLATFORM_ICONS[platform.id] || Globe
              const platformLeads = breakdown.find((b) => b.platform === platform.id)?.leads || 0
              const platformAccounts = breakdown.find((b) => b.platform === platform.id)?.accounts || 0
              return (
                <button
                  key={platform.id}
                  onClick={() => setActivePlatform(platform.id as PlatformId)}
                  className="group relative flex flex-col gap-2 p-3 rounded-xl text-right transition-all duration-200 hover:-translate-y-1 hover:shadow-lg overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(226,232,240,0.5)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = platform.color + '40'; e.currentTarget.style.boxShadow = `0 12px 28px ${platform.color}20` }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(226,232,240,0.5)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {/* Subtle background gradient on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
                    style={{ background: gradient }}
                  />
                  <div className="relative z-10 flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-all duration-200 group-hover:scale-110 shadow-md"
                      style={{ background: gradient }}
                    >
                      <PIcon size={18} />
                    </div>
                    {(platformLeads > 0 || platformAccounts > 0) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: gradient }}>
                        {platformLeads + platformAccounts}
                      </span>
                    )}
                  </div>
                  <div className="relative z-10 min-w-0">
                    <p className="text-sm font-bold text-secondary-900 truncate">{platform.name}</p>
                    <p className="text-[10px] text-secondary-500 truncate">{platform.segment}</p>
                    {(platformLeads > 0 || platformAccounts > 0) && (
                      <p className="text-[10px] text-secondary-600 mt-1 font-medium">
                        {platformLeads} سجل · {platformAccounts} حساب
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activity + System Status combined */}
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226,232,240,0.6)' }}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-secondary-900 text-sm flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" />
                آخر النشاطات
              </h3>
            </div>
            {recentLeads.length === 0 ? (
              <div className="text-center py-6">
                <Database size={24} className="mx-auto mb-1.5 text-secondary-300" />
                <p className="text-xs text-secondary-500">لا توجد نشاطات بعد</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto scroll-container pl-1">
                {recentLeads.slice(0, 8).map((item) => {
                  const gradient = getPlatformGradient(item.platform)
                  const PIcon = PLATFORM_ICONS[item.platform] || Globe
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-lg transition-colors hover:bg-secondary-50"
                      style={{ background: 'rgba(248,250,252,0.5)' }}
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-white flex-shrink-0"
                        style={{ background: gradient }}
                      >
                        <PIcon size={11} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-secondary-900 truncate">{item.name || '—'}</p>
                        <p className="text-[10px] text-secondary-500 truncate">
                          {platformLabel(item.platform)} · {item.source || '-'}
                        </p>
                      </div>
                      {item.created_at && (
                        <span className="text-[10px] text-secondary-400 flex-shrink-0">
                          {new Date(item.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="pt-4" style={{ borderTop: '1px solid rgba(226,232,240,0.5)' }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <Sparkles size={13} className="text-violet-600" />
              <span className="text-xs font-bold text-secondary-700">حالة النظام</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-500">المتصفح (Playwright)</span>
                <div className="flex items-center gap-1.5">
                  <span className={browserReady ? 'sw-status-dot' : 'sw-status-dot sw-status-dot--off'} />
                  <span className={browserReady ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                    {browserReady ? 'جاهز' : 'بانتظار'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-500">قاعدة البيانات</span>
                <div className="flex items-center gap-1.5">
                  <span className="sw-status-dot" />
                  <span className="text-emerald-600 font-medium">متصلة</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-500">المنصات المتصلة</span>
                <span className="font-medium text-secondary-800">{breakdown.filter((b) => b.accounts > 0).length}/{socialPlatforms.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-500">الإصدار</span>
                <span className="font-bold" style={{ color: '#8B2CF5' }}>v{appVersion}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
