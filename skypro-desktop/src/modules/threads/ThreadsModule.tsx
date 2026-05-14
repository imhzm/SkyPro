import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import {
  LogIn, Download, AtSign, Send,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet, Eye, EyeOff,
  Users, MessageSquare, Heart, Hash, Settings, ExternalLink, Megaphone,
  LogOut, Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ActiveTool = 'extract' | 'mention' | 'broadcast' | 'more' | null
type ResultsOwner = 'extract' | 'mention' | 'broadcast' | null

const ACCENT = '#000000'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #1a1a1a, #404040)'

export default function ThreadsModule() {
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadResults, handleExport, clearResults, deleteResult, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('threads')

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [showPassword, setShowPassword] = useState(false)
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [extractUrl, setExtractUrl] = useState('')
  const [extractLimit, setExtractLimit] = useState(50)
  const [mentionUrl, setMentionUrl] = useState('')
  const [mentionUsers, setMentionUsers] = useState('')
  const [mentionMessage, setMentionMessage] = useState('')
  const [broadcastRecipients, setBroadcastRecipients] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [toolResults, setToolResults] = useState<any[]>([])

  const threadsAccounts = allAccounts.filter(a => a.platform === 'threads')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.threadsLogin({ username: loginForm.username, password: loginForm.password, headless: false, proxy: loginForm.proxy || undefined })
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
    if (!hasPass) { setLoginForm({ ...loginForm, username: account.username, password: '' }); setShowLoginPanel(true); setTimeout(() => passwordRef.current?.focus(), 200); showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة.', true); setLoading(false); return }
    setLoginForm({ ...loginForm, username: account.username, password: account.password || '' })
    try {
      const res = await window.electronAPI.threadsLogin({ accountId: account.id, username: account.username, password: account.password, headless: false, proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || 'threads-session'); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLaunchBrowser = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.launchBrowser({ platform: 'threads', headless: false })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم فتح المتصفح'); setShowLoginPanel(false) }
      else showMsg(res.error || 'فشل فتح المتصفح', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!extractUrl) { showMsg('أدخل رابط المنشور أو الحساب', true); return }
    setLoading(true)
    setResultsOwner('extract')
    try {
      const res = await window.electronAPI.threadsExtract({ sessionId, url: extractUrl, limit: extractLimit })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count || ((res.data as any[]) || []).length}`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleMention = async () => {
    if (!ensureSession()) return
    const mentions = mentionUsers.split('\n').map(s => s.trim()).filter(Boolean)
    if (!mentionUrl || mentions.length === 0) { showMsg('أدخل الرابط والمستخدمين', true); return }
    setLoading(true)
    setResultsOwner('mention')
    try {
      const res = await window.electronAPI.threadsMention({ sessionId, postUrl: mentionUrl, mentions, message: mentionMessage })
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

  const extractStubTools = [
    { id: 'page-likers', name: 'استخراج معجبين المنشورات', desc: 'المعجبين', icon: Heart },
    { id: 'post-comments', name: 'استخراج التعليقات', desc: 'تعليقات المنشورات', icon: MessageSquare },
    { id: 'followers', name: 'استخراج المتابعين', desc: 'قائمة المتابعين', icon: Users },
    { id: 'hashtag', name: 'استخراج الهاشتاجات', desc: 'من الهاشتاجات', icon: Hash },
  ]

  const stubTools = [
    { id: 'follow-send', name: 'متابعة وإرسال رسائل', desc: 'متابعة تلقائية', icon: Users, soon: true },
    { id: 'multi-mention', name: 'منشن متعدد', desc: 'من حسابات متعددة', icon: AtSign, soon: true },
    { id: 'schedule-posts', name: 'جدولة المنشورات', desc: 'نشر مجدول', icon: Megaphone, soon: true },
  ]

  const tools: Array<{
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: LucideIcon
    accent: string
    accentGradient: string
    requiresSession: boolean
  }> = [
    { id: 'extract', name: 'استخراج البيانات', description: 'استخراج من المنشورات والحسابات', icon: Download, accent: '#1a1a1a', accentGradient: 'linear-gradient(135deg, #1a1a1a, #404040)', requiresSession: true },
    { id: 'mention', name: 'منشن جماعي', description: 'منشن مستخدمين في منشور', icon: AtSign, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: true },
    { id: 'broadcast', name: 'إرسال رسائل', description: 'بث رسائل مباشرة (قريباً)', icon: Send, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: true },
    { id: 'more', name: 'أدوات إضافية', description: 'أدوات قيد التطوير', icon: Settings, accent: '#64748b', accentGradient: 'linear-gradient(135deg, #64748b, #334155)', requiresSession: false },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  // ----- Session card -----
  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02))',
        border: '1px solid rgba(0,0,0,0.18)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          >
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Threads</h3>
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
              className="btn-primary text-sm text-white"
              style={{ background: ACCENT_GRADIENT }}
            >
              <LogIn size={16} /> تسجيل الدخول
            </button>
          )}
        </div>
      </div>

      {threadsAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(0,0,0,0.08)', background: 'rgba(255,255,255,0.5)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value
              setSelectedAccountId(id)
              const acc = threadsAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) {
                setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' })
                if (!acc.password?.trim()) { setShowLoginPanel(true); setTimeout(() => passwordRef.current?.focus(), 200) }
              }
            }}
          >
            <option value="">-- اختر حساب --</option>
            {threadsAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}
              </option>
            ))}
          </select>
          {selectedAccountId && (
            <button
              onClick={() => {
                const acc = threadsAccounts.find(a => a.id.toString() === selectedAccountId)
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
        <label className="label-field">اسم المستخدم</label>
        <input type="text" className="input-field" placeholder="username" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
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
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold bg-secondary-200 text-secondary-700 shrink-0">
                    {(acc.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 text-sm truncate">{acc.username || 'حساب Threads'}</p>
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
      className="btn-primary w-full disabled:opacity-50 text-white"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}
    </button>
  )

  // ----- Results table -----
  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string) => {
    if (resultsOwner !== owner) return null
    const displayResults = toolResults.length > 0 ? toolResults : results
    if (displayResults.length === 0) return null
    return (
      <div className="mt-5 rounded-xl border border-secondary-200 bg-white/60 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
          <h4 className="font-bold text-secondary-900 text-sm">النتائج ({displayResults.length})</h4>
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
              {displayResults.map((r: any, i: number) => {
                if (owner === 'extract') {
                  const extra = (() => { try { return JSON.parse(r.extra_data || '{}') } catch { return {} as any } })()
                  const name = r.name || r.username || extra.username || '-'
                  const userId = r.username || extra.username || '-'
                  const url = r.url || r.profile || r.link || extra.profile || extra.url || '-'
                  const source = r.source || extra.source || 'threads'
                  return (
                    <tr key={r.id || i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium text-sm">{name}</td>
                      <td className="text-xs font-mono">{userId}</td>
                      <td className="text-xs max-w-[150px] truncate">{url !== '-' ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{url.substring(0, 35)}...</a> : '-'}</td>
                      <td className="text-xs">{source}</td>
                      <td className="text-xs text-secondary-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG') : '-'}</td>
                      <td><button onClick={() => { if (r.id) { deleteResult(r.id); setToolResults(prev => prev.filter(item => item.id !== r.id)) } }} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td>
                    </tr>
                  )
                }
                if (owner === 'mention') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || r.recipient || '-'}</td>
                      <td><span className={`badge ${r.status === 'success' || r.status === 'sent' ? 'badge-success' : 'badge-danger'}`}>{r.status || 'sent'}</span></td>
                      <td className="text-sm">{r.message || r.error || '-'}</td>
                    </tr>
                  )
                }
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{r.recipient || r.name || '-'}</td>
                    <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
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
  const renderExtractBody = () => (
    <div className="space-y-5">
      <AccountSelector
        platformId="threads"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType: 'extract', url: extractUrl, limit: extractLimit } }}
        sendTask={{ type: 'send', params: { postUrl: mentionUrl, mentions: mentionUsers.split('\n').filter(Boolean), message: mentionMessage || broadcastMessage } }}
      />
      <div>
        <label className="label-field">رابط المنشور أو الحساب</label>
        <input type="url" className="input-field" placeholder="https://threads.net/..." value={extractUrl} onChange={e => setExtractUrl(e.target.value)} />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {extractLimit}</label>
        <input type="range" min="10" max="200" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full" />
      </div>
      <div>
        <h4 className="font-bold text-secondary-900 text-sm mb-2">أدوات استخراج إضافية</h4>
        <div className="grid grid-cols-2 gap-3">
          {extractStubTools.map(tool => (
            <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-secondary-100"><tool.icon size={20} className="text-secondary-600" /></div>
              <h4 className="font-bold text-secondary-900 text-xs mt-2">{tool.name}</h4>
              <p className="text-[10px] text-secondary-500">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>
      {renderResultsTable('extract', ['#', 'الاسم', 'المعرف', 'الرابط', 'المصدر', 'التاريخ', ''], 'threads-extract')}
    </div>
  )

  const extractFooter = (
    <button onClick={handleExtract} disabled={loading || !sessionId || !extractUrl.trim()} className="btn-primary w-full disabled:opacity-50 text-white" style={{ background: ACCENT_GRADIENT }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}
    </button>
  )

  const renderMentionBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط المنشور</label>
        <input type="url" className="input-field" placeholder="https://threads.net/..." value={mentionUrl} onChange={e => setMentionUrl(e.target.value)} />
      </div>
      <div>
        <label className="label-field">المستخدمين (username - سطر لكل مستخدم)</label>
        <textarea className="textarea-field" rows={4} value={mentionUsers} onChange={e => setMentionUsers(e.target.value)} placeholder="user1&#10;user2" />
      </div>
      <div>
        <label className="label-field">الرسالة (اختياري)</label>
        <textarea className="textarea-field" rows={3} value={mentionMessage} onChange={e => setMentionMessage(e.target.value)} placeholder="..." />
      </div>
      {renderResultsTable('mention', ['#', 'المستخدم', 'الحالة', 'تفاصيل'], 'threads-mention')}
    </div>
  )

  const mentionFooter = (
    <button onClick={handleMention} disabled={loading || !sessionId || !mentionUrl.trim() || !mentionUsers.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> منشن</>}
    </button>
  )

  const renderBroadcastBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)', color: '#555' }}>
        <AlertCircle size={16} className="inline ml-1" /> هذه الخاصية قيد التطوير - ستتوفر قريباً
      </div>
      <div className="space-y-4 opacity-60">
        <div>
          <label className="label-field">المستلمين (username - سطر لكل مستخدم)</label>
          <textarea className="textarea-field" rows={5} value={broadcastRecipients} onChange={e => setBroadcastRecipients(e.target.value)} placeholder="user1&#10;user2" />
        </div>
        <div>
          <label className="label-field">الرسالة</label>
          <textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." />
        </div>
      </div>
      {renderResultsTable('broadcast', ['#', 'المستلم', 'الحالة', 'خطأ'], 'threads-broadcast')}
    </div>
  )

  const broadcastFooter = (
    <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>
      <Send size={18} /> إرسال (قريباً)
    </button>
  )

  const renderMoreBody = () => (
    <div className="space-y-5">
      <p className="text-xs text-secondary-500">أدوات قيد التطوير — ستتوفر قريباً</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
  )

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    extract: { body: renderExtractBody(), footer: extractFooter },
    mention: { body: renderMentionBody(), footer: mentionFooter },
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    more: { body: renderMoreBody(), footer: null },
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

      <ToolGrid
        title="أدوات Threads"
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
        title="تسجيل الدخول إلى Threads"
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
