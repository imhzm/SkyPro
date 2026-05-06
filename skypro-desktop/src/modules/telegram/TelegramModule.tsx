import { useState } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  LogIn, Download, Send, UserPlus, AlertCircle, CheckCircle, Loader2,
  Trash2, FileSpreadsheet, Users, MessageSquare, BarChart3, Link2,
  Shield, Settings, Megaphone, Globe, Phone, KeyRound
} from 'lucide-react'

type ToolTab = 'login' | 'extract' | 'broadcast' | 'add' | 'tools'

export default function TelegramModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('login')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadAccounts, loadResults, handleExport, clearResults, deleteResult, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('telegram')

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

  const { accounts: allAccounts } = useAccountsStore()

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
        else { setNeedsCode(false); showMsg(res.message || 'تم فتح Telegram بنجاح') }
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
      if (res.success) { setNeedsCode(false); showMsg('تم التحقق بنجاح!'); await loadAccounts() }
      else showMsg(res.error || 'فشل التحقق', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في التحقق', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!groupUrl) { showMsg('أدخل رابط المجموعة', true); return }
    setLoading(true)
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
    try {
      const res = await window.electronAPI.telegramAddUsers({ sessionId, groupUsername: addGroup, users })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'added').length; showMsg(`تم إضافة ${ok} من ${users.length} مستخدم`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => { setToolResults([]); clearResults() }

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
    { id: 'extract', label: 'استخراج', icon: Download },
    { id: 'broadcast', label: 'إرسال', icon: Send },
    { id: 'add', label: 'إضافة', icon: UserPlus },
    { id: 'tools', label: 'أدوات إضافية', icon: Settings },
  ]

  const extractStubTools = [
    { id: 'extract-channels', name: 'استخراج القنوات', desc: 'استخراج قنوات تليجرام', icon: Globe, soon: true },
    { id: 'extract-links', name: 'استخراج الروابط', desc: 'روابط المجموعات والقنوات', icon: Link2, soon: true },
    { id: 'extract-messengers', name: 'استخراج المراسلين', desc: 'جهات الاتصال', icon: MessageSquare, soon: true },
    { id: 'analyze-groups', name: 'تحليل المجموعات', desc: 'تحليل بيانات المجموعات', icon: BarChart3, soon: true },
  ]

  const toolStubTools = [
    { id: 'join-groups', name: 'الانضمام للمجموعات', desc: 'انضمام تلقائي للمجموعات', icon: Users, soon: true },
    { id: 'post-to-groups', name: 'النشر في المجموعات', desc: 'نشر تلقائي', icon: Megaphone, soon: true },
    { id: 'enable-2fa', name: 'تفعيل المصادقة الثنائية', desc: 'حماية الحساب', icon: Shield, soon: true },
    { id: 'change-account-data', name: 'تغيير بيانات الحساب', desc: 'تعديل بيانات الحساب', icon: Settings, soon: true },
    { id: 'schedule-messages', name: 'جدولة الرسائل', desc: 'إرسال مجدول', icon: Send, soon: true },
  ]

  const renderLogin = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Phone size={20} style={{ color: '#0088cc' }} /> تسجيل الدخول</h3>
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
        {needsCode && (
          <div className="mb-4 p-4 rounded-xl border" style={{ background: 'rgba(0,136,204,0.06)', borderColor: 'rgba(0,136,204,0.2)' }}>
            <h4 className="font-bold text-secondary-900 mb-2 flex items-center gap-2"><KeyRound size={18} style={{ color: '#0088cc' }} /> كود التحقق</h4>
            <p className="text-sm text-secondary-600 mb-3">تم إرسال كود التحقق لهاتفك - أدخله أدناه أو في نافذة المتصفح</p>
            <div className="flex gap-2">
              <input type="text" className="input-field flex-1" placeholder="أدخل الكود (مثال: 12345)" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} maxLength={10} />
              <button onClick={handleVerifyCode} disabled={loading || !verifyCode.trim()} className="btn-primary disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0088cc, #006699)' }}>{loading ? <Loader2 size={16} className="animate-spin" /> : <><KeyRound size={16} /> تحقق</>}</button>
            </div>
          </div>
        )}
        {telegramAccounts.length > 0 && (
          <div className="mb-4 p-4 rounded-xl border" style={{ background: 'rgba(0,136,204,0.04)', borderColor: 'rgba(0,136,204,0.1)' }}>
            <label className="label-field">الحسابات المحفوظة</label>
            <select className="select-field mb-2" onChange={e => {
              const acc = telegramAccounts.find((a: any) => a.id.toString() === e.target.value)
              if (acc) { setPhoneNumber(acc.username || '') }
            }}>
              <option value="">-- اختر حساب --</option>
              {telegramAccounts.map((acc: any) => (<option key={acc.id} value={acc.id}>{acc.username || 'حساب تليجرام'}</option>))}
            </select>
          </div>
        )}
        <div className="space-y-4">
          <div><label className="label-field">رقم الهاتف (مع رمز الدولة)</label><input type="tel" className="input-field" placeholder="+2010xxxxxxxx" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} /></div>
          <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={proxy} onChange={e => setProxy(e.target.value)} /></div>
          <button onClick={handleLogin} disabled={loading || !phoneNumber.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0088cc, #006699)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Phone size={18} /> فتح Telegram</>}</button>
        </div>
      </div>
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg">الحسابات المحفوظة</h3>
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-secondary-400"><Users size={48} className="mx-auto mb-3 opacity-30" /><p>لا توجد حسابات محفوظة</p><p className="text-xs mt-1">سجل الدخول لحفظ حسابك</p></div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary-50 border border-secondary-100 hover:bg-secondary-100 transition-colors">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(0,136,204,0.1)', color: '#0088cc' }}>{(acc.username || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username || 'حساب تليجرام'}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p></div></div>
                <span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{acc.status === 'active' ? 'نشط' : 'غير نشط'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderExtract = () => {
    const displayResults = toolResults.length > 0 ? toolResults : results
    return (
      <div className="space-y-6">
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
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Download size={20} style={{ color: '#0088cc' }} /> استخراج أعضاء المجموعة</h3>
          {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً من تبويب "تسجيل الدخول"</div>}
          <div className="space-y-4">
            <div><label className="label-field">رابط المجموعة</label><input type="url" className="input-field" placeholder="https://web.telegram.org/a/#-..." value={groupUrl} onChange={e => setGroupUrl(e.target.value)} /></div>
            <div><label className="label-field">الحد الأقصى: {extractLimit}</label><input type="range" min="10" max="500" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full" style={{ accentColor: '#0088cc' }} /></div>
            <button onClick={handleExtract} disabled={loading || !sessionId} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0088cc, #006699)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}</button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {extractStubTools.map(tool => (
            <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'rgba(0,136,204,0.08)' }}><tool.icon size={20} style={{ color: '#0088cc' }} /></div>
              <h4 className="font-bold text-secondary-900 text-xs mt-2">{tool.name}</h4>
              <p className="text-[10px] text-secondary-500">{tool.desc}</p>
            </div>
          ))}
        </div>
        {displayResults.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-secondary-900">النتائج ({displayResults.length})</h3>
              <div className="flex gap-2">
                <button onClick={() => handleExport(['الاسم', 'المعرف', 'الرابط', 'الهاتف', 'المصدر', 'التاريخ'], 'telegram-members', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
                <button onClick={handleClearResults} className="btn-danger text-sm"><Trash2 size={16} /> مسح الكل</button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>#</th><th>الاسم</th><th>المعرف</th><th>الرابط</th><th>المصدر</th><th>التاريخ</th><th></th></tr></thead>
                <tbody>
                  {displayResults.map((r: any, i: number) => {
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
                        <td><button onClick={() => r.id && deleteResult(r.id)} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderBroadcast = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Send size={20} style={{ color: '#0088cc' }} /> إرسال رسائل</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
        <div className="space-y-4">
          <div><label className="label-field">المستلمين (username - سطر لكل مستخدم)</label><textarea className="textarea-field" rows={5} value={broadcastRecipients} onChange={e => setBroadcastRecipients(e.target.value)} placeholder="user1&#10;user2&#10;@channel_name" /></div>
          <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." /></div>
          <button onClick={handleBroadcast} disabled={loading || !sessionId || !broadcastRecipients.trim() || !broadcastMessage.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0088cc, #006699)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-secondary-900">نتائج الإرسال ({toolResults.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => handleExport(['المستلم', 'الحالة', 'خطأ'], 'telegram-messages', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير</button>
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

  const renderAdd = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><UserPlus size={20} style={{ color: '#0088cc' }} /> إضافة أعضاء للمجموعة</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
        <div className="space-y-4">
          <div><label className="label-field">معرف المجموعة (@groupname)</label><input type="text" className="input-field" placeholder="@groupname" value={addGroup} onChange={e => setAddGroup(e.target.value)} /></div>
          <div><label className="label-field">قائمة المستخدمين (username - سطر لكل مستخدم)</label><textarea className="textarea-field" rows={5} value={addUsersText} onChange={e => setAddUsersText(e.target.value)} placeholder="user1&#10;user2" /></div>
          <button onClick={handleAddUsers} disabled={loading || !sessionId || !addGroup.trim() || !addUsersText.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0088cc, #006699)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> إضافة أعضاء</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-secondary-900">نتائج الإضافة ({toolResults.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => handleExport(['المستخدم', 'الحالة', 'خطأ'], 'telegram-add-users', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير</button>
              <button onClick={() => setToolResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>المستخدم</th><th>الحالة</th><th>خطأ</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.user || r.name || '-'}</td><td><span className={`badge ${r.status === 'added' ? 'badge-success' : r.status === 'error' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td><td className="text-xs text-secondary-500">{r.error || '-'}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderTools = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0088cc, #006699)' }}><Settings size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">أدوات إضافية</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {toolStubTools.map(tool => (
            <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'rgba(0,136,204,0.08)' }}><tool.icon size={20} style={{ color: '#0088cc' }} /></div>
              <h4 className="font-bold text-secondary-900 text-xs mt-2">{tool.name}</h4>
              <p className="text-[10px] text-secondary-500">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'login': return renderLogin()
      case 'extract': return renderExtract()
      case 'broadcast': return renderBroadcast()
      case 'add': return renderAdd()
      case 'tools': return renderTools()
      default: return renderLogin()
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
              style={isActive ? { color: '#0088cc', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,136,204,0.15), 0 4px 12px rgba(0,136,204,0.08)', fontWeight: 600 } : {}}>
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
