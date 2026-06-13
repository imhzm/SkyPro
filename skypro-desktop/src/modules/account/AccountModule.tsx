import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  User, CreditCard, Calendar, CheckCircle, Loader2, KeyRound, AlertCircle,
  Database, Users, BarChart3, Copy, Crown, Activity, Mail, Phone, Shield,
  ExternalLink, Sparkles,
} from 'lucide-react'
import { useAuthStore } from '../../stores/appStore'
import ModuleHeader, { HeaderChip } from '../../components/common/ModuleHeader'

export default function AccountModule() {
  const { isAuthenticated, keyData } = useAuthStore()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' })
  const [stats, setStats] = useState({ leads: 0, accounts: 0, campaigns: 0, activeAccounts: 0 })
  const [copied, setCopied] = useState(false)
  const [memberSince, setMemberSince] = useState<string>('')

  const loadStats = useCallback(async () => {
    try {
      const [leads, accounts, campaigns, activeAccounts] = await Promise.all([
        window.electronAPI.dbCount({ table: 'leads', filters: [] }),
        window.electronAPI.dbCount({ table: 'accounts', filters: [] }),
        window.electronAPI.dbCount({ table: 'campaigns', filters: [] }),
        window.electronAPI.dbCount({ table: 'accounts', filters: [{ column: 'status', op: '=', value: 'active' }] }),
      ])
      setStats({
        leads: leads.count || 0,
        accounts: accounts.count || 0,
        campaigns: campaigns.count || 0,
        activeAccounts: activeAccounts.count || 0,
      })

      // Get oldest account row to figure out "member since"
      const oldestAccountRes = await window.electronAPI.dbQuery({ table: 'accounts', filters: [], limit: 1000 })
      const allAccounts = (oldestAccountRes.data as Array<{ created_at: string }>) || []
      if (allAccounts.length > 0) {
        const oldest = [...allAccounts].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))[0]
        if (oldest?.created_at) setMemberSince(new Date(oldest.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' }))
      }
    } catch {
      setError('فشل تحميل الإحصائيات')
    }
  }, [])

  useEffect(() => {
    const storedName = localStorage.getItem('profile_name') || ''
    const storedEmail = localStorage.getItem('profile_email') || ''
    const storedPhone = localStorage.getItem('profile_phone') || ''
    setProfile({ name: storedName, email: storedEmail, phone: storedPhone })
    loadStats()
    // Refresh every 60s for live feel
    const handle = window.setInterval(loadStats, 60000)
    return () => window.clearInterval(handle)
  }, [loadStats])

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') } else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 4000)
  }

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      localStorage.setItem('profile_name', profile.name)
      localStorage.setItem('profile_email', profile.email)
      localStorage.setItem('profile_phone', profile.phone)
      showMsg('تم حفظ البيانات بنجاح ✓')
    } catch { showMsg('فشل الحفظ', true) }
    setLoading(false)
  }

  const handleCopyKey = () => {
    if (keyData?.key) {
      navigator.clipboard.writeText(keyData.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Calculate days remaining + percentage of subscription used
  const subscriptionInfo = useMemo(() => {
    if (!keyData?.expiryDate) return null
    const expiry = new Date(keyData.expiryDate)
    const now = new Date()
    const msRemaining = expiry.getTime() - now.getTime()
    const daysRemaining = Math.max(0, Math.floor(msRemaining / (1000 * 60 * 60 * 24)))
    // Assume 1-year subscription for the percent calculation
    const yearMs = 365 * 24 * 60 * 60 * 1000
    const remainingPct = Math.min(100, Math.max(0, (msRemaining / yearMs) * 100))
    return { daysRemaining, remainingPct, expired: msRemaining <= 0, expiryDate: expiry }
  }, [keyData])

  const statCards = [
    { label: 'سجل مستخرج', value: stats.leads.toLocaleString('en'), icon: Database, gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
    { label: 'حساب محفوظ', value: stats.accounts.toLocaleString('en'), icon: Users, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', sub: `${stats.activeAccounts} نشط` },
    { label: 'حملة مجدولة', value: stats.campaigns.toLocaleString('en'), icon: BarChart3, gradient: 'linear-gradient(135deg, #8B2CF5, #FF4FD8)' },
    { label: 'منذ', value: memberSince || '—', icon: Calendar, gradient: 'linear-gradient(135deg, #0A6CF1, #06b6d4)' },
  ]

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Notification */}
      {(message || error) && (
        <div
          className="flex items-center gap-3 p-3.5 rounded-xl text-sm font-medium"
          style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#34d399' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
        >
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      <ModuleHeader
        title={profile.name || 'حسابك في SkyPro'}
        subtitle={profile.email || 'أضف بياناتك الشخصية لتسهيل الدعم الفني والإشعارات'}
        icon={User}
        badge={{
          label: isAuthenticated ? 'مفعّل' : 'غير مفعّل',
          tone: isAuthenticated ? 'success' : 'danger',
        }}
        meta={
          <>
            <HeaderChip>SkyPro Pro</HeaderChip>
            {subscriptionInfo && !subscriptionInfo.expired && (
              <HeaderChip>{subscriptionInfo.daysRemaining} يوم متبقي</HeaderChip>
            )}
          </>
        }
      />

      {/* ============= STATS ROW ============= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-default"
            style={{ background: 'var(--panel-bg)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: stat.gradient }}>
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

      {/* ============= MAIN GRID ============= */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Profile Form — 3 columns */}
        <div className="lg:col-span-3 rounded-2xl p-5 space-y-4" style={{ background: 'var(--panel-bg)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #8B2CF5, #0A6CF1)' }}>
              <User size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-secondary-900">الملف الشخصي</h3>
              <p className="text-xs text-secondary-500">بياناتك محفوظة محلياً على جهازك</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="label-field flex items-center gap-1.5"><User size={12} /> الاسم الكامل</label>
              <input type="text" className="input-field" placeholder="اسمك الكامل" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label-field flex items-center gap-1.5"><Mail size={12} /> البريد الإلكتروني</label>
                <input type="email" className="input-field" placeholder="example@email.com" dir="ltr" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div>
                <label className="label-field flex items-center gap-1.5"><Phone size={12} /> رقم الهاتف</label>
                <input type="text" className="input-field" placeholder="+201..." dir="ltr" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={loading} className="btn-primary w-full text-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> حفظ التغييرات</>}
            </button>
          </div>

          {/* Quick activity */}
          <div className="pt-3 border-t border-secondary-100">
            <div className="flex items-center gap-2 mb-3">
              <Activity size={14} className="text-violet-600" />
              <span className="text-xs font-bold text-secondary-700">ملخص النشاط</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-secondary-50">
                <span className="text-secondary-500">إجمالي السجلات</span>
                <p className="font-bold text-secondary-900 mt-0.5">{stats.leads.toLocaleString('en')}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary-50">
                <span className="text-secondary-500">إجمالي الحسابات</span>
                <p className="font-bold text-secondary-900 mt-0.5">{stats.accounts.toLocaleString('en')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription card — 2 columns */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden flex flex-col" style={{ background: 'linear-gradient(135deg, #8B2CF5, #FF4FD8)', boxShadow: '0 12px 30px rgba(139,44,245,0.25)' }}>
          <div className="p-5 text-white flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm">
                  <Crown size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">SkyPro Pro</h3>
                  <p className="text-[11px] text-white/80">الباقة الاحترافية</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isAuthenticated ? 'bg-emerald-400/30 text-white' : 'bg-red-400/30 text-white'
              }`}>
                {isAuthenticated ? '● مفعّل' : '○ غير مفعّل'}
              </span>
            </div>

            {/* Days remaining progress */}
            {subscriptionInfo && !subscriptionInfo.expired && (
              <div className="mb-4">
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-3xl font-extrabold text-white">{subscriptionInfo.daysRemaining}</span>
                  <span className="text-[11px] text-white/80">يوم متبقي</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${subscriptionInfo.remainingPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/70 mt-1.5">
                  ينتهي: {subscriptionInfo.expiryDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}

            {subscriptionInfo?.expired && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/30 border border-red-300/30">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle size={14} className="text-white" />
                  <span className="font-bold text-white text-sm">انتهت الباقة</span>
                </div>
                <p className="text-[11px] text-white/80">قم بالتجديد للاستمرار في استخدام كل المميزات</p>
              </div>
            )}

            {/* Serial Key */}
            {keyData?.key && (
              <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 mb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <KeyRound size={12} className="text-white/80 flex-shrink-0" />
                    <span className="font-mono text-[11px] text-white truncate" dir="ltr">{keyData.key}</span>
                  </div>
                  <button onClick={handleCopyKey} className="p-1 rounded-md bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0" title="نسخ">
                    {copied ? <CheckCircle size={11} className="text-emerald-300" /> : <Copy size={11} className="text-white" />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] text-white/90">
                <Sparkles size={11} /> كل المنصات
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/90">
                <Shield size={11} /> حماية متقدمة من الحظر
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/90">
                <CreditCard size={11} /> 2,000 جنيه/سنة فقط
              </div>
            </div>
          </div>

          {/* CTA at bottom */}
          <div className="px-5 py-3 bg-white/10 border-t border-white/20">
            <a
              href="https://skypro.skywaveads.com/dashboard/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs font-bold text-white hover:text-white/90 transition-colors"
            >
              {subscriptionInfo?.expired ? 'تجديد الاشتراك الآن' : 'إدارة الاشتراك'}
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
