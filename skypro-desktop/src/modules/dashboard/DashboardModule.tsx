import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '../../stores/appStore'
import { platforms } from '../../data/platforms'
import type { PlatformId } from '../../types'
import {
  Activity, Database, Users, Loader2, Sparkles, LayoutDashboard,
  BarChart3, TrendingUp, Clock, ChevronLeft, Globe, Plus,
  AlertTriangle, CheckCircle2, CalendarClock, Zap, Target,
} from 'lucide-react'
import ModuleHeader, { HeaderChip } from '../../components/common/ModuleHeader'
import OffersSection from '../../components/common/OffersSection'
import AreaChart from '../../components/charts/AreaChart'
import DonutChart from '../../components/charts/DonutChart'
import type { DonutSegment } from '../../components/charts/DonutChart'
import BrandIcon from '../../components/icons/BrandIcon'
import { BRAND_COLORS, hasBrandIcon } from '../../components/icons/brand-data'

/* ============================================================
   Dashboard — Night Edition. All figures come from the local
   SQLite db (db-count / db-query IPC) or honest empty states.
   ============================================================ */

// Some extraction handlers store leads under historical platform keys.
// Normalize them to platform ids so icons/labels/colors resolve.
const LEAD_ALIAS: Record<string, string> = {
  'google-maps': 'google',
  olx: 'google',
  gmail: 'send-emails',
  emails: 'send-emails',
  'video-download': 'other-tools',
}
const normPid = (p: string) => LEAD_ALIAS[p] || p

// Lead rows that belong to a platform id (including its aliases).
const LEAD_VALUES: Record<string, string[]> = {
  google: ['google', 'google-maps', 'olx'],
  'send-emails': ['send-emails', 'gmail', 'emails'],
}
const leadValuesFor = (pid: string) => LEAD_VALUES[pid] || [pid]

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const PANEL: React.CSSProperties = {
  background: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  backdropFilter: 'blur(16px)',
}

const sqliteUtc = (msAgo: number) => new Date(Date.now() - msAgo).toISOString().slice(0, 19).replace('T', ' ')
const DAY_MS = 24 * 60 * 60 * 1000

interface PlatformBreakdown {
  platform: string
  leads: number
  accounts: number
}

interface RecentLead {
  id: number
  platform: string
  name: string
  source: string
  created_at?: string
}

interface CampaignRow {
  id: number
  name: string
  platform: string
  type: string
  status: string
  scheduled_at?: string
  created_at?: string
}

const CAMPAIGN_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'مجدولة', cls: 'badge badge-primary' },
  running: { label: 'قيد التنفيذ', cls: 'badge badge-warning' },
  failed: { label: 'فشلت', cls: 'badge badge-danger' },
}
const campaignStatus = (s: string) => CAMPAIGN_STATUS[s] || { label: 'مكتملة', cls: 'badge badge-success' }

function PlatformGlyph({ pid, size = 16 }: { pid: string; size?: number }) {
  const norm = normPid(pid)
  if (hasBrandIcon(norm)) return <BrandIcon platform={norm} variant="color" size={size} />
  return <Globe size={size} style={{ color: 'rgba(234,243,255,0.6)' }} />
}

export default function DashboardModule() {
  const { setActivePlatform } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    leads: 0, accounts: 0, campaigns: 0, activeAccounts: 0,
    activeCampaigns: 0, failedCampaigns: 0, weekNow: 0, weekPrev: 0,
  })
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([])
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignRow[]>([])
  const [breakdown, setBreakdown] = useState<PlatformBreakdown[]>([])
  const [last7Days, setLast7Days] = useState<{ date: string; count: number }[]>([])
  const [appVersion, setAppVersion] = useState('—')
  const [dbOk, setDbOk] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [donutActive, setDonutActive] = useState<number | null>(null)

  // Real social/channel platforms (skip overview + system entries)
  const socialPlatforms = useMemo(
    () => platforms.filter((p) => !['dashboard', 'accounts', 'settings', 'security', 'account'].includes(p.id)),
    [],
  )

  const loadData = useCallback(async () => {
    setRefreshing(true)
    try {
      const count = (table: string, filters: Array<{ column: string; op: string; value: unknown }> = []) =>
        window.electronAPI.dbCount({ table, filters }).then((r) => (r?.success ? r.count || 0 : 0)).catch(() => 0)

      const sevenAgo = sqliteUtc(7 * DAY_MS)
      const fourteenAgo = sqliteUtc(14 * DAY_MS)

      // 1) Headline counts (exact, SQL COUNT)
      const [leads, accounts, campaigns, activeAccounts, activeCampaigns, failedCampaigns, weekNow, weekPrev] =
        await Promise.all([
          count('leads'),
          count('accounts'),
          count('campaigns'),
          count('accounts', [{ column: 'status', op: '=', value: 'active' }]),
          count('campaigns', [{ column: 'status', op: 'IN', value: ['pending', 'running'] }]),
          count('campaigns', [{ column: 'status', op: '=', value: 'failed' }]),
          count('leads', [{ column: 'created_at', op: '>=', value: sevenAgo }]),
          count('leads', [
            { column: 'created_at', op: '>=', value: fourteenAgo },
            { column: 'created_at', op: '<', value: sevenAgo },
          ]),
        ])
      setStats({ leads, accounts, campaigns, activeAccounts, activeCampaigns, failedCampaigns, weekNow, weekPrev })
      setDbOk(true)

      // 2) Recent leads + recent campaigns (handler orders by id DESC)
      const [leadsRes, campaignsRes] = await Promise.all([
        window.electronAPI.dbQuery({ table: 'leads', filters: [], limit: 8 }).catch(() => null),
        window.electronAPI.dbQuery({ table: 'campaigns', filters: [], limit: 5 }).catch(() => null),
      ])
      setRecentLeads(((leadsRes as { data?: unknown[] } | null)?.data as RecentLead[]) || [])
      setRecentCampaigns(((campaignsRes as { data?: unknown[] } | null)?.data as CampaignRow[]) || [])

      // 3) Per-platform breakdown (alias-aware lead counts)
      const breakdownResults = await Promise.all(
        socialPlatforms.map(async (p) => {
          const [pLeads, pAcc] = await Promise.all([
            count('leads', [{ column: 'platform', op: 'IN', value: leadValuesFor(p.id) }]),
            count('accounts', [{ column: 'platform', op: '=', value: p.id }]),
          ])
          return { platform: p.id, leads: pLeads, accounts: pAcc }
        }),
      )
      setBreakdown(breakdownResults)

      // 4) 7-day activity series (bucket newest 5000 rows by UTC day)
      const chartRes = await window.electronAPI.dbQuery({ table: 'leads', filters: [], limit: 5000 }).catch(() => null)
      const allLeads = ((chartRes as { data?: unknown[] } | null)?.data as RecentLead[]) || []
      const buckets: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        buckets[new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10)] = 0
      }
      allLeads.forEach((l) => {
        const key = l.created_at?.slice(0, 10)
        if (key && key in buckets) buckets[key]++
      })
      setLast7Days(Object.entries(buckets).map(([date, c]) => ({ date, count: c })))

      // 5) App version (real)
      const verRes = await window.electronAPI.getAppVersion().catch(() => null)
      if (verRes?.success) {
        const v = (verRes as { version?: string; data?: string }).version || (verRes as { data?: string }).data || ''
        if (v) setAppVersion(String(v))
      }
      setLastRefresh(new Date())
    } catch (err) {
      console.error('[Dashboard] load error:', err)
    }
    setLoading(false)
    setRefreshing(false)
  }, [socialPlatforms])

  useEffect(() => {
    loadData()
    const handle = window.setInterval(loadData, 30000)
    return () => window.clearInterval(handle)
  }, [loadData])

  const platformInfo = (pid: string) => platforms.find((p) => p.id === normPid(pid))
  const platformLabel = (pid: string) => platformInfo(pid)?.name || pid
  const platformColor = (pid: string) => BRAND_COLORS[normPid(pid)] || platformInfo(pid)?.color || '#8b5cf6'

  // ---- Derived (pure) ----
  const weeklyDelta = useMemo(() => {
    if (stats.weekPrev === 0) return stats.weekNow > 0 ? null : 0 // null → "جديد"
    return Math.round(((stats.weekNow - stats.weekPrev) / stats.weekPrev) * 100)
  }, [stats.weekNow, stats.weekPrev])

  const chartData = useMemo(
    () =>
      last7Days.map((d) => ({
        label: new Date(`${d.date}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'short' }),
        value: d.count,
      })),
    [last7Days],
  )

  const weekTotal = useMemo(() => last7Days.reduce((a, b) => a + b.count, 0), [last7Days])
  const weekAvg = useMemo(() => (last7Days.length ? Math.round(weekTotal / last7Days.length) : 0), [weekTotal, last7Days])
  const weekPeak = useMemo(() => {
    if (!last7Days.length) return { count: 0, label: '—' }
    const best = last7Days.reduce((a, b) => (b.count > a.count ? b : a), last7Days[0])
    return {
      count: best.count,
      label: best.count > 0 ? new Date(`${best.date}T00:00:00`).toLocaleDateString('ar-EG', { weekday: 'long' }) : '—',
    }
  }, [last7Days])

  const donutSegments: DonutSegment[] = useMemo(() => {
    const top = [...breakdown]
      .filter((b) => b.leads > 0)
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 5)
      .map((b) => ({ label: platformLabel(b.platform), value: b.leads, color: platformColor(b.platform) }))
    const counted = top.reduce((a, s) => a + s.value, 0)
    const rest = stats.leads - counted
    if (rest > 0 && top.length > 0) top.push({ label: 'أخرى', value: rest, color: '#64748b' })
    return top
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakdown, stats.leads])

  const emptyPlatforms = useMemo(() => breakdown.filter((b) => b.accounts === 0), [breakdown])
  const todayCount = last7Days.length ? last7Days[last7Days.length - 1].count : 0

  // Attention tasks — every row derives from a real figure above.
  const attention = useMemo(() => {
    const rows: { tone: 'danger' | 'warning' | 'primary' | 'success'; chip: string; text: string; onClick?: () => void }[] = []
    if (stats.failedCampaigns > 0)
      rows.push({ tone: 'danger', chip: 'تحذير', text: `${stats.failedCampaigns} حملة فشلت — راجع الجدولة والحسابات`, onClick: () => setActivePlatform('other-tools' as PlatformId) })
    if (stats.activeCampaigns > 0)
      rows.push({ tone: 'primary', chip: 'جارٍ', text: `${stats.activeCampaigns} حملة مجدولة أو قيد التنفيذ الآن` })
    if (stats.accounts > 0 && stats.activeAccounts < stats.accounts)
      rows.push({ tone: 'warning', chip: 'تنبيه', text: `${stats.accounts - stats.activeAccounts} حساب غير نشط — راجع صفحة الحسابات`, onClick: () => setActivePlatform('accounts' as PlatformId) })
    if (emptyPlatforms.length > 0)
      rows.push({ tone: 'warning', chip: 'تنبيه', text: `${emptyPlatforms.length} منصة بدون حسابات — اربط حسابًا لتفعيلها`, onClick: () => setActivePlatform('accounts' as PlatformId) })
    if (todayCount > 0)
      rows.push({ tone: 'success', chip: 'نجاح', text: `تم استخراج ${todayCount.toLocaleString('en-US')} سجل اليوم` })
    if (rows.length === 0)
      rows.push({ tone: 'success', chip: 'ممتاز', text: 'كل شيء يعمل بشكل ممتاز — لا مهام عالقة' })
    return rows
  }, [stats, emptyPlatforms.length, todayCount, setActivePlatform])

  const suggestionPlatform = emptyPlatforms.length > 0 ? platformInfo(emptyPlatforms[0].platform) : null

  const TONE_STYLE: Record<string, string> = {
    danger: 'badge badge-danger',
    warning: 'badge badge-warning',
    primary: 'badge badge-primary',
    success: 'badge badge-success',
  }

  // KPI cards — target-theme icon chips
  const statCards = [
    { label: 'المنصات المدعومة', value: String(socialPlatforms.length), icon: Globe, color: '#3b82f6', sub: 'منصة نشطة' },
    { label: 'الحملات النشطة', value: stats.activeCampaigns.toLocaleString('en-US'), icon: BarChart3, color: '#8b5cf6', sub: `${stats.campaigns.toLocaleString('en-US')} إجمالًا` },
    { label: 'الحسابات المحفوظة', value: stats.accounts.toLocaleString('en-US'), icon: Users, color: '#22c55e', sub: `${stats.activeAccounts} نشط` },
    { label: 'السجلات المستخرجة', value: stats.leads.toLocaleString('en-US'), icon: Database, color: '#f59e0b', sub: 'إجمالي السجلات' },
    {
      label: 'النشاط هذا الأسبوع',
      value: weeklyDelta === null ? 'جديد' : `${weeklyDelta > 0 ? '+' : ''}${weeklyDelta}%`,
      icon: TrendingUp,
      color: '#06b6d4',
      sub: 'مقارنة بالأسبوع الماضي',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-3" style={{ color: '#8b5cf6' }} />
          <p className="text-sm" style={{ color: 'rgba(234,243,255,0.5)' }}>جاري تحميل البيانات الحية...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="لوحة التحكم"
        subtitle="مرحبًا بك في SkyPro، منصة الأتمتة والتسويق الذكية."
        icon={LayoutDashboard}
        meta={
          <>
            <HeaderChip>{socialPlatforms.length} منصة</HeaderChip>
            <HeaderChip>{stats.leads.toLocaleString('en-US')} سجل مستخرج</HeaderChip>
            <HeaderChip>آخر تحديث {lastRefresh.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</HeaderChip>
          </>
        }
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActivePlatform('accounts' as PlatformId)}
              className="btn-primary !px-3.5 !py-1.5 !text-xs"
            >
              <Plus size={13} />
              إضافة حساب
            </button>
            <button
              type="button"
              onClick={loadData}
              disabled={refreshing}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-1.5 disabled:opacity-60"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
              title="تحديث الإحصائيات الآن"
            >
              <Activity size={12} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'جاري التحديث...' : 'تحديث'}
            </button>
          </div>
        }
      />

      <OffersSection />

      {/* ============= KPI CARDS ============= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4 transition-all hover:-translate-y-0.5" style={PANEL}>
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: hexToRgba(stat.color, 0.14), border: `1px solid ${hexToRgba(stat.color, 0.25)}` }}
              >
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
            </div>
            <div className="text-2xl font-extrabold tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>{stat.value}</div>
            <div className="text-[12px] mt-0.5 font-semibold" style={{ color: 'rgba(234,243,255,0.60)' }}>{stat.label}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'rgba(234,243,255,0.35)' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ============= ROW: Area chart + Donut ============= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={PANEL}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <TrendingUp size={14} style={{ color: '#8b5cf6' }} />
                <h3 className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>النشاط خلال آخر 7 أيام</h3>
              </div>
              <p className="text-[11px]" style={{ color: 'rgba(234,243,255,0.40)' }}>عدد السجلات المستخرجة يوميًا</p>
            </div>
          </div>
          <AreaChart data={chartData} height={210} color="#8b5cf6" />
          <div className="grid grid-cols-4 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {[
              { v: weekTotal.toLocaleString('en-US'), l: 'إجمالي السجلات' },
              { v: weeklyDelta === null ? 'جديد' : `${weeklyDelta > 0 ? '+' : ''}${weeklyDelta}%`, l: 'نسبة النمو' },
              { v: weekAvg.toLocaleString('en-US'), l: 'متوسط يومي' },
              { v: weekPeak.count > 0 ? `${weekPeak.count.toLocaleString('en-US')} (${weekPeak.label})` : '—', l: 'أعلى يوم' },
            ].map((s) => (
              <div key={s.l} className="text-center">
                <div className="text-sm font-extrabold" style={{ color: 'rgba(255,255,255,0.92)' }}>{s.v}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'rgba(234,243,255,0.40)' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={PANEL}>
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={14} style={{ color: '#8b5cf6' }} />
            <h3 className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>أفضل المنصات نشاطًا</h3>
          </div>
          <p className="text-[11px] mb-3" style={{ color: 'rgba(234,243,255,0.40)' }}>توزيع السجلات حسب المنصة</p>
          <div className="flex items-center justify-center my-2">
            <DonutChart segments={donutSegments} size={170} thickness={15} centerLabel="إجمالي السجلات" activeIndex={donutActive} onActiveChange={setDonutActive} />
          </div>
          {donutSegments.length === 0 ? (
            <p className="text-center text-xs py-3" style={{ color: 'rgba(234,243,255,0.35)' }}>لا بيانات بعد — ابدأ الاستخراج</p>
          ) : (
            <div className="space-y-1.5 mt-2">
              {donutSegments.map((s, i) => {
                const total = donutSegments.reduce((a, x) => a + x.value, 0)
                const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
                return (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 px-2 py-1 rounded-lg cursor-default transition-colors"
                    style={{ background: donutActive === i ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                    onMouseEnter={() => setDonutActive(i)}
                    onMouseLeave={() => setDonutActive(null)}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-xs flex-1 truncate" style={{ color: 'rgba(234,243,255,0.75)' }}>{s.label}</span>
                    <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>{pct}%</span>
                    <span className="text-[10px]" style={{ color: 'rgba(234,243,255,0.40)' }}>({s.value.toLocaleString('en-US')})</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============= ROW: Attention + Suggestions + Campaigns ============= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attention tasks (real signals only) */}
        <div className="rounded-2xl p-5" style={PANEL}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
            <h3 className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>مهام تحتاج انتباهك</h3>
          </div>
          <div className="space-y-2">
            {attention.map((row, i) => (
              <button
                key={i}
                type="button"
                onClick={row.onClick}
                disabled={!row.onClick}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-right transition-colors disabled:cursor-default"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className={TONE_STYLE[row.tone]}>{row.chip}</span>
                <span className="text-[11.5px] flex-1 leading-snug" style={{ color: 'rgba(234,243,255,0.72)' }}>{row.text}</span>
                {row.onClick && <ChevronLeft size={13} style={{ color: 'rgba(234,243,255,0.35)' }} />}
              </button>
            ))}
          </div>
        </div>

        {/* Smart suggestions */}
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.16), rgba(59,130,246,0.07))',
            border: '1px solid rgba(139,92,246,0.25)',
          }}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <Zap size={14} style={{ color: '#a78bfa' }} />
            <h3 className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>اقتراحات ذكية</h3>
          </div>
          <p className="text-[11px] mb-3" style={{ color: 'rgba(234,243,255,0.45)' }}>نوصي بالخطوات التالية لتحسين نتائجك</p>
          <div className="space-y-2.5">
            {suggestionPlatform && (
              <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <PlatformGlyph pid={suggestionPlatform.id} size={14} />
                  <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>نشاط غير مستغل</span>
                </div>
                <p className="text-[10.5px] mb-2 leading-relaxed" style={{ color: 'rgba(234,243,255,0.50)' }}>
                  منصة {suggestionPlatform.name} جاهزة بلا حسابات مرتبطة — ابدأ بربط حساب لاستغلالها
                </p>
                <button type="button" className="btn-secondary !px-2.5 !py-1 !text-[10.5px]" onClick={() => setActivePlatform(suggestionPlatform.id as PlatformId)}>
                  استكشف الآن
                </button>
              </div>
            )}
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <CalendarClock size={14} style={{ color: '#60a5fa' }} />
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>تحسين جدول النشر</span>
              </div>
              <p className="text-[10.5px] mb-2 leading-relaxed" style={{ color: 'rgba(234,243,255,0.50)' }}>
                جدوِل حملاتك في أوقات الذروة ليصل المحتوى لأكبر جمهور تلقائيًا
              </p>
              <button type="button" className="btn-secondary !px-2.5 !py-1 !text-[10.5px]" onClick={() => setActivePlatform('other-tools' as PlatformId)}>
                فتح المجدول
              </button>
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Target size={14} style={{ color: '#f472b6' }} />
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>تحسين الاستهداف</span>
              </div>
              <p className="text-[10.5px] mb-2 leading-relaxed" style={{ color: 'rgba(234,243,255,0.50)' }}>
                استخرج بيانات أعمال دقيقة بالموقع والكلمة المفتاحية من Google Maps
              </p>
              <button type="button" className="btn-secondary !px-2.5 !py-1 !text-[10.5px]" onClick={() => setActivePlatform('google' as PlatformId)}>
                بدء الاستخراج
              </button>
            </div>
          </div>
        </div>

        {/* Recent campaigns */}
        <div className="rounded-2xl p-5" style={PANEL}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CalendarClock size={14} style={{ color: '#8b5cf6' }} />
              <h3 className="font-bold text-sm" style={{ color: 'rgba(255,255,255,0.92)' }}>آخر الحملات</h3>
            </div>
            <button type="button" className="btn-ghost !px-2 !py-1 !text-[10.5px]" onClick={() => setActivePlatform('other-tools' as PlatformId)}>
              عرض الكل
            </button>
          </div>
          {recentCampaigns.length === 0 ? (
            <div className="text-center py-8">
              <CalendarClock size={26} className="mx-auto mb-2" style={{ color: 'rgba(234,243,255,0.25)' }} />
              <p className="text-xs mb-3" style={{ color: 'rgba(234,243,255,0.45)' }}>لا توجد حملات بعد</p>
              <button type="button" className="btn-secondary !px-3 !py-1.5 !text-[11px]" onClick={() => setActivePlatform('other-tools' as PlatformId)}>
                جدولة حملة
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentCampaigns.map((c) => {
                const st = campaignStatus(c.status)
                const when = (c.scheduled_at || c.created_at || '').slice(0, 16).replace('T', ' ')
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: hexToRgba(platformColor(c.platform), 0.12) }}
                    >
                      <PlatformGlyph pid={c.platform} size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.88)' }}>{c.name || c.type || 'حملة'}</p>
                      <p className="text-[10px] truncate" style={{ color: 'rgba(234,243,255,0.40)' }}>
                        {platformLabel(c.platform)}{when ? ` · ${when}` : ''}
                      </p>
                    </div>
                    <span className={st.cls}>{st.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ============= ROW: Platforms grid + Activity/System ============= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={PANEL}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-sm mb-0.5" style={{ color: 'rgba(255,255,255,0.92)' }}>كل المنصات المتاحة</h2>
              <p className="text-[11px]" style={{ color: 'rgba(234,243,255,0.40)' }}>انقر لفتح أي منصة والبدء فورًا</p>
            </div>
            <span className="badge badge-primary">{socialPlatforms.length} منصة</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {socialPlatforms.map((platform) => {
              const color = platformColor(platform.id)
              const pLeads = breakdown.find((b) => b.platform === platform.id)?.leads || 0
              const pAccounts = breakdown.find((b) => b.platform === platform.id)?.accounts || 0
              return (
                <button
                  key={platform.id}
                  onClick={() => setActivePlatform(platform.id as PlatformId)}
                  className="group relative flex flex-col gap-2 p-3 rounded-xl text-right transition-all duration-200 hover:-translate-y-1"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = hexToRgba(color, 0.45); e.currentTarget.style.boxShadow = `0 12px 28px ${hexToRgba(color, 0.12)}` }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div className="flex items-center justify-between">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                      style={{ background: hexToRgba(color, 0.13), border: `1px solid ${hexToRgba(color, 0.22)}` }}
                    >
                      <PlatformGlyph pid={platform.id} size={18} />
                    </div>
                    {(pLeads > 0 || pAccounts > 0) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: hexToRgba(color, 0.15), color: 'rgba(255,255,255,0.85)' }}>
                        {(pLeads + pAccounts).toLocaleString('en-US')}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'rgba(255,255,255,0.90)' }}>{platform.name}</p>
                    <p className="text-[10px] truncate" style={{ color: 'rgba(234,243,255,0.40)' }}>{platform.segment}</p>
                    {(pLeads > 0 || pAccounts > 0) && (
                      <p className="text-[10px] mt-1 font-medium" style={{ color: 'rgba(234,243,255,0.55)' }}>
                        {pLeads.toLocaleString('en-US')} سجل · {pAccounts} حساب
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent activity + system status */}
        <div className="rounded-2xl p-5 space-y-4" style={PANEL}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.92)' }}>
                <Clock size={14} style={{ color: '#f59e0b' }} />
                آخر النشاطات
              </h3>
            </div>
            {recentLeads.length === 0 ? (
              <div className="text-center py-6">
                <Database size={24} className="mx-auto mb-1.5" style={{ color: 'rgba(234,243,255,0.20)' }} />
                <p className="text-xs" style={{ color: 'rgba(234,243,255,0.45)' }}>لا توجد نشاطات بعد</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[230px] overflow-y-auto scroll-container pl-1">
                {recentLeads.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 rounded-lg transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: hexToRgba(platformColor(item.platform), 0.12) }}
                    >
                      <PlatformGlyph pid={item.platform} size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{item.name || '—'}</p>
                      <p className="text-[10px] truncate" style={{ color: 'rgba(234,243,255,0.40)' }}>
                        {platformLabel(item.platform)} · {item.source || '-'}
                      </p>
                    </div>
                    {item.created_at && (
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(234,243,255,0.35)' }}>
                        {new Date(item.created_at.replace(' ', 'T')).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-1.5 mb-2.5">
              <CheckCircle2 size={13} style={{ color: '#a78bfa' }} />
              <span className="text-xs font-bold" style={{ color: 'rgba(234,243,255,0.75)' }}>حالة النظام</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'rgba(234,243,255,0.45)' }}>قاعدة البيانات</span>
                <div className="flex items-center gap-1.5">
                  <span className="sw-status-dot" style={dbOk ? undefined : { background: '#f59e0b', boxShadow: '0 0 8px rgba(245,158,11,0.55)' }} />
                  <span className="font-medium" style={{ color: dbOk ? '#4ade80' : '#fbbf24' }}>{dbOk ? 'متصلة' : 'بانتظار'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'rgba(234,243,255,0.45)' }}>المنصات المرتبطة بحسابات</span>
                <span className="font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {breakdown.filter((b) => b.accounts > 0).length}/{socialPlatforms.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span style={{ color: 'rgba(234,243,255,0.45)' }}>الإصدار</span>
                <span className="font-bold" style={{ color: '#a78bfa' }}>v{appVersion}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
