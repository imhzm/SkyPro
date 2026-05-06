import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  LogIn, Search, Download, Send, Megaphone, UserPlus,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet, Eye, EyeOff,
  Users, Heart, Globe, Settings, BarChart3, Link2
} from 'lucide-react'

type ToolTab = 'login' | 'search' | 'extract' | 'broadcast' | 'tools'

export default function PinterestModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('login')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadResults, handleExport, clearResults, deleteResult, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('pinterest')

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
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم تسجيل الدخول بنجاح!'); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLoginWithAccount = async (account: Account) => {
    setLoading(true)
    const sessionCheck = await checkSession()
    if (sessionCheck.alreadyLoggedIn) { showMsg(`جلسة نشطة - مسجل دخول بحساب ${account.username}`); setLoading(false); return }
    const hasPass = (!!account.has_password || !!(account.password && account.password.trim()))
    if (!hasPass) { setLoginForm({ ...loginForm, username: account.username, password: '' }); setTimeout(() => passwordRef.current?.focus(), 100); showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة.', true); setLoading(false); return }
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
    try {
      const res = await window.electronAPI.pinterestExtract({ sessionId, boardUrl: boardUrl || `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(searchQuery)}`, limit: extractLimit })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count || ((res.data as any[]) || []).length} عنصر`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => { setToolResults([]); clearResults() }

  const stubExtractTools = [
    { id: 'extract-followers', name: 'استخراج المتابعين', desc: 'قائمة المتابعين', icon: Users, soon: true },
    { id: 'extract-analytics', name: 'تحليل اللوحات', desc: 'إحصائيات اللوحات', icon: BarChart3, soon: true },
  ]

  const stubTools = [
    { id: 'follow-unfollow', name: 'متابعة / إلغاء متابعة', desc: 'متابعة تلقائية', icon: UserPlus, soon: true },
    { id: 'auto-post', name: 'النشر التلقائي', desc: 'نشر Pins تلقائي', icon: Megaphone, soon: true },
    { id: 'download-search', name: 'التحميل من البحث', desc: 'تحميل صور', icon: Download, soon: true },
    { id: 'download-url', name: 'التحميل من الرابط', desc: 'تحميل من رابط', icon: Link2, soon: true },
    { id: 'create-account', name: 'إنشاء حسابات', desc: 'إنشاء حسابات Pinterest', icon: Globe, soon: true },
    { id: 'scrape-pins', name: 'استخراج Pins من الهاشتاج', desc: 'من الهاشتاجات', icon: Heart, soon: true },
  ]

  const PIN = '#E60023'

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
    { id: 'search', label: 'البحث', icon: Search },
    { id: 'extract', label: 'استخراج', icon: Download },
    { id: 'broadcast', label: 'إرسال', icon: Send },
    { id: 'tools', label: 'أدوات إضافية', icon: Settings },
  ]

  const renderLogin = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><LogIn size={20} style={{ color: PIN }} /> تسجيل الدخول</h3>
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
        {pinterestAccounts.length > 0 && (
          <div className="mb-4 p-4 rounded-xl border" style={{ background: 'rgba(230,0,35,0.04)', borderColor: 'rgba(230,0,35,0.1)' }}>
            <label className="label-field">الحسابات المحفوظة</label>
            <select className="select-field mb-2" value={selectedAccountId} onChange={e => {
              const id = e.target.value; setSelectedAccountId(id)
              const acc = pinterestAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) { setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' }); if (!acc.password?.trim()) setTimeout(() => passwordRef.current?.focus(), 100) }
            }}>
              <option value="">-- اختر حساب --</option>
              {pinterestAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}</option>))}
            </select>
            {selectedAccountId && (<button onClick={() => { const acc = pinterestAccounts.find(a => a.id.toString() === selectedAccountId); if (acc) handleLoginWithAccount(acc) }} disabled={loading} className="btn-success w-full text-sm">{loading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} /> دخول / فحص الجلسة</>}</button>)}
            <div className="my-3 border-t border-secondary-100" />
          </div>
        )}
        <div className="space-y-4">
          <div><label className="label-field">البريد الإلكتروني أو اسم المستخدم</label><input type="email" className="input-field" placeholder="example@email.com" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} /></div>
          <div><label className="label-field">كلمة المرور</label><div className="relative"><input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /><button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} /></div>
          <button onClick={handleLogin} disabled={loading || !loginForm.username || !loginForm.password} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #E60023, #B8001A)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}</button>
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
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(230,0,35,0.1)', color: PIN }}>{(acc.username || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username || 'حساب Pinterest'}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>{acc.password?.trim() ? <span className="text-[10px] text-success-600">باسورد محفوظ</span> : <span className="text-[10px] text-warning-600">بدون باسورد</span>}</div></div>
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
          platformId="pinterest"
          accounts={allAccounts}
          cycleActive={cycleActive}
          cycleProgress={cycleProgress}
          onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
          onStopCycle={stopCycle}
          extractTask={{ type: 'extract', params: { extractType: 'search', searchQuery, url: boardUrl, boardUrl, limit: extractLimit } }}
          sendTask={{ type: 'send', params: { pinUrl, boards: pinBoards } }}
        />
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Search size={20} style={{ color: PIN }} /> البحث في Pinterest</h3>
          {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1"><label className="label-field">كلمة البحث</label><input type="text" className="input-field" placeholder="design ideas, marketing..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
              <div className="w-48"><label className="label-field">الحد الأقصى: {searchLimit}</label><input type="range" min="10" max="200" value={searchLimit} onChange={e => setSearchLimit(parseInt(e.target.value))} className="w-full" style={{ accentColor: PIN }} /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSearch} disabled={loading || !sessionId || !searchQuery.trim()} className="btn-primary disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #E60023, #B8001A)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Search size={18} /> بحث</>}</button>
              <button onClick={handleExtract} disabled={loading || !sessionId} className="btn-secondary"><Download size={18} /> استخراج</button>
            </div>
          </div>
        </div>
        {displayResults.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-secondary-900">النتائج ({displayResults.length})</h3>
              <div className="flex gap-2">
                <button onClick={() => handleExport(['العنوان', 'الرابط', 'الصورة', 'المصدر', 'التاريخ'], 'pinterest-search', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
                <button onClick={handleClearResults} className="btn-danger text-sm"><Trash2 size={16} /> مسح الكل</button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>#</th><th>العنوان</th><th>الرابط</th><th>المصدر</th><th>التاريخ</th><th></th></tr></thead>
                <tbody>
                  {displayResults.map((r: any, i: number) => {
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
                        <td><button onClick={() => { if(r.id) { deleteResult(r.id); setToolResults(prev => prev.filter(item => item.id !== r.id)) } }} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td>
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
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Download size={20} style={{ color: PIN }} /> استخراج من لوحة</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
        <div className="space-y-4">
          <div><label className="label-field">رابط اللوحة (اختياري - يُستخدم كلمة البحث إذا تُرك فارغاً)</label><input type="url" className="input-field" placeholder="https://pinterest.com/user/board" value={boardUrl} onChange={e => setBoardUrl(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">كلمة البحث</label><input type="text" className="input-field" placeholder="marketing, design..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
            <div><label className="label-field">الحد الأقصى: {extractLimit}</label><input type="range" min="10" max="500" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full" style={{ accentColor: PIN }} /></div>
          </div>
          <button onClick={handleExtract} disabled={loading || !sessionId || (!boardUrl.trim() && !searchQuery.trim())} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #E60023, #B8001A)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {stubExtractTools.map(tool => (
          <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
            <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
            <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'rgba(230,0,35,0.08)' }}><tool.icon size={20} style={{ color: PIN }} /></div>
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
            <table className="data-table"><thead><tr><th>#</th><th>الوصف</th><th>الرابط</th><th>الحالة</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.alt || r.title || r.name || '-'}</td><td className="text-xs max-w-[200px] truncate">{r.link || r.url || r.image || '-'}</td><td><span className="badge badge-success">found</span></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderBroadcast = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Send size={20} style={{ color: PIN }} /> مشاركة Pins</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(230,0,35,0.06)', border: '1px solid rgba(230,0,35,0.2)', color: '#B8001A' }}>
          <AlertCircle size={16} className="inline ml-1" /> هذه الخاصية قيد التطوير - ستتوفر قريباً
        </div>
        <div className="space-y-4 opacity-60">
          <div><label className="label-field">رابط الـ Pin</label><input type="url" className="input-field" placeholder="https://pinterest.com/pin/..." value={pinUrl} onChange={e => setPinUrl(e.target.value)} /></div>
          <div><label className="label-field">اللوحات المستهدفة</label><textarea className="textarea-field" rows={4} placeholder="board1&#10;board2" value={pinBoards} onChange={e => setPinBoards(e.target.value)} /></div>
          <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #E60023, #B8001A)' }}><Send size={18} /> مشاركة (قريباً)</button>
        </div>
      </div>
    </div>
  )

  const renderTools = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E60023, #B8001A)' }}><Settings size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">أدوات Pinterest الإضافية</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {stubTools.map(tool => (
            <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'rgba(230,0,35,0.08)' }}><tool.icon size={20} style={{ color: PIN }} /></div>
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
      case 'search': return renderSearch()
      case 'extract': return renderExtract()
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
              style={isActive ? { color: PIN, background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(230,0,35,0.15), 0 4px 12px rgba(230,0,35,0.08)', fontWeight: 600 } : {}}>
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
