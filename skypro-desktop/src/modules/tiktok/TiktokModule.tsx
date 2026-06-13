import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { getBackgroundMode } from '../../lib/backgroundMode'
import { makeJobId } from '../../lib/jobId'
import { useAccountsStore } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import {
  LogIn, Download, Heart, UserPlus, AtSign, Upload,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet, ExternalLink,
  Eye, EyeOff,
  LogOut, Wrench, Music, Play,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type ActiveTool = 'extract' | 'mention' | 'download' | 'upload' | 'search' | 'follow' | 'interact' | null
type ResultsOwner = 'extract' | 'mention' | 'download' | 'upload' | 'search' | 'follow' | 'interact' | null

const ACCENT = '#fe2c55'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #fe2c55, #25f4ee)'

export default function TiktokModule() {
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadResults, handleExport, clearResults, deleteResult, clearSession, cycleActive, cycleProgress, startCycle, stopCycle, liveRows, beginLiveJob, endLiveJob } = usePlatform('tiktok')

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [showPassword, setShowPassword] = useState(false)
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [extractType, setExtractType] = useState('comments')
  const [extractInput, setExtractInput] = useState('')
  const [extractLimit, setExtractLimit] = useState(50)
  const [toolResults, setToolResults] = useState<any[]>([])
  const [mentionVideoUrls, setMentionVideoUrls] = useState('')
  const [mentionUsers, setMentionUsers] = useState('')
  const [mentionMessage, setMentionMessage] = useState('')
  const [downloadVideoUrl, setDownloadVideoUrl] = useState('')
  const [downloadSavePath, setDownloadSavePath] = useState('')
  const [uploadVideoPath, setUploadVideoPath] = useState('')
  const [uploadCaption, setUploadCaption] = useState('')
  const uploadFileRef = useRef<HTMLInputElement | null>(null)
  // --- Search ---
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLimit, setSearchLimit] = useState(50)
  // --- Follow ---
  const [followList, setFollowList] = useState('')
  const [followDelay, setFollowDelay] = useState(5)
  // --- Interact ---
  const [interactUrls, setInteractUrls] = useState('')
  const [interactDoLike, setInteractDoLike] = useState(true)
  const [interactComment, setInteractComment] = useState('')
  const [interactDelay, setInteractDelay] = useState(5)

  const tiktokAccounts = allAccounts.filter(a => a.platform === 'tiktok')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username) { showMsg('أدخل اسم المستخدم', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.launchBrowser({ platform: 'tiktok', headless: getBackgroundMode('tiktok'), proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم فتح المتصفح - سجل دخول يدوياً على TikTok'); await loadAllAccounts(); setShowLoginPanel(false) }
      else showMsg(res.error || 'فشل فتح المتصفح', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!extractInput) { showMsg('أدخل الرابط أو اسم المستخدم', true); return }
    setLoading(true)
    setResultsOwner('extract')
    setToolResults([])
    const jobId = makeJobId('tt-extract')
    beginLiveJob(jobId)
    try {
      let res: any
      if (extractType === 'comments') res = await window.electronAPI.tiktokExtractComments({ sessionId, videoUrl: extractInput, limit: extractLimit, jobId })
      else res = await window.electronAPI.tiktokExtractFollowers({ sessionId, username: extractInput.replace('@', ''), limit: extractLimit, jobId })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count || ((res.data as any[]) || []).length}`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleDownload = async () => {
    if (!downloadVideoUrl) { showMsg('أدخل رابط الفيديو', true); return }
    setLoading(true)
    setResultsOwner('download')
    try {
      const res = await window.electronAPI.videoDownload({ url: downloadVideoUrl, saveDir: downloadSavePath })
      if (res.success) showMsg(`تم التحميل: ${res.path}`)
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => {
    setToolResults([])
    setResultsOwner(null)
    clearResults()
  }

  const handleSearch = async () => {
    if (!ensureSession()) return
    if (!searchQuery.trim()) { showMsg('أدخل الكلمة المفتاحية', true); return }
    setLoading(true); setResultsOwner('search'); setToolResults([])
    const jobId = makeJobId('tt-search')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.tiktokSearch({ sessionId, query: searchQuery.trim(), limit: searchLimit, jobId })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم العثور على ${res.count || ((res.data as any[]) || []).length} فيديو`) }
      else { showMsg(res.error || 'فشلت العملية', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleFollow = async () => {
    if (!ensureSession()) return
    const list = followList.split('\n').map(s => s.trim()).filter(Boolean)
    if (list.length === 0) { showMsg('أدخل قائمة الحسابات', true); return }
    setLoading(true); setResultsOwner('follow'); setToolResults([])
    const jobId = makeJobId('tt-follow')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.tiktokFollow({ sessionId, usernames: list, delayMs: Math.max(2, followDelay) * 1000, jobId })
      if (res.success) {
        const items = (res.data as any[]) || []; setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'followed').length
        showMsg(`تمت متابعة ${ok} من ${list.length}`)
      } else { showMsg(res.error || 'فشلت', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleInteract = async () => {
    if (!ensureSession()) return
    const urls = interactUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط الفيديوهات', true); return }
    if (!interactDoLike && !interactComment.trim()) { showMsg('اختر إعجاب أو تعليق', true); return }
    setLoading(true); setResultsOwner('interact'); setToolResults([])
    const jobId = makeJobId('tt-interact')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.tiktokInteract({ sessionId, videoUrls: urls, doLike: interactDoLike, comment: interactComment || undefined, delayMs: Math.max(2, interactDelay) * 1000, jobId })
      if (res.success) {
        const items = (res.data as any[]) || []; setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'done').length
        showMsg(`تم التفاعل مع ${ok} من ${urls.length}`)
      } else { showMsg(res.error || 'فشلت', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handlePickVideo = () => uploadFileRef.current?.click()
  const handleVideoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    setUploadVideoPath((f as any).path || '')
    if (uploadFileRef.current) uploadFileRef.current.value = ''
  }
  const handleUpload = async () => {
    if (!ensureSession()) return
    if (!uploadVideoPath) { showMsg('اختر ملف فيديو', true); return }
    setLoading(true); setResultsOwner('upload')
    try {
      const res = await window.electronAPI.tiktokUploadVideo({ sessionId, videoPath: uploadVideoPath, caption: uploadCaption })
      if (res.success) showMsg('تم نشر الفيديو ✓')
      else showMsg(res.error || 'فشل النشر', true)
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
    { id: 'extract', name: 'استخراج البيانات', description: 'تعليقات الفيديوهات والمتابعين', icon: Download, accent: '#fe2c55', accentGradient: 'linear-gradient(135deg, #fe2c55, #25f4ee)', requiresSession: true },
    { id: 'search', name: 'البحث في TikTok', description: 'استخراج فيديوهات بكلمة مفتاحية', icon: Heart, accent: '#ec4899', accentGradient: 'linear-gradient(135deg, #ec4899, #be185d)', requiresSession: true },
    { id: 'follow', name: 'متابعة المستخدمين', description: 'متابعة قائمة حسابات', icon: UserPlus, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', requiresSession: true },
    { id: 'interact', name: 'إعجاب + تعليق', description: 'تفاعل على فيديوهات (مزرعة)', icon: Heart, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: true },
    { id: 'mention', name: 'منشن جماعي', description: 'منشن مستخدمين في فيديوهات', icon: AtSign, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: true },
    { id: 'download', name: 'تحميل فيديو', description: 'تحميل فيديوهات TikTok', icon: Play, accent: '#22c55e', accentGradient: 'linear-gradient(135deg, #22c55e, #15803d)', requiresSession: false },
    { id: 'upload', name: 'نشر فيديو', description: 'رفع فيديو من ملف محلي', icon: Upload, accent: '#a855f7', accentGradient: 'linear-gradient(135deg, #a855f7, #6d28d9)', requiresSession: true },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  // ----- Session card -----
  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(254,44,85,0.06), rgba(37,244,238,0.04))',
        border: '1px solid rgba(254,44,85,0.18)',
        boxShadow: '0 4px 20px rgba(254,44,85,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(254,44,85,0.3)' }}
          >
            <Music size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">TikTok</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: sessionId ? '#22c55e' : '#94a3b8',
                  boxShadow: sessionId ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                }}
              />
              <span className="text-xs font-medium" style={{ color: sessionId ? '#16a34a' : '#64748b' }}>
                {sessionId ? 'جلسة نشطة — جاهز للعمل' : 'لا توجد جلسة — افتح المتصفح أولاً'}
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

      {tiktokAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(254,44,85,0.12)', background: 'var(--panel-bg)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value
              setSelectedAccountId(id)
              const acc = tiktokAccounts.find(a => a.id.toString() === id)
              if (acc) setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' })
            }}
          >
            <option value="">-- اختر حساب --</option>
            {tiktokAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}
              </option>
            ))}
          </select>
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
      <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(254,44,85,0.06)', border: '1px solid rgba(254,44,85,0.2)', color: '#be123c' }}>
        <AlertCircle size={16} className="inline ml-1" /> TikTok يتطلب تسجيل الدخول يدوياً — سيتم فتح المتصفح وأنت تكمل الدخول بنفسك
      </div>
      <div>
        <label className="label-field">اسم المستخدم</label>
        <input type="text" className="input-field" placeholder="@username" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
      </div>
      <div>
        <label className="label-field">كلمة المرور (اختياري)</label>
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
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'rgba(254,44,85,0.1)', color: ACCENT }}>
                    {(acc.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 text-sm truncate">{acc.username || 'حساب TikTok'}</p>
                    <p className="text-[11px] text-secondary-500">
                      {new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}
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
      disabled={loading || !loginForm.username}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><ExternalLink size={18} /> فتح المتصفح</>}
    </button>
  )

  // ----- Results table -----
  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string) => {
    if (resultsOwner !== owner) return null
    const displayResults = toolResults.length > 0 ? toolResults : (liveRows.length > 0 ? liveRows : results)
    if (displayResults.length === 0) return null
    return (
      <div className="mt-5 rounded-xl border border-secondary-200 bg-white/60 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
          <h4 className="font-bold text-secondary-900 text-sm">النتائج ({displayResults.length}){loading && <span className="text-emerald-600 animate-pulse"> • مباشر ⚡</span>}</h4>
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
                  const userId = r.username || extra.username || r.extra || '-'
                  const text = r.text || r.content || extra.text || '-'
                  const url = r.url || r.profile || r.link || extra.profile || extra.url || '-'
                  return (
                    <tr key={r.id || i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium text-sm">{name}</td>
                      <td className="text-xs font-mono" style={{ color: ACCENT }}>{userId}</td>
                      <td className="text-xs max-w-[200px] truncate">{text}</td>
                      <td className="text-xs max-w-[150px] truncate">{url !== '-' ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{url.substring(0, 35)}...</a> : '-'}</td>
                      <td className="text-xs text-secondary-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG') : '-'}</td>
                      <td><button onClick={() => { if (r.id) { deleteResult(r.id); setToolResults(prev => prev.filter(item => item.id !== r.id)) } }} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td>
                    </tr>
                  )
                }
                if (owner === 'search') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">@{r.author || '-'}</td>
                      <td className="text-xs max-w-[260px] truncate">{r.caption || '-'}</td>
                      <td className="text-xs"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a></td>
                    </tr>
                  )
                }
                if (owner === 'follow') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">@{r.username || '-'}</td>
                      <td><span className={`badge ${r.status === 'followed' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'interact') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[260px] truncate"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" dir="ltr">{r.url}</a></td>
                      <td>{r.liked ? <CheckCircle size={14} className="text-emerald-500" /> : <span className="text-secondary-300">-</span>}</td>
                      <td>{r.commented ? <CheckCircle size={14} className="text-emerald-500" /> : <span className="text-secondary-300">-</span>}</td>
                      <td><span className={`badge ${r.status === 'done' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{r.username || r.recipient || r.name || '-'}</td>
                    <td><span className={`badge ${r.status === 'sent' || r.status === 'success' ? 'badge-success' : r.status === 'failed' || r.status === 'error' ? 'badge-danger' : 'badge-warning'}`}>{r.status || 'pending'}</span></td>
                    <td className="text-xs text-secondary-500">{r.error || r.message || '-'}</td>
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
        platformId="tiktok"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType, url: extractInput, limit: extractLimit } }}
        sendTask={{ type: 'send', params: { message: mentionMessage } }}
      />
      <div>
        <label className="label-field">نوع الاستخراج</label>
        <select className="select-field" value={extractType} onChange={e => setExtractType(e.target.value)}>
          <option value="comments">استخراج التعليقات (رابط فيديو)</option>
          <option value="followers">استخراج المتابعين (اسم المستخدم)</option>
        </select>
      </div>
      <div>
        <label className="label-field">{extractType === 'comments' ? 'رابط الفيديو' : 'اسم المستخدم'}</label>
        <input type="text" className="input-field" placeholder={extractType === 'comments' ? 'https://tiktok.com/...' : '@username'} value={extractInput} onChange={e => setExtractInput(e.target.value)} />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {extractLimit}</label>
        <input type="range" min="10" max="500" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full" style={{ accentColor: ACCENT }} />
      </div>
      {renderResultsTable('extract', ['#', 'الاسم', 'المعرف', 'النص', 'الرابط', 'التاريخ', ''], 'tiktok-extract')}
    </div>
  )

  const extractFooter = (
    <button onClick={handleExtract} disabled={loading || !sessionId} className="btn-primary w-full disabled:opacity-50" style={{ background: ACCENT_GRADIENT }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}
    </button>
  )

  const handleMention = async () => {
    if (!ensureSession()) return
    const urls = mentionVideoUrls.split('\n').map(s => s.trim()).filter(Boolean)
    const users = mentionUsers.split('\n').map(s => s.trim().replace(/^@/, '')).filter(Boolean)
    if (urls.length === 0 || users.length === 0) { showMsg('أدخل الروابط والمستخدمين', true); return }
    const text = users.map(u => `@${u}`).join(' ') + ' ' + (mentionMessage || '')
    setLoading(true); setResultsOwner('mention'); setToolResults([])
    try {
      const res = await window.electronAPI.tiktokInteract({ sessionId, videoUrls: urls, doLike: false, comment: text, delayMs: 5000 })
      if (res.success) {
        const items = (res.data as any[]) || []; setToolResults(items)
        const ok = items.filter((r: any) => r.commented).length
        showMsg(`تم المنشن في ${ok} من ${urls.length}`)
      } else { showMsg(res.error || 'فشل', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const renderMentionBody = () => (
    <div className="space-y-5">
      <div><label className="label-field">روابط الفيديو (سطر لكل رابط)</label><textarea className="textarea-field" rows={5} value={mentionVideoUrls} onChange={e => setMentionVideoUrls(e.target.value)} placeholder="https://tiktok.com/@user/video/..." /></div>
      <div><label className="label-field">المستخدمين للمنشن (سطر لكل اسم)</label><textarea className="textarea-field" rows={4} value={mentionUsers} onChange={e => setMentionUsers(e.target.value)} placeholder="@user1&#10;@user2" /></div>
      <div><label className="label-field">رسالة إضافية (اختياري)</label><textarea className="textarea-field" rows={3} value={mentionMessage} onChange={e => setMentionMessage(e.target.value)} placeholder="شوف ده 🔥" /></div>
      {renderResultsTable('mention', ['#', 'المستخدم', 'الحالة', 'التفاصيل'], 'tiktok-mention')}
    </div>
  )

  const mentionFooter = (
    <button onClick={handleMention} disabled={loading || !sessionId || !mentionVideoUrls.trim() || !mentionUsers.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> منشن جماعي</>}
    </button>
  )

  const renderDownloadBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط الفيديو</label>
        <input type="url" className="input-field" placeholder="https://tiktok.com/..." value={downloadVideoUrl} onChange={e => setDownloadVideoUrl(e.target.value)} />
      </div>
      <div>
        <label className="label-field">مسار الحفظ (اختياري)</label>
        <input type="text" className="input-field" placeholder="C:\Downloads" value={downloadSavePath} onChange={e => setDownloadSavePath(e.target.value)} />
      </div>
      {renderResultsTable('download', ['#', 'الحالة'], 'tiktok-download')}
    </div>
  )

  const downloadFooter = (
    <button onClick={handleDownload} disabled={loading || !downloadVideoUrl} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> تحميل</>}
    </button>
  )

  const renderUploadBody = () => (
    <div className="space-y-5">
      <input ref={uploadFileRef} type="file" accept="video/*" onChange={handleVideoSelected} className="hidden" />
      <div>
        <label className="label-field">ملف الفيديو</label>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={handlePickVideo} className="btn-secondary text-sm"><Play size={16} /> اختر فيديو</button>
          {uploadVideoPath && <span className="text-xs truncate max-w-[400px]" dir="ltr">{uploadVideoPath}</span>}
        </div>
      </div>
      <div><label className="label-field">الوصف / الكابشن (يدعم #هاشتاجات)</label><textarea className="textarea-field" rows={4} value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="اكتب الوصف..." /></div>
    </div>
  )

  const uploadFooter = (
    <button onClick={handleUpload} disabled={loading || !sessionId || !uploadVideoPath} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #a855f7, #6d28d9)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Upload size={18} /> نشر الفيديو</>}
    </button>
  )

  const renderSearchBody = () => (
    <div className="space-y-5">
      <div><label className="label-field">الكلمة المفتاحية</label><input type="text" className="input-field" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="dance, music, travel" /></div>
      <div><label className="label-field">الحد الأقصى: {searchLimit}</label><input type="range" min={10} max={500} step={10} className="w-full accent-pink-500" value={searchLimit} onChange={e => setSearchLimit(parseInt(e.target.value))} /></div>
      {renderResultsTable('search', ['#', 'المستخدم', 'الكابشن', 'الرابط'], 'tiktok-search')}
    </div>
  )
  const searchFooter = (<button onClick={handleSearch} disabled={loading || !sessionId || !searchQuery.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Heart size={18} /> بحث</>}</button>)

  const renderFollowBody = () => (
    <div className="space-y-5">
      <div><label className="label-field">قائمة الحسابات (سطر لكل username)</label><textarea className="textarea-field" rows={6} value={followList} onChange={e => setFollowList(e.target.value)} placeholder="@user1&#10;@user2" /></div>
      <div><label className="label-field">الفاصل (ثانية)</label><input type="number" min={2} max={60} className="input-field w-32" value={followDelay} onChange={e => setFollowDelay(Number(e.target.value) || 5)} /></div>
      {renderResultsTable('follow', ['#', 'المستخدم', 'الحالة', 'خطأ'], 'tiktok-follow')}
    </div>
  )
  const followFooter = (<button onClick={handleFollow} disabled={loading || !sessionId || !followList.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> متابعة</>}</button>)

  const renderInteractBody = () => (
    <div className="space-y-5">
      <div><label className="label-field">روابط الفيديوهات (سطر لكل رابط)</label><textarea className="textarea-field" rows={6} value={interactUrls} onChange={e => setInteractUrls(e.target.value)} placeholder="https://www.tiktok.com/@user/video/..." /></div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={interactDoLike} onChange={e => setInteractDoLike(e.target.checked)} className="rounded" />
        إعجاب
      </label>
      <div><label className="label-field">نص التعليق (اختياري — {'{{n}}'} = رقم الفيديو)</label><textarea className="textarea-field" rows={3} value={interactComment} onChange={e => setInteractComment(e.target.value)} placeholder="رائع 🔥" /></div>
      <div><label className="label-field">الفاصل (ثانية)</label><input type="number" min={2} max={60} className="input-field w-32" value={interactDelay} onChange={e => setInteractDelay(Number(e.target.value) || 5)} /></div>
      {renderResultsTable('interact', ['#', 'الرابط', 'إعجاب', 'تعليق', 'الحالة'], 'tiktok-interact')}
    </div>
  )
  const interactFooter = (<button onClick={handleInteract} disabled={loading || !sessionId || !interactUrls.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Heart size={18} /> تفاعل</>}</button>)

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    extract: { body: renderExtractBody(), footer: extractFooter },
    search: { body: renderSearchBody(), footer: searchFooter },
    follow: { body: renderFollowBody(), footer: followFooter },
    interact: { body: renderInteractBody(), footer: interactFooter },
    mention: { body: renderMentionBody(), footer: mentionFooter },
    download: { body: renderDownloadBody(), footer: downloadFooter },
    upload: { body: renderUploadBody(), footer: uploadFooter },
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
        platformId="tiktok"
        platformName="TikTok"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('extract')}
      />

      <ToolGrid
        title="أدوات TikTok"
        subtitle="اختر أداة لفتح إعدادات الحملة الخاصة بها"
        icon={Wrench}
        accent={ACCENT}
        cols={5}
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
        title="تسجيل الدخول إلى TikTok"
        subtitle="افتح المتصفح لتسجيل الدخول يدوياً"
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
