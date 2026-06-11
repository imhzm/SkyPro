import { useState } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { getBackgroundMode } from '../../lib/backgroundMode'
import { makeJobId } from '../../lib/jobId'
import { useAccountsStore } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import type { LucideIcon } from 'lucide-react'
import {
  LogIn, Download, Send, UserPlus, AlertCircle, CheckCircle, Loader2,
  Trash2, FileSpreadsheet, Users, MessageSquare,
  Megaphone, Phone, KeyRound, LogOut, Wrench,
  Contact, Search, Hash, Database,
} from 'lucide-react'

type ActiveTool =
  | 'extract' | 'broadcast' | 'add'
  | 'extract-dialogs' | 'extract-contacts' | 'search-public' | 'join-groups' | 'send-to-groups'
  | 'add-by-id' | 'bulk-groups-download'
  | null
type ResultsOwner =
  | 'extract' | 'broadcast' | 'add'
  | 'extract-dialogs' | 'extract-contacts' | 'search-public' | 'join-groups' | 'send-to-groups'
  | 'add-by-id' | 'bulk-groups-download'
  | null

const ACCENT = '#0088CC'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #0088CC, #006699)'

export default function TelegramModule() {
  const {
    loading, setLoading, message, error, showMsg, sessionId, setSessionId,
    accounts, results, loadAccounts, loadResults, handleExport, clearResults,
    deleteResult, clearSession, cycleActive, cycleProgress, startCycle, stopCycle,
    liveRows, beginLiveJob, endLiveJob,
  } = usePlatform('telegram')
  const { accounts: allAccounts } = useAccountsStore()

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)

  const [phoneNumber, setPhoneNumber] = useState('')
  const [proxy, setProxy] = useState('')
  const [needsCode, setNeedsCode] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [groupUrl, setGroupUrl] = useState('')
  const [extractLimit, setExtractLimit] = useState(200)
  const [broadcastRecipients, setBroadcastRecipients] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [addGroup, setAddGroup] = useState('')
  const [addUsersText, setAddUsersText] = useState('')
  const [toolResults, setToolResults] = useState<any[]>([])
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)

  // --- Extract dialogs / contacts ---
  const [dialogsLimit, setDialogsLimit] = useState(300)
  const [dialogsFilter, setDialogsFilter] = useState<'all' | 'chat' | 'group' | 'channel' | 'bot'>('all')
  const [contactsLimit, setContactsLimit] = useState(1000)
  // --- Search public ---
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'group' | 'channel' | 'bot'>('all')
  const [searchLimit, setSearchLimit] = useState(50)
  // --- Join groups ---
  const [joinList, setJoinList] = useState('')
  const [joinDelay, setJoinDelay] = useState(4)
  // --- Send to groups ---
  const [sendToGroupsList, setSendToGroupsList] = useState('')
  const [sendToGroupsMessage, setSendToGroupsMessage] = useState('')
  const [sendToGroupsDelay, setSendToGroupsDelay] = useState(5)
  // --- Add by ID ---
  const [addByIdGroup, setAddByIdGroup] = useState('')
  const [addByIdList, setAddByIdList] = useState('')
  const [addByIdDelay, setAddByIdDelay] = useState(4)
  // --- Bulk groups download ---
  const [bulkKeywords, setBulkKeywords] = useState('')
  const [bulkType, setBulkType] = useState<'all' | 'group' | 'channel' | 'bot'>('group')
  const [bulkPerKeyword, setBulkPerKeyword] = useState(50)

  const telegramAccounts = accounts.filter((a: any) => a.platform === 'telegram')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!phoneNumber) { showMsg('أدخل رقم الهاتف', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.telegramLogin({ phoneNumber, headless: getBackgroundMode('telegram'), proxy })
      if (res.success) {
        setSessionId(res.sessionId || '')
        if (res.needsCode) { setNeedsCode(true); showMsg('أدخل كود التحقق المرسل لهاتفك') }
        else { setNeedsCode(false); showMsg(res.message || 'تم فتح Telegram بنجاح'); setShowLoginPanel(false) }
        await loadAccounts()
      } else showMsg(res.error || 'فشل الاتصال', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleVerifyCode = async () => {
    if (!verifyCode) { showMsg('أدخل كود التحقق', true); return }
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.telegramVerifyCode({ sessionId, code: verifyCode })
      if (res.success) { setNeedsCode(false); showMsg('تم التحقق بنجاح!'); await loadAccounts(); setShowLoginPanel(false) }
      else showMsg(res.error || 'فشل التحقق', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في التحقق', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!groupUrl) { showMsg('أدخل رابط المجموعة', true); return }
    setLoading(true)
    setResultsOwner('extract')
    try {
      const res = await window.electronAPI.telegramExtractMembers({ sessionId, groupUrl, limit: extractLimit })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count || ((res.data as any[]) || []).length} عضو`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleBroadcast = async () => {
    if (!ensureSession()) return
    const recipients = broadcastRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (!broadcastMessage || recipients.length === 0) { showMsg('أدخل المستلمين والرسالة', true); return }
    setLoading(true)
    setResultsOwner('broadcast')
    setToolResults([])
    const jobId = makeJobId('tg-send')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.telegramSendMessages({ sessionId, recipients, message: broadcastMessage, jobId })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'sent').length; showMsg(`تم إرسال ${ok} من ${recipients.length} رسالة`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleAddUsers = async () => {
    if (!ensureSession()) return
    const users = addUsersText.split('\n').map(s => s.trim()).filter(Boolean)
    if (!addGroup || users.length === 0) { showMsg('أدخل معرف المجموعة وقائمة المستخدمين', true); return }
    setLoading(true)
    setResultsOwner('add')
    setToolResults([])
    const jobId = makeJobId('tg-add')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.telegramAddUsers({ sessionId, groupUsername: addGroup, users, jobId })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'added').length; showMsg(`تم إضافة ${ok} من ${users.length} مستخدم`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleClearResults = () => {
    setToolResults([])
    setResultsOwner(null)
    clearResults()
  }

  // ---- Extract dialogs ----
  const handleExtractDialogs = async () => {
    if (!ensureSession()) return
    setLoading(true)
    setResultsOwner('extract-dialogs')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramExtractDialogs({ sessionId, limit: dialogsLimit, filter: dialogsFilter })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} محادثة`)
        await loadResults()
      } else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Extract contacts ----
  const handleExtractContacts = async () => {
    if (!ensureSession()) return
    setLoading(true)
    setResultsOwner('extract-contacts')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramExtractContacts({ sessionId, limit: contactsLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} جهة اتصال`)
        await loadResults()
      } else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Search public groups/channels ----
  const handleSearchPublic = async () => {
    if (!ensureSession()) return
    if (!searchQuery.trim()) { showMsg('أدخل الكلمة المفتاحية', true); return }
    setLoading(true)
    setResultsOwner('search-public')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramSearchPublic({ sessionId, query: searchQuery.trim(), type: searchType, limit: searchLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم العثور على ${res.count || items.length} نتيجة`)
        await loadResults()
      } else showMsg(res.error || 'فشل البحث', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Join groups ----
  const handleJoinGroups = async () => {
    if (!ensureSession()) return
    const groups = joinList.split('\n').map(s => s.trim()).filter(Boolean)
    if (groups.length === 0) { showMsg('أدخل قائمة المجموعات', true); return }
    setLoading(true)
    setResultsOwner('join-groups')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramJoinGroups({ sessionId, groups, delayMs: Math.max(1, joinDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'joined').length
        showMsg(`تم الانضمام إلى ${ok} من ${groups.length} مجموعة`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Add by ID ----
  const handleAddById = async () => {
    if (!ensureSession()) return
    if (!addByIdGroup.trim()) { showMsg('أدخل اسم المجموعة', true); return }
    const ids = addByIdList.split('\n').map(s => s.trim()).filter(Boolean)
    if (ids.length === 0) { showMsg('أدخل قائمة الـ IDs', true); return }
    setLoading(true)
    setResultsOwner('add-by-id')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramAddById({ sessionId, groupName: addByIdGroup.trim(), userIds: ids, delayMs: Math.max(1, addByIdDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'added').length
        showMsg(`تم إضافة ${ok} من ${ids.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Bulk groups download ----
  const handleBulkGroupsDownload = async () => {
    if (!ensureSession()) return
    const keywords = bulkKeywords.split('\n').map(s => s.trim()).filter(Boolean)
    if (keywords.length === 0) { showMsg('أدخل الكلمات المفتاحية', true); return }
    setLoading(true)
    setResultsOwner('bulk-groups-download')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramBulkGroupsDownload({ sessionId, keywords, type: bulkType, perKeyword: bulkPerKeyword })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم تجميع ${res.count || items.length} مجموعة/قناة`)
        await loadResults()
      } else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Send to multiple groups ----
  const handleSendToGroups = async () => {
    if (!ensureSession()) return
    const groups = sendToGroupsList.split('\n').map(s => s.trim()).filter(Boolean)
    if (groups.length === 0) { showMsg('أدخل قائمة المجموعات', true); return }
    if (!sendToGroupsMessage.trim()) { showMsg('أدخل نص الرسالة', true); return }
    setLoading(true)
    setResultsOwner('send-to-groups')
    setToolResults([])
    try {
      const res = await window.electronAPI.telegramSendToGroups({ sessionId, groups, message: sendToGroupsMessage, delayMs: Math.max(1, sendToGroupsDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال الرسالة لـ ${ok} من ${groups.length} مجموعة`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
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
    { id: 'extract', name: 'استخراج الأعضاء', description: 'أعضاء مجموعة معينة', icon: Download, accent: '#0088CC', accentGradient: 'linear-gradient(135deg, #0088CC, #006699)', requiresSession: true },
    { id: 'extract-dialogs', name: 'استخراج محادثاتي', description: 'القنوات والمجموعات في حسابك', icon: MessageSquare, accent: '#06b6d4', accentGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', requiresSession: true },
    { id: 'extract-contacts', name: 'استخراج جهات الاتصال', description: 'استخراج كل جهات اتصالك', icon: Contact, accent: '#14b8a6', accentGradient: 'linear-gradient(135deg, #14b8a6, #0d9488)', requiresSession: true },
    { id: 'search-public', name: 'بحث المجموعات والقنوات', description: 'بحث عام بكلمة مفتاحية', icon: Search, accent: '#a855f7', accentGradient: 'linear-gradient(135deg, #a855f7, #7e22ce)', requiresSession: true },
    { id: 'join-groups', name: 'الانضمام للمجموعات', description: 'انضمام جماعي لقائمة', icon: Users, accent: '#84cc16', accentGradient: 'linear-gradient(135deg, #84cc16, #4d7c0f)', requiresSession: true },
    { id: 'broadcast', name: 'إرسال رسائل', description: 'بث رسائل لقائمة مستخدمين', icon: Send, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: true },
    { id: 'send-to-groups', name: 'إرسال للمجموعات', description: 'إرسال رسالة لعدة مجموعات', icon: Megaphone, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: true },
    { id: 'add', name: 'إضافة أعضاء', description: 'إضافة مستخدمين لمجموعة', icon: UserPlus, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', requiresSession: true },
    { id: 'add-by-id', name: 'إضافة بالـ ID', description: 'إضافة أعضاء برقم Telegram ID', icon: Hash, accent: '#0d9488', accentGradient: 'linear-gradient(135deg, #0d9488, #115e59)', requiresSession: true },
    { id: 'bulk-groups-download', name: 'استخراج بالكميات', description: 'مجموعات/قنوات بكلمات متعددة', icon: Database, accent: '#7c3aed', accentGradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)', requiresSession: true },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(0,136,204,0.06), rgba(0,102,153,0.04))',
        border: '1px solid rgba(0,136,204,0.18)',
        boxShadow: '0 4px 20px rgba(0,136,204,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(0,136,204,0.3)' }}
          >
            <Send size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Telegram</h3>
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

      {telegramAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(0,136,204,0.12)', background: 'rgba(255,255,255,0.5)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            onChange={e => {
              const acc = telegramAccounts.find((a: any) => a.id.toString() === e.target.value)
              if (acc) { setPhoneNumber(acc.username || ''); setShowLoginPanel(true) }
            }}
          >
            <option value="">-- اختر حساب --</option>
            {telegramAccounts.map((acc: any) => (
              <option key={acc.id} value={acc.id}>{acc.username || 'حساب تليجرام'}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )

  const renderLoginPanelContent = () => (
    <div className="space-y-5">
      {sessionId && !needsCode && (
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-success-600" />
            <p className="font-semibold text-success-700 text-sm">جلسة نشطة — يمكنك استخدام جميع الأدوات</p>
          </div>
        </div>
      )}
      {needsCode && (
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(0,136,204,0.06)', borderColor: 'rgba(0,136,204,0.2)' }}>
          <h4 className="font-bold text-secondary-900 mb-2 flex items-center gap-2"><KeyRound size={18} style={{ color: '#0088cc' }} /> كود التحقق</h4>
          <p className="text-sm text-secondary-600 mb-3">تم إرسال كود التحقق لهاتفك - أدخله أدناه أو في نافذة المتصفح</p>
          <div className="flex gap-2">
            <input type="text" className="input-field flex-1" placeholder="أدخل الكود (مثال: 12345)" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} maxLength={10} />
            <button onClick={handleVerifyCode} disabled={loading || !verifyCode.trim()} className="btn-primary disabled:opacity-50" style={{ background: ACCENT_GRADIENT }}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><KeyRound size={16} /> تحقق</>}
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
        <input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={proxy} onChange={e => setProxy(e.target.value)} />
      </div>

      {accounts.length > 0 && (
        <div>
          <h4 className="font-bold text-secondary-900 text-sm mb-3">الحسابات المحفوظة على الجهاز</h4>
          <div className="space-y-2 max-h-[280px] overflow-y-auto scroll-container pr-1">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'rgba(0,136,204,0.1)', color: '#0088cc' }}>
                    {(acc.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 text-sm truncate">{acc.username || 'حساب تليجرام'}</p>
                    <p className="text-[11px] text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>
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
      disabled={loading || !phoneNumber.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Phone size={18} /> فتح Telegram</>}
    </button>
  )

  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string, showActions = false) => {
    if (resultsOwner !== owner) return null
    const displayResults = toolResults.length > 0 ? toolResults : (liveRows.length > 0 ? liveRows : results)
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
                  const name = r.name || extra.name || '-'
                  const username = r.username || extra.username || r.extra || '-'
                  const url = r.url || extra.url || extra.profile || '-'
                  const source = r.source || extra.source || 'telegram'
                  return (
                    <tr key={r.id || i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium text-sm">{name}</td>
                      <td className="text-xs font-mono" style={{ color: '#0088cc' }}>{username}</td>
                      <td className="text-xs max-w-[150px] truncate">{url !== '-' ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{url.substring(0, 40)}...</a> : '-'}</td>
                      <td className="text-xs">{source}</td>
                      <td className="text-xs text-secondary-400">{r.created_at ? new Date(r.created_at).toLocaleDateString('ar-EG') : '-'}</td>
                      {showActions && (
                        <td><button onClick={() => r.id && deleteResult(r.id)} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td>
                      )}
                    </tr>
                  )
                }
                if (owner === 'broadcast') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.recipient || r.name || '-'}</td>
                      <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-dialogs') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td><span className={`badge ${r.type === 'channel' ? 'badge-warning' : r.type === 'group' ? 'badge-success' : r.type === 'bot' ? 'badge-danger' : 'badge-info'}`}>{r.type}</span></td>
                      <td className="text-xs max-w-[260px] truncate text-secondary-600">{r.lastMessage || '-'}</td>
                      <td className="text-xs text-secondary-500">{r.time || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-contacts') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td dir="ltr" className="text-xs font-mono">{r.phone || '-'}</td>
                      <td className="text-xs text-secondary-500">{r.status || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'search-public') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td><span className={`badge ${r.type === 'channel' ? 'badge-warning' : r.type === 'group' ? 'badge-success' : 'badge-info'}`}>{r.type}</span></td>
                      <td className="text-xs max-w-[280px] truncate text-secondary-600">{r.subtitle || '-'}</td>
                      <td className="text-xs">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'join-groups') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium" dir="ltr">{r.group || '-'}</td>
                      <td><span className={`badge ${r.status === 'joined' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'send-to-groups') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium" dir="ltr">{r.group || '-'}</td>
                      <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'add-by-id') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td dir="ltr" className="font-mono text-sm">{r.userId || '-'}</td>
                      <td><span className={`badge ${r.status === 'added' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'bulk-groups-download') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td><span className={`badge ${r.type === 'channel' ? 'badge-warning' : 'badge-success'}`}>{r.type}</span></td>
                      <td className="text-xs text-secondary-600">{r.keyword || '-'}</td>
                      <td className="text-xs">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td>
                    </tr>
                  )
                }
                // add
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{r.user || r.name || '-'}</td>
                    <td><span className={`badge ${r.status === 'added' ? 'badge-success' : r.status === 'error' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
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
        platformId="telegram"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType: 'members', groupUrl, limit: extractLimit } }}
        sendTask={{ type: 'send', params: { recipients: broadcastRecipients.split('\n').filter(Boolean), message: broadcastMessage } }}
      />
      <div>
        <label className="label-field">رابط المجموعة</label>
        <input type="url" className="input-field" placeholder="https://web.telegram.org/a/#-..." value={groupUrl} onChange={e => setGroupUrl(e.target.value)} />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {extractLimit}</label>
        <input type="range" min="10" max="500" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full" style={{ accentColor: '#0088cc' }} />
      </div>

      {renderResultsTable('extract', ['#', 'الاسم', 'المعرف', 'الرابط', 'المصدر', 'التاريخ', ''], 'telegram-members', true)}
    </div>
  )

  const extractFooter = (
    <button
      onClick={handleExtract}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}
    </button>
  )

  const renderBroadcastBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">المستلمين (username - سطر لكل مستخدم)</label>
        <textarea className="textarea-field" rows={5} value={broadcastRecipients} onChange={e => setBroadcastRecipients(e.target.value)} placeholder="user1&#10;user2&#10;@channel_name" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." />
      </div>
      {renderResultsTable('broadcast', ['#', 'المستلم', 'الحالة', 'خطأ'], 'telegram-messages')}
    </div>
  )

  const broadcastFooter = (
    <button
      onClick={handleBroadcast}
      disabled={loading || !broadcastRecipients.trim() || !broadcastMessage.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال</>}
    </button>
  )

  const renderAddBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">معرف المجموعة (@groupname)</label>
        <input type="text" className="input-field" placeholder="@groupname" value={addGroup} onChange={e => setAddGroup(e.target.value)} />
      </div>
      <div>
        <label className="label-field">قائمة المستخدمين (username - سطر لكل مستخدم)</label>
        <textarea className="textarea-field" rows={5} value={addUsersText} onChange={e => setAddUsersText(e.target.value)} placeholder="user1&#10;user2" />
      </div>
      {renderResultsTable('add', ['#', 'المستخدم', 'الحالة', 'خطأ'], 'telegram-add-users')}
    </div>
  )

  const addFooter = (
    <button
      onClick={handleAddUsers}
      disabled={loading || !addGroup.trim() || !addUsersText.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> إضافة أعضاء</>}
    </button>
  )

  // ---- Extract dialogs (my chats) panel ----
  const renderExtractDialogsBody = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">الحد الأقصى: {dialogsLimit}</label>
          <input type="range" min={20} max={2000} step={10} className="w-full" style={{ accentColor: '#06b6d4' }} value={dialogsLimit} onChange={e => setDialogsLimit(parseInt(e.target.value))} />
        </div>
        <div>
          <label className="label-field">الفلتر</label>
          <select className="select-field" value={dialogsFilter} onChange={e => setDialogsFilter(e.target.value as any)}>
            <option value="all">كل المحادثات</option>
            <option value="chat">دردشات فردية</option>
            <option value="group">مجموعات</option>
            <option value="channel">قنوات</option>
            <option value="bot">بوتات</option>
          </select>
        </div>
      </div>
      {renderResultsTable('extract-dialogs', ['#', 'الاسم', 'النوع', 'آخر رسالة', 'الوقت'], 'telegram-dialogs')}
    </div>
  )
  const extractDialogsFooter = (
    <button onClick={handleExtractDialogs} disabled={loading} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><MessageSquare size={18} /> استخراج المحادثات</>}
    </button>
  )

  // ---- Extract contacts panel ----
  const renderExtractContactsBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)' }}>
        سيتم فتح قائمة جهات الاتصال من القائمة الجانبية واستخراج كل الأرقام المحفوظة.
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {contactsLimit}</label>
        <input type="range" min={50} max={5000} step={50} className="w-full" style={{ accentColor: '#14b8a6' }} value={contactsLimit} onChange={e => setContactsLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-contacts', ['#', 'الاسم', 'الهاتف', 'الحالة'], 'telegram-contacts')}
    </div>
  )
  const extractContactsFooter = (
    <button onClick={handleExtractContacts} disabled={loading} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Contact size={18} /> استخراج جهات الاتصال</>}
    </button>
  )

  // ---- Search public groups/channels panel ----
  const renderSearchPublicBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الكلمة المفتاحية</label>
        <input type="text" className="input-field" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="مثال: تسويق، crypto، @username" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">النوع</label>
          <select className="select-field" value={searchType} onChange={e => setSearchType(e.target.value as any)}>
            <option value="all">الكل</option>
            <option value="group">مجموعات فقط</option>
            <option value="channel">قنوات فقط</option>
            <option value="bot">بوتات فقط</option>
          </select>
        </div>
        <div>
          <label className="label-field">الحد الأقصى: {searchLimit}</label>
          <input type="range" min={10} max={300} step={10} className="w-full" style={{ accentColor: '#a855f7' }} value={searchLimit} onChange={e => setSearchLimit(parseInt(e.target.value))} />
        </div>
      </div>
      {renderResultsTable('search-public', ['#', 'الاسم', 'النوع', 'التفاصيل', 'الرابط'], 'telegram-search')}
    </div>
  )
  const searchPublicFooter = (
    <button onClick={handleSearchPublic} disabled={loading || !searchQuery.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Search size={18} /> بحث</>}
    </button>
  )

  // ---- Join groups panel ----
  const renderJoinGroupsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">قائمة المجموعات / القنوات (سطر لكل عنصر)</label>
        <textarea className="textarea-field" rows={7} value={joinList} onChange={e => setJoinList(e.target.value)} placeholder="@channel_name&#10;https://t.me/groupname&#10;@bot_name" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={60} className="input-field w-32" value={joinDelay} onChange={e => setJoinDelay(Number(e.target.value) || 4)} />
      </div>
      {renderResultsTable('join-groups', ['#', 'المجموعة', 'الحالة', 'خطأ'], 'telegram-join')}
    </div>
  )
  const joinGroupsFooter = (
    <button onClick={handleJoinGroups} disabled={loading || !joinList.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #84cc16, #4d7c0f)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Users size={18} /> الانضمام</>}
    </button>
  )

  // ---- Send to groups panel ----
  const renderSendToGroupsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">قائمة المجموعات / القنوات (سطر لكل عنصر)</label>
        <textarea className="textarea-field" rows={5} value={sendToGroupsList} onChange={e => setSendToGroupsList(e.target.value)} placeholder="@channel_name&#10;https://t.me/groupname" />
      </div>
      <div>
        <label className="label-field">نص الرسالة ({'{{n}}'} = رقم المجموعة)</label>
        <textarea className="textarea-field" rows={4} value={sendToGroupsMessage} onChange={e => setSendToGroupsMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={120} className="input-field w-32" value={sendToGroupsDelay} onChange={e => setSendToGroupsDelay(Number(e.target.value) || 5)} />
      </div>
      {renderResultsTable('send-to-groups', ['#', 'المجموعة', 'الحالة', 'خطأ'], 'telegram-group-send')}
    </div>
  )
  const sendToGroupsFooter = (
    <button onClick={handleSendToGroups} disabled={loading || !sendToGroupsList.trim() || !sendToGroupsMessage.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Megaphone size={18} /> إرسال</>}
    </button>
  )

  // ---- Add by ID panel ----
  const renderAddByIdBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">اسم المجموعة المستهدفة</label>
        <input type="text" className="input-field" value={addByIdGroup} onChange={e => setAddByIdGroup(e.target.value)} placeholder="اسم المجموعة كما يظهر في التليجرام" />
      </div>
      <div>
        <label className="label-field">قائمة الـ IDs (سطر لكل ID)</label>
        <textarea className="textarea-field font-mono" dir="ltr" rows={7} value={addByIdList} onChange={e => setAddByIdList(e.target.value)} placeholder="123456789&#10;987654321" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={60} className="input-field w-32" value={addByIdDelay} onChange={e => setAddByIdDelay(Number(e.target.value) || 4)} />
      </div>
      {renderResultsTable('add-by-id', ['#', 'ID', 'الحالة', 'خطأ'], 'telegram-add-id')}
    </div>
  )
  const addByIdFooter = (<button onClick={handleAddById} disabled={loading || !addByIdGroup.trim() || !addByIdList.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0d9488, #115e59)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Hash size={18} /> إضافة بالـ ID</>}</button>)

  // ---- Bulk groups download panel ----
  const renderBulkGroupsDownloadBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)' }}>
        أدخل كلمات/مجالات (سطر لكل كلمة) — سيبحث في تليجرام عن كل كلمة ويجمع المجموعات/القنوات حتى الحد المحدد.
      </div>
      <div>
        <label className="label-field">الكلمات المفتاحية / المجالات</label>
        <textarea className="textarea-field" rows={7} value={bulkKeywords} onChange={e => setBulkKeywords(e.target.value)} placeholder="تسويق&#10;ecommerce&#10;crypto" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">النوع</label>
          <select className="select-field" value={bulkType} onChange={e => setBulkType(e.target.value as any)}>
            <option value="all">الكل</option>
            <option value="group">مجموعات فقط</option>
            <option value="channel">قنوات فقط</option>
            <option value="bot">بوتات فقط</option>
          </select>
        </div>
        <div>
          <label className="label-field">لكل كلمة: {bulkPerKeyword}</label>
          <input type="range" min={10} max={500} step={10} className="w-full" style={{ accentColor: '#7c3aed' }} value={bulkPerKeyword} onChange={e => setBulkPerKeyword(parseInt(e.target.value))} />
        </div>
      </div>
      {renderResultsTable('bulk-groups-download', ['#', 'الاسم', 'النوع', 'الكلمة', 'الرابط'], 'telegram-bulk')}
    </div>
  )
  const bulkGroupsDownloadFooter = (<button onClick={handleBulkGroupsDownload} disabled={loading || !bulkKeywords.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Database size={18} /> تجميع</>}</button>)

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    extract: { body: renderExtractBody(), footer: extractFooter },
    'extract-dialogs': { body: renderExtractDialogsBody(), footer: extractDialogsFooter },
    'extract-contacts': { body: renderExtractContactsBody(), footer: extractContactsFooter },
    'search-public': { body: renderSearchPublicBody(), footer: searchPublicFooter },
    'bulk-groups-download': { body: renderBulkGroupsDownloadBody(), footer: bulkGroupsDownloadFooter },
    'join-groups': { body: renderJoinGroupsBody(), footer: joinGroupsFooter },
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    'send-to-groups': { body: renderSendToGroupsBody(), footer: sendToGroupsFooter },
    add: { body: renderAddBody(), footer: addFooter },
    'add-by-id': { body: renderAddByIdBody(), footer: addByIdFooter },
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
        platformId="telegram"
        platformName="Telegram"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('extract')}
      />

      <ToolGrid
        title="أدوات Telegram"
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
        title="تسجيل الدخول إلى Telegram"
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
