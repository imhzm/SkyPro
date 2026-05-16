import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import type { LucideIcon } from 'lucide-react'
import {
  LogIn, Download, Calendar, AtSign, Send, UserPlus, Megaphone, Repeat,
  Play, AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet,
  Eye, EyeOff, LogOut, Wrench, Twitter as TwitterIcon,
} from 'lucide-react'

type ActiveTool = 'extract' | 'follow' | 'retweet' | 'mention' | 'broadcast' | 'schedule' | null
type ResultsOwner = 'extract' | 'follow' | 'retweet' | 'mention' | 'broadcast' | null

const ACCENT = '#1DA1F2'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #1DA1F2, #1A91DA)'

export default function TwitterModule() {
  const {
    loading, setLoading, message, error, showMsg, sessionId, setSessionId,
    accounts, results, loadAccounts, loadResults, handleExport, clearResults,
    checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle,
  } = usePlatform('twitter')
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [extractUser, setExtractUser] = useState('')
  const [extractLimit, setExtractLimit] = useState(200)
  const [toolResults, setToolResults] = useState<any[]>([])
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)
  const [tweetText, setTweetText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [mentionTweetUrl, setMentionTweetUrl] = useState('')
  const [mentionUsers, setMentionUsers] = useState('')
  const [mentionMessage, setMentionMessage] = useState('')
  const [broadcastText, setBroadcastText] = useState('')
  const [followList, setFollowList] = useState('')
  const [retweetUrls, setRetweetUrls] = useState('')

  const twitterAccounts = allAccounts.filter(a => a.platform === 'twitter')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.twitterLogin({ username: loginForm.username, password: loginForm.password, headless: false, proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم تسجيل الدخول بنجاح!'); await loadAccounts(); setShowLoginPanel(false) }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLoginWithAccount = async (account: Account) => {
    setLoading(true)
    const sessionCheck = await checkSession()
    if (sessionCheck.alreadyLoggedIn) {
      showMsg(`جلسة نشطة - مسجل دخول بحساب ${account.username}`)
      setLoading(false)
      return
    }
    const hasPass = (!!account.has_password || !!(account.password && account.password.trim()))
    if (!hasPass) {
      setLoginForm({ ...loginForm, username: account.username, password: '' })
      setShowLoginPanel(true)
      setTimeout(() => passwordRef.current?.focus(), 200)
      showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة. يرجى إدخال كلمة المرور يدوياً.', true)
      setLoading(false)
      return
    }
    setLoginForm({ ...loginForm, username: account.username, password: account.password || '' })
    try {
      const res = await window.electronAPI.twitterLogin({ accountId: account.id, username: account.username, password: account.password, headless: false, proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!extractUser) { showMsg('أدخل اسم المستخدم', true); return }
    setLoading(true)
    setResultsOwner('extract')
    try {
      const res = await window.electronAPI.twitterExtractFollowers({ sessionId, username: extractUser, limit: extractLimit })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count || 0} متابع`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleSchedule = async () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return }
    if (!tweetText || !scheduledAt) { showMsg('أدخل النص والموعد', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.twitterScheduleTweet({ text: tweetText, scheduledAt })
      if (res.success) showMsg('تم حفظ التغريدة المجدولة')
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleTweet = async () => {
    if (!ensureSession()) return
    if (!broadcastText) { showMsg('أدخل نص التغريدة', true); return }
    setLoading(true)
    setResultsOwner('broadcast')
    try {
      const res = await window.electronAPI.twitterTweet({ sessionId, text: broadcastText })
      if (res.success) showMsg('تم نشر التغريدة بنجاح!')
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!ensureSession()) return
    const usernames = followList.split('\n').map(s => s.trim()).filter(Boolean)
    if (usernames.length === 0) { showMsg('أدخل قائمة الحسابات', true); return }
    setLoading(true)
    setResultsOwner('follow')
    try {
      const res = await window.electronAPI.twitterFollow({ sessionId, usernames })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'followed').length; showMsg(`تمت متابعة ${ok} من ${usernames.length} حساب`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleRetweet = async () => {
    if (!ensureSession()) return
    const urls = retweetUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط التغريدات', true); return }
    setLoading(true)
    setResultsOwner('retweet')
    try {
      const res = await window.electronAPI.twitterRetweet({ sessionId, tweetUrls: urls })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'retweeted').length; showMsg(`تم الريتويت ${ok} من ${urls.length}`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleMention = async () => {
    if (!ensureSession()) return
    const mentions = mentionUsers.split('\n').map(s => s.trim()).filter(Boolean)
    if (!mentionTweetUrl || mentions.length === 0) { showMsg('أدخل رابط التغريدة والمستخدمين', true); return }
    setLoading(true)
    setResultsOwner('mention')
    try {
      const res = await window.electronAPI.runTool({ platform: 'twitter', toolId: 'mention', toolName: 'منشن تويتر', params: { sessionId, postUrl: mentionTweetUrl, mentions, message: mentionMessage } })
      if (res.success) { showMsg('تم المنشن بنجاح'); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
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
    { id: 'extract', name: 'استخراج المتابعين', description: 'استخراج قائمة المتابعين والمعلومات', icon: Download, accent: '#1DA1F2', accentGradient: 'linear-gradient(135deg, #1DA1F2, #1A91DA)', requiresSession: true },
    { id: 'follow', name: 'متابعة تلقائية', description: 'متابعة قائمة حسابات بشكل آمن', icon: UserPlus, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', requiresSession: true },
    { id: 'retweet', name: 'إعادة تغريد', description: 'ريتويت قائمة تغريدات', icon: Repeat, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: true },
    { id: 'mention', name: 'منشن جماعي', description: 'منشن مستخدمين في تغريدة معينة', icon: AtSign, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: true },
    { id: 'broadcast', name: 'نشر تغريدة', description: 'نشر تغريدة جديدة الآن', icon: Megaphone, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: true },
    { id: 'schedule', name: 'جدولة تغريدة', description: 'جدولة تغريدة لموعد لاحق', icon: Calendar, accent: '#ef4444', accentGradient: 'linear-gradient(135deg, #ef4444, #b91c1c)', requiresSession: true },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(29,161,242,0.06), rgba(26,145,218,0.04))',
        border: '1px solid rgba(29,161,242,0.18)',
        boxShadow: '0 4px 20px rgba(29,161,242,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(29,161,242,0.3)' }}
          >
            <TwitterIcon size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Twitter</h3>
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
              style={{ background: ACCENT_GRADIENT }}
            >
              <LogIn size={16} /> تسجيل الدخول
            </button>
          )}
        </div>
      </div>

      {twitterAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(29,161,242,0.12)', background: 'rgba(255,255,255,0.5)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value
              setSelectedAccountId(id)
              const acc = twitterAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) {
                setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' })
                if (!acc.password?.trim()) {
                  setShowLoginPanel(true)
                  setTimeout(() => passwordRef.current?.focus(), 200)
                }
              }
            }}
          >
            <option value="">-- اختر حساب --</option>
            {twitterAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}
              </option>
            ))}
          </select>
          {selectedAccountId && (
            <button
              onClick={() => {
                const acc = twitterAccounts.find(a => a.id.toString() === selectedAccountId)
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
        <input
          type="text"
          className="input-field"
          placeholder="@username"
          value={loginForm.username}
          onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
        />
      </div>
      <div>
        <label className="label-field">كلمة المرور</label>
        <div className="relative">
          <input
            ref={passwordRef}
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
          placeholder="IP:Port أو http://user:pass@ip:port"
          value={loginForm.proxy}
          onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })}
        />
      </div>

      {accounts.length > 0 && (
        <div>
          <h4 className="font-bold text-secondary-900 text-sm mb-3">الحسابات المحفوظة على الجهاز</h4>
          <div className="space-y-2 max-h-[280px] overflow-y-auto scroll-container pr-1">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'rgba(29,161,242,0.1)', color: '#1DA1F2' }}>
                    {(acc.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 text-sm truncate">{acc.username}</p>
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
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}
    </button>
  )

  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string) => {
    if (resultsOwner !== owner) return null
    const displayResults = toolResults.length > 0 ? toolResults : results
    const list = displayResults
    if (list.length === 0) return null
    return (
      <div className="mt-5 rounded-xl border border-secondary-200 bg-white/60 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
          <h4 className="font-bold text-secondary-900 text-sm">النتائج ({list.length})</h4>
          <div className="flex gap-2">
            <button onClick={() => handleExport(columns, exportKey, toolResults)} className="btn-success text-xs">
              <FileSpreadsheet size={14} /> تصدير CSV
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
              {list.map((r: any, i: number) => {
                if (owner === 'extract') {
                  const extra = (() => { try { return JSON.parse(r.extra_data || '{}') } catch { return {} as any } })()
                  const userId = r.userId || extra.userId || extra.id || r.user_id || '-'
                  const name = r.name || extra.name || r.username || '-'
                  const profile = r.url || r.profile || extra.profile || extra.url || '-'
                  const phone = r.phone || extra.phone || '-'
                  const text = r.text || r.bio || extra.text || extra.bio || '-'
                  const source = r.source || extra.source || '-'
                  return (
                    <tr key={r.id || i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium text-sm">{name}</td>
                      <td className="text-xs font-mono text-blue-600">{userId}</td>
                      <td className="text-xs max-w-[150px] truncate">{profile !== '-' ? <a href={profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.substring(0, 40)}...</a> : '-'}</td>
                      <td className="text-xs">{phone}</td>
                      <td className="text-xs max-w-[200px] truncate">{text}</td>
                      <td className="text-xs">{source}</td>
                    </tr>
                  )
                }
                if (owner === 'follow') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || r.user || r.name || r.recipient || '-'}</td>
                      <td><span className={`badge ${r.status === 'followed' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                if (owner === 'retweet') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[300px] truncate">{r.url || r.tweetUrl || r.name || '-'}</td>
                      <td><span className={`badge ${r.status === 'retweeted' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                if (owner === 'mention') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[300px] truncate">{r.username || r.name || r.recipient || JSON.stringify(r).substring(0, 80)}</td>
                      <td><span className={`badge ${r.status === 'mentioned' || r.status === 'sent' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                // broadcast
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{r.recipient || r.name || '-'}</td>
                    <td><span className={`badge ${r.status === 'sent' || r.status === 'posted' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
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

  const renderExtractBody = () => (
    <div className="space-y-5">
      <AccountSelector
        platformId="twitter"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType: 'followers', targetUser: extractUser, username: extractUser, limit: extractLimit } }}
        sendTask={{ type: 'send', params: { text: broadcastText } }}
      />
      <div>
        <label className="label-field">اسم المستخدم</label>
        <input type="text" className="input-field" placeholder="@username أو اتركه فارغاً لحسابك" value={extractUser} onChange={e => setExtractUser(e.target.value)} />
      </div>
      <div>
        <label className="label-field">الحد الأقصى للنتائج: {extractLimit}</label>
        <input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-blue-600" />
      </div>
      {renderResultsTable('extract', ['#', 'الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'النص', 'المصدر'], 'twitter-extract')}
    </div>
  )

  const extractFooter = (
    <button
      onClick={handleExtract}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}
    </button>
  )

  const renderFollowBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">قائمة الحسابات (سطر لكل حساب)</label>
        <textarea className="textarea-field" rows={8} value={followList} onChange={e => setFollowList(e.target.value)} placeholder="user1&#10;user2&#10;user3" />
      </div>
      {renderResultsTable('follow', ['#', 'الحساب', 'الحالة'], 'twitter-follow')}
    </div>
  )

  const followFooter = (
    <button
      onClick={handleFollow}
      disabled={loading || !followList.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> بدء المتابعة</>}
    </button>
  )

  const renderRetweetBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط التغريدات (سطر لكل رابط)</label>
        <textarea className="textarea-field" rows={8} value={retweetUrls} onChange={e => setRetweetUrls(e.target.value)} placeholder="https://x.com/user/status/...&#10;https://x.com/user/status/..." />
      </div>
      {renderResultsTable('retweet', ['#', 'الرابط', 'الحالة'], 'twitter-retweet')}
    </div>
  )

  const retweetFooter = (
    <button
      onClick={handleRetweet}
      disabled={loading || !retweetUrls.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Repeat size={18} /> بدء الريتويت</>}
    </button>
  )

  const renderMentionBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط التغريدة</label>
        <input type="url" className="input-field" placeholder="https://x.com/user/status/..." value={mentionTweetUrl} onChange={e => setMentionTweetUrl(e.target.value)} />
      </div>
      <div>
        <label className="label-field">المستخدمين للمنشن (سطر لكل اسم)</label>
        <textarea className="textarea-field" rows={5} value={mentionUsers} onChange={e => setMentionUsers(e.target.value)} placeholder="user1&#10;user2" />
      </div>
      <div>
        <label className="label-field">نص التعليق (اختياري)</label>
        <textarea className="textarea-field" rows={3} value={mentionMessage} onChange={e => setMentionMessage(e.target.value)} placeholder="...تعليقك مع المنشن" />
      </div>
      {renderResultsTable('mention', ['#', 'التفاصيل', 'الحالة'], 'twitter-mention')}
    </div>
  )

  const mentionFooter = (
    <button
      onClick={handleMention}
      disabled={loading || !mentionTweetUrl || !mentionUsers.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> بدء المنشن</>}
    </button>
  )

  const renderBroadcastBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">نص التغريدة</label>
        <textarea className="textarea-field" rows={6} value={broadcastText} onChange={e => setBroadcastText(e.target.value)} placeholder="اكتب تغريدتك هنا..." />
      </div>
      {renderResultsTable('broadcast', ['#', 'المستلم', 'الحالة', 'خطأ'], 'twitter-broadcast')}
    </div>
  )

  const broadcastFooter = (
    <button
      onClick={handleTweet}
      disabled={loading || !broadcastText.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> نشر التغريدة</>}
    </button>
  )

  const renderScheduleBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">نص التغريدة</label>
        <textarea className="textarea-field" rows={5} value={tweetText} onChange={e => setTweetText(e.target.value)} placeholder="اكتب التغريدة المجدولة..." />
      </div>
      <div>
        <label className="label-field">الموعد</label>
        <input type="datetime-local" className="input-field" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
      </div>
    </div>
  )

  const scheduleFooter = (
    <button
      onClick={handleSchedule}
      disabled={loading || !tweetText.trim() || !scheduledAt}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Calendar size={18} /> جدولة</>}
    </button>
  )

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    extract: { body: renderExtractBody(), footer: extractFooter },
    follow: { body: renderFollowBody(), footer: followFooter },
    retweet: { body: renderRetweetBody(), footer: retweetFooter },
    mention: { body: renderMentionBody(), footer: mentionFooter },
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    schedule: { body: renderScheduleBody(), footer: scheduleFooter },
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
        platformId="twitter"
        platformName="Twitter / X"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('extract')}
      />

      <ToolGrid
        title="أدوات Twitter"
        subtitle="اختر أداة لفتح إعدادات الحملة الخاصة بها"
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
        title="تسجيل الدخول إلى Twitter"
        subtitle="ابدأ جلسة جديدة لتشغيل الأدوات"
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
