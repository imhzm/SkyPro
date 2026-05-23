import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import {
  LogIn, Search, Download, Send, UserPlus,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet, Eye, EyeOff,
  Heart, Globe, BarChart3,
  LogOut, Wrench, Pin, MessageSquare, LayoutGrid, Upload, X, Image as ImageIcon, Plus,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ActiveTool =
  | 'search' | 'extract' | 'broadcast' | 'follow-users' | 'extract-hashtag'
  | 'send-message' | 'analyze-profile' | 'extract-boards' | 'auto-publish'
  | 'download' | 'signup-batch'
  | null
type ResultsOwner =
  | 'search' | 'extract' | 'broadcast' | 'follow-users' | 'extract-hashtag'
  | 'send-message' | 'extract-boards' | 'auto-publish' | 'download'
  | null

const ACCENT = '#E60023'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #E60023, #BD081C)'

export default function PinterestModule() {
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadResults, handleExport, clearResults, deleteResult, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('pinterest')

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [showPassword, setShowPassword] = useState(false)
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchLimit, setSearchLimit] = useState(50)
  const [boardUrl, setBoardUrl] = useState('')
  const [extractLimit, setExtractLimit] = useState(50)
  const [pinUrl, setPinUrl] = useState('')
  const [pinBoards, setPinBoards] = useState('')

  const [toolResults, setToolResults] = useState<any[]>([])

  // --- Follow users ---
  const [followList, setFollowList] = useState('')
  const [followDelay, setFollowDelay] = useState(4)
  // --- Extract hashtag ---
  const [hashtagKeyword, setHashtagKeyword] = useState('')
  const [hashtagLimit, setHashtagLimit] = useState(100)
  // --- Send message ---
  const [msgUsernames, setMsgUsernames] = useState('')
  const [msgContent, setMsgContent] = useState('')
  const [msgDelay, setMsgDelay] = useState(5)
  // --- Analyze profile ---
  const [analyzeUsername, setAnalyzeUsername] = useState('')
  const [analyzeResult, setAnalyzeResult] = useState<any>(null)
  // --- Extract boards ---
  const [boardsKeyword, setBoardsKeyword] = useState('')
  const [boardsLimit, setBoardsLimit] = useState(50)
  // --- Auto publish ---
  const [autoPublishPins, setAutoPublishPins] = useState<Array<{ imagePath: string; title: string; description: string; link: string }>>([])
  const autoPublishFileRef = useRef<HTMLInputElement | null>(null)
  const [autoPublishDelay, setAutoPublishDelay] = useState(8)
  // --- Download ---
  const [downloadSource, setDownloadSource] = useState<'search' | 'board'>('search')
  const [downloadQuery, setDownloadQuery] = useState('')
  const [downloadBoardUrl, setDownloadBoardUrl] = useState('')
  const [downloadSaveDir, setDownloadSaveDir] = useState('')
  const [downloadLimit, setDownloadLimit] = useState(50)
  // --- Signup batch ---
  const [signupCount, setSignupCount] = useState(3)

  const pinterestAccounts = allAccounts.filter(a => a.platform === 'pinterest')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.pinterestLogin({ username: loginForm.username, password: loginForm.password, proxy: loginForm.proxy || undefined, headless: false })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم تسجيل الدخول بنجاح!'); await loadAllAccounts(); setShowLoginPanel(false) }
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
      const res = await window.electronAPI.pinterestLogin({ accountId: account.id, username: account.username, password: account.password, proxy: account.proxy || loginForm.proxy || undefined, headless: false })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!ensureSession()) return
    if (!searchQuery) { showMsg('أدخل كلمة البحث', true); return }
    setLoading(true)
    setResultsOwner('search')
    try {
      const res = await window.electronAPI.pinterestSearch({ sessionId, query: searchQuery, limit: searchLimit })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم العثور على ${res.count || ((res.data as any[]) || []).length} نتيجة`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    setLoading(true)
    setResultsOwner('extract')
    try {
      const res = await window.electronAPI.pinterestExtract({ sessionId, boardUrl: boardUrl || `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(searchQuery)}`, limit: extractLimit })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count || ((res.data as any[]) || []).length} عنصر`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => {
    setToolResults([])
    setResultsOwner(null)
    clearResults()
  }

  const handleFollowUsers = async () => {
    if (!ensureSession()) return
    const usernames = followList.split('\n').map(s => s.trim()).filter(Boolean)
    if (usernames.length === 0) { showMsg('أدخل قائمة المستخدمين', true); return }
    setLoading(true)
    setResultsOwner('follow-users')
    setToolResults([])
    try {
      const res = await window.electronAPI.pinterestFollowUsers({ sessionId, usernames, delayMs: Math.max(1, followDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'followed').length
        showMsg(`تمت متابعة ${ok} من ${usernames.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleExtractHashtag = async () => {
    if (!ensureSession()) return
    if (!hashtagKeyword.trim()) { showMsg('أدخل الكلمة المفتاحية', true); return }
    setLoading(true)
    setResultsOwner('extract-hashtag')
    setToolResults([])
    try {
      const res = await window.electronAPI.pinterestExtractHashtag({ sessionId, keyword: hashtagKeyword.trim(), limit: hashtagLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} Pin`)
      } else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleSendMessage = async () => {
    if (!ensureSession()) return
    const list = msgUsernames.split('\n').map(s => s.trim()).filter(Boolean)
    if (list.length === 0) { showMsg('أدخل المستخدمين', true); return }
    if (!msgContent.trim()) { showMsg('أدخل نص الرسالة', true); return }
    setLoading(true)
    setResultsOwner('send-message')
    setToolResults([])
    try {
      const res = await window.electronAPI.pinterestSendMessage({ sessionId, usernames: list, message: msgContent, delayMs: Math.max(2, msgDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال ${ok} من ${list.length}`)
      } else { showMsg(res.error || 'فشلت العملية', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleAnalyzeProfile = async () => {
    if (!ensureSession()) return
    if (!analyzeUsername.trim()) { showMsg('أدخل اسم المستخدم', true); return }
    setLoading(true)
    setResultsOwner(null)
    setAnalyzeResult(null)
    try {
      const res = await window.electronAPI.pinterestAnalyzeProfile({ sessionId, username: analyzeUsername.trim() })
      if (res.success && res.data) {
        setAnalyzeResult(res.data)
        showMsg(`تم تحليل @${(res.data as any).username || analyzeUsername}`)
      } else showMsg(String((res as any).error || 'فشل التحليل'), true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleExtractBoards = async () => {
    if (!ensureSession()) return
    if (!boardsKeyword.trim()) { showMsg('أدخل الكلمة المفتاحية', true); return }
    setLoading(true)
    setResultsOwner('extract-boards')
    setToolResults([])
    try {
      const res = await window.electronAPI.pinterestExtractBoards({ sessionId, keyword: boardsKeyword.trim(), limit: boardsLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم العثور على ${res.count || items.length} لوحة`)
      } else { showMsg(res.error || 'فشل الاستخراج', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handlePickAutoPublishImages = () => autoPublishFileRef.current?.click()
  const handleAutoPublishImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const paths = Array.from(files).map(f => (f as any).path).filter(Boolean)
    setAutoPublishPins(prev => [...prev, ...paths.map(p => ({ imagePath: p, title: '', description: '', link: '' }))])
    if (autoPublishFileRef.current) autoPublishFileRef.current.value = ''
  }
  const handleRemoveAutoPublishPin = (idx: number) => setAutoPublishPins(prev => prev.filter((_, i) => i !== idx))
  const handleUpdateAutoPublishPin = (idx: number, field: 'title' | 'description' | 'link', value: string) => {
    setAutoPublishPins(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
  }
  const handleAutoPublish = async () => {
    if (!ensureSession()) return
    if (autoPublishPins.length === 0) { showMsg('أضف صور للنشر', true); return }
    setLoading(true)
    setResultsOwner('auto-publish')
    setToolResults([])
    try {
      const res = await window.electronAPI.pinterestAutoPublish({ sessionId, pins: autoPublishPins, delayMs: Math.max(3, autoPublishDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'published').length
        showMsg(`تم نشر ${ok} من ${autoPublishPins.length} Pin`)
      } else { showMsg(res.error || 'فشلت العملية', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleDownload = async () => {
    if (!ensureSession()) return
    if (downloadSource === 'search' && !downloadQuery.trim()) { showMsg('أدخل كلمة البحث', true); return }
    if (downloadSource === 'board' && !downloadBoardUrl.trim()) { showMsg('أدخل رابط البورد', true); return }
    if (!downloadSaveDir.trim()) { showMsg('أدخل مسار الحفظ', true); return }
    setLoading(true); setResultsOwner('download'); setToolResults([])
    try {
      const res = await window.electronAPI.pinterestDownload({
        sessionId, source: downloadSource,
        query: downloadQuery || undefined, boardUrl: downloadBoardUrl || undefined,
        saveDir: downloadSaveDir, limit: downloadLimit,
      })
      if (res.success) {
        const items = (res.data as any[]) || []; setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'downloaded').length
        showMsg(`تم تحميل ${ok} صورة`)
      } else { showMsg(res.error || 'فشل التحميل', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleSignupBatch = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.pinterestOpenSignupBatch({ count: signupCount })
      if (res.success) showMsg(res.message || `تم فتح ${signupCount} نافذة تسجيل`)
      else showMsg(res.error || 'فشل', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
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
    { id: 'search', name: 'البحث في Pinterest', description: 'بحث عن Pins بالكلمات المفتاحية', icon: Search, accent: '#E60023', accentGradient: 'linear-gradient(135deg, #E60023, #BD081C)', requiresSession: true },
    { id: 'extract', name: 'استخراج من اللوحات', description: 'استخراج Pins من لوحة', icon: Download, accent: '#ec4899', accentGradient: 'linear-gradient(135deg, #ec4899, #be185d)', requiresSession: true },
    { id: 'extract-hashtag', name: 'استخراج بكلمة مفتاحية', description: 'Pins من البحث / الهاشتاج', icon: Heart, accent: '#a855f7', accentGradient: 'linear-gradient(135deg, #a855f7, #7e22ce)', requiresSession: true },
    { id: 'follow-users', name: 'متابعة المستخدمين', description: 'متابعة قائمة من المستخدمين', icon: UserPlus, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: true },
    { id: 'broadcast', name: 'مشاركة Pins', description: 'مشاركة Pin على لوحات', icon: Send, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: true },
    { id: 'send-message', name: 'إرسال رسائل', description: 'رسائل مباشرة لقائمة مستخدمين', icon: MessageSquare, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: true },
    { id: 'analyze-profile', name: 'تحليل حساب', description: 'متابعين/متابعون/Pins/السيرة', icon: BarChart3, accent: '#7c3aed', accentGradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)', requiresSession: true },
    { id: 'extract-boards', name: 'استخراج اللوحات', description: 'لوحات بنيتش معين', icon: LayoutGrid, accent: '#14b8a6', accentGradient: 'linear-gradient(135deg, #14b8a6, #0f766e)', requiresSession: true },
    { id: 'auto-publish', name: 'نشر تلقائي', description: 'نشر Pins جديدة دفعة واحدة', icon: Upload, accent: '#dc2626', accentGradient: 'linear-gradient(135deg, #dc2626, #991b1b)', requiresSession: true },
    { id: 'download', name: 'تحميل الصور', description: 'تحميل Pins من بحث أو بورد', icon: Download, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: true },
    { id: 'signup-batch', name: 'إنشاء حسابات', description: 'فتح نوافذ متعددة للتسجيل', icon: Globe, accent: '#64748b', accentGradient: 'linear-gradient(135deg, #64748b, #334155)', requiresSession: false },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  // ----- Session card -----
  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(230,0,35,0.06), rgba(189,8,28,0.04))',
        border: '1px solid rgba(230,0,35,0.18)',
        boxShadow: '0 4px 20px rgba(230,0,35,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(230,0,35,0.3)' }}
          >
            <Pin size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Pinterest</h3>
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

      {pinterestAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(230,0,35,0.12)', background: 'rgba(255,255,255,0.5)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value
              setSelectedAccountId(id)
              const acc = pinterestAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) {
                setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' })
                if (!acc.password?.trim()) { setShowLoginPanel(true); setTimeout(() => passwordRef.current?.focus(), 200) }
              }
            }}
          >
            <option value="">-- اختر حساب --</option>
            {pinterestAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}
              </option>
            ))}
          </select>
          {selectedAccountId && (
            <button
              onClick={() => {
                const acc = pinterestAccounts.find(a => a.id.toString() === selectedAccountId)
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
        <label className="label-field">البريد الإلكتروني أو اسم المستخدم</label>
        <input type="email" className="input-field" placeholder="example@email.com" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
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

      {accounts.length > 0 && (
        <div>
          <h4 className="font-bold text-secondary-900 text-sm mb-3">الحسابات المحفوظة على الجهاز</h4>
          <div className="space-y-2 max-h-[280px] overflow-y-auto scroll-container pr-1">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'rgba(230,0,35,0.1)', color: ACCENT }}>
                    {(acc.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 text-sm truncate">{acc.username || 'حساب Pinterest'}</p>
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
                if (owner === 'search') {
                  const extra = (() => { try { return JSON.parse(r.extra_data || '{}') } catch { return {} as any } })()
                  const name = r.title || r.name || extra.title || '-'
                  const link = r.link || r.url || extra.link || '-'
                  const source = r.source || extra.source || 'pinterest'
                  return (
                    <tr key={r.id || i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium text-sm">{name}</td>
                      <td className="text-xs max-w-[150px] truncate">{link !== '-' ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{link.substring(0, 40)}...</a> : '-'}</td>
                      <td className="text-xs">{source}</td>
                      <td className="text-xs text-secondary-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG') : '-'}</td>
                      <td><button onClick={() => { if (r.id) { deleteResult(r.id); setToolResults(prev => prev.filter(item => item.id !== r.id)) } }} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td>
                    </tr>
                  )
                }
                if (owner === 'extract') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.alt || r.title || r.name || '-'}</td>
                      <td className="text-xs max-w-[200px] truncate">{r.link || r.url || r.image || '-'}</td>
                      <td><span className="badge badge-success">found</span></td>
                    </tr>
                  )
                }
                if (owner === 'follow-users') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || '-'}</td>
                      <td><span className={`badge ${r.status === 'followed' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-hashtag') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium text-xs max-w-[280px] truncate">{r.title || '-'}</td>
                      <td className="text-xs">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Pin</a> : '-'}</td>
                      <td className="text-xs text-secondary-500">{r.image ? <a href={r.image} target="_blank" rel="noopener noreferrer" className="text-secondary-600 hover:underline">صورة</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'send-message') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">@{r.username || '-'}</td>
                      <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-boards') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'auto-publish') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[260px] truncate">{r.title || '-'}</td>
                      <td><span className={`badge ${r.status === 'published' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'download') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[260px] truncate" dir="ltr">{r.url || '-'}</td>
                      <td className="text-xs max-w-[200px] truncate text-secondary-600" dir="ltr">{r.file || '-'}</td>
                      <td><span className={`badge ${r.status === 'downloaded' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{r.recipient || r.board || '-'}</td>
                    <td><span className={`badge ${r.status === 'sent' || r.status === 'success' ? 'badge-success' : 'badge-warning'}`}>{r.status || 'pending'}</span></td>
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
  const renderSearchBody = () => (
    <div className="space-y-5">
      <AccountSelector
        platformId="pinterest"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType: 'search', searchQuery, url: boardUrl, boardUrl, limit: extractLimit } }}
        sendTask={{ type: 'send', params: { pinUrl, boards: pinBoards } }}
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-field">كلمة البحث</label>
          <input type="text" className="input-field" placeholder="design ideas, marketing..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div>
          <label className="label-field">الحد الأقصى: {searchLimit}</label>
          <input type="range" min="10" max="200" value={searchLimit} onChange={e => setSearchLimit(parseInt(e.target.value))} className="w-full" style={{ accentColor: ACCENT }} />
        </div>
      </div>
      {renderResultsTable('search', ['#', 'العنوان', 'الرابط', 'المصدر', 'التاريخ', ''], 'pinterest-search')}
    </div>
  )

  const searchFooter = (
    <button onClick={handleSearch} disabled={loading || !sessionId || !searchQuery.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: ACCENT_GRADIENT }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Search size={18} /> بحث</>}
    </button>
  )

  const renderExtractBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط اللوحة (اختياري - يُستخدم كلمة البحث إذا تُرك فارغاً)</label>
        <input type="url" className="input-field" placeholder="https://pinterest.com/user/board" value={boardUrl} onChange={e => setBoardUrl(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-field">كلمة البحث</label>
          <input type="text" className="input-field" placeholder="marketing, design..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div>
          <label className="label-field">الحد الأقصى: {extractLimit}</label>
          <input type="range" min="10" max="500" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full" style={{ accentColor: ACCENT }} />
        </div>
      </div>
      {renderResultsTable('extract', ['#', 'الوصف', 'الرابط', 'الحالة'], 'pinterest-extract')}
    </div>
  )

  const extractFooter = (
    <button onClick={handleExtract} disabled={loading || !sessionId || (!boardUrl.trim() && !searchQuery.trim())} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}
    </button>
  )

  const handleSharePin = async () => {
    if (!ensureSession()) return
    if (!pinUrl.trim()) { showMsg('أدخل رابط الـ Pin', true); return }
    const boards = pinBoards.split('\n').map(s => s.trim()).filter(Boolean)
    if (boards.length === 0) { showMsg('أدخل أسماء اللوحات', true); return }
    setLoading(true); setResultsOwner('broadcast'); setToolResults([])
    try {
      const res = await window.electronAPI.pinterestSharePin({ sessionId, pinUrl: pinUrl.trim(), boards })
      if (res.success) {
        const items = (res.data as any[]) || []; setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'saved').length
        showMsg(`تم حفظ Pin في ${ok} لوحة`)
      } else { showMsg(res.error || 'فشل', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const renderBroadcastBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط الـ Pin</label>
        <input type="url" className="input-field" placeholder="https://pinterest.com/pin/..." value={pinUrl} onChange={e => setPinUrl(e.target.value)} />
      </div>
      <div>
        <label className="label-field">اللوحات المستهدفة (سطر لكل لوحة)</label>
        <textarea className="textarea-field" rows={5} placeholder="board1&#10;board2" value={pinBoards} onChange={e => setPinBoards(e.target.value)} />
      </div>
      {renderResultsTable('broadcast', ['#', 'اللوحة', 'الحالة', 'خطأ'], 'pinterest-broadcast')}
    </div>
  )

  const broadcastFooter = (
    <button onClick={handleSharePin} disabled={loading || !sessionId || !pinUrl.trim() || !pinBoards.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> حفظ</>}
    </button>
  )

  const renderDownloadBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">المصدر</label>
        <div className="flex gap-3 flex-wrap">
          <button type="button" onClick={() => setDownloadSource('search')} className="px-4 py-2 rounded-lg text-sm font-medium" style={downloadSource === 'search' ? { background: 'rgba(14,165,233,0.12)', color: '#0ea5e9', border: '1px solid #0ea5e9' } : { background: 'white', color: '#475569', border: '1px solid #e2e8f0' }}>من البحث</button>
          <button type="button" onClick={() => setDownloadSource('board')} className="px-4 py-2 rounded-lg text-sm font-medium" style={downloadSource === 'board' ? { background: 'rgba(14,165,233,0.12)', color: '#0ea5e9', border: '1px solid #0ea5e9' } : { background: 'white', color: '#475569', border: '1px solid #e2e8f0' }}>من رابط لوحة</button>
        </div>
      </div>
      {downloadSource === 'search' ? (
        <div><label className="label-field">كلمة البحث</label><input type="text" className="input-field" value={downloadQuery} onChange={e => setDownloadQuery(e.target.value)} placeholder="design, fashion, travel" /></div>
      ) : (
        <div><label className="label-field">رابط اللوحة</label><input type="url" className="input-field" value={downloadBoardUrl} onChange={e => setDownloadBoardUrl(e.target.value)} placeholder="https://pinterest.com/user/board" /></div>
      )}
      <div><label className="label-field">مسار الحفظ على القرص</label><input type="text" className="input-field" value={downloadSaveDir} onChange={e => setDownloadSaveDir(e.target.value)} placeholder="C:\Pinterest" dir="ltr" /></div>
      <div><label className="label-field">الحد الأقصى: {downloadLimit}</label><input type="range" min={10} max={500} step={10} className="w-full accent-sky-500" value={downloadLimit} onChange={e => setDownloadLimit(parseInt(e.target.value))} /></div>
      {renderResultsTable('download', ['#', 'الرابط', 'الملف', 'الحالة'], 'pinterest-download')}
    </div>
  )
  const downloadFooter = (
    <button onClick={handleDownload} disabled={loading || !sessionId || !downloadSaveDir.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> تحميل</>}
    </button>
  )

  const renderSignupBatchBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-700" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        يفتح عدة نوافذ تسجيل في Pinterest. أكمل كل حساب يدوياً (Pinterest تستخدم CAPTCHA + تحقق بريد).
      </div>
      <div><label className="label-field">عدد الحسابات (أقصى 5 في المرة): {signupCount}</label><input type="range" min={1} max={5} step={1} className="w-full accent-red-600" value={signupCount} onChange={e => setSignupCount(parseInt(e.target.value))} /></div>
    </div>
  )
  const signupBatchFooter = (
    <button onClick={handleSignupBatch} disabled={loading} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #64748b, #334155)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Globe size={18} /> فتح نوافذ التسجيل</>}
    </button>
  )

  const renderFollowUsersBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">قائمة المستخدمين (سطر لكل اسم)</label>
        <textarea className="textarea-field" rows={7} value={followList} onChange={e => setFollowList(e.target.value)} placeholder="username1&#10;username2" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={1} max={60} className="input-field w-32" value={followDelay} onChange={e => setFollowDelay(Number(e.target.value) || 4)} />
      </div>
      {renderResultsTable('follow-users', ['#', 'المستخدم', 'الحالة', 'خطأ'], 'pinterest-follow')}
    </div>
  )
  const followUsersFooter = (
    <button onClick={handleFollowUsers} disabled={loading || !followList.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> متابعة</>}
    </button>
  )

  const renderExtractHashtagBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الكلمة المفتاحية أو الهاشتاج</label>
        <input type="text" className="input-field" value={hashtagKeyword} onChange={e => setHashtagKeyword(e.target.value)} placeholder="design ideas, marketing" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {hashtagLimit}</label>
        <input type="range" min={20} max={1000} step={10} className="w-full" style={{ accentColor: '#a855f7' }} value={hashtagLimit} onChange={e => setHashtagLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-hashtag', ['#', 'العنوان', 'رابط Pin', 'الصورة'], 'pinterest-hashtag')}
    </div>
  )
  const extractHashtagFooter = (
    <button onClick={handleExtractHashtag} disabled={loading || !hashtagKeyword.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Heart size={18} /> استخراج</>}
    </button>
  )

  // ---- Send message panel ----
  const renderSendMessageBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">قائمة المستخدمين (سطر لكل username)</label>
        <textarea className="textarea-field" rows={6} value={msgUsernames} onChange={e => setMsgUsernames(e.target.value)} placeholder="@user1&#10;@user2" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={4} value={msgContent} onChange={e => setMsgContent(e.target.value)} placeholder="اكتب رسالتك..." />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={60} className="input-field w-32" value={msgDelay} onChange={e => setMsgDelay(Number(e.target.value) || 5)} />
      </div>
      {renderResultsTable('send-message', ['#', 'المستخدم', 'الحالة', 'خطأ'], 'pinterest-msg')}
    </div>
  )
  const sendMessageFooter = (<button onClick={handleSendMessage} disabled={loading || !msgUsernames.trim() || !msgContent.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><MessageSquare size={18} /> إرسال</>}</button>)

  // ---- Analyze profile panel ----
  const renderAnalyzeProfileBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">اسم المستخدم</label>
        <input type="text" className="input-field" value={analyzeUsername} onChange={e => setAnalyzeUsername(e.target.value)} placeholder="@username" />
      </div>
      {analyzeResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border bg-white/60">
              <p className="text-xs text-secondary-500">Pins</p>
              <p className="text-2xl font-bold text-secondary-800">{analyzeResult.pins || '-'}</p>
            </div>
            <div className="p-3 rounded-xl border bg-white/60">
              <p className="text-xs text-secondary-500">متابعين</p>
              <p className="text-2xl font-bold text-rose-700">{analyzeResult.followers || '-'}</p>
            </div>
            <div className="p-3 rounded-xl border bg-white/60">
              <p className="text-xs text-secondary-500">متابعون</p>
              <p className="text-2xl font-bold text-violet-700">{analyzeResult.following || '-'}</p>
            </div>
          </div>
          {analyzeResult.bio && (
            <div className="p-3 rounded-xl border bg-white/60">
              <p className="text-xs text-secondary-500 mb-1">السيرة الذاتية</p>
              <p className="text-sm text-secondary-700 whitespace-pre-wrap">{analyzeResult.bio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
  const analyzeProfileFooter = (<button onClick={handleAnalyzeProfile} disabled={loading || !analyzeUsername.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><BarChart3 size={18} /> تحليل</>}</button>)

  // ---- Extract boards panel ----
  const renderExtractBoardsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">النيتش / الكلمة المفتاحية</label>
        <input type="text" className="input-field" value={boardsKeyword} onChange={e => setBoardsKeyword(e.target.value)} placeholder="travel, fashion, fitness" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {boardsLimit}</label>
        <input type="range" min={10} max={300} step={5} className="w-full accent-teal-500" value={boardsLimit} onChange={e => setBoardsLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-boards', ['#', 'اسم اللوحة', 'الرابط'], 'pinterest-boards')}
    </div>
  )
  const extractBoardsFooter = (<button onClick={handleExtractBoards} disabled={loading || !boardsKeyword.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><LayoutGrid size={18} /> بحث اللوحات</>}</button>)

  // ---- Auto-publish panel ----
  const renderAutoPublishBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-700" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        أضف الصور أولاً، ثم لكل صورة يمكن إضافة عنوان ووصف ورابط، وستُنشر تباعاً.
      </div>
      <input ref={autoPublishFileRef} type="file" multiple accept="image/*" onChange={handleAutoPublishImagesSelected} className="hidden" />
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={handlePickAutoPublishImages} className="btn-secondary text-sm"><Plus size={16} /> أضف صور</button>
        {autoPublishPins.length === 0 && <span className="text-xs text-secondary-400">لم تتم إضافة أي صورة</span>}
      </div>
      {autoPublishPins.length > 0 && (
        <ul className="space-y-3">
          {autoPublishPins.map((p, i) => (
            <li key={i} className="rounded-xl border border-secondary-100 bg-white/70 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs truncate" dir="ltr"><ImageIcon size={14} /> {p.imagePath}</span>
                <button onClick={() => handleRemoveAutoPublishPin(i)} type="button" className="text-danger-500 p-1 hover:bg-danger-50 rounded"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input type="text" className="input-field text-sm" value={p.title} onChange={e => handleUpdateAutoPublishPin(i, 'title', e.target.value)} placeholder="العنوان" />
                <input type="text" className="input-field text-sm" value={p.description} onChange={e => handleUpdateAutoPublishPin(i, 'description', e.target.value)} placeholder="الوصف" />
                <input type="url" className="input-field text-sm" value={p.link} onChange={e => handleUpdateAutoPublishPin(i, 'link', e.target.value)} placeholder="الرابط (اختياري)" />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div>
        <label className="label-field">الفاصل بين Pins (ثانية)</label>
        <input type="number" min={3} max={120} className="input-field w-32" value={autoPublishDelay} onChange={e => setAutoPublishDelay(Number(e.target.value) || 8)} />
      </div>
      {renderResultsTable('auto-publish', ['#', 'العنوان', 'الحالة', 'خطأ'], 'pinterest-publish')}
    </div>
  )
  const autoPublishFooter = (<button onClick={handleAutoPublish} disabled={loading || autoPublishPins.length === 0} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Upload size={18} /> نشر {autoPublishPins.length} Pin</>}</button>)

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    search: { body: renderSearchBody(), footer: searchFooter },
    extract: { body: renderExtractBody(), footer: extractFooter },
    'extract-hashtag': { body: renderExtractHashtagBody(), footer: extractHashtagFooter },
    'extract-boards': { body: renderExtractBoardsBody(), footer: extractBoardsFooter },
    'follow-users': { body: renderFollowUsersBody(), footer: followUsersFooter },
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    'send-message': { body: renderSendMessageBody(), footer: sendMessageFooter },
    'analyze-profile': { body: renderAnalyzeProfileBody(), footer: analyzeProfileFooter },
    'auto-publish': { body: renderAutoPublishBody(), footer: autoPublishFooter },
    download: { body: renderDownloadBody(), footer: downloadFooter },
    'signup-batch': { body: renderSignupBatchBody(), footer: signupBatchFooter },
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
        platformId="pinterest"
        platformName="Pinterest"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('extract')}
      />

      <ToolGrid
        title="أدوات Pinterest"
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
        title="تسجيل الدخول إلى Pinterest"
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
