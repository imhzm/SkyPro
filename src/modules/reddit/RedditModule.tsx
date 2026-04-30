import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  LogIn, Search, PenTool, Megaphone,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet, Eye, EyeOff,
  Users, TrendingUp, Settings, ArrowBigUp, ArrowBigDown
} from 'lucide-react'

type ToolTab = 'login' | 'search' | 'publish' | 'vote' | 'tools'

export default function RedditModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('login')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadResults, handleExport, clearResults, deleteResult, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('reddit')

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [showPassword, setShowPassword] = useState(false)
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchLimit, setSearchLimit] = useState(50)
  const [subreddit, setSubreddit] = useState('')
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')
  const [voteType, setVoteType] = useState('up')
  const [voteUrls, setVoteUrls] = useState('')
  const [toolResults, setToolResults] = useState<any[]>([])

  const redditAccounts = allAccounts.filter(a => a.platform === 'reddit')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.redditLogin({ username: loginForm.username, password: loginForm.password, proxy: loginForm.proxy || undefined, headless: false })
      if (res.success) { setSessionId(res.sessionId); showMsg('تم تسجيل الدخول بنجاح!'); await loadAllAccounts() }
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
      const res = await window.electronAPI.redditLogin({ username: account.username, password: account.password, proxy: account.proxy || loginForm.proxy || undefined, headless: false })
      if (res.success) { setSessionId(res.sessionId); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!ensureSession()) return
    if (!searchQuery) { showMsg('أدخل كلمة البحث', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.redditSearch({ sessionId, query: searchQuery, limit: searchLimit })
      if (res.success) { setToolResults(res.data || []); showMsg(`تم العثور على ${res.count || (res.data || []).length} نتيجة`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handlePublish = async () => {
    if (!ensureSession()) return
    if (!subreddit || !postTitle) { showMsg('أدخل الـ Subreddit والعنوان', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.redditPublish({ sessionId, subreddit, title: postTitle, content: postContent })
      if (res.success) showMsg('تم النشر بنجاح!')
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => { setToolResults([]); clearResults() }

  const stubTools = [
    { id: 'top-growing', name: 'الأكثر نمواً', desc: 'استخراج المواضيع الرائجة', icon: TrendingUp },
    { id: 'extract-communities', name: 'استخراج المجتمعات', desc: 'قائمة الـ Subreddits', icon: Users },
    { id: 'schedule-posts', name: 'جدولة المنشورات', desc: 'نشر مجدول', icon: PenTool },
    { id: 'auto-comment', name: 'التعليق التلقائي', desc: 'تعليقات تلقائية', icon: Megaphone },
  ]

  const RD = '#FF4500'

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
    { id: 'search', label: 'البحث', icon: Search },
    { id: 'publish', label: 'نشر', icon: PenTool },
    { id: 'vote', label: 'تصويت', icon: ArrowBigUp },
    { id: 'tools', label: 'أدوات إضافية', icon: Settings },
  ]

  const renderLogin = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><LogIn size={20} style={{ color: RD }} /> تسجيل الدخول</h3>
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
        {redditAccounts.length > 0 && (
          <div className="mb-4 p-4 rounded-xl border" style={{ background: 'rgba(255,69,0,0.04)', borderColor: 'rgba(255,69,0,0.1)' }}>
            <label className="label-field">الحسابات المحفوظة</label>
            <select className="select-field mb-2" value={selectedAccountId} onChange={e => {
              const id = e.target.value; setSelectedAccountId(id)
              const acc = redditAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) { setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' }); if (!acc.password?.trim()) setTimeout(() => passwordRef.current?.focus(), 100) }
            }}>
              <option value="">-- اختر حساب --</option>
              {redditAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}</option>))}
            </select>
            {selectedAccountId && (<button onClick={() => { const acc = redditAccounts.find(a => a.id.toString() === selectedAccountId); if (acc) handleLoginWithAccount(acc) }} disabled={loading} className="btn-success w-full text-sm">{loading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} /> دخول / فحص الجلسة</>}</button>)}
            <div className="my-3 border-t border-secondary-100" />
          </div>
        )}
        <div className="space-y-4">
          <div><label className="label-field">اسم المستخدم</label><input type="text" className="input-field" placeholder="username" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} /></div>
          <div><label className="label-field">كلمة المرور</label><div className="relative"><input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /><button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} /></div>
          <button onClick={handleLogin} disabled={loading || !loginForm.username || !loginForm.password} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #FF4500, #CC3700)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}</button>
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
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(255,69,0,0.1)', color: RD }}>{(acc.username || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username || 'حساب Reddit'}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>{acc.password?.trim() ? <span className="text-[10px] text-success-600">باسورد محفوظ</span> : <span className="text-[10px] text-warning-600">بدون باسورد</span>}</div></div>
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
          platformId="reddit"
          accounts={allAccounts}
          cycleActive={cycleActive}
          cycleProgress={cycleProgress}
          onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
          onStopCycle={stopCycle}
          extractTask={{ type: 'extract', params: { extractType: 'search', searchQuery, query: searchQuery, limit: searchLimit } }}
          sendTask={{ type: 'send', params: { subreddit, title: postTitle, content: postContent } }}
        />
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Search size={20} style={{ color: RD }} /> البحث في Reddit</h3>
          {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1"><label className="label-field">كلمة البحث</label><input type="text" className="input-field" placeholder="ابحث عن مواضيع..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
              <div className="w-48"><label className="label-field">الحد الأقصى: {searchLimit}</label><input type="range" min="10" max="200" value={searchLimit} onChange={e => setSearchLimit(parseInt(e.target.value))} className="w-full" style={{ accentColor: RD }} /></div>
            </div>
            <button onClick={handleSearch} disabled={loading || !sessionId || !searchQuery.trim()} className="btn-primary disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #FF4500, #CC3700)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Search size={18} /> بحث</>}</button>
          </div>
        </div>
        {displayResults.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-secondary-900">النتائج ({displayResults.length})</h3>
              <div className="flex gap-2">
                <button onClick={() => handleExport(['العنوان', 'الرابط', 'المصدر', 'التاريخ'], 'reddit-search', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
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
                    const source = r.source || extra.source || 'reddit'
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

  const renderPublish = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><PenTool size={20} style={{ color: RD }} /> نشر منشور</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى تسجيل الدخول أولاً</div>}
        <div className="space-y-4">
          <div><label className="label-field">الـ Subreddit</label><input type="text" className="input-field" placeholder="r/subreddit_name" value={subreddit} onChange={e => setSubreddit(e.target.value)} /></div>
          <div><label className="label-field">العنوان</label><input type="text" className="input-field" placeholder="عنوان المنشور..." value={postTitle} onChange={e => setPostTitle(e.target.value)} /></div>
          <div><label className="label-field">المحتوى</label><textarea className="textarea-field" rows={5} value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="اكتب محتوى المنشور هنا..." /></div>
          <button onClick={handlePublish} disabled={loading || !sessionId || !subreddit.trim() || !postTitle.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #FF4500, #CC3700)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><PenTool size={18} /> نشر</>}</button>
        </div>
      </div>
    </div>
  )

  const renderVote = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><ArrowBigUp size={20} style={{ color: RD }} /> تصويت تلقائي</h3>
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(255,69,0,0.06)', border: '1px solid rgba(255,69,0,0.2)', color: '#CC3700' }}>
          <AlertCircle size={16} className="inline ml-1" /> هذه الخاصية قيد التطوير - ستتوفر قريباً
        </div>
        <div className="space-y-4 opacity-60">
          <div><label className="label-field">روابط المنشورات (سطر لكل رابط)</label><textarea className="textarea-field" rows={5} placeholder="https://reddit.com/r/..." value={voteUrls} onChange={e => setVoteUrls(e.target.value)} /></div>
          <div><label className="label-field">نوع التصويت</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="voteType" value="up" checked={voteType === 'up'} onChange={e => setVoteType(e.target.value)} className="w-4 h-4" style={{ accentColor: RD }} /><ArrowBigUp size={18} style={{ color: '#FF4500' }} /> Up Vote</label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="voteType" value="down" checked={voteType === 'down'} onChange={e => setVoteType(e.target.value)} className="w-4 h-4" style={{ accentColor: RD }} /><ArrowBigDown size={18} style={{ color: '#718096' }} /> Down Vote</label>
            </div>
          </div>
          <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #FF4500, #CC3700)' }}><ArrowBigUp size={18} /> بدء التصويت (قريباً)</button>
        </div>
      </div>
    </div>
  )

  const renderTools = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF4500, #CC3700)' }}><Settings size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">أدوات Reddit الإضافية</h2>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {stubTools.map(tool => (
            <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'rgba(255,69,0,0.08)' }}><tool.icon size={20} style={{ color: RD }} /></div>
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
      case 'publish': return renderPublish()
      case 'vote': return renderVote()
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
              style={isActive ? { color: RD, background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(255,69,0,0.15), 0 4px 12px rgba(255,69,0,0.08)', fontWeight: 600 } : {}}>
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