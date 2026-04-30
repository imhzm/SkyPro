import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  LogIn, Download, Heart, UserPlus, AtSign, Upload,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet,
  Eye, EyeOff, Settings, Megaphone, ExternalLink, Users, MessageSquare
} from 'lucide-react'

type ToolTab = 'login' | 'extract' | 'mention' | 'upload' | 'tools'

const TT = '#EE1174'

export default function TiktokModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('login')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadResults, handleExport, clearResults, deleteResult, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('tiktok')

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [showPassword, setShowPassword] = useState(false)
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [extractType, setExtractType] = useState('comments')
  const [extractInput, setExtractInput] = useState('')
  const [extractLimit, setExtractLimit] = useState(50)
  const [toolResults, setToolResults] = useState<any[]>([])
  const [mentionVideoUrls, setMentionVideoUrls] = useState('')
  const [mentionUsers, setMentionUsers] = useState('')
  const [mentionMessage, setMentionMessage] = useState('')
  const [downloadVideoUrl, setDownloadVideoUrl] = useState('')
  const [downloadSavePath, setDownloadSavePath] = useState('')
  const [uploadVideoPath, setUploadVideoPath] = useState('')
  const [uploadCaption, setUploadCaption] = useState('')

  const tiktokAccounts = allAccounts.filter(a => a.platform === 'tiktok')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username) { showMsg('أدخل اسم المستخدم', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.launchBrowser({ platform: 'tiktok', headless: false, proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId); showMsg('تم فتح المتصفح - سجل دخول يدوياً على TikTok'); await loadAllAccounts() }
      else showMsg(res.error || 'فشل فتح المتصفح', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!extractInput) { showMsg('أدخل الرابط أو اسم المستخدم', true); return }
    setLoading(true)
    try {
      let res: any
      if (extractType === 'comments') res = await window.electronAPI.tiktokExtractComments({ sessionId, videoUrl: extractInput, limit: extractLimit })
      else res = await window.electronAPI.tiktokExtractFollowers({ sessionId, username: extractInput.replace('@', ''), limit: extractLimit })
      if (res.success) { setToolResults(res.data || []); showMsg(`تم استخراج ${res.count || (res.data || []).length}`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleDownload = async () => {
    if (!downloadVideoUrl) { showMsg('أدخل رابط الفيديو', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.videoDownload({ url: downloadVideoUrl, saveDir: downloadSavePath })
      if (res.success) showMsg(`تم التحميل: ${res.path}`)
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => { setToolResults([]); clearResults() }

  const extractStubTools = [
    { id: 'search', name: 'استخراج من البحث', desc: 'نتائج البحث', icon: Download, soon: true },
  ]

  const stubTools = [
    { id: 'follow-send', name: 'متابعة وإرسال رسائل', desc: 'متابعة تلقائية', icon: UserPlus, soon: true },
    { id: 'interaction-farm', name: 'مزرعة التفاعل', desc: 'إعجاب وتعليقات', icon: Heart, soon: true },
    { id: 'live-support', name: 'دعم البث المباشر', desc: 'تفاعل مباشر', icon: MessageSquare, soon: true },
    { id: 'auto-post', name: 'النشر التلقائي', desc: 'نشر فيديوهات', icon: Megaphone, soon: true },
    { id: 'schedule-posts', name: 'جدولة المنشورات', desc: 'نشر مجدول', icon: Upload, soon: true },
  ]

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
    { id: 'extract', label: 'استخراج', icon: Download },
    { id: 'mention', label: 'منشن', icon: AtSign },
    { id: 'upload', label: 'رفع', icon: Upload },
    { id: 'tools', label: 'أدوات إضافية', icon: Settings },
  ]

  const renderLogin = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><LogIn size={20} style={{ color: TT }} /> فتح TikTok</h3>
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
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(238,17,116,0.06)', border: '1px solid rgba(238,17,116,0.2)', color: '#D81268' }}>
          <AlertCircle size={16} className="inline ml-1" /> TikTok يتطلب تسجيل الدخول يدوياً - سيتم فتح المتصفح وأنت تكمل الدخول بنفسك
        </div>
        {tiktokAccounts.length > 0 && (
          <div className="mb-4 p-4 rounded-xl border" style={{ background: 'rgba(238,17,116,0.04)', borderColor: 'rgba(238,17,116,0.1)' }}>
            <label className="label-field">الحسابات المحفوظة</label>
            <select className="select-field mb-2" value={selectedAccountId} onChange={e => {
              const id = e.target.value; setSelectedAccountId(id)
              const acc = tiktokAccounts.find(a => a.id.toString() === id)
              if (acc) setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' })
            }}>
              <option value="">-- اختر حساب --</option>
              {tiktokAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}</option>))}
            </select>
            <div className="my-3 border-t border-secondary-100" />
          </div>
        )}
        <div className="space-y-4">
          <div><label className="label-field">اسم المستخدم</label><input type="text" className="input-field" placeholder="@username" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} /></div>
          <div><label className="label-field">كلمة المرور (اختياري)</label><div className="relative"><input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /><button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} /></div>
          <button onClick={handleLogin} disabled={loading || !loginForm.username} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #EE1174, #D81268)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><ExternalLink size={18} /> فتح المتصفح</>}</button>
        </div>
      </div>
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg">الحسابات المحفوظة</h3>
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-secondary-400"><Users size={48} className="mx-auto mb-3 opacity-30" /><p>لا توجد حسابات محفوظة</p><p className="text-xs mt-1">افتح TikTok لحفظ حسابك</p></div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary-50 border border-secondary-100 hover:bg-secondary-100 transition-colors">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(238,17,116,0.1)', color: TT }}>{(acc.username || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username || 'حساب TikTok'}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p></div></div>
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
          platformId="tiktok"
          accounts={allAccounts}
          cycleActive={cycleActive}
          cycleProgress={cycleProgress}
          onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
          onStopCycle={stopCycle}
          extractTask={{ type: 'extract', params: { extractType, url: extractInput, limit: extractLimit } }}
          sendTask={{ type: 'send', params: { message: mentionMessage } }}
        />
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Download size={20} style={{ color: TT }} /> استخراج بيانات TikTok</h3>
          {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى فتح المتصفح أولاً من تبويب "تسجيل الدخول"</div>}
          <div className="space-y-4">
            <div><label className="label-field">نوع الاستخراج</label>
              <select className="select-field" value={extractType} onChange={e => setExtractType(e.target.value)}>
                <option value="comments">استخراج التعليقات (رابط فيديو)</option>
                <option value="followers">استخراج المتابعين (اسم المستخدم)</option>
              </select>
            </div>
            <div><label className="label-field">{extractType === 'comments' ? 'رابط الفيديو' : 'اسم المستخدم'}</label><input type="text" className="input-field" placeholder={extractType === 'comments' ? 'https://tiktok.com/...' : '@username'} value={extractInput} onChange={e => setExtractInput(e.target.value)} /></div>
            <div><label className="label-field">الحد الأقصى: {extractLimit}</label><input type="range" min="10" max="500" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full" style={{ accentColor: TT }} /></div>
            <button onClick={handleExtract} disabled={loading || !sessionId} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #EE1174, #D81268)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {extractStubTools.map(tool => (
            <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'rgba(238,17,116,0.08)' }}><tool.icon size={20} style={{ color: TT }} /></div>
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
                <button onClick={() => handleExport(['الاسم', 'المعرف', 'النص', 'الرابط', 'المصدر', 'التاريخ'], 'tiktok-extract', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
                <button onClick={handleClearResults} className="btn-danger text-sm"><Trash2 size={16} /> مسح الكل</button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>#</th><th>الاسم</th><th>المعرف</th><th>النص</th><th>الرابط</th><th>التاريخ</th><th></th></tr></thead>
                <tbody>
                  {displayResults.map((r: any, i: number) => {
                    const extra = (() => { try { return JSON.parse(r.extra_data || '{}') } catch { return {} as any } })()
                    const name = r.name || r.username || extra.username || '-'
                    const userId = r.username || extra.username || r.extra || '-'
                    const text = r.text || r.content || extra.text || '-'
                    const url = r.url || r.profile || r.link || extra.profile || extra.url || '-'
                    return (
                      <tr key={r.id || i}>
                        <td className="text-secondary-500">{i + 1}</td>
                        <td className="font-medium text-sm">{name}</td>
                        <td className="text-xs font-mono" style={{ color: TT }}>{userId}</td>
                        <td className="text-xs max-w-[200px] truncate">{text}</td>
                        <td className="text-xs max-w-[150px] truncate">{url !== '-' ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{url.substring(0, 35)}...</a> : '-'}</td>
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
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><AtSign size={20} style={{ color: TT }} /> منشن</h3>
        {!sessionId && <div className="mb-4 p-3 bg-warning-50 text-warning-700 rounded-lg text-sm"><AlertCircle size={16} className="inline ml-1" /> يرجى فتح المتصفح أولاً</div>}
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(238,17,116,0.06)', border: '1px solid rgba(238,17,116,0.2)', color: '#D81268' }}>
          <AlertCircle size={16} className="inline ml-1" /> هذه الخاصية قيد التطوير - ستتوفر قريباً
        </div>
        <div className="space-y-4 opacity-60">
          <div><label className="label-field">روابط الفيديو</label><textarea className="textarea-field" rows={4} value={mentionVideoUrls} onChange={e => setMentionVideoUrls(e.target.value)} placeholder="https://tiktok.com/..." /></div>
          <div><label className="label-field">المستخدمين</label><textarea className="textarea-field" rows={4} value={mentionUsers} onChange={e => setMentionUsers(e.target.value)} placeholder="user1&#10;user2" /></div>
          <div><label className="label-field">الرسالة (اختياري)</label><textarea className="textarea-field" rows={3} value={mentionMessage} onChange={e => setMentionMessage(e.target.value)} placeholder="..." /></div>
          <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #EE1174, #D81268)' }}><AtSign size={18} /> بدء المنشن (قريباً)</button>
        </div>
      </div>
    </div>
  )

  const renderUpload = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Download size={20} style={{ color: TT }} /> تحميل فيديو</h3>
        <div className="space-y-4">
          <div><label className="label-field">رابط الفيديو</label><input type="url" className="input-field" placeholder="https://tiktok.com/..." value={downloadVideoUrl} onChange={e => setDownloadVideoUrl(e.target.value)} /></div>
          <div><label className="label-field">مسار الحفظ (اختياري)</label><input type="text" className="input-field" placeholder="C:\Downloads" value={downloadSavePath} onChange={e => setDownloadSavePath(e.target.value)} /></div>
          <button onClick={handleDownload} disabled={loading || !downloadVideoUrl} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #EE1174, #D81268)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> تحميل</>}</button>
        </div>
      </div>
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Upload size={20} style={{ color: TT }} /> نشر فيديو</h3>
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(238,17,116,0.06)', border: '1px solid rgba(238,17,116,0.2)', color: '#D81268' }}>
          <AlertCircle size={16} className="inline ml-1" /> هذه الخاصية قيد التطوير - ستتوفر قريباً
        </div>
        <div className="space-y-4 opacity-60">
          <div><label className="label-field">مسار الفيديو</label><input type="text" className="input-field" placeholder="C:\video.mp4" value={uploadVideoPath} onChange={e => setUploadVideoPath(e.target.value)} /></div>
          <div><label className="label-field">الوصف</label><textarea className="textarea-field" rows={4} value={uploadCaption} onChange={e => setUploadCaption(e.target.value)} placeholder="..." /></div>
          <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #EE1174, #D81268)' }}><Upload size={18} /> نشر (قريباً)</button>
        </div>
      </div>
    </div>
  )

  const renderTools = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EE1174, #D81268)' }}><Settings size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">أدوات TikTok الإضافية</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {stubTools.map(tool => (
            <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
              <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
              <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center" style={{ background: 'rgba(238,17,116,0.08)' }}><tool.icon size={20} style={{ color: TT }} /></div>
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
      case 'upload': return renderUpload()
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
              style={isActive ? { color: TT, background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(238,17,116,0.15), 0 4px 12px rgba(238,17,116,0.08)', fontWeight: 600 } : {}}>
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