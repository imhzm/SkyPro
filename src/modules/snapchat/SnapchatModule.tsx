import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  LogIn, Send, UserPlus, Users, MessageSquare,
  AlertCircle, CheckCircle, Loader2, Trash2, Eye, EyeOff,
  ExternalLink, Settings, Download
} from 'lucide-react'

type ToolTab = 'login' | 'broadcast' | 'tools'

export default function SnapchatModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('login')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, handleExport, clearResults, clearSession, checkSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('snapchat')

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [showPassword, setShowPassword] = useState(false)
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [broadcastRecipients, setBroadcastRecipients] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
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
      const res = await window.electronAPI.snapchatLogin({ username: loginForm.username, password: loginForm.password, headless: false, proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(res.message || 'تم تسجيل الدخول بنجاح!'); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLoginWithAccount = async (account: Account) => {
    setLoading(true)
    const sessionCheck = await checkSession()
    if (sessionCheck.alreadyLoggedIn) { showMsg(`جلسة نشطة - مسجل دخول بحساب ${account.username}`); setLoading(false); return }
    const hasPass = (!!account.has_password || !!(account.password && account.password.trim()))
    if (!hasPass) { setLoginForm({ ...loginForm, username: account.username, password: '' }); setTimeout(() => passwordRef.current?.focus(), 100); showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة. يرجى إدخال كلمة المرور يدوياً.', true); setLoading(false); return }
    setLoginForm({ ...loginForm, username: account.username, password: account.password || '' })
    try {
      const res = await window.electronAPI.snapchatLogin({ accountId: account.id, username: account.username, password: account.password, headless: false, proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || 'snapchat-session'); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLaunchBrowser = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.launchBrowser({ platform: 'snapchat', headless: false })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم فتح المتصفح - سجل دخول يدوياً') }
      else showMsg(res.error || 'فشل فتح المتصفح', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleBroadcast = async () => {
    if (!ensureSession()) return
    const recipients = broadcastRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (!broadcastMessage || recipients.length === 0) { showMsg('أدخل المستلمين والرسالة', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.snapchatBroadcast({ sessionId, usernames: recipients, message: broadcastMessage })
      if (res.success) { setToolResults((res as any).data || [{ status: 'opened', message: (res as any).message }]); showMsg((res as any).message || 'تم فتح Snapchat Web') }
      else showMsg(res.error || 'فشل العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => { setToolResults([]); clearResults() }

  const stubTools = [
    { id: 'extract-friends', name: 'استخراج الأصدقاء', desc: 'قائمة الأصدقاء', icon: Users },
    { id: 'extract-stories', name: 'استخراج القصص', desc: 'القصص العامة', icon: Download },
    { id: 'add-friends', name: 'إضافة أصدقاء', desc: 'إضافة تلقائية', icon: UserPlus },
    { id: 'groups', name: 'إرسال للمجموعات', desc: 'رسائل جماعية', icon: MessageSquare },
  ]

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
    { id: 'broadcast', label: 'إرسال', icon: Send },
    { id: 'tools', label: 'أدوات إضافية', icon: Settings },
  ]

  const SC = '#FFFC00'
  const SC_DARK = '#F0C000'

  const renderLogin = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><LogIn size={20} style={{ color: SC }} /> تسجيل الدخول</h3>
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
        {snapchatAccounts.length > 0 && (
          <div className="mb-4 p-4 rounded-xl border" style={{ background: 'rgba(255,252,0,0.04)', borderColor: 'rgba(255,252,0,0.15)' }}>
            <label className="label-field">الحسابات المحفوظة</label>
            <select className="select-field mb-2" value={selectedAccountId} onChange={e => {
              const id = e.target.value; setSelectedAccountId(id)
              const acc = snapchatAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) { setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' }); if (!acc.password?.trim()) setTimeout(() => passwordRef.current?.focus(), 100) }
            }}>
              <option value="">-- اختر حساب --</option>
              {snapchatAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}</option>))}
            </select>
            {selectedAccountId && (<button onClick={() => { const acc = snapchatAccounts.find(a => a.id.toString() === selectedAccountId); if (acc) handleLoginWithAccount(acc) }} disabled={loading} className="btn-success w-full text-sm">{loading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} /> دخول / فحص الجلسة</>}</button>)}
            <div className="my-3 border-t border-secondary-100" />
          </div>
        )}
        <div className="space-y-4">
          <div><label className="label-field">اسم المستخدم أو البريد</label><input type="text" className="input-field" placeholder="username أو email" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} /></div>
          <div><label className="label-field">كلمة المرور</label><div className="relative"><input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /><button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} /></div>
          <button onClick={handleLogin} disabled={loading || !loginForm.username || !loginForm.password} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #FFFC00, #F0C000)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}</button>
          <div className="relative my-3"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-secondary-200" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-secondary-400">أو</span></div></div>
          <button onClick={handleLaunchBrowser} disabled={loading} className="btn-secondary w-full">{loading ? <Loader2 size={18} className="animate-spin" /> : <><ExternalLink size={18} /> فتح المتصفح يدوياً</>}</button>
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
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(255,252,0,0.15)', color: '#F0C000' }}>{(acc.username || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username || 'حساب سناب شات'}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>{acc.password?.trim() ? <span className="text-[10px] text-success-600">باسورد محفوظ</span> : <span className="text-[10px] text-warning-600">بدون باسورد</span>}</div></div>
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
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Send size={20} style={{ color: SC }} /> إرسال رسائل Snapchat</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً من تبويب "تسجيل الدخول"</div>}
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(255,252,0,0.08)', border: '1px solid rgba(255,252,0,0.2)', color: '#8B6914' }}>
          <AlertCircle size={16} className="inline ml-1" /> الإرسال التلقائي غير متاح حالياً - سيتم فتح Snapchat Web ويمكنك إرسال الرسائل يدوياً
        </div>
        <div className="space-y-4">
          <div><label className="label-field">المستلمين (username - سطر لكل مستخدم)</label><textarea className="textarea-field" rows={5} value={broadcastRecipients} onChange={e => setBroadcastRecipients(e.target.value)} placeholder="user1&#10;user2" /></div>
          <div><label className="label-field">نص الرسالة (للنسخ)</label><textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا - سيتم فتح Snapchat Web لنسخها..." /></div>
          <button onClick={handleBroadcast} disabled={loading || !sessionId} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #FFFC00, #F0C000)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> فتح Snapchat Web</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-secondary-900">النتائج ({toolResults.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => handleExport(['#', 'الحالة', 'التفاصيل'], 'snapchat-broadcast', toolResults)} className="btn-success text-sm"><Download size={16} /> تصدير</button>
              <button onClick={() => handleClearResults()} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>الحالة</th><th>التفاصيل</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td><span className={`badge ${r.status === 'opened' || r.status === 'sent' ? 'badge-success' : 'badge-warning'}`}>{r.status || 'opened'}</span></td><td className="text-sm">{r.message || r.recipient || '-'}</td></tr>))}</tbody>
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
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFFC00, #F0C000)' }}><Settings size={16} className="text-secondary-900" /></div>
          <h2 className="font-bold text-secondary-900 text-base">أدوات Snapchat الإضافية</h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {stubTools.map(tool => (
            <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'rgba(255,252,0,0.1)' }}><tool.icon size={20} style={{ color: SC_DARK }} /></div>
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
      case 'broadcast': return renderBroadcast()
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
              style={isActive ? { color: SC_DARK, background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(240,192,0,0.2), 0 4px 12px rgba(240,192,0,0.1)', fontWeight: 600 } : {}}>
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
