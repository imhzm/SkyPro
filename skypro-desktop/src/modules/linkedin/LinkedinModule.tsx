import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  LogIn, Search, Download, Megaphone, Send, Play, Eye, EyeOff,
  Users, Globe, AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet,
  UserPlus, Heart, Calendar
} from 'lucide-react'

type ToolTab = 'login' | 'search' | 'extract' | 'marketing' | 'broadcast'

export default function LinkedinModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('login')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, checkSession, clearSession, accounts, results, loadAccounts, loadResults, handleExport, clearResults, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('linkedin')

  const [showPassword, setShowPassword] = useState(false)
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [extractUrl, setExtractUrl] = useState('')
  const [extractLimit, setExtractLimit] = useState(200)
  const [toolResults, setToolResults] = useState<any[]>([])
  const [broadcastRecipients, setBroadcastRecipients] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')

  const linkedinAccounts = allAccounts.filter(a => a.platform === 'linkedin')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.linkedinLogin({ username: loginForm.username, password: loginForm.password, headless: false, proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم تسجيل الدخول بنجاح!'); await loadAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLoginWithAccount = async (account: Account) => {
    setLoading(true)
    const sessionCheck = await checkSession()
    if (sessionCheck.alreadyLoggedIn) {
      showMsg(`جلسة نشطة - مسجل دخول بحساب ${account.username}`)
      setLoading(false)
      return
    }
    const hasPass = (!!account.has_password || !!(account.password && account.password.trim()))
    if (!hasPass) {
      setLoginForm({ ...loginForm, username: account.username, password: '' })
      setTimeout(() => passwordRef.current?.focus(), 100)
      showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة. يرجى إدخال كلمة المرور يدوياً.', true)
      setLoading(false)
      return
    }
    setLoginForm({ ...loginForm, username: account.username, password: account.password || '' })
    try {
      const res = await window.electronAPI.linkedinLogin({ accountId: account.id, username: account.username, password: account.password, headless: false, proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!ensureSession()) return
    if (!searchQuery) { showMsg('أدخل كلمة البحث', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.linkedinSearch({ sessionId, query: searchQuery, type: searchType, limit: extractLimit })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم العثور على ${res.count || 0} نتيجة`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    setLoading(true)
    try {
      const res = await window.electronAPI.linkedinExtractCompanies({ sessionId, searchUrl: extractUrl || `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(searchQuery)}`, limit: extractLimit })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count || 0} شركة`); await loadResults() }
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
      const res = await window.electronAPI.linkedinSendMessages({ sessionId, recipients, message: broadcastMessage })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'sent').length; showMsg(`تم إرسال ${ok} من ${recipients.length} رسالة`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => { setToolResults([]); clearResults() }

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
    { id: 'search', label: 'البحث', icon: Search },
    { id: 'extract', label: 'استخراج', icon: Download },
    { id: 'marketing', label: 'تسويق', icon: Megaphone },
    { id: 'broadcast', label: 'إرسال', icon: Send },
  ]

  const extractTools = [
    { id: 'extract-colleagues', name: 'استخراج الزملاء', desc: 'استخراج موظفي الشركات', icon: Users, soon: true },
    { id: 'extract-colleague-data', name: 'استخراج بيانات الزملاء', desc: 'الوظائف والشركات', icon: Search, soon: true },
    { id: 'extract-group-members', name: 'استخراج أعضاء المجموعات', desc: 'أعضاء المجموعات', icon: Users, soon: true },
    { id: 'extract-post-engagers', name: 'استخراج المهتمين بالمنشورات', desc: 'المتفاعلين', icon: Globe, soon: true },
    { id: 'extract-search-results', name: 'استخراج بيانات من محركات البحث', desc: 'نتائج البحث', icon: Search, soon: true },
    { id: 'extract-groups', name: 'استخراج المجموعات', desc: 'المجموعات', icon: Users, soon: true },
  ]

  const marketingTools = [
    { id: 'join-groups', name: 'الانضمام للمجموعات', desc: 'انضمام تلقائي', icon: Users, soon: true },
    { id: 'send-connect', name: 'إرسال طلب تواصل', desc: 'طلب تواصل تلقائي', icon: UserPlus, soon: true },
    { id: 'follow-companies', name: 'متابعة الشركات', desc: 'متابعة تلقائية', icon: Globe, soon: true },
    { id: 'interaction-farm', name: 'مزرعة التفاعل', desc: 'تفاعل تلقائي', icon: Heart, soon: true },
    { id: 'schedule-posts', name: 'نشر أو جدولة المنشورات', desc: 'جدولة النشر', icon: Calendar, soon: true },
  ]

  const renderLogin = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><LogIn size={20} className="text-blue-700" /> تسجيل الدخول</h3>
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
        {linkedinAccounts.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <label className="label-field">الحسابات المحفوظة</label>
            <select className="select-field mb-2" value={selectedAccountId} onChange={e => {
              const id = e.target.value; setSelectedAccountId(id)
              const acc = linkedinAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) { setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' }); if (!acc.password?.trim()) setTimeout(() => passwordRef.current?.focus(), 100) }
            }}>
              <option value="">-- اختر حساب --</option>
              {linkedinAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}</option>))}
            </select>
            {selectedAccountId && (<button onClick={() => { const acc = linkedinAccounts.find(a => a.id.toString() === selectedAccountId); if (acc) handleLoginWithAccount(acc) }} disabled={loading} className="btn-success w-full text-sm">{loading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} /> دخول / فحص الجلسة</>}</button>)}
            <div className="my-3 border-t border-blue-100" />
          </div>
        )}
        <div className="space-y-4">
          <div><label className="label-field">البريد الإلكتروني أو اسم المستخدم</label><input type="email" className="input-field" placeholder="example@email.com" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} /></div>
          <div><label className="label-field">كلمة المرور</label><div className="relative"><input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /><button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} /></div>
          <button onClick={handleLogin} disabled={loading || !loginForm.username || !loginForm.password} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}</button>
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
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-bold">{(acc.username || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>{acc.password?.trim() ? <span className="text-[10px] text-success-600">باسورد محفوظ</span> : <span className="text-[10px] text-warning-600">بدون باسورد</span>}</div></div>
                <span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{acc.status === 'active' ? 'نشط' : 'غير نشط'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderSearch = () => {
    const displayResults = toolResults.length > 0 ? toolResults : results
    return (
      <div className="space-y-6">
        <AccountSelector
          platformId="linkedin"
          accounts={allAccounts}
          cycleActive={cycleActive}
          cycleProgress={cycleProgress}
          onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
          onStopCycle={stopCycle}
          extractTask={{ type: 'extract', params: { extractType: 'companies', searchQuery, searchType, url: extractUrl, limit: extractLimit } }}
          sendTask={{ type: 'send', params: { recipients: broadcastRecipients.split('\n').filter(Boolean), message: broadcastMessage } }}
        />
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Search size={20} className="text-blue-700" /> البحث المتقدم</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1"><label className="label-field">كلمة البحث</label><input type="text" className="input-field" placeholder="ابحث عن شركات، أشخاص..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
              <div className="w-48"><label className="label-field">النوع</label><select className="select-field" value={searchType} onChange={e => setSearchType(e.target.value)}><option value="all">الكل</option><option value="people">أشخاص</option><option value="companies">شركات</option></select></div>
            </div>
            <div><label className="label-field">الحد الأقصى للنتائج: {extractLimit}</label><input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-blue-700" /></div>
            <button onClick={handleSearch} disabled={loading || !searchQuery.trim()} className="btn-primary disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Search size={18} /> بحث</>}</button>
          </div>
        </div>
        {displayResults.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-secondary-900">النتائج ({displayResults.length})</h3>
              <div className="flex gap-2">
                <button onClick={() => handleExport(['الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'المصدر', 'التاريخ'], 'linkedin-search', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
                <button onClick={handleClearResults} className="btn-danger text-sm"><Trash2 size={16} /> مسح الكل</button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>#</th><th>الاسم</th><th>معرف المستخدم</th><th>الرابط</th><th>المصدر</th></tr></thead>
                <tbody>
                  {displayResults.map((r: any, i: number) => {
                    const extra = (() => { try { return JSON.parse(r.extra_data || '{}') } catch { return {} as any } })()
                    const userId = r.userId || extra.userId || extra.id || '-'
                    const name = r.name || extra.name || '-'
                    const profile = r.url || r.profile || extra.profile || extra.url || '-'
                    const source = r.source || extra.source || '-'
                    return (
                      <tr key={r.id || i}>
                        <td className="text-secondary-500">{i + 1}</td>
                        <td className="font-medium text-sm">{name}</td>
                        <td className="text-xs font-mono text-blue-700">{userId}</td>
                        <td className="text-xs max-w-[150px] truncate">{profile !== '-' ? <a href={profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.substring(0, 40)}...</a> : '-'}</td>
                        <td className="text-xs">{source}</td>
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

  const renderExtract = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Download size={20} className="text-blue-700" /> استخراج الشركات</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً من تبويب "تسجيل الدخول"</div>}
        <div className="space-y-4">
          <div><label className="label-field">رابط نتائج البحث (اختياري - يُستخدم كلمة البحث إذا تُرك فارغاً)</label><input type="url" className="input-field" placeholder="https://linkedin.com/search/results/companies..." value={extractUrl} onChange={e => setExtractUrl(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">كلمة البحث</label><input type="text" className="input-field" placeholder="marketing, sales..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
            <div><label className="label-field">الحد الأقصى: {extractLimit}</label><input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-blue-700" /></div>
          </div>
          <button onClick={handleExtract} disabled={loading || !sessionId || (!extractUrl.trim() && !searchQuery.trim())} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}</button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {extractTools.map(tool => (
          <div key={tool.id} className={`tool-card text-center relative ${tool.soon ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {tool.soon && <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>}
            <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-blue-50"><tool.icon size={20} className="text-blue-600" /></div>
            <h4 className="font-bold text-secondary-900 text-xs mt-2">{tool.name}</h4>
            <p className="text-[10px] text-secondary-500">{tool.desc}</p>
          </div>
        ))}
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-secondary-900">نتائج الاستخراج ({toolResults.length})</h3>
            <button onClick={() => setToolResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button>
          </div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>الاسم</th><th>الرابط</th><th>الحالة</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.name || r.group || '-'}</td><td className="text-xs max-w-[200px] truncate">{r.url || r.link || '-'}</td><td><span className={`badge ${r.status === 'found' || r.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{r.status || 'found'}</span></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderMarketing = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)' }}><Megaphone size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">أدوات التسويق المتقدمة</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {marketingTools.map(tool => (
            <div key={tool.id} className={`tool-card text-center relative ${tool.soon ? 'opacity-60 cursor-not-allowed' : ''}`}>
              {tool.soon && <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>}
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-blue-50"><tool.icon size={20} className="text-blue-600" /></div>
              <h4 className="font-bold text-secondary-900 text-xs mt-2">{tool.name}</h4>
              <p className="text-[10px] text-secondary-500">{tool.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderBroadcast = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Send size={20} className="text-blue-700" /> إرسال رسائل InMail</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
        <div className="space-y-4">
          <div><label className="label-field">المستلمين (معرف URL أو اسم مستخدم - سطر لكل مستلم)</label><textarea className="textarea-field" rows={5} value={broadcastRecipients} onChange={e => setBroadcastRecipients(e.target.value)} placeholder="username&#10;https://linkedin.com/in/username" /></div>
          <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." /></div>
          <button onClick={handleBroadcast} disabled={loading || !sessionId || !broadcastRecipients.trim() || !broadcastMessage.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-secondary-900">نتائج الإرسال ({toolResults.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => handleExport(['المستلم', 'الحالة', 'خطأ'], 'linkedin-messages', toolResults)} className="btn-secondary text-sm"><FileSpreadsheet size={16} /> تصدير</button>
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

  const renderContent = () => {
    switch (activeTab) {
      case 'login': return renderLogin()
      case 'search': return renderSearch()
      case 'extract': return renderExtract()
      case 'marketing': return renderMarketing()
      case 'broadcast': return renderBroadcast()
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
              style={isActive ? { color: '#1d4ed8', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(29,78,216,0.15), 0 4px 12px rgba(29,78,216,0.08)', fontWeight: 600 } : {}}>
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
