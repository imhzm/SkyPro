import { useState, useEffect } from 'react'
import { User, CreditCard, Calendar, CheckCircle, Loader2, KeyRound, AlertCircle, Database, Users, BarChart3, Copy } from 'lucide-react'
import { useAuthStore } from '../../stores/appStore'
import ModuleHeader, { HeaderChip } from '../../components/common/ModuleHeader'

export default function AccountModule() {
  const { isAuthenticated, keyData } = useAuthStore()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' })
  const [stats, setStats] = useState({ leads: 0, accounts: 0, campaigns: 0 })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [leads, accounts, campaigns] = await Promise.all([
          window.electronAPI.dbCount({ table: 'leads', filters: [] }),
          window.electronAPI.dbCount({ table: 'accounts', filters: [] }),
          window.electronAPI.dbCount({ table: 'campaigns', filters: [] }),
        ])
        setStats({ leads: leads.count || 0, accounts: accounts.count || 0, campaigns: campaigns.count || 0 })
      } catch { setError('فشل تحميل الإحصائيات') }
    }
    const storedName = localStorage.getItem('profile_name') || ''
    const storedEmail = localStorage.getItem('profile_email') || ''
    const storedPhone = localStorage.getItem('profile_phone') || ''
    setProfile({ name: storedName, email: storedEmail, phone: storedPhone })
    loadStats()
  }, [])

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
      showMsg('تم حفظ البيانات بنجاح')
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

  const statCards = [
    { label: 'جهات اتصال', value: stats.leads, icon: Database, gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
    { label: 'حسابات', value: stats.accounts, icon: Users, gradient: 'linear-gradient(135deg, #22c55e, #16a34a)' },
    { label: 'حملات', value: stats.campaigns, icon: BarChart3, gradient: 'linear-gradient(135deg, #8B2CF5, #FF4FD8)' },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Notification */}
      {(message || error) && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-medium animate-in" style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      <ModuleHeader
        title={profile.name || 'الملف الشخصي'}
        subtitle={profile.email || 'لم يتم إعداد البريد الإلكتروني — قم بتعديل بياناتك أدناه'}
        icon={User}
        badge={{
          label: isAuthenticated ? 'حساب مفعّل' : 'غير مفعّل',
          tone: isAuthenticated ? 'success' : 'danger',
        }}
        meta={<HeaderChip>SkyPro Pro Account</HeaderChip>}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="card-gradient-border">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: stat.gradient }}>
                <stat.icon size={20} className="text-white" />
              </div>
            </div>
            <div className="text-2xl font-bold text-secondary-900">{stat.value}</div>
            <div className="text-xs text-secondary-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Form */}
        <div className="card-gradient-border">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B2CF5, #0A6CF1)' }}>
              <User size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-secondary-900">الملف الشخصي</h3>
              <p className="text-xs text-secondary-500">معلوماتك الشخصية</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label-field">الاسم</label>
              <input type="text" className="input-field" placeholder="اسمك الكامل" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div>
              <label className="label-field">البريد الإلكتروني</label>
              <input type="email" className="input-field" placeholder="example@email.com" dir="ltr" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} />
            </div>
            <div>
              <label className="label-field">رقم الهاتف</label>
              <input type="text" className="input-field" placeholder="+2010..." dir="ltr" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
            </div>
            <button onClick={handleSaveProfile} disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={18} /> حفظ التغييرات</>}
            </button>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="card-gradient-border">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
              <CreditCard size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-secondary-900">الاشتراك</h3>
              <p className="text-xs text-secondary-500">تفاصيل باقتك الحالية</p>
            </div>
          </div>
          <div className="space-y-4">
            {/* Plan Card */}
            <div className="p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(139,44,245,0.06), rgba(10,108,241,0.06))', border: '1px solid rgba(139,44,245,0.15)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-secondary-900">SkyPro</span>
                <span className={`badge ${isAuthenticated ? 'badge-success' : 'badge-danger'}`}>{isAuthenticated ? 'نشط' : 'غير مفعل'}</span>
              </div>
              <p className="text-sm text-secondary-500">الباقة الاحترافية — كامل الميزات</p>
            </div>

            {/* Key Info */}
            {keyData && (
              <div className="space-y-3">
                <div className="p-3 rounded-xl" style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.6)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <KeyRound size={16} style={{ color: '#8B2CF5' }} />
                      <span className="font-medium font-mono text-secondary-700 text-xs">{keyData.key}</span>
                    </div>
                    <button onClick={handleCopyKey} className="p-1.5 rounded-lg hover:bg-secondary-100 transition-colors" title="نسخ">
                      {copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} className="text-secondary-400" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.6)' }}>
                  <Calendar size={16} style={{ color: '#0A6CF1' }} />
                  <span className="text-sm text-secondary-600">ينتهي:</span>
                  <span className="text-sm font-medium text-secondary-900">{keyData.expiryDate}</span>
                </div>
              </div>
            )}

            {/* Price */}
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <CreditCard size={16} className="text-amber-500" />
              <span className="text-sm text-amber-700 font-medium">السعر: 2,000 جنيه/سنة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
