import { useState } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import type { LucideIcon } from 'lucide-react'
import {
  Sparkles, Download, AtSign, Contact, Smile,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet,
  LogIn, LogOut, Wrench, Send, Phone, Crown,
} from 'lucide-react'

type ActiveTool = 'extract-hidden' | 'add-username' | 'add-phone' | 'react' | null
type ResultsOwner = 'extract-hidden' | 'add-username' | 'add-phone' | 'react' | null

const ACCENT = '#0088CC'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #0088CC, #facc15)'

export default function TelegramPremiumModule() {
  const {
    loading, setLoading, message, error, showMsg, sessionId, setSessionId,
    accounts, results, loadAccounts, loadResults, handleExport, clearResults,
    clearSession,
  } = usePlatform('telegram')
  const { accounts: allAccounts } = useAccountsStore()

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)
  const [toolResults, setToolResults] = useState<any[]>([])

  // --- Login state (shares telegram session) ---
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [needsCode, setNeedsCode] = useState(false)
  const [proxy, setProxy] = useState('')

  // --- Extract hidden members ---
  const [hiddenGroup, setHiddenGroup] = useState('')
  const [hiddenLimit, setHiddenLimit] = useState(500)
  // --- Add by username ---
  const [usernameTargetGroup, setUsernameTargetGroup] = useState('')
  const [usernameList, setUsernameList] = useState('')
  const [usernameDelay, setUsernameDelay] = useState(4)
  // --- Add by phone ---
  const [phoneTargetGroup, setPhoneTargetGroup] = useState('')
  const [phoneList, setPhoneList] = useState('')
  const [phoneDelay, setPhoneDelay] = useState(4)
  // --- React ---
  const [reactGroup, setReactGroup] = useState('')
  const [reactEmoji, setReactEmoji] = useState('❤️')
  const [reactCount, setReactCount] = useState(20)
  const [reactDelay, setReactDelay] = useState(2)

  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول إلى Telegram أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!phoneNumber.trim()) { showMsg('أدخل رقم الهاتف', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.telegramLogin({ phoneNumber, headless: false, proxy: proxy || undefined })
      if (res.success) {
        setSessionId(res.sessionId || '')
        if (res.needsCode) { setNeedsCode(true); showMsg('أدخل كود التحقق المرسل لهاتفك') }
        else { setNeedsCode(false); showMsg('تم فتح Telegram بنجاح'); setShowLoginPanel(false) }
        await loadAccounts()
      } else showMsg(res.error || 'فشل الاتصال', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleVerifyCode = async () => {
    if (!verifyCode || !sessionId) { showMsg('أدخل الكود', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.telegramVerifyCode({ sessionId, code: verifyCode })
      if (res.success) { setNeedsCode(false); showMsg('تم التحقق'); setShowLoginPanel(false); await loadAccounts() }
      else showMsg(res.error || 'فشل التحقق', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleExtractHidden = async () => {
    if (!ensureSession()) return
    if (!hiddenGroup.trim()) { showMsg('أدخل اسم المجموعة', true); return }
    setLoading(true)
    setResultsOwner('extract-hidden')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramPremiumExtractHidden({ sessionId, groupName: hiddenGroup.trim(), limit: hiddenLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} عضو مخفي`)
        await loadResults()
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleAddByUsername = async () => {
    if (!ensureSession()) return
    if (!usernameTargetGroup.trim()) { showMsg('أدخل المجموعة المستهدفة', true); return }
    const usernames = usernameList.split('\n').map(s => s.trim()).filter(Boolean)
    if (usernames.length === 0) { showMsg('أدخل قائمة Usernames', true); return }
    setLoading(true)
    setResultsOwner('add-username')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramPremiumAddByUsername({ sessionId, targetGroup: usernameTargetGroup.trim(), usernames, delayMs: Math.max(2, usernameDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'added').length
        showMsg(`تم إضافة ${ok} من ${usernames.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleAddByPhone = async () => {
    if (!ensureSession()) return
    if (!phoneTargetGroup.trim()) { showMsg('أدخل المجموعة المستهدفة', true); return }
    const phones = phoneList.split('\n').map(s => s.trim()).filter(Boolean)
    if (phones.length === 0) { showMsg('أدخل قائمة الأرقام', true); return }
    setLoading(true)
    setResultsOwner('add-phone')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramPremiumAddByPhone({ sessionId, targetGroup: phoneTargetGroup.trim(), phones, delayMs: Math.max(2, phoneDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'added').length
        showMsg(`تم إضافة ${ok} من ${phones.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleReact = async () => {
    if (!ensureSession()) return
    if (!reactGroup.trim()) { showMsg('أدخل اسم المجموعة', true); return }
    if (!reactEmoji.trim()) { showMsg('اختر إيموجي', true); return }
    setLoading(true)
    setResultsOwner('react')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramPremiumReact({ sessionId, groupName: reactGroup.trim(), emoji: reactEmoji, count: reactCount, delayMs: Math.max(1, reactDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'reacted').length
        showMsg(`تم التفاعل مع ${ok} رسالة`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleClearResults = () => {
    setToolResults([])
    setResultsOwner(null)
    clearResults()
  }

  const tools: Array<{
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: LucideIcon
    accent: string
    accentGradient: string
  }> = [
    { id: 'extract-hidden', name: 'استخراج الأعضاء المخفيين', description: 'مجموعات مفعّلة إخفاء الأعضاء', icon: Download, accent: '#facc15', accentGradient: 'linear-gradient(135deg, #facc15, #b45309)' },
    { id: 'add-username', name: 'إضافة بالـ Username', description: 'إضافة/نقل أعضاء بالـ @username', icon: AtSign, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)' },
    { id: 'add-phone', name: 'إضافة برقم الهاتف', description: 'إضافة/نقل أعضاء برقم الهاتف', icon: Phone, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)' },
    { id: 'react', name: 'تفاعل بالـ Emoji', description: 'تفاعل على الرسائل (Premium)', icon: Smile, accent: '#ec4899', accentGradient: 'linear-gradient(135deg, #ec4899, #be185d)' },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  // ---- Session card ----
  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(0,136,204,0.06), rgba(250,204,21,0.05))',
        border: '1px solid rgba(250,204,21,0.25)',
        boxShadow: '0 4px 20px rgba(250,204,21,0.08)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(250,204,21,0.3)' }}>
            <Crown size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Telegram Premium</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: sessionId ? '#22c55e' : '#94a3b8', boxShadow: sessionId ? '0 0 8px rgba(34,197,94,0.6)' : 'none' }} />
              <span className="text-xs font-medium" style={{ color: sessionId ? '#16a34a' : '#64748b' }}>
                {sessionId ? 'جلسة نشطة — جاهزة' : 'لا توجد جلسة'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionId ? (
            <button onClick={clearSession} className="btn-secondary text-xs"><LogOut size={14} /> إنهاء</button>
          ) : (
            <button onClick={() => setShowLoginPanel(true)} className="btn-primary text-sm" style={{ background: ACCENT_GRADIENT }}><LogIn size={16} /> تسجيل الدخول</button>
          )}
        </div>
      </div>
      <div className="px-5 py-3 border-t text-xs text-secondary-700" style={{ borderColor: 'rgba(250,204,21,0.2)', background: 'rgba(255,255,255,0.5)' }}>
        <AlertCircle size={12} className="inline ml-1 text-amber-600" />
        هذه الأدوات تتطلب حساب Telegram Premium لاستخدامها بشكل كامل. مع حساب عادي ستعمل الأدوات لكن قد تواجه قيوداً.
      </div>
    </div>
  )

  // ---- Login panel ----
  const renderLoginPanelContent = () => (
    <div className="space-y-5">
      {needsCode && (
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(250,204,21,0.06)', borderColor: 'rgba(250,204,21,0.25)' }}>
          <h4 className="font-bold text-secondary-900 mb-2">كود التحقق</h4>
          <div className="flex gap-2">
            <input type="text" className="input-field flex-1" placeholder="12345" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} />
            <button onClick={handleVerifyCode} disabled={loading || !verifyCode.trim()} className="btn-primary" style={{ background: ACCENT_GRADIENT }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'تحقق'}
            </button>
          </div>
        </div>
      )}
      <div>
        <label className="label-field">رقم الهاتف (مع رمز الدولة)</label>
        <input type="tel" className="input-field" placeholder="+2010xxxxxxxx" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
      </div>
      <div>
        <label className="label-field">بروكسي (اختياري)</label>
        <input type="text" className="input-field" value={proxy} onChange={e => setProxy(e.target.value)} placeholder="host:port" />
      </div>
    </div>
  )

  const loginFooter = (
    <button onClick={handleLogin} disabled={loading || !phoneNumber.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: ACCENT_GRADIENT }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> فتح Telegram Premium</>}
    </button>
  )

  // ---- Results table ----
  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string) => {
    if (resultsOwner !== owner) return null
    const list = toolResults.length > 0 ? toolResults : results
    if (list.length === 0) return null
    return (
      <div className="mt-5 rounded-xl border border-secondary-200 bg-white/60 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
          <h4 className="font-bold text-secondary-900 text-sm">النتائج ({list.length})</h4>
          <div className="flex gap-2">
            <button onClick={() => handleExport(columns, exportKey, toolResults)} className="btn-success text-xs"><FileSpreadsheet size={14} /> تصدير CSV</button>
            <button onClick={handleClearResults} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
          </div>
        </div>
        <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {list.map((r: any, i: number) => {
                if (owner === 'extract-hidden') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td dir="ltr" className="text-xs font-mono">{r.username || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'add-username') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td dir="ltr">@{r.username || '-'}</td>
                      <td><span className={`badge ${r.status === 'added' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'add-phone') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td dir="ltr" className="font-mono text-sm">{r.phone || '-'}</td>
                      <td><span className={`badge ${r.status === 'added' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'react') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td><span className={`badge ${r.status === 'reacted' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                return null
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ---- Panel bodies ----
  const renderExtractHiddenBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-700" style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        يعمل عبر تحليل سجل الرسائل واستخراج المرسلين الفريدين (يتجاوز قيود إخفاء قائمة الأعضاء).
      </div>
      <div>
        <label className="label-field">اسم المجموعة</label>
        <input type="text" className="input-field" value={hiddenGroup} onChange={e => setHiddenGroup(e.target.value)} placeholder="اسم المجموعة كما يظهر" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {hiddenLimit}</label>
        <input type="range" min={50} max={5000} step={50} className="w-full" style={{ accentColor: '#facc15' }} value={hiddenLimit} onChange={e => setHiddenLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-hidden', ['#', 'الاسم', 'Username'], 'tg-premium-hidden')}
    </div>
  )
  const extractHiddenFooter = (<button onClick={handleExtractHidden} disabled={loading || !hiddenGroup.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #facc15, #b45309)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> استخراج المخفيين</>}</button>)

  const renderAddByUsernameBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">المجموعة المستهدفة</label>
        <input type="text" className="input-field" value={usernameTargetGroup} onChange={e => setUsernameTargetGroup(e.target.value)} placeholder="اسم المجموعة" />
      </div>
      <div>
        <label className="label-field">قائمة الـ Usernames (سطر لكل username)</label>
        <textarea className="textarea-field" dir="ltr" rows={7} value={usernameList} onChange={e => setUsernameList(e.target.value)} placeholder="@username1&#10;@username2" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={60} className="input-field w-32" value={usernameDelay} onChange={e => setUsernameDelay(Number(e.target.value) || 4)} />
      </div>
      {renderResultsTable('add-username', ['#', 'Username', 'الحالة', 'خطأ'], 'tg-premium-add-user')}
    </div>
  )
  const addByUsernameFooter = (<button onClick={handleAddByUsername} disabled={loading || !usernameTargetGroup.trim() || !usernameList.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> إضافة</>}</button>)

  const renderAddByPhoneBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">المجموعة المستهدفة</label>
        <input type="text" className="input-field" value={phoneTargetGroup} onChange={e => setPhoneTargetGroup(e.target.value)} placeholder="اسم المجموعة" />
      </div>
      <div>
        <label className="label-field">قائمة الأرقام (سطر لكل رقم)</label>
        <textarea className="textarea-field font-mono" dir="ltr" rows={7} value={phoneList} onChange={e => setPhoneList(e.target.value)} placeholder="+2010xxxxxxxx" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={60} className="input-field w-32" value={phoneDelay} onChange={e => setPhoneDelay(Number(e.target.value) || 4)} />
      </div>
      {renderResultsTable('add-phone', ['#', 'الرقم', 'الحالة', 'خطأ'], 'tg-premium-add-phone')}
    </div>
  )
  const addByPhoneFooter = (<button onClick={handleAddByPhone} disabled={loading || !phoneTargetGroup.trim() || !phoneList.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Contact size={18} /> إضافة</>}</button>)

  const renderReactBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">اسم المجموعة/القناة</label>
        <input type="text" className="input-field" value={reactGroup} onChange={e => setReactGroup(e.target.value)} placeholder="اسم المجموعة كما يظهر" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label-field">الإيموجي</label>
          <input type="text" className="input-field text-2xl text-center" value={reactEmoji} onChange={e => setReactEmoji(e.target.value)} placeholder="❤️" />
        </div>
        <div>
          <label className="label-field">عدد الرسائل: {reactCount}</label>
          <input type="range" min={5} max={100} step={1} className="w-full accent-pink-500" value={reactCount} onChange={e => setReactCount(parseInt(e.target.value))} />
        </div>
        <div>
          <label className="label-field">الفاصل (ث)</label>
          <input type="number" min={1} max={20} className="input-field" value={reactDelay} onChange={e => setReactDelay(Number(e.target.value) || 2)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 text-2xl">
        {['❤️', '👍', '🔥', '😂', '😍', '👏', '🙏', '💯', '🎉', '✨'].map(emo => (
          <button key={emo} type="button" onClick={() => setReactEmoji(emo)} className="w-10 h-10 rounded-lg border hover:bg-secondary-50" style={reactEmoji === emo ? { background: 'rgba(236,72,153,0.08)', borderColor: '#ec4899' } : { borderColor: 'rgba(226,232,240,0.7)' }}>
            {emo}
          </button>
        ))}
      </div>
      {renderResultsTable('react', ['#', 'الحالة', 'خطأ'], 'tg-premium-react')}
    </div>
  )
  const reactFooter = (<button onClick={handleReact} disabled={loading || !reactGroup.trim() || !reactEmoji.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> تفاعل</>}</button>)

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    'extract-hidden': { body: renderExtractHiddenBody(), footer: extractHiddenFooter },
    'add-username': { body: renderAddByUsernameBody(), footer: addByUsernameFooter },
    'add-phone': { body: renderAddByPhoneBody(), footer: addByPhoneFooter },
    react: { body: renderReactBody(), footer: reactFooter },
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

      <AccountCycleBanner
        platformId="telegram"
        platformName="Telegram Premium"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={false}
        onOpenCycle={() => setActiveTool('extract-hidden')}
      />

      <ToolGrid
        title="أدوات Telegram Premium"
        subtitle="أدوات حصرية لحسابات Premium"
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
            locked={!sessionId}
            onClick={() => {
              if (!sessionId) {
                showMsg('يرجى تسجيل الدخول أولاً', true)
                setShowLoginPanel(true)
                return
              }
              setActiveTool(tool.id)
            }}
          />
        ))}
      </ToolGrid>

      {/* Saved accounts shortcut */}
      {accounts.length > 0 && (
        <div className="text-xs text-secondary-500">عدد الحسابات المحفوظة: {accounts.length}</div>
      )}

      <ToolPanel
        open={showLoginPanel}
        onClose={() => setShowLoginPanel(false)}
        title="تسجيل الدخول إلى Telegram Premium"
        subtitle="أدخل رقم الهاتف ثم كود التحقق"
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
