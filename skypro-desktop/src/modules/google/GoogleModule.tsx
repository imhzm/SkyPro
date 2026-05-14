import { useState } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import {
  MapPin, Globe, Star, Mail, Users, Zap,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet,
  Download, Eye, EyeOff, ExternalLink, LogIn, LogOut, Settings, Phone, Search, Wrench,
} from 'lucide-react'

type ActiveTool = 'maps' | 'olx' | 'rate' | 'tools' | null
type ResultsOwner = 'maps' | 'olx' | null

const ACCENT = '#4285F4'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #4285F4, #1a73e8)'

export default function GoogleModule() {
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle, handleExport } = usePlatform('google')

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)

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
    setResultsOwner('maps')
    try {
      const res = await window.electronAPI.googleMapsExtract({ searchQuery: mapsQuery, location: mapsLocation, limit: mapsLimit })
      if (res.success && res.data) { setMapsResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count ?? res.data?.length ?? 0}`) }
      else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleOlxExtract = async () => {
    setLoading(true)
    setResultsOwner('olx')
    try {
      const res = await window.electronAPI.olxExtract({ country: olxCountry, category: olxCategory, limit: olxLimit })
      if (res.success && res.data) { setOlxResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count ?? res.data?.length ?? 0}`) }
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
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم فتح المتصفح - سجل الدخول بحساب Google'); setShowLoginPanel(false) }
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
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(`تم فتح المتصفح - سجل الدخول بحساب ${account.username}`) }
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

  const tools: Array<{
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: typeof MapPin
    accent: string
    accentGradient: string
    requiresSession: boolean
  }> = [
    { id: 'maps', name: 'خرائط جوجل', description: 'استخراج بيانات الأنشطة التجارية', icon: MapPin, accent: '#4285F4', accentGradient: 'linear-gradient(135deg, #4285F4, #1a73e8)', requiresSession: false },
    { id: 'olx', name: 'OLX', description: 'استخراج الإعلانات من OLX', icon: Globe, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: false },
    { id: 'rate', name: 'تقييم Google', description: 'إرسال تقييمات لأماكن Google Maps', icon: Star, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: true },
    { id: 'tools', name: 'أدوات إضافية', description: 'أدوات مساعدة قادمة قريباً', icon: Settings, accent: '#64748b', accentGradient: 'linear-gradient(135deg, #64748b, #475569)', requiresSession: false },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  // ----- Session / Login Header Card -----
  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(66,133,244,0.06), rgba(26,115,232,0.04))',
        border: '1px solid rgba(66,133,244,0.18)',
        boxShadow: '0 4px 20px rgba(66,133,244,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(66,133,244,0.3)' }}
          >
            <Search size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Google</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: sessionId ? '#22c55e' : '#94a3b8',
                  boxShadow: sessionId ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                }}
              />
              <span className="text-xs font-medium" style={{ color: sessionId ? '#16a34a' : '#64748b' }}>
                {sessionId ? 'جلسة نشطة — جاهز للعمل' : 'لا توجد جلسة — سجل الدخول للتقييم'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessionId ? (
            <button onClick={clearSession} className="btn-secondary text-xs">
              <LogOut size={14} /> إنهاء الجلسة
            </button>
          ) : (
            <button
              onClick={() => setShowLoginPanel(true)}
              className="btn-primary text-sm"
              style={{ background: ACCENT_GRADIENT }}
            >
              <LogIn size={16} /> تسجيل الدخول
            </button>
          )}
        </div>
      </div>

      {googleAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(66,133,244,0.12)', background: 'rgba(255,255,255,0.5)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value
              setSelectedAccountId(id)
              const acc = googleAccounts.find(a => a.id.toString() === id)
              if (acc) setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' })
            }}
          >
            <option value="">-- اختر حساب --</option>
            {googleAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.username}</option>
            ))}
          </select>
          {selectedAccountId && (
            <button
              onClick={() => {
                const acc = googleAccounts.find(a => a.id.toString() === selectedAccountId)
                if (acc) handleLoginWithAccount(acc)
              }}
              disabled={loading}
              className="btn-success text-xs"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <><LogIn size={14} /> دخول</>}
            </button>
          )}
        </div>
      )}
    </div>
  )

  // ----- Login Panel content -----
  const renderLoginPanelContent = () => (
    <div className="space-y-5">
      {sessionId && (
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-success-600" />
            <p className="font-semibold text-success-700 text-sm">جلسة نشطة — يمكنك استخدام جميع الأدوات</p>
          </div>
        </div>
      )}
      <div>
        <label className="label-field">البريد الإلكتروني</label>
        <input
          type="text"
          className="input-field"
          placeholder="example@gmail.com"
          value={loginForm.username}
          onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
        />
      </div>
      <div>
        <label className="label-field">كلمة المرور</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="input-field pl-10"
            placeholder="••••••••"
            value={loginForm.password}
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div>
        <label className="label-field">بروكسي (اختياري)</label>
        <input
          type="text"
          className="input-field"
          placeholder="IP:Port"
          value={loginForm.proxy}
          onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })}
        />
      </div>
      <p className="text-xs text-secondary-500">
        ملاحظة: تسجيل الدخول إلى Google يتم يدوياً عبر المتصفح بعد فتحه.
      </p>
    </div>
  )

  const loginFooter = (
    <button
      onClick={handleLaunchBrowser}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><ExternalLink size={18} /> فتح المتصفح يدوياً</>}
    </button>
  )

  // ----- Tool panel bodies -----
  const renderMapsBody = () => (
    <div className="space-y-5">
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
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label-field">نوع النشاط التجاري</label><input type="text" className="input-field" placeholder="مثال: مطاعم، عيادات، محلات..." value={mapsQuery} onChange={e => setMapsQuery(e.target.value)} /></div>
        <div><label className="label-field">المدينة / المنطقة</label><input type="text" className="input-field" placeholder="مثال: القاهرة، جدة، دبي..." value={mapsLocation} onChange={e => setMapsLocation(e.target.value)} /></div>
      </div>
      <div><label className="label-field">الحد الأقصى: {mapsLimit}</label><input type="range" min="10" max="200" value={mapsLimit} onChange={e => setMapsLimit(parseInt(e.target.value))} className="w-full" /></div>

      {resultsOwner === 'maps' && mapsResults.length > 0 && (
        <div className="mt-5 rounded-xl border border-secondary-200 bg-white/60 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
            <h4 className="font-bold text-secondary-900 text-sm">النتائج ({mapsResults.length})</h4>
            <div className="flex gap-2">
              <button onClick={handleExportMaps} className="btn-success text-xs"><FileSpreadsheet size={14} /> تصدير CSV</button>
              <button onClick={() => { setMapsResults([]); setResultsOwner(null) }} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
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

  const mapsFooter = (
    <button
      onClick={handleMapsExtract}
      disabled={loading || !mapsQuery.trim() || !mapsLocation.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #4285F4, #1a73e8)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}
    </button>
  )

  const renderOlxBody = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label-field">الدولة</label><select className="select-field" value={olxCountry} onChange={e => setOlxCountry(e.target.value)}>{countries.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div><label className="label-field">الفئة</label><select className="select-field" value={olxCategory} onChange={e => setOlxCategory(e.target.value)}>{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
      </div>
      <div><label className="label-field">الحد الأقصى: {olxLimit}</label><input type="range" min="10" max="200" value={olxLimit} onChange={e => setOlxLimit(parseInt(e.target.value))} className="w-full" /></div>

      {resultsOwner === 'olx' && olxResults.length > 0 && (
        <div className="mt-5 rounded-xl border border-secondary-200 bg-white/60 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
            <h4 className="font-bold text-secondary-900 text-sm">الإعلانات ({olxResults.length})</h4>
            <div className="flex gap-2">
              <button onClick={handleExportOlx} className="btn-success text-xs"><FileSpreadsheet size={14} /> تصدير CSV</button>
              <button onClick={() => { setOlxResults([]); setResultsOwner(null) }} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
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

  const olxFooter = (
    <button
      onClick={handleOlxExtract}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}
    </button>
  )

  const renderRateBody = () => (
    <div className="space-y-5">
      <div><label className="label-field">رابط المكان على Google Maps</label><input type="url" className="input-field" placeholder="https://maps.google.com/..." value={rateUrl} onChange={e => setRateUrl(e.target.value)} /></div>
      <div><label className="label-field">التقييم: {rateStars} نجوم</label><input type="range" min="1" max="5" value={rateStars} onChange={e => setRateStars(parseInt(e.target.value))} className="w-full" /></div>
      <div><label className="label-field">نص المراجعة</label><textarea className="textarea-field" rows={3} value={rateReview} onChange={e => setRateReview(e.target.value)} placeholder="اكتب مراجعتك هنا..." /></div>
    </div>
  )

  const rateFooter = (
    <button
      onClick={handleRate}
      disabled={loading || !sessionId || !rateUrl.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Star size={18} /> تقييم</>}
    </button>
  )

  const renderToolsBody = () => (
    <div className="grid grid-cols-2 gap-4">
      {stubTools.map(tool => (
        <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
          <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
          <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-secondary-100"><tool.icon size={20} className="text-secondary-600" /></div>
          <h4 className="font-bold text-secondary-900 text-xs mt-2">{tool.name}</h4>
          <p className="text-[10px] text-secondary-500">{tool.desc}</p>
        </div>
      ))}
    </div>
  )

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    maps: { body: renderMapsBody(), footer: mapsFooter },
    olx: { body: renderOlxBody(), footer: olxFooter },
    rate: { body: renderRateBody(), footer: rateFooter },
    tools: { body: renderToolsBody(), footer: null },
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      {renderSessionCard()}

      <ToolGrid
        title="أدوات Google"
        subtitle="اختر أداة لفتح إعداداتها"
        icon={Wrench}
        accent={ACCENT}
        cols={4}
      >
        {tools.map(tool => (
          <ToolCard
            key={tool.id}
            icon={tool.icon}
            name={tool.name}
            description={tool.description}
            accent={tool.accent}
            accentGradient={tool.accentGradient}
            badge={tool.requiresSession && !sessionId ? 'يتطلب دخول' : undefined}
            badgeTone={tool.requiresSession && !sessionId ? 'warning' : 'primary'}
            onClick={() => {
              if (tool.requiresSession && !sessionId) {
                showMsg('يرجى تسجيل الدخول أولاً', true)
                setShowLoginPanel(true)
                return
              }
              setActiveTool(tool.id)
            }}
          />
        ))}
      </ToolGrid>

      <ToolPanel
        open={showLoginPanel}
        onClose={() => setShowLoginPanel(false)}
        title="تسجيل الدخول إلى Google"
        subtitle="افتح المتصفح وسجل الدخول بحساب Google"
        icon={LogIn}
        accent={ACCENT}
        accentGradient={ACCENT_GRADIENT}
        width="md"
        footer={loginFooter}
      >
        {renderLoginPanelContent()}
      </ToolPanel>

      <ToolPanel
        open={activeTool !== null}
        onClose={() => setActiveTool(null)}
        title={currentTool?.name ?? ''}
        subtitle={currentTool?.description}
        icon={currentTool?.icon}
        accent={currentTool?.accent ?? ACCENT}
        accentGradient={currentTool?.accentGradient}
        width="lg"
        footer={activeTool ? panelMap[activeTool].footer : null}
      >
        {activeTool ? panelMap[activeTool].body : null}
      </ToolPanel>
    </div>
  )
}
