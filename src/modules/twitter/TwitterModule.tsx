import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  LogIn, Download, Calendar, AtSign, Send, UserPlus, Megaphone, Repeat,
  Play, Settings, AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet,
  Eye, EyeOff, Users, Hash, Heart, Globe, MessageSquare
} from 'lucide-react'

type ToolTab = 'login' | 'extract' | 'interactions' | 'marketing' | 'scheduled'

export default function TwitterModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('login')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadAccounts, loadResults, handleExport, clearResults, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('twitter')

  const [showPassword, setShowPassword] = useState(false)
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [extractUser, setExtractUser] = useState('')
  const [extractLimit, setExtractLimit] = useState(200)
  const [toolResults, setToolResults] = useState<any[]>([])
  const [tweetText, setTweetText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [mentionTweetUrl, setMentionTweetUrl] = useState('')
  const [mentionUsers, setMentionUsers] = useState('')
  const [mentionMessage, setMentionMessage] = useState('')
  const [broadcastText, setBroadcastText] = useState('')
  const [followList, setFollowList] = useState('')
  const [retweetUrls, setRetweetUrls] = useState('')

  const twitterAccounts = allAccounts.filter(a => a.platform === 'twitter')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.twitterLogin({ username: loginForm.username, password: loginForm.password, headless: false, proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId); showMsg('تم تسجيل الدخول بنجاح!'); await loadAccounts() }
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
    const hasPass = !!(account.password && account.password.trim())
    if (!hasPass) {
      setLoginForm({ ...loginForm, username: account.username, password: '' })
      setTimeout(() => passwordRef.current?.focus(), 100)
      showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة. يرجى إدخال كلمة المرور يدوياً.', true)
      setLoading(false)
      return
    }
    setLoginForm({ ...loginForm, username: account.username, password: account.password || '' })
    try {
      const res = await window.electronAPI.twitterLogin({ username: account.username, password: account.password, headless: false, proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!extractUser) { showMsg('أدخل اسم المستخدم', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.twitterExtractFollowers({ sessionId, username: extractUser, limit: extractLimit })
      if (res.success) { setToolResults(res.data || []); showMsg(`تم استخراج ${res.count || 0} متابع`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleSchedule = async () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return }
    if (!tweetText || !scheduledAt) { showMsg('أدخل النص والموعد', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.twitterScheduleTweet({ text: tweetText, scheduledAt })
      if (res.success) showMsg('تم حفظ التغريدة المجدولة')
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleTweet = async () => {
    if (!ensureSession()) return
    if (!broadcastText) { showMsg('أدخل نص التغريدة', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.twitterTweet({ sessionId, text: broadcastText })
      if (res.success) showMsg('تم نشر التغريدة بنجاح!')
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!ensureSession()) return
    const usernames = followList.split('\n').map(s => s.trim()).filter(Boolean)
    if (usernames.length === 0) { showMsg('أدخل قائمة الحسابات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.twitterFollow({ sessionId, usernames })
      if (res.success) { const ok = (res.data || []).filter((x: any) => x.status === 'followed').length; showMsg(`تمت متابعة ${ok} من ${usernames.length} حساب`); setToolResults(res.data || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleRetweet = async () => {
    if (!ensureSession()) return
    const urls = retweetUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط التغريدات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.twitterRetweet({ sessionId, tweetUrls: urls })
      if (res.success) { const ok = (res.data || []).filter((x: any) => x.status === 'retweeted').length; showMsg(`تم الريتويت ${ok} من ${urls.length}`); setToolResults(res.data || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleMention = async () => {
    if (!ensureSession()) return
    const mentions = mentionUsers.split('\n').map(s => s.trim()).filter(Boolean)
    if (!mentionTweetUrl || mentions.length === 0) { showMsg('أدخل رابط التغريدة والمستخدمين', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.runTool({ platform: 'twitter', toolId: 'mention', toolName: 'منشن تويتر', params: { sessionId, postUrl: mentionTweetUrl, mentions, message: mentionMessage } })
      if (res.success) { showMsg('تم المنشن بنجاح'); setToolResults(res.data || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => { setToolResults([]); clearResults() }

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
    { id: 'extract', label: 'استخراج', icon: Download },
    { id: 'interactions', label: 'تفاعل', icon: AtSign },
    { id: 'marketing', label: 'تسويق', icon: Megaphone },
    { id: 'scheduled', label: 'جدولة', icon: Calendar },
  ]

  const extractTools = [
    { id: 'extract-search-followers', name: 'استخراج من البحث والمتابعين', desc: 'استخراج من نتائج البحث', icon: Download, soon: true },
    { id: 'extract-tweets-delete', name: 'استخراج التغريدات أو حذفها', desc: 'إدارة التغريدات', icon: Settings, soon: true },
    { id: 'extract-trends', name: 'استخراج الترندات', desc: 'الترندات الشائعة', icon: Megaphone, soon: true },
    { id: 'extract-from-tweet', name: 'استخراج من التغريدة', desc: 'من التغريدات', icon: Globe, soon: true },
    { id: 'extract-news-interactions', name: 'استخراج التفاعلات من الأخبار', desc: 'تفاعلات الأخبار', icon: MessageSquare, soon: true },
    { id: 'extract-demographics', name: 'استخراج البيانات الديموغرافية', desc: 'البيانات العامة', icon: Users, soon: true },
  ]

  const marketingTools = [
    { id: 'marketing-hashtag', name: 'تسويق الهاشتاجات', desc: 'رفع الهاشتاجات', icon: Hash, soon: true },
    { id: 'marketing-auto-post', name: 'النشر التلقائي', desc: 'جدولة ونشر تلقائي', icon: Play, soon: true },
    { id: 'marketing-check-accounts', name: 'فحص الحسابات', desc: 'فحص صلاحية الحسابات', icon: CheckCircle, soon: true },
    { id: 'marketing-interaction-farm', name: 'مزرعة التفاعل', desc: 'تفاعل تلقائي', icon: Heart, soon: true },
  ]

  const renderLogin = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><LogIn size={20} className="text-blue-600" /> تسجيل الدخول</h3>
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
        {twitterAccounts.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <label className="label-field">الحسابات المحفوظة</label>
            <select className="select-field mb-2" value={selectedAccountId} onChange={e => {
              const id = e.target.value; setSelectedAccountId(id)
              const acc = twitterAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) { setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' }); if (!acc.password?.trim()) setTimeout(() => passwordRef.current?.focus(), 100) }
            }}>
              <option value="">-- اختر حساب --</option>
              {twitterAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}</option>))}
            </select>
            {selectedAccountId && (<button onClick={() => { const acc = twitterAccounts.find(a => a.id.toString() === selectedAccountId); if (acc) handleLoginWithAccount(acc) }} disabled={loading} className="btn-success w-full text-sm">{loading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} /> دخول / فحص الجلسة</>}</button>)}
            <div className="my-3 border-t border-blue-100" />
          </div>
        )}
        <div className="space-y-4">
          <div><label className="label-field">اسم المستخدم أو البريد</label><input type="text" className="input-field" placeholder="@username" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} /></div>
          <div><label className="label-field">كلمة المرور</label><div className="relative"><input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /><button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} /></div>
          <button onClick={handleLogin} disabled={loading || !loginForm.username || !loginForm.password} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}</button>
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
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">{(acc.username || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>{acc.password?.trim() ? <span className="text-[10px] text-success-600">باسورد محفوظ</span> : <span className="text-[10px] text-warning-600">بدون باسورد</span>}</div></div>
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
          platformId="twitter"
          accounts={allAccounts}
          cycleActive={cycleActive}
          cycleProgress={cycleProgress}
          onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
          onStopCycle={stopCycle}
          extractTask={{ type: 'extract', params: { extractType: 'followers', targetUser: extractUser, username: extractUser, limit: extractLimit } }}
          sendTask={{ type: 'send', params: { text: broadcastText } }}
        />
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Download size={20} className="text-blue-600" /> استخراج المتابعين</h3>
          <div className="space-y-4">
            <div><label className="label-field">اسم المستخدم</label><input type="text" className="input-field" placeholder="@username أو اتركه فارغاً لحسابك" value={extractUser} onChange={e => setExtractUser(e.target.value)} /></div>
            <div><label className="label-field">الحد الأقصى للنتائج: {extractLimit}</label><input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-blue-600" /></div>
            <div className="flex gap-2">
              <button onClick={handleExtract} disabled={loading} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}</button>
              <button onClick={() => handleExport(['الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'المصدر', 'التاريخ'], 'twitter-extract', toolResults)} className="btn-secondary"><FileSpreadsheet size={18} /> تصدير</button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {extractTools.map(tool => (
            <div key={tool.id} className={`tool-card text-center relative ${tool.soon ? 'opacity-60' : ''}`}>
              {tool.soon && <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>}
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-blue-50"><tool.icon size={20} className="text-blue-500" /></div>
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
                <button onClick={() => handleExport(['الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'المصدر', 'التاريخ'], 'twitter-extract', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
                <button onClick={handleClearResults} className="btn-danger text-sm"><Trash2 size={16} /> مسح الكل</button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>#</th><th>الاسم</th><th>معرف المستخدم</th><th>الرابط</th><th>الهاتف</th><th>النص</th><th>المصدر</th></tr></thead>
                <tbody>
                  {displayResults.map((r: any, i: number) => {
                    const extra = (() => { try { return JSON.parse(r.extra_data || '{}') } catch { return {} as any } })()
                    const userId = r.userId || extra.userId || extra.id || r.user_id || '-'
                    const name = r.name || extra.name || r.username || '-'
                    const profile = r.url || r.profile || extra.profile || extra.url || '-'
                    const phone = r.phone || extra.phone || '-'
                    const text = r.text || r.bio || extra.text || extra.bio || '-'
                    const source = r.source || extra.source || '-'
                    return (
                      <tr key={r.id || i}>
                        <td className="text-secondary-500">{i + 1}</td>
                        <td className="font-medium text-sm">{name}</td>
                        <td className="text-xs font-mono text-blue-600">{userId}</td>
                        <td className="text-xs max-w-[150px] truncate">{profile !== '-' ? <a href={profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.substring(0, 40)}...</a> : '-'}</td>
                        <td className="text-xs">{phone}</td>
                        <td className="text-xs max-w-[200px] truncate">{text}</td>
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

  const renderInteractions = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-blue-600" /> متابعة حسابات</h3>
          <div className="space-y-4">
            <div><label className="label-field">قائمة الحسابات (سطر لكل حساب)</label><textarea className="textarea-field" rows={6} value={followList} onChange={e => setFollowList(e.target.value)} placeholder="user1&#10;user2&#10;user3" /></div>
            <button onClick={handleFollow} disabled={loading || !followList.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> متابعة</>}</button>
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><Repeat size={20} className="text-blue-600" /> ريتويت</h3>
          <div className="space-y-4">
            <div><label className="label-field">روابط التغريدات (سطر لكل رابط)</label><textarea className="textarea-field" rows={6} value={retweetUrls} onChange={e => setRetweetUrls(e.target.value)} placeholder="https://x.com/user/status/...&#10;https://x.com/user/status/..." /></div>
            <button onClick={handleRetweet} disabled={loading || !retweetUrls.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Repeat size={18} /> ريتويت</>}</button>
          </div>
        </div>
        <div className="card col-span-2">
          <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><AtSign size={20} className="text-blue-600" /> منشن في التعليقات</h3>
          <div className="space-y-4">
            <div><label className="label-field">رابط التغريدة</label><input type="url" className="input-field" placeholder="https://x.com/user/status/..." value={mentionTweetUrl} onChange={e => setMentionTweetUrl(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label-field">المستخدمين للمنشن (سطر لكل اسم)</label><textarea className="textarea-field" rows={4} value={mentionUsers} onChange={e => setMentionUsers(e.target.value)} placeholder="user1&#10;user2" /></div>
              <div><label className="label-field">نص التعليق (اختياري)</label><textarea className="textarea-field" rows={4} value={mentionMessage} onChange={e => setMentionMessage(e.target.value)} placeholder="...تعليقك مع المنشن" /></div>
            </div>
            <button onClick={handleMention} disabled={loading || !mentionTweetUrl || !mentionUsers.trim()} className="btn-primary disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> بدء المنشن</>}</button>
          </div>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-secondary-900">النتائج ({toolResults.length})</h3><button onClick={() => setToolResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button></div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>التفاصيل</th><th>الحالة</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="text-xs max-w-[300px] truncate">{r.username || r.name || r.recipient || r.url || JSON.stringify(r).substring(0, 80)}</td><td><span className={`badge ${r.status === 'followed' || r.status === 'retweeted' || r.status === 'mentioned' || r.status === 'sent' || r.status === 'posted' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderMarketing = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Megaphone size={20} className="text-blue-600" /> نشر تغريدة الآن</h3>
        <div className="space-y-4">
          <div><label className="label-field">نص التغريدة</label><textarea className="textarea-field" rows={5} value={broadcastText} onChange={e => setBroadcastText(e.target.value)} placeholder="اكتب تغريدتك هنا..." /></div>
          <button onClick={handleTweet} disabled={loading || !broadcastText.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> نشر</>}</button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {marketingTools.map(tool => (
          <div key={tool.id} className={`tool-card text-center relative ${tool.soon ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {tool.soon && <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>}
            <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-blue-50"><tool.icon size={20} className="text-blue-500" /></div>
            <h4 className="font-bold text-secondary-900 text-xs mt-2">{tool.name}</h4>
            <p className="text-[10px] text-secondary-500">{tool.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderScheduled = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Calendar size={20} className="text-blue-600" /> جدولة التغريدات</h3>
        <div className="space-y-4">
          <div><label className="label-field">نص التغريدة</label><textarea className="textarea-field" rows={4} value={tweetText} onChange={e => setTweetText(e.target.value)} placeholder="اكتب التغريدة المجدولة..." /></div>
          <div><label className="label-field">الموعد</label><input type="datetime-local" className="input-field" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /></div>
          <button onClick={handleSchedule} disabled={loading || !tweetText.trim() || !scheduledAt} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Calendar size={18} /> جدولة</>}</button>
        </div>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'login': return renderLogin()
      case 'extract': return renderExtract()
      case 'interactions': return renderInteractions()
      case 'marketing': return renderMarketing()
      case 'scheduled': return renderScheduled()
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
              style={isActive ? { color: '#2563eb', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(37,99,235,0.15), 0 4px 12px rgba(37,99,235,0.08)', fontWeight: 600 } : {}}>
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