import { useState } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  Filter, Download, Users, Send, Play, AlertCircle, CheckCircle, Loader2,
  Trash2, BarChart3, MessageSquare, FileSpreadsheet, LogIn
} from 'lucide-react'

type ToolTab = 'launch' | 'broadcast' | 'filter' | 'extract' | 'groups'

export default function WhatsappModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('launch')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadAccounts, loadResults, handleExport, clearResults, deleteResult, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('whatsapp')

  const [showQR, setShowQR] = useState(false)
  const [filterNumbers, setFilterNumbers] = useState('')
  const [extractType, setExtractType] = useState('groups')
  const [recipientsText, setRecipientsText] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [groupUrls, setGroupUrls] = useState('')
  const [groupMessage, setGroupMessage] = useState('')
  const [toolResults, setToolResults] = useState<any[]>([])
  const [proxy, setProxy] = useState('')

  const { accounts: allAccounts } = useAccountsStore()

  const handleLaunch = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.whatsappLaunch({ proxy: proxy || undefined })
      if (res.success) {
        setSessionId(res.sessionId || '')
        if (res.needsQR) { setShowQR(true); showMsg('افتح كاميرا الهاتف وامسح QR code الظاهر في المتصفح') }
        else { setShowQR(false); showMsg('WhatsApp متصل بنجاح!') }
        await loadAccounts()
      } else showMsg(res.error || 'فشل الاتصال', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleSend = async () => {
    if (!sessionId) { showMsg('يرجى فتح WhatsApp أولاً', true); return }
    if (!recipientsText || !broadcastMessage) { showMsg('يرجى إدخال الأرقام والرسالة', true); return }
    setLoading(true)
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
    try {
      const res = await window.electronAPI.runTool({ platform: 'whatsapp', toolId: 'group-post', toolName: 'النشر في المجموعات', params: { sessionId, groups, message: groupMessage } })
      if (res.success) { showMsg('تم النشر في المجموعات'); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => { setToolResults([]); clearResults() }

  const extractTools = [
    { id: 'groups', name: 'استخراج المجموعات', desc: 'استخراج قائمة المجموعات', icon: Users },
    { id: 'members-from-links', name: 'استخراج الأعضاء من الروابط', desc: 'قريباً', icon: Download, soon: true },
    { id: 'members-without-links', name: 'استخراج الأعضاء بدون روابط', desc: 'قريباً', icon: Users, soon: true },
    { id: 'messengers', name: 'استخراج المراسلين', desc: 'قريباً', icon: MessageSquare, soon: true },
    { id: 'analyze-groups', name: 'تحليل المجموعات', desc: 'قريباً', icon: BarChart3, soon: true },
  ]

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'launch', label: 'الاتصال', icon: LogIn },
    { id: 'broadcast', label: 'إرسال', icon: Send },
    { id: 'filter', label: 'فلترة', icon: Filter },
    { id: 'extract', label: 'استخراج', icon: Download },
    { id: 'groups', label: 'المجموعات', icon: Users },
  ]

  const renderLaunch = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><LogIn size={20} className="text-green-600" /> فتح WhatsApp</h3>
        {sessionId && (
          <div className="mb-4 p-4 bg-success-50 rounded-xl border border-success-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-success-600" />
                <div><p className="font-bold text-success-700">جلسة نشطة</p><p className="text-xs text-success-600">يمكنك استخدام جميع الأدوات الآن</p></div>
              </div>
              <button onClick={clearSession} className="btn-danger text-xs px-3 py-1.5"><LogIn size={14} /> إنهاء الجلسة</button>
            </div>
          </div>
        )}
        {sessionId && <div className="flex items-center gap-2 text-sm text-success-600 bg-success-50 p-2 rounded-lg mb-4"><CheckCircle size={16} /> WhatsApp متصل</div>}
        {showQR && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> افتح كاميرا الهاتف وامسح QR code من نافذة المتصفح</div>}
        {!sessionId && <div className="mb-4"><label className="label-field">بروكسي (اختياري)</label><input type="text" value={proxy} onChange={e => setProxy(e.target.value)} placeholder="host:port أو user:pass@host:port" className="input-field text-sm" dir="ltr" /></div>}
        <button onClick={handleLaunch} disabled={loading} className="btn-success w-full text-lg py-3">{loading ? <Loader2 size={20} className="animate-spin" /> : <><Play size={20} /> فتح WhatsApp Web</>}</button>
        {!sessionId && <p className="text-xs text-secondary-400 mt-3 text-center">سيتم فتح نافذة المتصفح - امسح رمز QR بهاتفك للاتصال</p>}
      </div>
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg">الحسابات المحفوظة</h3>
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-secondary-400"><Users size={48} className="mx-auto mb-3 opacity-30" /><p>لا توجد جلسات محفوظة</p><p className="text-xs mt-1">افتح WhatsApp لحفظ الجلسة</p></div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary-50 border border-secondary-100 hover:bg-secondary-100 transition-colors">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm font-bold">{(acc.username || acc.email || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username || acc.email || 'حساب واتساب'}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p></div></div>
                <span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{acc.status === 'active' ? 'نشط' : 'غير نشط'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderBroadcast = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Send size={20} className="text-green-600" /> إرسال رسائل</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى الاتصال بـ WhatsApp أولاً من تبويب "الاتصال"</div>}
        <div className="space-y-4">
          <div><label className="label-field">الأرقام (سطر لكل رقم)</label><textarea className="textarea-field" rows={5} value={recipientsText} onChange={e => setRecipientsText(e.target.value)} placeholder="+2010xxxxxxxxx&#10;+9665xxxxxxxxx" /></div>
          <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." /></div>
          <button onClick={handleSend} disabled={loading || !sessionId} className="btn-success w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-secondary-900">نتائج الإرسال ({toolResults.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => handleExport(['المستلم', 'الحالة', 'خطأ'], 'whatsapp-messages', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير</button>
              <button onClick={() => setToolResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>المستلم</th><th>الحالة</th><th>خطأ</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.recipient || r.name || '-'}</td><td><span className={`badge ${r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td><td className="text-xs text-secondary-500">{r.error || '-'}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderFilter = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Filter size={20} className="text-green-600" /> فلترة الأرقام</h3>
        <div className="space-y-4">
          <div><label className="label-field">الأرقام (سطر لكل رقم)</label><textarea className="textarea-field" rows={8} value={filterNumbers} onChange={e => setFilterNumbers(e.target.value)} placeholder="+2010xxxxxxxxx&#10;+9665xxxxxxxxx" /></div>
          <button onClick={handleFilter} disabled={loading || !filterNumbers.trim()} className="btn-primary w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Filter size={18} /> فلترة</>}</button>
        </div>
      </div>
      {(toolResults.length > 0 || (results as any[]).length > 0) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-secondary-900">النتائج ({toolResults.length || (results as any[]).length})</h3>
            <div className="flex gap-2">
              <button onClick={() => handleExport(['الرقم', 'الحالة'], 'whatsapp-filter', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير</button>
              <button onClick={handleClearResults} className="btn-danger text-sm"><Trash2 size={16} /> مسح الكل</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '400px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>الرقم</th><th>الحالة</th><th></th></tr></thead>
              <tbody>{(toolResults.length > 0 ? toolResults : results).map((r: any, i: number) => (
                <tr key={r.id || i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.name || r.phone || '-'}</td>
                <td><span className={`badge ${(r.status || r.extra || '') === 'valid' || (r.status || r.extra || '').includes('نشط') ? 'badge-success' : 'badge-danger'}`}>{r.status || r.extra || 'غير معروف'}</span></td>
                <td><button onClick={() => r.id && deleteResult(r.id)} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderExtract = () => (
<div className="space-y-6">
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
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Download size={20} className="text-green-600" /> استخراج بيانات WhatsApp</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى الاتصال بـ WhatsApp أولاً</div>}
        <div className="space-y-4">
          <div><label className="label-field">نوع الاستخراج</label>
            <select className="select-field" value={extractType} onChange={e => setExtractType(e.target.value)}>
              {extractTools.map(t => <option key={t.id} value={t.id} disabled={t.soon}>{t.name}{t.soon ? ' (قريباً)' : ''}</option>)}
            </select>
          </div>
          <button onClick={handleExtract} disabled={loading || !sessionId || extractTools.find(t => t.id === extractType)?.soon} className="btn-success w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}</button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-3">
        {extractTools.map(tool => {
          const isSel = extractType === tool.id
          return (
            <button key={tool.id} onClick={() => !tool.soon && setExtractType(tool.id)} disabled={tool.soon}
              className={`tool-card cursor-pointer text-center relative ${isSel ? 'ring-2' : ''} ${tool.soon ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={isSel && !tool.soon ? { borderColor: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.2), 0 4px 16px rgba(34,197,94,0.1)' } : {}}>
              {tool.soon && <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>}
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center"
                style={isSel && !tool.soon ? { background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' } : { background: 'rgba(248,250,252,0.8)', color: '#64748b' }}>
                <tool.icon size={20} />
              </div>
              <h4 className="font-bold text-xs mt-2" style={{ color: isSel && !tool.soon ? '#22c55e' : '#334155' }}>{tool.name}</h4>
            </button>
          )
        })}
      </div>
      {(toolResults.length > 0) && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-secondary-900">النتائج ({toolResults.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => handleExport(['الاسم', 'الرابط', 'الأعضاء', 'التاريخ'], 'whatsapp-extract', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير</button>
              <button onClick={() => setToolResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '400px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>الاسم</th><th>الرابط</th><th>الحالة</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (
                <tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.name || r.group || '-'}</td>
                <td className="text-xs max-w-[200px] truncate">{r.url || r.link || '-'}</td>
                <td><span className={`badge ${r.status === 'joined' || r.status === 'active' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status || '-'}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderGroups = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Users size={20} className="text-green-600" /> النشر في المجموعات</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى الاتصال بـ WhatsApp أولاً</div>}
        <div className="space-y-4">
          <div><label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label><textarea className="textarea-field" rows={5} value={groupUrls} onChange={e => setGroupUrls(e.target.value)} placeholder="https://chat.whatsapp.com/..." /></div>
          <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={4} value={groupMessage} onChange={e => setGroupMessage(e.target.value)} placeholder="اكتب رسالتك..." /></div>
          <button onClick={handleGroupPost} disabled={loading || !sessionId || !groupMessage.trim()} className="btn-success w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> نشر في المجموعات</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-secondary-900">النتائج ({toolResults.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => handleExport(['المجموعة', 'الحالة'], 'whatsapp-groups', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير</button>
              <button onClick={() => setToolResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>المجموعة</th><th>الحالة</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (
                <tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.name || r.group || '-'}</td>
                <td><span className={`badge ${r.status === 'posted' || r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status || '-'}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'launch': return renderLaunch()
      case 'broadcast': return renderBroadcast()
      case 'filter': return renderFilter()
      case 'extract': return renderExtract()
      case 'groups': return renderGroups()
      default: return renderLaunch()
    }
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}
      <div className="flex gap-1 p-1.5 rounded-xl overflow-x-auto" style={{ background: 'rgba(241,245,249,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(226,232,240,0.5)' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="tab-button"
              style={isActive ? { color: '#22c55e', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(34,197,94,0.15), 0 4px 12px rgba(34,197,94,0.08)', fontWeight: 600 } : {}}>
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
      {renderContent()}
    </div>
  )
}
