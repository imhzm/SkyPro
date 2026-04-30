import { useState } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  MapPin, Globe, Star, Mail, Users, Zap,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet,
  Download, Eye, EyeOff, ExternalLink, LogIn, Settings, Phone
} from 'lucide-react'

type ToolTab = 'maps' | 'olx' | 'rate' | 'tools'

export default function GoogleModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('maps')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle, handleExport } = usePlatform('google')

  const [mapsQuery, setMapsQuery] = useState('')
  const [mapsLocation, setMapsLocation] = useState('')
  const [mapsLimit, setMapsLimit] = useState(50)
  const [mapsResults, setMapsResults] = useState<any[]>([])
  const [olxCountry, setOlxCountry] = useState('egypt')
  const [olxCategory, setOlxCategory] = useState('properties')
  const [olxLimit, setOlxLimit] = useState(50)
  const [olxResults, setOlxResults] = useState<any[]>([])
  const [rateUrl, setRateUrl] = useState('')
  const [rateStars, setRateStars] = useState(5)
  const [rateReview, setRateReview] = useState('')
  const { accounts: allAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [showPassword, setShowPassword] = useState(false)

  const googleAccounts = allAccounts.filter(a => a.platform === 'google')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleMapsExtract = async () => {
    if (!mapsQuery || !mapsLocation) { showMsg('أدخل نوع النشاط والمدينة', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.googleMapsExtract({ searchQuery: mapsQuery, location: mapsLocation, limit: mapsLimit })
      if (res.success && res.data) { setMapsResults(res.data || []); showMsg(`تم استخراج ${res.count ?? res.data?.length ?? 0}`) }
      else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleOlxExtract = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.olxExtract({ country: olxCountry, category: olxCategory, limit: olxLimit })
      if (res.success && res.data) { setOlxResults(res.data || []); showMsg(`تم استخراج ${res.count ?? res.data?.length ?? 0}`) }
      else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleRate = async () => {
    if (!ensureSession()) return
    if (!rateUrl) { showMsg('أدخل رابط المكان', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.googleRate({ sessionId, placeUrl: rateUrl, rating: rateStars, review: rateReview })
      if (res.success) showMsg(res.message || 'تم التقييم بنجاح')
      else showMsg(res.error || 'فشل التقييم', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleLaunchBrowser = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.launchBrowser({ platform: 'google', headless: false, proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId); showMsg('تم فتح المتصفح - سجل الدخول بحساب Google') }
      else showMsg(res.error || 'فشل فتح المتصفح', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleLoginWithAccount = async (account: Account) => {
    setLoading(true)
    const sessionCheck = await checkSession()
    if (sessionCheck.alreadyLoggedIn) { showMsg(`جلسة نشطة - مسجل دخول بحساب ${account.username}`); setLoading(false); return }
    const proxyToUse = account.proxy || loginForm.proxy || undefined
    setLoginForm({ ...loginForm, username: account.username, password: account.password || '' })
    if (!account.password?.trim()) { showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة.', true); setLoading(false); return }
    try {
      const res = await window.electronAPI.launchBrowser({ platform: 'google', headless: false, proxy: proxyToUse })
      if (res.success) { setSessionId(res.sessionId); showMsg(`تم فتح المتصفح - سجل الدخول بحساب ${account.username}`) }
      else showMsg(res.error || 'فشل فتح المتصفح', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExportMaps = () => {
    handleExport(['الاسم', 'التقييم', 'العنوان', 'النوع', 'الهاتف', 'المصدر', 'التاريخ'], 'google-maps', mapsResults)
  }

  const handleExportOlx = () => {
    handleExport(['العنوان', 'السعر', 'الموقع', 'الرابط', 'المصدر', 'التاريخ'], 'olx', olxResults)
  }

  const countries = [
    { value: 'egypt', label: 'مصر' },
    { value: 'saudi', label: 'السعودية' },
    { value: 'uae', label: 'الإمارات' },
    { value: 'qatar', label: 'قطر' },
    { value: 'kuwait', label: 'الكويت' },
  ]

  const categories = [
    { value: 'properties', label: 'عقارات' },
    { value: 'vehicles', label: 'سيارات' },
    { value: 'electronics', label: 'إلكترونيات' },
    { value: 'furniture', label: 'أثاث' },
  ]

  const stubTools = [
    { id: 'sms-bulk', name: 'إرسال SMS جماعي', desc: 'إرسال رسائل نصية', icon: Mail },
    { id: 'contacts-import', name: 'استيراد جهات اتصال', desc: 'من ملف أو نص', icon: Users },
    { id: 'contacts-export', name: 'تصدير جهات اتصال', desc: 'تصدير CSV/Excel', icon: FileSpreadsheet },
    { id: 'auto-like4like', name: 'Like4Like تلقائي', desc: 'تبادل إعجابات', icon: Zap },
    { id: 'auto-kingdom', name: 'KingdomLikes تلقائي', desc: 'تبادل تفاعل', icon: Zap },
    { id: 'phone-extract', name: 'استخراج أرقام هواتف', desc: 'من صفحات الويب', icon: Phone },
  ]

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'maps', label: 'خرائط جوجل', icon: MapPin },
    { id: 'olx', label: 'OLX', icon: Globe },
    { id: 'rate', label: 'تقييم', icon: Star },
    { id: 'tools', label: 'أدوات إضافية', icon: Settings },
  ]

  const renderMaps = () => (
<div className="space-y-6">
        <AccountSelector
          platformId="google"
          accounts={allAccounts}
          cycleActive={cycleActive}
          cycleProgress={cycleProgress}
          onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
          onStopCycle={stopCycle}
          extractTask={{ type: 'extract', params: { extractType: 'maps', searchQuery: mapsQuery, location: mapsLocation, limit: mapsLimit } }}
          sendTask={{ type: 'send', params: { placeUrl: rateUrl, rating: rateStars, review: rateReview } }}
        />
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><MapPin size={20} /> استخراج بيانات من خرائط جوجل</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">نوع النشاط التجاري</label><input type="text" className="input-field" placeholder="مثال: مطاعم، عيادات، محلات..." value={mapsQuery} onChange={e => setMapsQuery(e.target.value)} /></div>
            <div><label className="label-field">المدينة / المنطقة</label><input type="text" className="input-field" placeholder="مثال: القاهرة، جدة، دبي..." value={mapsLocation} onChange={e => setMapsLocation(e.target.value)} /></div>
          </div>
          <div><label className="label-field">الحد الأقصى: {mapsLimit}</label><input type="range" min="10" max="200" value={mapsLimit} onChange={e => setMapsLimit(parseInt(e.target.value))} className="w-full" /></div>
          <button onClick={handleMapsExtract} disabled={loading || !mapsQuery.trim() || !mapsLocation.trim()} className="btn-primary w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}</button>
        </div>
      </div>
      {mapsResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-secondary-900">النتائج ({mapsResults.length})</h3>
            <div className="flex gap-2">
              <button onClick={handleExportMaps} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
              <button onClick={() => setMapsResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>#</th><th>الاسم</th><th>التقييم</th><th>العنوان</th><th>النوع</th></tr></thead>
              <tbody>
                {mapsResults.map((b, i) => (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{b.name || '-'}</td>
                    <td><span className="flex items-center gap-1"><Star size={14} className="text-warning-500" />{b.rating || '-'}</span></td>
                    <td className="text-sm">{b.address || '-'}</td>
                    <td className="text-sm">{b.type || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderOlx = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Globe size={20} /> استخراج بيانات من OLX</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">الدولة</label><select className="select-field" value={olxCountry} onChange={e => setOlxCountry(e.target.value)}>{countries.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            <div><label className="label-field">الفئة</label><select className="select-field" value={olxCategory} onChange={e => setOlxCategory(e.target.value)}>{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          </div>
          <div><label className="label-field">الحد الأقصى: {olxLimit}</label><input type="range" min="10" max="200" value={olxLimit} onChange={e => setOlxLimit(parseInt(e.target.value))} className="w-full" /></div>
          <button onClick={handleOlxExtract} disabled={loading} className="btn-primary w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}</button>
        </div>
      </div>
      {olxResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-secondary-900">الإعلانات ({olxResults.length})</h3>
            <div className="flex gap-2">
              <button onClick={handleExportOlx} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
              <button onClick={() => setOlxResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>#</th><th>العنوان</th><th>السعر</th><th>الموقع</th><th>الرابط</th></tr></thead>
              <tbody>
                {olxResults.map((l, i) => (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{l.title || '-'}</td>
                    <td className="font-bold" style={{ color: '#16a34a' }}>{l.price || '-'}</td>
                    <td className="text-sm flex items-center gap-1"><MapPin size={14} />{l.location || '-'}</td>
                    <td>{l.link ? <a href={l.link} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm">عرض</a> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderRate = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Star size={20} /> تقييم أماكن Google</h3>
          {sessionId && (
            <div className="mb-4 p-4 rounded-xl border" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.2)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-success-600" />
                  <div><p className="font-bold text-success-700">جلسة نشطة</p><p className="text-xs text-success-600">يمكنك التقييم الآن</p></div>
                </div>
                <button onClick={clearSession} className="btn-danger text-xs px-3 py-1.5"><ExternalLink size={14} /> إنهاء الجلسة</button>
              </div>
            </div>
          )}
          {googleAccounts.length > 0 && !sessionId && (
            <div className="mb-4 p-4 rounded-xl border" style={{ background: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.08)' }}>
              <label className="label-field">الحسابات المحفوظة</label>
              <select className="select-field mb-2" value={selectedAccountId} onChange={e => { const id = e.target.value; setSelectedAccountId(id); const acc = googleAccounts.find(a => a.id.toString() === id); if (acc) setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' }) }}>
                <option value="">-- اختر حساب --</option>
                {googleAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.username}</option>)}
              </select>
              {selectedAccountId && <button onClick={() => { const acc = googleAccounts.find(a => a.id.toString() === selectedAccountId); if (acc) handleLoginWithAccount(acc) }} disabled={loading} className="btn-success w-full text-sm">{loading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} /> فتح المتصفح</>}</button>}
              <div className="my-3 border-t border-secondary-100" />
            </div>
          )}
          <div className="space-y-4">
            <div><label className="label-field">رابط المكان على Google Maps</label><input type="url" className="input-field" placeholder="https://maps.google.com/..." value={rateUrl} onChange={e => setRateUrl(e.target.value)} /></div>
            <div><label className="label-field">التقييم: {rateStars} نجوم</label><input type="range" min="1" max="5" value={rateStars} onChange={e => setRateStars(parseInt(e.target.value))} className="w-full" /></div>
            <div><label className="label-field">نص المراجعة</label><textarea className="textarea-field" rows={3} value={rateReview} onChange={e => setRateReview(e.target.value)} placeholder="اكتب مراجعتك هنا..." /></div>
            <button onClick={handleRate} disabled={loading || !sessionId || !rateUrl.trim()} className="btn-primary w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Star size={18} /> تقييم</>}</button>
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg">تسجيل الدخول</h3>
          {!sessionId ? (
            <div className="text-center py-8">
              <Star size={48} className="mx-auto mb-3 opacity-30 text-secondary-400" />
              <p className="text-secondary-500 mb-4">تحتاج إلى تسجيل الدخول بحساب Google للتقييم</p>
              <div className="space-y-3">
                <div><label className="label-field">البريد الإلكتروني</label><input type="text" className="input-field" placeholder="example@gmail.com" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} /></div>
                <div><label className="label-field">كلمة المرور</label><div className="relative"><input type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /><button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} /></div>
                <button onClick={handleLaunchBrowser} disabled={loading} className="btn-secondary w-full">{loading ? <Loader2 size={18} className="animate-spin" /> : <><ExternalLink size={18} /> فتح المتصفح يدوياً</>}</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-success-50 border border-success-100">
                <div className="flex items-center gap-2 mb-2"><CheckCircle size={20} className="text-success-600" /><span className="font-bold text-success-700">المتصفح مفتوح</span></div>
                <p className="text-sm text-success-600">يمكنك الآن استخدام أداة التقييم</p>
              </div>
              <button onClick={clearSession} className="btn-danger w-full"><ExternalLink size={18} /> إغلاق المتصفح وإنهاء الجلسة</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderTools = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary-800"><Settings size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">أدوات Google الإضافية</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {stubTools.map(tool => (
            <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-secondary-100"><tool.icon size={20} className="text-secondary-600" /></div>
              <h4 className="font-bold text-secondary-900 text-xs mt-2">{tool.name}</h4>
              <p className="text-[10px] text-secondary-500">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'maps': return renderMaps()
      case 'olx': return renderOlx()
      case 'rate': return renderRate()
      case 'tools': return renderTools()
      default: return renderMaps()
    }
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}
      <div className="flex gap-1 p-1.5 rounded-xl overflow-x-auto" style={{ background: 'rgba(241,245,249,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(226,232,240,0.5)' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="tab-button"
              style={isActive ? { color: '#000', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)', fontWeight: 600 } : {}}>
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
      {renderContent()}
    </div>
  )
}