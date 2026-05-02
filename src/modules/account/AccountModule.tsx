import { useState, useEffect } from 'react'
import { User, CreditCard, Calendar, CheckCircle, Loader2, KeyRound, AlertCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/appStore'

export default function AccountModule() {
  const { isAuthenticated, keyData } = useAuthStore()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' })
  const [stats, setStats] = useState({ leads: 0, accounts: 0, campaigns: 0 })

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [leads, accounts, campaigns] = await Promise.all([
          window.electronAPI.dbQuery({ table: 'leads', filters: [] }),
          window.electronAPI.dbQuery({ table: 'accounts', filters: [] }),
          window.electronAPI.dbQuery({ table: 'campaigns', filters: [] }),
        ])
        setStats({ leads: leads.data?.length || 0, accounts: accounts.data?.length || 0, campaigns: campaigns.data?.length || 0 })
      } catch (err: any) { setError('فشل تحميل الإحصائيات'); console.error('Failed to load stats:', err.message) }
    }
    const loadProfile = async () => {
      try {
        const res = await window.electronAPI.dbQuery({ table: 'accounts', filters: [{ column: 'platform', op: '=', value: 'facebook' }], limit: 1 })
        if (res.data && res.data[0]) setProfile({ name: res.data[0].username || '', email: res.data[0].notes || '', phone: '' })
      } catch (err: any) { console.error('Failed to load profile:', err.message) }
    }
    loadStats()
    loadProfile()
  }, [])

  const handleSaveProfile = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.dbQuery({ table: 'accounts', filters: [], limit: 1 })
      if (res.success && res.data && res.data.length > 0) {
        await window.electronAPI.dbUpdate({ table: 'accounts', id: res.data[0].id, data: { notes: profile.email } })
        setMessage('تم حفظ البيانات')
        setTimeout(() => setMessage(''), 3000)
      } else { setError('لا يوجد حساب لحفظ البيانات'); setTimeout(() => setError(''), 3000) }
    } catch (err: any) { setError(err.message || 'فشل الحفظ'); setTimeout(() => setError(''), 3000) }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-medium" style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center"><div className="text-2xl font-bold" style={{ color: '#8B2CF5' }}>{stats.leads}</div><div className="text-sm text-secondary-500">جهات اتصال</div></div>
        <div className="card text-center"><div className="text-2xl font-bold" style={{ color: '#8B2CF5' }}>{stats.accounts}</div><div className="text-sm text-secondary-500">حسابات</div></div>
        <div className="card text-center"><div className="text-2xl font-bold" style={{ color: '#8B2CF5' }}>{stats.campaigns}</div><div className="text-sm text-secondary-500">حملات</div></div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><User size={20} style={{ color: '#8B2CF5' }} /> الملف الشخصي</h3>
          <div className="space-y-4">
            <div><label className="label-field">الاسم</label><input type="text" className="input-field" placeholder="اسمك" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></div>
            <div><label className="label-field">البريد الإلكتروني</label><input type="email" className="input-field" placeholder="example@email.com" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></div>
            <div><label className="label-field">رقم الهاتف</label><input type="text" className="input-field" placeholder="+2010..." value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
            <button onClick={handleSaveProfile} disabled={loading} className="btn-primary w-full">{loading ? <Loader2 size={18} className="animate-spin" /> : 'حفظ'}</button>
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><CreditCard size={20} style={{ color: '#8B2CF5' }} /> الاشتراك</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(139,44,245,0.06)', border: '1px solid rgba(139,44,245,0.15)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold" style={{ color: '#7c3aed' }}>الباقة الحالية</span>
                <span className={`badge ${isAuthenticated ? 'badge-success' : 'badge-danger'}`}>{isAuthenticated ? 'نشط' : 'غير مفعل'}</span>
              </div>
              <p className="text-sm text-secondary-600">SkyPro</p>
            </div>
            {keyData && (
              <div className="p-3 bg-secondary-50 rounded-xl border border-secondary-100 space-y-2">
                <div className="flex items-center gap-2 text-sm"><KeyRound size={16} className="text-secondary-500" /><span className="font-medium">{keyData.key}</span></div>
                <div className="flex items-center gap-2 text-sm text-secondary-500"><Calendar size={16} /><span>ينتهي: {keyData.expiryDate}</span></div>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-secondary-500">
              <Calendar size={16} />
              <span>السعر: 2,000 جنيه/سنة</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
