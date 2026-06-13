import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { getBackgroundMode } from '../../lib/backgroundMode'
import { makeJobId } from '../../lib/jobId'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import {
  LogIn, Send, Users,
  AlertCircle, CheckCircle, Loader2, Trash2, Eye, EyeOff,
  Image as ImageIcon, X, FileSpreadsheet, ExternalLink,
  LogOut, Wrench, Ghost,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ActiveTool = 'broadcast' | 'extract-friends' | null
type ResultsOwner = 'broadcast' | 'extract-friends' | null

const ACCENT_GRADIENT = 'linear-gradient(135deg, #FFD400, #f5c800)'
const ACCENT_DARK = '#a17800'

export default function SnapchatModule() {
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, handleExport, clearResults, clearSession, checkSession, cycleActive, cycleProgress, startCycle, stopCycle, liveRows, beginLiveJob } = usePlatform('snapchat')

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [showPassword, setShowPassword] = useState(false)
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [broadcastRecipients, setBroadcastRecipients] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcastImagePath, setBroadcastImagePath] = useState<string>('')
  const broadcastImgInputRef = useRef<HTMLInputElement | null>(null)
  const [broadcastDelay, setBroadcastDelay] = useState(5)
  const [extractFriendsLimit, setExtractFriendsLimit] = useState(200)
  const [toolResults, setToolResults] = useState<any[]>([])

  const snapchatAccounts = allAccounts.filter(a => a.platform === 'snapchat')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.snapchatLogin({ username: loginForm.username, password: loginForm.password, headless: getBackgroundMode('snapchat'), proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(res.message || 'تم تسجيل الدخول بنجاح!'); await loadAllAccounts(); setShowLoginPanel(false) }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLoginWithAccount = async (account: Account) => {
    setLoading(true)
    const sessionCheck = await checkSession()
    if (sessionCheck.alreadyLoggedIn) { showMsg(`جلسة نشطة - مسجل دخول بحساب ${account.username}`); setLoading(false); return }
    const hasPass = (!!account.has_password || !!(account.password && account.password.trim()))
    if (!hasPass) { setLoginForm({ ...loginForm, username: account.username, password: '' }); setShowLoginPanel(true); setTimeout(() => passwordRef.current?.focus(), 200); showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة. يرجى إدخال كلمة المرور يدوياً.', true); setLoading(false); return }
    setLoginForm({ ...loginForm, username: account.username, password: account.password || '' })
    try {
      const res = await window.electronAPI.snapchatLogin({ accountId: account.id, username: account.username, password: account.password, headless: getBackgroundMode('snapchat'), proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || 'snapchat-session'); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLaunchBrowser = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.launchBrowser({ platform: 'snapchat', headless: getBackgroundMode('snapchat') })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم فتح المتصفح - سجل دخول يدوياً'); setShowLoginPanel(false) }
      else showMsg(res.error || 'فشل فتح المتصفح', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handlePickBroadcastImage = () => broadcastImgInputRef.current?.click()
  const handleBroadcastImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const p = (files[0] as any).path
    if (p) setBroadcastImagePath(p)
    if (broadcastImgInputRef.current) broadcastImgInputRef.current.value = ''
  }

  const handleBroadcast = async () => {
    if (!ensureSession()) return
    const recipients = broadcastRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (recipients.length === 0) { showMsg('أدخل المستلمين', true); return }
    if (!broadcastMessage && !broadcastImagePath) { showMsg('أدخل رسالة أو صورة', true); return }
    setLoading(true)
    setResultsOwner('broadcast')
    setToolResults([])
    const jobId = makeJobId('snap-send')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.snapchatBroadcast({ sessionId, usernames: recipients, message: broadcastMessage, imagePath: broadcastImagePath || undefined, delayMs: Math.max(3, broadcastDelay) * 1000, jobId })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const sent = items.filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال ${sent} من ${recipients.length}`)
      } else {
        showMsg(res.error || 'فشل العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExtractFriends = async () => {
    if (!ensureSession()) return
    setLoading(true)
    setResultsOwner('extract-friends')
    setToolResults([])
    const jobId = makeJobId('snap-friends')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.snapchatExtractFriends({ sessionId, limit: extractFriendsLimit, jobId })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} صديق`)
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
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
    requiresSession: boolean
  }> = [
    { id: 'broadcast', name: 'إرسال رسائل', description: 'إرسال للأصدقاء (نص + صورة)', icon: Send, accent: '#FFD400', accentGradient: 'linear-gradient(135deg, #FFD400, #f5c800)', requiresSession: true },
    { id: 'extract-friends', name: 'استخراج الأصدقاء', description: 'قائمة الأصدقاء', icon: Users, accent: '#ec4899', accentGradient: 'linear-gradient(135deg, #ec4899, #be185d)', requiresSession: true },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  // ----- Session card -----
  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,212,0,0.10), rgba(245,200,0,0.05))',
        border: '1px solid rgba(255,212,0,0.30)',
        boxShadow: '0 4px 20px rgba(255,212,0,0.08)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(255,212,0,0.4)', color: '#1a1a1a' }}
          >
            <Ghost size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Snapchat</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: sessionId ? '#22c55e' : '#94a3b8',
                  boxShadow: sessionId ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                }}
              />
              <span className="text-xs font-medium" style={{ color: sessionId ? '#16a34a' : '#64748b' }}>
                {sessionId ? 'جلسة نشطة — جاهز للعمل' : 'لا توجد جلسة — سجل الدخول أولاً'}
              </span>
              {accounts.length > 0 && (
                <span className="text-[11px] text-secondary-500">• {accounts.length} حساب محفوظ</span>
              )}
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
              style={{ background: ACCENT_GRADIENT, color: '#1a1a1a' }}
            >
              <LogIn size={16} /> تسجيل الدخول
            </button>
          )}
        </div>
      </div>

      {snapchatAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(255,212,0,0.25)', background: 'var(--panel-bg)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value
              setSelectedAccountId(id)
              const acc = snapchatAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) {
                setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' })
                if (!acc.password?.trim()) { setShowLoginPanel(true); setTimeout(() => passwordRef.current?.focus(), 200) }
              }
            }}
          >
            <option value="">-- اختر حساب --</option>
            {snapchatAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}
              </option>
            ))}
          </select>
          {selectedAccountId && (
            <button
              onClick={() => {
                const acc = snapchatAccounts.find(a => a.id.toString() === selectedAccountId)
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

  // ----- Login panel -----
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
        <label className="label-field">اسم المستخدم أو البريد</label>
        <input type="text" className="input-field" placeholder="username أو email" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
      </div>
      <div>
        <label className="label-field">كلمة المرور</label>
        <div className="relative">
          <input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div>
        <label className="label-field">بروكسي (اختياري)</label>
        <input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} />
      </div>
      <button onClick={handleLaunchBrowser} disabled={loading} className="btn-secondary w-full">
        {loading ? <Loader2 size={18} className="animate-spin" /> : <><ExternalLink size={18} /> فتح المتصفح يدوياً</>}
      </button>

      {accounts.length > 0 && (
        <div>
          <h4 className="font-bold text-secondary-900 text-sm mb-3">الحسابات المحفوظة على الجهاز</h4>
          <div className="space-y-2 max-h-[280px] overflow-y-auto scroll-container pr-1">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'rgba(255,212,0,0.20)', color: ACCENT_DARK }}>
                    {(acc.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 text-sm truncate">{acc.username || 'حساب سناب شات'}</p>
                    <p className="text-[11px] text-secondary-500">
                      {new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}
                      {acc.password?.trim() ? ' • باسورد محفوظ' : ' • بدون باسورد'}
                    </p>
                  </div>
                </div>
                <span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                  {acc.status === 'active' ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const loginFooter = (
    <button
      onClick={handleLogin}
      disabled={loading || !loginForm.username || !loginForm.password}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT, color: '#1a1a1a' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}
    </button>
  )

  // ----- Results table -----
  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string) => {
    if (resultsOwner !== owner) return null
    const displayResults = toolResults.length > 0 ? toolResults : liveRows
    if (displayResults.length === 0) return null
    return (
      <div className="mt-5 rounded-xl border border-secondary-200 bg-white/60 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
          <h4 className="font-bold text-secondary-900 text-sm">النتائج ({displayResults.length}){loading && <span className="text-emerald-600 animate-pulse"> • مباشر ⚡</span>}</h4>
          <div className="flex gap-2">
            <button onClick={() => handleExport(columns, exportKey, toolResults)} className="btn-success text-xs">
              <FileSpreadsheet size={14} /> تصدير
            </button>
            <button onClick={handleClearResults} className="btn-danger text-xs">
              <Trash2 size={14} /> مسح
            </button>
          </div>
        </div>
        <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {displayResults.map((r: any, i: number) => {
                if (owner === 'extract-friends') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td dir="ltr" className="text-xs font-mono">{r.username || '-'}</td>
                    </tr>
                  )
                }
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{r.username || r.recipient || '-'}</td>
                    <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : 'badge-danger'}`}>{r.status || '-'}</span></td>
                    <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ----- Tool bodies -----
  const renderBroadcastBody = () => (
    <div className="space-y-5">
      <AccountSelector
        platformId="snapchat"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType: 'snapchat-broadcast', usernames: broadcastRecipients.split('\n').filter(Boolean), message: broadcastMessage } }}
        sendTask={{ type: 'send', params: { usernames: broadcastRecipients.split('\n').filter(Boolean), message: broadcastMessage } }}
      />
      <div>
        <label className="label-field">المستلمين (username - سطر لكل مستخدم)</label>
        <textarea className="textarea-field" rows={5} value={broadcastRecipients} onChange={e => setBroadcastRecipients(e.target.value)} placeholder="user1&#10;user2" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك..." />
      </div>
      <div>
        <label className="label-field">صورة (اختياري)</label>
        <input ref={broadcastImgInputRef} type="file" accept="image/*" onChange={handleBroadcastImageSelected} className="hidden" />
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={handlePickBroadcastImage} className="btn-secondary text-sm"><ImageIcon size={16} /> اختر صورة</button>
          {broadcastImagePath && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/70 border border-secondary-100">
              <span className="text-xs truncate max-w-[280px]" dir="ltr">{broadcastImagePath}</span>
              <button type="button" onClick={() => setBroadcastImagePath('')} className="text-danger-500 p-1 hover:bg-danger-50 rounded"><X size={14} /></button>
            </div>
          )}
        </div>
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={3} max={60} className="input-field w-32" value={broadcastDelay} onChange={e => setBroadcastDelay(Number(e.target.value) || 5)} />
      </div>
      {renderResultsTable('broadcast', ['#', 'المستلم', 'الحالة', 'خطأ'], 'snapchat-broadcast')}
    </div>
  )

  const broadcastFooter = (
    <button onClick={handleBroadcast} disabled={loading || !sessionId || !broadcastRecipients.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: ACCENT_GRADIENT, color: '#1a1a1a' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال</>}
    </button>
  )

  const renderExtractFriendsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الحد الأقصى: {extractFriendsLimit}</label>
        <input type="range" min={20} max={2000} step={20} className="w-full accent-pink-500" value={extractFriendsLimit} onChange={e => setExtractFriendsLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-friends', ['#', 'الاسم', 'Username'], 'snapchat-friends')}
    </div>
  )
  const extractFriendsFooter = (
    <button onClick={handleExtractFriends} disabled={loading || !sessionId} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Users size={18} /> استخراج الأصدقاء</>}
    </button>
  )

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    'extract-friends': { body: renderExtractFriendsBody(), footer: extractFriendsFooter },
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`}
          style={message
            ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }
            : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      {renderSessionCard()}

      <AccountCycleBanner
        platformId="snapchat"
        platformName="Snapchat"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('broadcast')}
      />

      <ToolGrid
        title="أدوات Snapchat"
        subtitle="اختر أداة لفتح إعدادات الحملة الخاصة بها"
        icon={Wrench}
        accent={ACCENT_DARK}
        cols={2}
      >
        {tools.map(tool => (
          <ToolCard
            key={tool.id}
            icon={tool.icon}
            name={tool.name}
            description={tool.description}
            accent={tool.accent}
            accentGradient={tool.accentGradient}
            locked={tool.requiresSession && !sessionId}
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
        title="تسجيل الدخول إلى Snapchat"
        subtitle="ابدأ جلسة جديدة لتشغيل الأدوات"
        icon={LogIn}
        accent={ACCENT_DARK}
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
        accent={currentTool?.accent ?? ACCENT_DARK}
        accentGradient={currentTool?.accentGradient}
        width="lg"
        footer={activeTool ? panelMap[activeTool].footer : null}
      >
        {activeTool ? panelMap[activeTool].body : null}
      </ToolPanel>
    </div>
  )
}
