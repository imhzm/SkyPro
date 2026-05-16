import { useState } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import type { LucideIcon } from 'lucide-react'
import {
  Filter, Download, Users, Send, Play, AlertCircle, CheckCircle, Loader2,
  Trash2, BarChart3, MessageSquare, FileSpreadsheet, LogIn, LogOut, Wrench,
  MessageCircle,
} from 'lucide-react'

type ActiveTool = 'broadcast' | 'filter' | 'extract' | 'groups' | null
type ResultsOwner = 'broadcast' | 'filter' | 'extract' | 'groups' | null

const ACCENT = '#25D366'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #25D366, #128C7E)'

export default function WhatsappModule() {
  const {
    loading, setLoading, message, error, showMsg, sessionId, setSessionId,
    accounts, results, loadAccounts, loadResults, handleExport, clearResults,
    deleteResult, clearSession, cycleActive, cycleProgress, startCycle, stopCycle,
  } = usePlatform('whatsapp')
  const { accounts: allAccounts } = useAccountsStore()

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [filterNumbers, setFilterNumbers] = useState('')
  const [extractType, setExtractType] = useState('groups')
  const [recipientsText, setRecipientsText] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [groupUrls, setGroupUrls] = useState('')
  const [groupMessage, setGroupMessage] = useState('')
  const [toolResults, setToolResults] = useState<any[]>([])
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)
  const [proxy, setProxy] = useState('')

  const handleLaunch = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.whatsappLaunch({ proxy: proxy || undefined })
      if (res.success) {
        setSessionId(res.sessionId || '')
        if (res.needsQR) { setShowQR(true); showMsg('افتح كاميرا الهاتف وامسح QR code الظاهر في المتصفح') }
        else { setShowQR(false); showMsg('WhatsApp متصل بنجاح!'); setShowLoginPanel(false) }
        await loadAccounts()
      } else showMsg(res.error || 'فشل الاتصال', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleSend = async () => {
    if (!sessionId) { showMsg('يرجى فتح WhatsApp أولاً', true); return }
    if (!recipientsText || !broadcastMessage) { showMsg('يرجى إدخال الأرقام والرسالة', true); return }
    setLoading(true)
    setResultsOwner('broadcast')
    const recipients = recipientsText.split('\n').map(r => r.trim()).filter(Boolean)
    try {
      const res = await window.electronAPI.whatsappSendMessages({ sessionId, recipients, message: broadcastMessage })
      if (res.success) {
        const sent = ((res.data as any[]) || []).filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال ${sent} من ${recipients.length} رسالة`)
        setToolResults((res.data as any[]) || [])
      } else showMsg(res.error || 'فشل الإرسال', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الإرسال', true) }
    setLoading(false)
  }

  const handleFilter = async () => {
    const numbers = filterNumbers.split('\n').map(s => s.trim()).filter(Boolean)
    if (numbers.length === 0) { showMsg('أدخل الأرقام', true); return }
    setLoading(true)
    setResultsOwner('filter')
    try {
      const res = await window.electronAPI.whatsappFilterNumbers({ numbers })
      if (res.success) {
        const filteredData = (res as any).data || []
        setToolResults(filteredData)
        showMsg(`تم فلترة ${filteredData.length} رقم - ${filteredData.filter((r: any) => r.status === 'valid' || r.status === 'نشط').length} رقم فعال`)
        await loadResults()
      } else showMsg((res as any).error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    setLoading(true)
    setResultsOwner('extract')
    try {
      let res
      if (extractType === 'groups' || extractType === 'groups-from-search') {
        res = await window.electronAPI.whatsappExtractGroups({ sessionId })
      } else {
        res = await window.electronAPI.runTool({ platform: 'whatsapp', toolId: extractType, toolName: 'استخراج واتساب', params: { sessionId } })
      }
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count || ((res.data as any[]) || []).length} نتيجة`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleGroupPost = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    if (!groupMessage) { showMsg('أدخل نص الرسالة', true); return }
    const groups = groupUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (groups.length === 0) { showMsg('أدخل روابط المجموعات', true); return }
    setLoading(true)
    setResultsOwner('groups')
    try {
      const res = await window.electronAPI.runTool({ platform: 'whatsapp', toolId: 'group-post', toolName: 'النشر في المجموعات', params: { sessionId, groups, message: groupMessage } })
      if (res.success) { showMsg('تم النشر في المجموعات'); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => {
    setToolResults([])
    setResultsOwner(null)
    clearResults()
  }

  const extractTools = [
    { id: 'groups', name: 'استخراج المجموعات', desc: 'استخراج قائمة المجموعات', icon: Users },
    { id: 'members-from-links', name: 'استخراج الأعضاء من الروابط', desc: 'قريباً', icon: Download, soon: true },
    { id: 'members-without-links', name: 'استخراج الأعضاء بدون روابط', desc: 'قريباً', icon: Users, soon: true },
    { id: 'messengers', name: 'استخراج المراسلين', desc: 'قريباً', icon: MessageSquare, soon: true },
    { id: 'analyze-groups', name: 'تحليل المجموعات', desc: 'قريباً', icon: BarChart3, soon: true },
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
    { id: 'broadcast', name: 'إرسال رسائل', description: 'بث رسائل لقائمة أرقام', icon: Send, accent: '#25D366', accentGradient: 'linear-gradient(135deg, #25D366, #128C7E)', requiresSession: true },
    { id: 'filter', name: 'فلترة الأرقام', description: 'فحص الأرقام الفعالة على واتساب', icon: Filter, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: false },
    { id: 'extract', name: 'استخراج البيانات', description: 'استخراج المجموعات والمراسلين', icon: Download, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', requiresSession: true },
    { id: 'groups', name: 'النشر في المجموعات', description: 'بث رسالة لقائمة مجموعات', icon: Users, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: true },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(37,211,102,0.06), rgba(18,140,126,0.04))',
        border: '1px solid rgba(37,211,102,0.18)',
        boxShadow: '0 4px 20px rgba(37,211,102,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}
          >
            <MessageCircle size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">WhatsApp</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: sessionId ? '#22c55e' : '#94a3b8',
                  boxShadow: sessionId ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                }}
              />
              <span className="text-xs font-medium" style={{ color: sessionId ? '#16a34a' : '#64748b' }}>
                {sessionId ? 'متصل — جاهز للعمل' : 'غير متصل — افتح WhatsApp أولاً'}
              </span>
              {accounts.length > 0 && (
                <span className="text-[11px] text-secondary-500">• {accounts.length} جلسة محفوظة</span>
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
              <Play size={16} /> فتح WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderLoginPanelContent = () => (
    <div className="space-y-5">
      {sessionId && (
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-success-600" />
            <p className="font-semibold text-success-700 text-sm">WhatsApp متصل — يمكنك استخدام جميع الأدوات</p>
          </div>
        </div>
      )}
      {showQR && (
        <div className="p-3 bg-warning-50 text-warning-700 rounded-lg text-sm">
          <AlertCircle size={16} className="inline ml-1" /> افتح كاميرا الهاتف وامسح QR code من نافذة المتصفح
        </div>
      )}
      <div>
        <label className="label-field">بروكسي (اختياري)</label>
        <input type="text" value={proxy} onChange={e => setProxy(e.target.value)} placeholder="host:port أو user:pass@host:port" className="input-field text-sm" dir="ltr" />
      </div>
      <p className="text-xs text-secondary-400 text-center">سيتم فتح نافذة المتصفح — امسح رمز QR بهاتفك للاتصال</p>

      {accounts.length > 0 && (
        <div>
          <h4 className="font-bold text-secondary-900 text-sm mb-3">الجلسات المحفوظة على الجهاز</h4>
          <div className="space-y-2 max-h-[280px] overflow-y-auto scroll-container pr-1">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'rgba(37,211,102,0.1)', color: '#128C7E' }}>
                    {(acc.username || acc.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 text-sm truncate">{acc.username || acc.email || 'حساب واتساب'}</p>
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
      onClick={handleLaunch}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : <><Play size={20} /> فتح WhatsApp Web</>}
    </button>
  )

  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string, showActions = false) => {
    if (resultsOwner !== owner) return null
    const isFilter = owner === 'filter'
    const displayResults = toolResults.length > 0 ? toolResults : (isFilter ? results : [])
    const list = displayResults as any[]
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
                if (owner === 'filter') {
                  return (
                    <tr key={r.id || i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || r.phone || '-'}</td>
                      <td><span className={`badge ${(r.status || r.extra || '') === 'valid' || (r.status || r.extra || '').includes('نشط') ? 'badge-success' : 'badge-danger'}`}>{r.status || r.extra || 'غير معروف'}</span></td>
                      {showActions && (
                        <td><button onClick={() => r.id && deleteResult(r.id)} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td>
                      )}
                    </tr>
                  )
                }
                if (owner === 'extract') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || r.group || '-'}</td>
                      <td className="text-xs max-w-[200px] truncate">{r.url || r.link || '-'}</td>
                      <td><span className={`badge ${r.status === 'joined' || r.status === 'active' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status || '-'}</span></td>
                    </tr>
                  )
                }
                // groups
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{r.name || r.group || '-'}</td>
                    <td><span className={`badge ${r.status === 'posted' || r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status || '-'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderBroadcastBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الأرقام (سطر لكل رقم)</label>
        <textarea className="textarea-field" rows={5} value={recipientsText} onChange={e => setRecipientsText(e.target.value)} placeholder="+2010xxxxxxxxx&#10;+9665xxxxxxxxx" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." />
      </div>
      {renderResultsTable('broadcast', ['#', 'المستلم', 'الحالة', 'خطأ'], 'whatsapp-messages')}
    </div>
  )

  const broadcastFooter = (
    <button
      onClick={handleSend}
      disabled={loading}
      className="btn-success w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال</>}
    </button>
  )

  const renderFilterBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الأرقام (سطر لكل رقم)</label>
        <textarea className="textarea-field" rows={8} value={filterNumbers} onChange={e => setFilterNumbers(e.target.value)} placeholder="+2010xxxxxxxxx&#10;+9665xxxxxxxxx" />
      </div>
      {renderResultsTable('filter', ['#', 'الرقم', 'الحالة', ''], 'whatsapp-filter', true)}
    </div>
  )

  const filterFooter = (
    <button
      onClick={handleFilter}
      disabled={loading || !filterNumbers.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Filter size={18} /> فلترة</>}
    </button>
  )

  const renderExtractBody = () => (
    <div className="space-y-5">
      <AccountSelector
        platformId="whatsapp"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType } }}
        sendTask={{ type: 'send', params: { recipients: recipientsText.split('\n').filter(Boolean), message: broadcastMessage } }}
      />
      <div>
        <label className="label-field">نوع الاستخراج</label>
        <select className="select-field" value={extractType} onChange={e => setExtractType(e.target.value)}>
          {extractTools.map(t => <option key={t.id} value={t.id} disabled={t.soon}>{t.name}{t.soon ? ' (قريباً)' : ''}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {extractTools.map(tool => {
          const isSel = extractType === tool.id
          return (
            <button key={tool.id} onClick={() => !tool.soon && setExtractType(tool.id)} disabled={tool.soon}
              className={`rounded-xl border bg-white/60 p-3 text-center relative ${tool.soon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              style={isSel && !tool.soon ? { borderColor: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.2)' } : { borderColor: 'rgba(226,232,240,0.7)' }}>
              {tool.soon && <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>}
              <div className="w-9 h-9 rounded-xl mx-auto flex items-center justify-center"
                style={isSel && !tool.soon ? { background: ACCENT_GRADIENT, color: 'white' } : { background: 'rgba(248,250,252,0.8)', color: '#64748b' }}>
                <tool.icon size={18} />
              </div>
              <p className="text-[10px] font-bold mt-2" style={{ color: isSel && !tool.soon ? '#22c55e' : '#334155' }}>{tool.name}</p>
            </button>
          )
        })}
      </div>
      {renderResultsTable('extract', ['#', 'الاسم', 'الرابط', 'الحالة'], 'whatsapp-extract')}
    </div>
  )

  const extractFooter = (
    <button
      onClick={handleExtract}
      disabled={loading || extractTools.find(t => t.id === extractType)?.soon}
      className="btn-success w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}
    </button>
  )

  const renderGroupsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label>
        <textarea className="textarea-field" rows={5} value={groupUrls} onChange={e => setGroupUrls(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={4} value={groupMessage} onChange={e => setGroupMessage(e.target.value)} placeholder="اكتب رسالتك..." />
      </div>
      {renderResultsTable('groups', ['#', 'المجموعة', 'الحالة'], 'whatsapp-groups')}
    </div>
  )

  const groupsFooter = (
    <button
      onClick={handleGroupPost}
      disabled={loading || !groupMessage.trim()}
      className="btn-success w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> نشر في المجموعات</>}
    </button>
  )

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    filter: { body: renderFilterBody(), footer: filterFooter },
    extract: { body: renderExtractBody(), footer: extractFooter },
    groups: { body: renderGroupsBody(), footer: groupsFooter },
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
        platformId="whatsapp"
        platformName="WhatsApp"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('extract')}
      />

      <ToolGrid
        title="أدوات WhatsApp"
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
                showMsg('يرجى فتح WhatsApp أولاً', true)
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
        title="فتح WhatsApp Web"
        subtitle="افتح نافذة المتصفح وامسح رمز QR"
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
