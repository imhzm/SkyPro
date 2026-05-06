import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'
import { platforms } from '../../data/platforms'
import type { PlatformId } from '../../types'

interface RecentLead {
  platform: string
  name: string
  source: string
  date: string
  created_at?: string
}

interface ActivationResult {
  serial: string
  key: string
  expiryDate: string
  emailSent?: boolean
}
import {
  Activity,
  Globe,
  Database,
  Users,
  Loader2,
  Sparkles,
  Rocket,
  BarChart3,
  Mail,
  Send,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react'
import { activationApi } from '../../services/api/activation'

const platformGradients: Record<string, string> = {
  facebook: 'linear-gradient(135deg, #1877f2, #0A6CF1)',
  whatsapp: 'linear-gradient(135deg, #25d366, #128C7E)',
  instagram: 'linear-gradient(135deg, #e4405f, #f77737)',
  twitter: 'linear-gradient(135deg, #1da1f2, #0A6CF1)',
  linkedin: 'linear-gradient(135deg, #0a66c2, #004182)',
  telegram: 'linear-gradient(135deg, #0088cc, #005f8f)',
  snapchat: 'linear-gradient(135deg, #fffc00, #ff7700)',
  pinterest: 'linear-gradient(135deg, #e60023, #ad081b)',
  reddit: 'linear-gradient(135deg, #ff4500, #dc2626)',
  tiktok: 'linear-gradient(135deg, #69c9d0, #ee1d52)',
  threads: 'linear-gradient(135deg, #000000, #8B2CF5)',
  google: 'linear-gradient(135deg, #4285f4, #34a853)',
  'send-emails': 'linear-gradient(135deg, #ea4335, #dd4b39)',
  'auto-point': 'linear-gradient(135deg, #f97316, #ea580c)',
  security: 'linear-gradient(135deg, #10b981, #059669)',
  account: 'linear-gradient(135deg, #8B2CF5, #0A6CF1)',
  'other-tools': 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  settings: 'linear-gradient(135deg, #64748b, #475569)',
  accounts: 'linear-gradient(135deg, #22c55e, #16a34a)',
}

export default function DashboardModule() {
  const { setActivePlatform } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ leads: 0, accounts: 0, campaigns: 0 })
  const [recentLeads, setRecentLeads] = useState<any[]>([])

  const socialPlatforms = platforms.slice(1)

  const [showActivateModal, setShowActivateModal] = useState(false)
  const [clientEmail, setClientEmail] = useState('')
  const [months, setMonths] = useState(12)
  const [actLoading, setActLoading] = useState(false)
  const [actError, setActError] = useState('')
  const [actSuccess, setActSuccess] = useState('')
  const [activationResult, setActivationResult] = useState<ActivationResult | null>(null)

  const handleRequestActivation = async () => {
    if (!clientEmail.trim()) {
      setActError('يرجى إدخال بريد العميل')
      return
    }
    setActLoading(true)
    setActError('')
    setActSuccess('')
    setActivationResult(null)
    try {
      const result = await activationApi.requestActivation(clientEmail.trim(), months)
      if (result.success && result.data) {
        setActSuccess('تم إنشاء بيانات التفعيل بنجاح')
        setActivationResult(result.data)
        setClientEmail('')
      } else {
        setActError(result.message || 'فشل إنشاء بيانات التفعيل')
      }
    } catch {
      setActError('فشل الاتصال بخادم التفعيل')
    } finally {
      setActLoading(false)
    }
  }

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
      {/* Hero Banner */}
      <div
        className="rounded-2xl overflow-hidden p-6"
        style={{
          background: 'linear-gradient(135deg, #001A3A 0%, #0A6CF1 50%, #8B2CF5 100%)',
          boxShadow: '0 8px 32px rgba(10, 108, 241, 0.2)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="sw-status-dot" />
              <span className="text-[11px] font-semibold" style={{ color: 'rgba(234, 243, 255, 0.6)' }}>SkyPro</span>
            </div>
            <h1 className="text-xl font-bold text-white mb-1">مرحباً بك</h1>
            <p className="text-sm leading-relaxed max-w-lg" style={{ color: 'rgba(234, 243, 255, 0.6)' }}>
              اختر منصة من القائمة الجانبية للبدء في التسويق واستخراج البيانات.
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>18+ منصة</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>أتمتة كاملة</span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-white" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}>استخراج بيانات</span>
              <button
                onClick={() => { setShowActivateModal(true); setActError(''); setActSuccess(''); setActivationResult(null) }}
                className="px-3 py-1 rounded-full text-[11px] font-semibold text-white transition-all hover:shadow-lg"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)' }}
              >
                <Send size={12} className="inline mr-1" />
                إنشاء تفعيل
              </button>
            </div>
          </div>
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 mr-4"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
          >
            <Rocket size={28} className="text-white" />
          </div>
        </div>
      </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
            {socialPlatforms.map((platform) => {
              const gradient = platformGradients[platform.id] || 'linear-gradient(135deg, #0A6CF1, #8B2CF5)'
              return (
                <button
                  key={platform.id}
                  onClick={() => setActivePlatform(platform.id as PlatformId)}
                  className="flex items-center gap-2 p-2.5 rounded-lg text-right transition-all hover:shadow-md"
                  style={{ background: 'rgba(248,250,252,0.6)', border: '1px solid rgba(226,232,240,0.5)' }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: gradient }}
                  >
                    {platform.name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-secondary-900 truncate">{platform.name}</p>
                    <p className="text-[10px] text-secondary-400 truncate">{platform.segment}</p>
                  </div>
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
              const gradient = platformGradients[item.platform] || 'linear-gradient(135deg, #0A6CF1, #8B2CF5)'
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
      <div className="rounded-xl p-4" style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Mail size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-secondary-900 text-sm">إنشاء تفعيل للعميل</h3>
              <p className="text-sm text-secondary-500">أدخل بريد العميل وسيتم إرسال بيانات التفعيل إليه</p>
            </div>
          </div>
          <button
            onClick={() => { setShowActivateModal(true); setActError(''); setActSuccess(''); setActivationResult(null) }}
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)' }}
          >
            <Send size={16} className="inline ml-2" />
            إرسال التفعيل
          </button>
        </div>
        {actError && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            <AlertCircle size={18} /> {actError}
          </div>
        )}
        {actSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
            <CheckCircle size={18} /> {actSuccess}
          </div>
        )}
        {activationResult && (
          <div className="mt-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
            <h4 className="font-bold text-secondary-900 mb-2">بيانات التفعيل:</h4>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">السيريال:</span> <span className="font-mono">{activationResult.serial}</span></p>
              <p><span className="font-medium">مفتاح التفعيل:</span> <span className="font-mono">{activationResult.key}</span></p>
              <p><span className="font-medium">تاريخ الانتهاء:</span> {activationResult.expiryDate}</p>
            </div>
          </div>
        )}
      </div>

      {/* Activation Modal */}
      {showActivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-secondary-900">إنشاء تفعيل جديد</h3>
              <button onClick={() => setShowActivateModal(false)} className="text-secondary-400 hover:text-secondary-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" />
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-secondary-200 text-right"
                    placeholder="client@example.com"
                    value={clientEmail}
                    onChange={(e) => { setClientEmail(e.target.value); setActError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleRequestActivation()}
                    dir="ltr"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">مدة الاشتراك (بالشهور)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 rounded-xl border border-secondary-200 text-right"
                  value={months}
                  onChange={(e) => setMonths(parseInt(e.target.value) || 12)}
                  min="1"
                  max="36"
                />
              </div>
              {actError && (
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                  <AlertCircle size={16} /> {actError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleRequestActivation}
                  disabled={actLoading || !clientEmail.trim()}
                  className="btn-primary flex-1"
                >
                  {actLoading ? <Loader2 size={18} className="animate-spin mx-auto" /> : 'إرسال'}
                </button>
                <button
                  onClick={() => setShowActivateModal(false)}
                  className="px-4 py-3 rounded-xl border border-secondary-200 text-secondary-600 hover:bg-secondary-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
