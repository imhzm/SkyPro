import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'
import { platforms } from '../../data/platforms'
import { getPlatformGradient } from '../../data/platformGradients'
import type { PlatformId } from '../../types'

interface RecentLead {
  platform: string
  name: string
  source: string
  date: string
  created_at?: string
}

import {
  Activity,
  Globe,
  Database,
  Users,
  Loader2,
  Sparkles,
  LayoutDashboard,
  BarChart3,
} from 'lucide-react'
import ModuleHeader, { HeaderChip } from '../../components/common/ModuleHeader'
import OffersSection from '../../components/common/OffersSection'

export default function DashboardModule() {
  const { setActivePlatform } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ leads: 0, accounts: 0, campaigns: 0 })
  const [recentLeads, setRecentLeads] = useState<any[]>([])

  const socialPlatforms = platforms.slice(1)

  const loadData = useCallback(async () => {
    try {
      const [leadsRes, accountsRes, campaignsRes] = await Promise.all([
        window.electronAPI.dbCount({ table: 'leads', filters: [] }).catch(() => ({ success: false, count: 0 })),
        window.electronAPI.dbCount({ table: 'accounts', filters: [] }).catch(() => ({ success: false, count: 0 })),
        window.electronAPI.dbCount({ table: 'campaigns', filters: [] }).catch(() => ({ success: false, count: 0 })),
      ])
      
      setStats({
        leads: leadsRes.count || 0,
        accounts: accountsRes.count || 0,
        campaigns: campaignsRes.count || 0,
      })
      
      const recentLeadsRes = await window.electronAPI.dbQuery({ table: 'leads', filters: [], limit: 6 }).catch(() => ({ success: false, data: [] }))
      const leads = (recentLeadsRes.data as any[]) || []
      if (leads.length > 0) {
        setRecentLeads(leads.slice(0, 6).map((l: RecentLead) => ({
          platform: l.platform || 'facebook',
          name: l.name || 'مستخدم',
          source: l.source || '-',
          date: l.created_at ? new Date(l.created_at).toLocaleDateString('ar-EG') : '-',
        })))
      }
    } catch (err) {
      console.error('Dashboard load error:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const statCards = [
    { label: 'المنصات', value: '18+', icon: Globe, gradient: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)' },
    { label: 'الحسابات', value: stats.accounts.toString(), icon: Users, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
    { label: 'السجلات', value: stats.leads.toString(), icon: Database, gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
    { label: 'الحملات', value: stats.campaigns.toString(), icon: BarChart3, gradient: 'linear-gradient(135deg, #8B2CF5, #FF4FD8)' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-3" style={{ color: '#0A6CF1' }} />
          <p className="text-secondary-500 text-sm">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="لوحة التحكم"
        subtitle="نظرة عامة على كل المنصات والإحصائيات · ابدأ بحملتك من القائمة الجانبية"
        icon={LayoutDashboard}
        meta={
          <>
            <HeaderChip>18+ منصة</HeaderChip>
            <HeaderChip>أتمتة كاملة</HeaderChip>
            <HeaderChip>استخراج بيانات</HeaderChip>
          </>
        }
      />

      {/* Offers / Ads */}
      <OffersSection />

      {/* Stats - Responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4 transition-all hover:shadow-lg"
            style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226,232,240,0.6)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: stat.gradient }}
              >
                <stat.icon size={18} className="text-white" />
              </div>
            </div>
            <div className="text-xl font-bold text-secondary-900">{stat.value}</div>
            <div className="text-[11px] text-secondary-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Bottom section - responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platforms */}
        <div className="lg:col-span-2 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226,232,240,0.6)' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-secondary-900 text-sm">المنصات المتاحة</h2>
            <span className="badge badge-primary">{socialPlatforms.length} منصة</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {socialPlatforms.map((platform) => {
              const gradient = getPlatformGradient(platform.id)
              const featureCount = platform.features?.length || 0
              return (
                <button
                  key={platform.id}
                  onClick={() => setActivePlatform(platform.id as PlatformId)}
                  className="group relative flex items-center gap-2.5 p-3 rounded-xl text-right transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgba(226,232,240,0.5)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = platform.color + '40'; e.currentTarget.style.boxShadow = `0 8px 24px ${platform.color}15` }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(226,232,240,0.5)'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 transition-shadow duration-200 group-hover:shadow-md"
                    style={{ background: gradient }}
                  >
                    {platform.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-secondary-900 truncate">{platform.name}</p>
                    <p className="text-[10px] text-secondary-400 truncate">{platform.segment}</p>
                  </div>
                  {featureCount > 0 && (
                    <span className="absolute top-1.5 left-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: gradient }}>
                      {featureCount}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(12px)', border: '1px solid rgba(226,232,240,0.6)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-secondary-900 text-sm">آخر النشاطات</h3>
            <Activity size={16} style={{ color: '#8B2CF5' }} />
          </div>
          <div className="space-y-2">
            {recentLeads.map((item, i) => {
              const gradient = getPlatformGradient(item.platform)
              return (
                <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg" style={{ background: 'rgba(248,250,252,0.5)' }}>
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                    style={{ background: gradient }}
                  >
                    {item.platform[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-secondary-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-secondary-400">{item.source}</p>
                  </div>
                  <span className="text-[10px] text-secondary-400 flex-shrink-0">{item.date}</span>
                </div>
              )
            })}
          </div>

          {/* Quick Stats */}
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(226,232,240,0.5)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} style={{ color: '#8B2CF5' }} />
              <span className="text-xs font-semibold text-secondary-700">حالة النظام</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-500">البراوزر</span>
                <div className="flex items-center gap-1.5"><span className="sw-status-dot" /><span className="text-emerald-600 font-medium">جاهز</span></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-500">قاعدة البيانات</span>
                <div className="flex items-center gap-1.5"><span className="sw-status-dot" /><span className="text-emerald-600 font-medium">متصل</span></div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-secondary-500">الإصدار</span>
                <span className="font-medium" style={{ color: '#8B2CF5' }}>1.0.0 Pro</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activation Section */}
    </div>
  )
}
