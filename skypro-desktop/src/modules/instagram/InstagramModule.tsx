import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  LogIn, Download, UserPlus, AtSign, Send, Play, Eye, EyeOff,
  Users, MessageSquare, Hash, Copy, AlertCircle, CheckCircle, Loader2,
  Trash2, FileSpreadsheet, Square
} from 'lucide-react'

type ToolTab = 'login' | 'extract' | 'follow' | 'mention' | 'broadcast'

export default function InstagramModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('login')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadAccounts, loadResults, handleExport, clearResults, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('instagram')
  const [showPassword, setShowPassword] = useState(false)
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [extractType, setExtractType] = useState('followers')
  const [extractInput, setExtractInput] = useState('')
  const [extractLimit, setExtractLimit] = useState(200)
  const [delayMs, setDelayMs] = useState(2000)
  const [extracting, setExtracting] = useState(false)
  const [streamResults, setStreamResults] = useState<any[]>([])
  const streamResultsRef = useRef<any[]>([])
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [toolResults, setToolResults] = useState<any[]>([])
  const [followList, setFollowList] = useState('')
  const [mentionPostUrl, setMentionPostUrl] = useState('')
  const [mentionUsers, setMentionUsers] = useState('')
  const [mentionMessage, setMentionMessage] = useState('')
  const [broadcastRecipients, setBroadcastRecipients] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')

  useEffect(() => {
    const cleanup = window.electronAPI.onExtractionProgress((data: any) => {
      if (data.type === 'progress' && data.data) {
        streamResultsRef.current = [...streamResultsRef.current, ...data.data]
        setStreamResults([...streamResultsRef.current])
      }
    })
    return cleanup
  }, [])

  const instaAccounts = allAccounts.filter(a => a.platform === 'instagram')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.instagramLogin({ username: loginForm.username, password: loginForm.password, headless: false, proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم تسجيل الدخول بنجاح!'); await loadAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
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
      const res = await window.electronAPI.instagramLogin({ accountId: account.id, username: account.username, password: account.password, headless: false, proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const stopExtraction = useCallback(() => {
    if (currentJobId) {
      window.electronAPI.cancelExtraction({ jobId: currentJobId })
      showMsg('تم إيقاف الاستخراج - البيانات المحفوظة متاحة')
    }
    setExtracting(false)
  }, [currentJobId, showMsg])

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!extractInput && extractType !== 'followers') { showMsg('يرجى إدخال البيانات المطلوبة', true); return }
    setExtracting(true)
    streamResultsRef.current = []
    setStreamResults([])
    const jobId = `ig-${extractType}-${Date.now()}`
    setCurrentJobId(jobId)
    try {
      let res: any
      const baseParams = { sessionId, limit: extractLimit, jobId, delayMs }
      switch (extractType) {
        case 'followers': res = await window.electronAPI.instagramExtractFollowers({ ...baseParams, targetUser: extractInput || loginForm.username }); break
        case 'comments': res = await window.electronAPI.instagramExtractComments({ ...baseParams, postUrl: extractInput }); break
        case 'hashtag': res = await window.electronAPI.instagramExtractHashtag({ ...baseParams, hashtag: extractInput.replace('#', '') }); break
        case 'messengers': res = await window.electronAPI.instagramExtractComments({ ...baseParams, postUrl: extractInput }); break
        case 'posts': res = await window.electronAPI.instagramExtractHashtag({ ...baseParams, hashtag: extractInput.replace('#', '') }); break
        default: res = await window.electronAPI.instagramExtractFollowers({ ...baseParams, targetUser: extractInput || loginForm.username })
      }
      if (res.success) {
        const data = res.data || res
        const finalData = streamResultsRef.current.length > 0 ? streamResultsRef.current : (Array.isArray(data) ? data : [data])
        setToolResults(finalData)
        showMsg(res.cancelled ? `تم إيقاف الاستخراج - ${finalData.length} نتيجة محفوظة` : `تم استخراج ${res.count || finalData.length || 0} نتيجة`)
        await loadResults()
      } else {
        const partial = res.partialData || streamResultsRef.current
        if (partial && partial.length > 0) {
          setToolResults(partial)
          showMsg(`تم استخراج ${partial.length} نتيجة قبل الخطأ: ${res.error || 'خطأ غير معروف'}`, true)
        } else { showMsg(res.error || 'فشل الاستخراج', true) }
      }
    } catch (err: any) { showMsg(err.message || 'خطأ في الاستخراج', true) }
    setExtracting(false)
    setCurrentJobId(null)
  }

  const handleAutoFollow = async () => {
    if (!ensureSession()) return
    const usernames = followList.split('\n').map(s => s.trim()).filter(Boolean)
    if (usernames.length === 0) { showMsg('يرجى إدخال قائمة الحسابات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.instagramAutoFollow({ sessionId, usernames })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'followed').length; showMsg(`تمت متابعة ${ok} من ${usernames.length}`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleMention = async () => {
    if (!ensureSession()) return
    const mentions = mentionUsers.split('\n').map(s => s.trim()).filter(Boolean)
    if (!mentionPostUrl || mentions.length === 0) { showMsg('يرجى إدخال الرابط والمستخدمين', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.runTool({ platform: 'instagram', toolId: 'mention', toolName: 'منشن إنستجرام', params: { sessionId, postUrl: mentionPostUrl, mentions, message: mentionMessage } })
      if (res.success) { showMsg('تم المنشن بنجاح'); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleBroadcast = async () => {
    if (!ensureSession()) return
    const recipients = broadcastRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (!broadcastMessage || recipients.length === 0) { showMsg('يرجى إدخال المستلمين والرسالة', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.instagramSendMessages({ sessionId, recipients, message: broadcastMessage })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'sent').length; showMsg(`تم إرسال ${ok} من ${recipients.length}`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => {
    setToolResults([])
    streamResultsRef.current = []
    setStreamResults([])
    clearResults()
  }

  const extractTools = [
    { id: 'followers', name: 'المتابعين الجدد', desc: 'استخراج قائمة المتابعين', icon: Users },
    { id: 'comments', name: 'الإعجابات والتعليقات', desc: 'استخراج الإعجابات والتعليقات من المنشور', icon: MessageSquare },
    { id: 'messengers', name: 'مراسلين الحساب', desc: 'استخراج مراسلين الحساب الشخصي', icon: Send },
    { id: 'hashtag', name: 'الهاشتاجات والأماكن', desc: 'استخراج المنشورات من الهاشتاجات', icon: Hash },
    { id: 'posts', name: 'المنشورات', desc: 'استخراج المنشورات المحفوظة والعامة', icon: Copy },
  ]

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
    { id: 'extract', label: 'استخراج', icon: Download },
    { id: 'follow', label: 'متابعة', icon: UserPlus },
    { id: 'mention', label: 'منشن', icon: AtSign },
    { id: 'broadcast', label: 'إرسال', icon: Send },
  ]

  const renderLogin = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><LogIn size={20} className="text-pink-600" /> تسجيل الدخول</h3>
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
        {instaAccounts.length > 0 && (
          <div className="mb-4 p-4 bg-pink-50 rounded-xl border border-pink-100">
            <label className="label-field">الحسابات المحفوظة</label>
            <select className="select-field mb-2" value={selectedAccountId} onChange={e => {
              const id = e.target.value; setSelectedAccountId(id)
              const acc = instaAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) { setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' }); if (!acc.password?.trim()) setTimeout(() => passwordRef.current?.focus(), 100) }
            }}>
              <option value="">-- اختر حساب --</option>
              {instaAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}</option>))}
            </select>
            {selectedAccountId && (<button onClick={() => { const acc = instaAccounts.find(a => a.id.toString() === selectedAccountId); if (acc) handleLoginWithAccount(acc) }} disabled={loading} className="btn-success w-full text-sm">{loading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} /> دخول / فحص الجلسة</>}</button>)}
            <div className="my-3 border-t border-pink-100" />
          </div>
        )}
        <div className="space-y-4">
          <div><label className="label-field">اسم المستخدم أو البريد</label><input type="text" className="input-field" placeholder="@username" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} /></div>
          <div><label className="label-field">كلمة المرور</label><div className="relative"><input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /><button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} /></div>
          <button onClick={handleLogin} disabled={loading || !loginForm.username || !loginForm.password} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}</button>
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
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-sm font-bold">{(acc.username || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>{acc.password?.trim() ? <span className="text-[10px] text-success-600">باسورد محفوظ</span> : <span className="text-[10px] text-warning-600">بدون باسورد</span>}</div></div>
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
    const inputPlaceholder = extractType === 'followers' ? '@username أو اتركه فارغاً للحساب الحالي' : extractType === 'comments' || extractType === 'messengers' ? 'https://instagram.com/p/...' : '#hashtag'
    const inputLabel = extractType === 'followers' ? 'اسم المستخدم' : extractType === 'comments' || extractType === 'messengers' ? 'رابط المنشور' : 'الهاشتاج'
    return (
      <div className="space-y-6">
        <AccountSelector
          platformId="instagram"
          accounts={allAccounts}
          cycleActive={cycleActive}
          cycleProgress={cycleProgress}
          onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
          onStopCycle={stopCycle}
          extractTask={{ type: 'extract', params: { extractType, targetUser: extractInput, postUrl: extractInput, hashtag: extractInput, url: extractInput, limit: extractLimit } }}
          sendTask={{ type: 'send', params: { recipients: broadcastRecipients.split('\n').filter(Boolean), message: broadcastMessage } }}
        />
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg">استخراج البيانات</h3>
          <div className="space-y-4">
            <div><label className="label-field">نوع الاستخراج</label>
              <select className="select-field" value={extractType} onChange={e => setExtractType(e.target.value)}>
                {extractTools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div><label className="label-field">{inputLabel}</label>
              <input type="text" className="input-field" placeholder={inputPlaceholder} value={extractInput} onChange={e => setExtractInput(e.target.value)} />
            </div>
            <div><label className="label-field">الحد الأقصى للنتائج: {extractLimit}</label><input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-pink-600" /></div>
            <div><label className="label-field">تأخير بين الصفحات (مللي ثانية): {delayMs}</label><input type="range" min="500" max="5000" step="100" value={delayMs} onChange={e => setDelayMs(parseInt(e.target.value))} className="w-full accent-purple-600" /><p className="text-xs text-secondary-400 mt-1">تأخير أكبر = أمان أكثر ضد الحظر</p></div>
            <div className="flex gap-2">
              <button onClick={handleExtract} disabled={extracting} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>{extracting ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}</button>
              {extracting && <button onClick={stopExtraction} className="btn-danger"><Square size={18} /> إيقاف</button>}
            </div>
            {extracting && <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-lg border border-pink-200"><Loader2 size={16} className="animate-spin text-pink-600" /><span className="text-pink-700 text-sm font-medium">جاري الاستخراج... {streamResults.length} نتيجة حتى الآن</span></div>}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {extractTools.map(tool => {
            const isSel = extractType === tool.id
            return (
              <button key={tool.id} onClick={() => setExtractType(tool.id)} className={`tool-card cursor-pointer text-center ${isSel ? 'ring-2' : ''}`}
                style={isSel ? { borderColor: '#ec4899', boxShadow: '0 0 0 2px rgba(236,72,153,0.2), 0 4px 16px rgba(236,72,153,0.1)' } : {}}>
                <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center"
                  style={isSel ? { background: 'linear-gradient(135deg, #ec4899, #be185d)', color: 'white', boxShadow: '0 2px 8px rgba(236,72,153,0.25)' } : { background: 'rgba(248,250,252,0.8)', color: '#64748b' }}>
                  <tool.icon size={20} />
                </div>
                <h4 className="font-bold text-xs mt-2" style={{ color: isSel ? '#ec4899' : '#334155' }}>{tool.name}</h4>
              </button>
            )
          })}
        </div>
        {(displayResults.length > 0 || streamResults.length > 0) && (
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-secondary-900">النتائج ({streamResults.length || displayResults.length})</h3>
              <div className="flex gap-2">
                <button onClick={() => handleExport(['الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'النص', 'المصدر', 'التاريخ'], 'instagram-extract', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
                <button onClick={handleClearResults} className="btn-danger text-sm"><Trash2 size={16} /> مسح الكل</button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>#</th><th>الاسم</th><th>معرف المستخدم</th><th>الرابط</th><th>الهاتف</th><th>النص</th><th>المصدر</th></tr></thead>
                <tbody>
                  {(streamResults.length > 0 ? streamResults : displayResults).map((r: any, i: number) => {
                    const extra = (() => { try { return JSON.parse(r.extra_data || '{}') } catch { return {} as any } })()
                    const userId = r.userId || extra.userId || extra.id || r.user_id || '-'
                    const name = r.name || extra.name || r.username || '-'
                    const profile = r.url || r.profile || extra.profile || extra.url || '-'
                    const phone = r.phone || extra.phone || '-'
                    const text = extra.text || r.text || extra.extra || '-'
                    const source = r.source || extra.source || '-'
                    return (
                      <tr key={r.id || i}>
                        <td className="text-secondary-500">{i + 1}</td>
                        <td className="font-medium text-sm">{name}</td>
                        <td className="text-xs font-mono text-pink-600">{userId}</td>
                        <td className="text-xs max-w-[150px] truncate">{profile !== '-' ? <a href={profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.substring(0, 40)}...</a> : '-'}</td>
                        <td className="text-xs">{phone}</td>
                        <td className="text-xs max-w-[150px] truncate">{text}</td>
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

  const renderFollow = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><UserPlus size={20} className="text-pink-600" /> متابعة حسابات</h3>
        <div className="space-y-4">
          <div><label className="label-field">قائمة الحسابات (سطر لكل حساب)</label><textarea className="textarea-field" rows={6} value={followList} onChange={e => setFollowList(e.target.value)} placeholder="user1&#10;user2&#10;user3" /></div>
          <button onClick={handleAutoFollow} disabled={loading || !followList.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> متابعة</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-secondary-900">النتائج ({toolResults.length})</h3><button onClick={() => setToolResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button></div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>الحساب</th><th>الحالة</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.username || r.user || r.name || r.recipient || '-'}</td><td><span className={`badge ${r.status === 'followed' || r.status === 'sent' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderMention = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><AtSign size={20} className="text-pink-600" /> منشن من عدة حسابات</h3>
        <div className="space-y-4">
          <div><label className="label-field">رابط المنشور</label><input type="url" className="input-field" placeholder="https://instagram.com/p/..." value={mentionPostUrl} onChange={e => setMentionPostUrl(e.target.value)} /></div>
          <div><label className="label-field">قائمة المستخدمين للمنشن</label><textarea className="textarea-field" rows={4} value={mentionUsers} onChange={e => setMentionUsers(e.target.value)} placeholder="username1&#10;username2" /></div>
          <div><label className="label-field">نص الرسالة (اختياري)</label><textarea className="textarea-field" rows={3} value={mentionMessage} onChange={e => setMentionMessage(e.target.value)} placeholder="...تعليقك مع المنشن" /></div>
          <button onClick={handleMention} disabled={loading || !mentionPostUrl || !mentionUsers.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> بدء المنشن</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-secondary-900">النتائج ({toolResults.length})</h3><button onClick={() => setToolResults([])} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button></div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>التفاصيل</th><th>الحالة</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="text-xs max-w-[300px] truncate">{r.username || r.name || r.recipient || JSON.stringify(r).substring(0, 80)}</td><td><span className={`badge ${r.status === 'mentioned' || r.status === 'sent' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderBroadcast = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Send size={20} className="text-pink-600" /> إرسال رسائل</h3>
        <div className="space-y-4">
          <div><label className="label-field">المستلمين (اسم مستخدم - سطر لكل مستلم)</label><textarea className="textarea-field" rows={5} value={broadcastRecipients} onChange={e => setBroadcastRecipients(e.target.value)} placeholder="user1&#10;user2&#10;user3" /></div>
          <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." /></div>
          <button onClick={handleBroadcast} disabled={loading || !broadcastRecipients.trim() || !broadcastMessage.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-secondary-900">نتائج الإرسال ({toolResults.length})</h3><button onClick={() => handleExport(['المستلم', 'الحالة', 'خطأ'], 'instagram-messages', toolResults)} className="btn-secondary text-sm"><FileSpreadsheet size={16} /> تصدير</button></div>
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
      case 'extract': return renderExtract()
      case 'follow': return renderFollow()
      case 'mention': return renderMention()
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
              style={isActive ? { color: '#ec4899', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(236,72,153,0.15), 0 4px 12px rgba(236,72,153,0.08)', fontWeight: 600 } : {}}>
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
