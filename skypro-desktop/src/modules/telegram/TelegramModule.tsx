import { useState } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import type { LucideIcon } from 'lucide-react'
import {
  LogIn, Download, Send, UserPlus, AlertCircle, CheckCircle, Loader2,
  Trash2, FileSpreadsheet, Users, MessageSquare, BarChart3, Link2,
  Shield, Settings, Megaphone, Globe, Phone, KeyRound, LogOut, Wrench,
} from 'lucide-react'

type ActiveTool = 'extract' | 'broadcast' | 'add' | 'tools' | null
type ResultsOwner = 'extract' | 'broadcast' | 'add' | null

const ACCENT = '#0088CC'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #0088CC, #006699)'

export default function TelegramModule() {
  const {
    loading, setLoading, message, error, showMsg, sessionId, setSessionId,
    accounts, results, loadAccounts, loadResults, handleExport, clearResults,
    deleteResult, clearSession, cycleActive, cycleProgress, startCycle, stopCycle,
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

  const telegramAccounts = accounts.filter((a: any) => a.platform === 'telegram')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!phoneNumber) { showMsg('أدخل رقم الهاتف', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.telegramLogin({ phoneNumber, headless: false, proxy })
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
    try {
      const res = await window.electronAPI.telegramSendMessages({ sessionId, recipients, message: broadcastMessage })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'sent').length; showMsg(`تم إرسال ${ok} من ${recipients.length} رسالة`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleAddUsers = async () => {
    if (!ensureSession()) return
    const users = addUsersText.split('\n').map(s => s.trim()).filter(Boolean)
    if (!addGroup || users.length === 0) { showMsg('أدخل معرف المجموعة وقائمة المستخدمين', true); return }
    setLoading(true)
    setResultsOwner('add')
    try {
      const res = await window.electronAPI.telegramAddUsers({ sessionId, groupUsername: addGroup, users })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'added').length; showMsg(`تم إضافة ${ok} من ${users.length} مستخدم`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => {
    setToolResults([])
    setResultsOwner(null)
    clearResults()
  }

  const toolStubTools = [
    { id: 'join-groups', name: 'الانضمام للمجموعات', desc: 'انضمام تلقائي للمجموعات', icon: Users },
    { id: 'post-to-groups', name: 'النشر في المجموعات', desc: 'نشر تلقائي', icon: Megaphone },
    { id: 'enable-2fa', name: 'تفعيل المصادقة الثنائية', desc: 'حماية الحساب', icon: Shield },
    { id: 'change-account-data', name: 'تغيير بيانات الحساب', desc: 'تعديل بيانات الحساب', icon: Settings },
    { id: 'schedule-messages', name: 'جدولة الرسائل', desc: 'إرسال مجدول', icon: Send },
  ]

  const extractStubTools = [
    { id: 'extract-channels', name: 'استخراج القنوات', desc: 'استخراج قنوات تليجرام', icon: Globe },
    { id: 'extract-links', name: 'استخراج الروابط', desc: 'روابط المجموعات والقنوات', icon: Link2 },
    { id: 'extract-messengers', name: 'استخراج المراسلين', desc: 'جهات الاتصال', icon: MessageSquare },
    { id: 'analyze-groups', name: 'تحليل المجموعات', desc: 'تحليل بيانات المجموعات', icon: BarChart3 },
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
    { id: 'extract', name: 'استخراج الأعضاء', description: 'استخراج أعضاء المجموعات', icon: Download, accent: '#0088CC', accentGradient: 'linear-gradient(135deg, #0088CC, #006699)', requiresSession: true },
    { id: 'broadcast', name: 'إرسال رسائل', description: 'بث رسائل لقائمة مستخدمين', icon: Send, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: true },
    { id: 'add', name: 'إضافة أعضاء', description: 'إضافة مستخدمين لمجموعة', icon: UserPlus, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', requiresSession: true },
    { id: 'tools', name: 'أدوات إضافية', description: 'مجموعات، 2FA، جدولة (قريباً)', icon: Settings, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: false },
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

      <div>
        <p className="text-xs text-secondary-500 mb-2">أدوات استخراج إضافية (قريباً):</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {extractStubTools.map(t => (
            <div key={t.id} className="rounded-xl border border-secondary-200 bg-white/60 p-3 text-center opacity-60 relative">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-9 h-9 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'rgba(0,136,204,0.08)' }}>
                <t.icon size={18} style={{ color: '#0088cc' }} />
              </div>
              <p className="text-[10px] font-bold text-secondary-700 mt-2">{t.name}</p>
            </div>
          ))}
        </div>
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

  const renderToolsBody = () => (
    <div className="space-y-5">
      <p className="text-sm text-secondary-500">أدوات إضافية قيد التطوير — ستكون متاحة قريباً.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {toolStubTools.map(t => (
          <div key={t.id} className="rounded-xl border border-secondary-200 bg-white/60 p-4 text-center opacity-70 relative">
            <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
            <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'rgba(0,136,204,0.08)' }}>
              <t.icon size={20} style={{ color: '#0088cc' }} />
            </div>
            <h4 className="font-bold text-secondary-900 text-xs mt-2">{t.name}</h4>
            <p className="text-[10px] text-secondary-500 mt-1">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const toolsFooter = null

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    extract: { body: renderExtractBody(), footer: extractFooter },
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    add: { body: renderAddBody(), footer: addFooter },
    tools: { body: renderToolsBody(), footer: toolsFooter },
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
