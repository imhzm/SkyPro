import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  LogIn, Download, AtSign, Send,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet, Eye, EyeOff,
  Users, MessageSquare, Heart, Hash, Settings, ExternalLink, Megaphone
} from 'lucide-react'

type ToolTab = 'login' | 'extract' | 'mention' | 'broadcast' | 'tools'

export default function ThreadsModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('login')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadResults, handleExport, clearResults, deleteResult, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('threads')

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
      if (res.success) { setSessionId(res.sessionId); showMsg(res.message || 'تم تسجيل الدخول بنجاح!'); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLoginWithAccount = async (account: Account) => {
    setLoading(true)
    const sessionCheck = await checkSession()
    if (sessionCheck.alreadyLoggedIn) { showMsg(`جلسة نشطة - مسجل دخول بحساب ${account.username}`); setLoading(false); return }
    const hasPass = !!(account.password && account.password.trim())
    if (!hasPass) { setLoginForm({ ...loginForm, username: account.username, password: '' }); setTimeout(() => passwordRef.current?.focus(), 100); showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة.', true); setLoading(false); return }
    setLoginForm({ ...loginForm, username: account.username, password: account.password || '' })
    try {
      const res = await window.electronAPI.threadsLogin({ username: account.username, password: account.password, headless: false, proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || 'threads-session'); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLaunchBrowser = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.launchBrowser({ platform: 'threads', headless: false })
      if (res.success) { setSessionId(res.sessionId); showMsg('تم فتح المتصفح') }
      else showMsg(res.error || 'فشل فتح المتصفح', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!extractUrl) { showMsg('أدخل رابط المنشور أو الحساب', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.threadsExtract({ sessionId, url: extractUrl, limit: extractLimit })
      if (res.success) { setToolResults(res.data || []); showMsg(`تم استخراج ${res.count || (res.data || []).length}`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleMention = async () => {
    if (!ensureSession()) return
    const mentions = mentionUsers.split('\n').map(s => s.trim()).filter(Boolean)
    if (!mentionUrl || mentions.length === 0) { showMsg('أدخل الرابط والمستخدمين', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.threadsMention({ sessionId, postUrl: mentionUrl, mentions, message: mentionMessage })
      if (res.success) { showMsg('تم المنشن بنجاح'); setToolResults(res.data || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => { setToolResults([]); clearResults() }

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

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
    { id: 'extract', label: 'استخراج', icon: Download },
    { id: 'mention', label: 'منشن', icon: AtSign },
    { id: 'broadcast', label: 'إرسال', icon: Send },
    { id: 'tools', label: 'أدوات إضافية', icon: Settings },
  ]

  const renderLogin = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><LogIn size={20} /> تسجيل الدخول</h3>
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
        {threadsAccounts.length > 0 && (
          <div className="mb-4 p-4 rounded-xl border" style={{ background: 'rgba(0,0,0,0.03)', borderColor: 'rgba(0,0,0,0.08)' }}>
            <label className="label-field">الحسابات المحفوظة</label>
            <select className="select-field mb-2" value={selectedAccountId} onChange={e => {
              const id = e.target.value; setSelectedAccountId(id)
              const acc = threadsAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) { setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' }); if (!acc.password?.trim()) setTimeout(() => passwordRef.current?.focus(), 100) }
            }}>
              <option value="">-- اختر حساب --</option>
              {threadsAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}</option>))}
            </select>
            {selectedAccountId && (<button onClick={() => { const acc = threadsAccounts.find(a => a.id.toString() === selectedAccountId); if (acc) handleLoginWithAccount(acc) }} disabled={loading} className="btn-success w-full text-sm">{loading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} /> دخول / فحص الجلسة</>}</button>)}
            <div className="my-3 border-t border-secondary-100" />
          </div>
        )}
        <div className="space-y-4">
          <div><label className="label-field">اسم المستخدم</label><input type="text" className="input-field" placeholder="username" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} /></div>
          <div><label className="label-field">كلمة المرور</label><div className="relative"><input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /><button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} /></div>
          <button onClick={handleLogin} disabled={loading || !loginForm.username || !loginForm.password} className="btn-primary w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}</button>
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
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-secondary-200 text-secondary-700">{(acc.username || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username || 'حساب Threads'}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>{acc.password?.trim() ? <span className="text-[10px] text-success-600">باسورد محفوظ</span> : <span className="text-[10px] text-warning-600">بدون باسورد</span>}</div></div>
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
          platformId="threads"
          accounts={allAccounts}
          cycleActive={cycleActive}
          cycleProgress={cycleProgress}
          onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
          onStopCycle={stopCycle}
          extractTask={{ type: 'extract', params: { extractType: 'extract', url: extractUrl, limit: extractLimit } }}
          sendTask={{ type: 'send', params: { postUrl: mentionUrl, mentions: mentionUsers.split('\n').filter(Boolean), message: mentionMessage || broadcastMessage } }}
        />
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Download size={20} /> استخراج من Threads</h3>
          {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
          <div className="space-y-4">
            <div><label className="label-field">رابط المنشور أو الحساب</label><input type="url" className="input-field" placeholder="https://threads.net/..." value={extractUrl} onChange={e => setExtractUrl(e.target.value)} /></div>
            <div><label className="label-field">الحد الأقصى: {extractLimit}</label><input type="range" min="10" max="200" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full" /></div>
            <button onClick={handleExtract} disabled={loading || !sessionId || !extractUrl.trim()} className="btn-primary w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {extractStubTools.map(tool => (
            <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-secondary-100"><tool.icon size={20} className="text-secondary-600" /></div>
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
                <button onClick={() => handleExport(['الاسم', 'المعرف', 'الرابط', 'المصدر', 'التاريخ'], 'threads-extract', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
                <button onClick={handleClearResults} className="btn-danger text-sm"><Trash2 size={16} /> مسح الكل</button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>#</th><th>الاسم</th><th>المعرف</th><th>الرابط</th><th>المصدر</th><th>التاريخ</th><th></th></tr></thead>
                <tbody>
                  {displayResults.map((r: any, i: number) => {
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderMention = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><AtSign size={20} /> منشن</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
        <div className="space-y-4">
          <div><label className="label-field">رابط المنشور</label><input type="url" className="input-field" placeholder="https://threads.net/..." value={mentionUrl} onChange={e => setMentionUrl(e.target.value)} /></div>
          <div><label className="label-field">المستخدمين (username - سطر لكل مستخدم)</label><textarea className="textarea-field" rows={4} value={mentionUsers} onChange={e => setMentionUsers(e.target.value)} placeholder="user1&#10;user2" /></div>
          <div><label className="label-field">الرسالة (اختياري)</label><textarea className="textarea-field" rows={3} value={mentionMessage} onChange={e => setMentionMessage(e.target.value)} placeholder="..." /></div>
          <button onClick={handleMention} disabled={loading || !sessionId || !mentionUrl.trim() || !mentionUsers.trim()} className="btn-primary w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> منشن</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-secondary-900">نتائج المنشن ({toolResults.length})</h3>
            <button onClick={() => setToolResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button>
          </div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>المستخدم</th><th>الحالة</th><th>تفاصيل</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.username || r.recipient || '-'}</td><td><span className={`badge ${r.status === 'success' || r.status === 'sent' ? 'badge-success' : 'badge-danger'}`}>{r.status || 'sent'}</span></td><td className="text-sm">{r.message || r.error || '-'}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderBroadcast = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Send size={20} /> إرسال رسائل</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)', color: '#555' }}>
          <AlertCircle size={16} className="inline ml-1" /> هذه الخاصية قيد التطوير - ستتوفر قريباً
        </div>
        <div className="space-y-4 opacity-60">
          <div><label className="label-field">المستلمين (username - سطر لكل مستخدم)</label><textarea className="textarea-field" rows={5} value={broadcastRecipients} onChange={e => setBroadcastRecipients(e.target.value)} placeholder="user1&#10;user2" /></div>
          <div><label className="label-field">الرسالة</label><textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." /></div>
          <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed"><Send size={18} /> إرسال (قريباً)</button>
        </div>
      </div>
    </div>
  )

  const renderTools = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-secondary-800"><Settings size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">أدوات Threads الإضافية</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
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
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'login': return renderLogin()
      case 'extract': return renderExtract()
      case 'mention': return renderMention()
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
              style={isActive ? { color: '#000', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)', fontWeight: 600 } : {}}>
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