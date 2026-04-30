import { useState } from 'react'
import { Zap, Twitter, Instagram, AlertCircle, CheckCircle, Loader2, Settings, ExternalLink } from 'lucide-react'

type ToolTab = 'get' | 'auto' | 'tools'

export default function AutoPointModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('get')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [site, setSite] = useState('like4like')
  const [interactionType, setInteractionType] = useState('like')
  const [count, setCount] = useState(100)
  const [delay, setDelay] = useState(5)

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') } else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 5000)
  }

  const handleRun = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.autoPointRun({
        platform: activeTab === 'get' ? 'twitter' : 'instagram',
        site,
        interactionType,
        count,
        delay,
        headless: false
      })
      if (res.success) showMsg(res.message || 'تم التنفيذ بنجاح')
      else showMsg(res.error || 'فشل التنفيذ', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const sites = [
    { value: 'like4like', label: 'Like4Like', desc: 'تبادل إعجابات تويتر' },
    { value: 'kingdomlikes', label: 'KingdomLikes', desc: 'تبادل تفاعل متعدد' },
    { value: 'followfast', label: 'FollowFast', desc: 'متابعة سريعة' },
    { value: 'likesplanet', label: 'LikesPlanet', desc: 'كوكب الإعجابات' },
  ]

  const stubTools = [
    { id: 'auto-youtube', name: 'يوتيوب تلقائي', desc: 'مشاهدات واشتراكات', icon: ExternalLink },
    { id: 'auto-tiktok', name: 'تيك توك تلقائي', desc: 'إعجابات ومتابعات', icon: ExternalLink },
  ]

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'get', label: 'تويتر', icon: Twitter },
    { id: 'auto', label: 'انستجرام', icon: Instagram },
    { id: 'tools', label: 'أدوات إضافية', icon: Settings },
  ]

  const renderGet = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Twitter size={20} style={{ color: '#1da1f2' }} /> تبادل إعجابات تويتر</h3>
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#ea580c' }}>
          <AlertCircle size={16} className="inline ml-1" /> هذه الأداة تعمل عبر مواقع تبادل خارجية — تحتاج تسجيل دخول يدوي على الموقع
        </div>
        <div className="space-y-4">
          <div><label className="label-field">الموقع</label>
            <div className="space-y-2">
              {sites.map(s => (<label key={s.value} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors" style={{ background: site === s.value ? 'rgba(249,115,22,0.06)' : 'transparent', border: site === s.value ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent' }}>
                <input type="radio" name="site-get" value={s.value} checked={site === s.value} onChange={() => setSite(s.value)} className="w-4 h-4" />
                <div><p className="font-medium text-sm text-secondary-900">{s.label}</p><p className="text-xs text-secondary-500">{s.desc}</p></div>
              </label>))}
            </div>
          </div>
          <div><label className="label-field">نوع التفاعل</label><select className="select-field" value={interactionType} onChange={e => setInteractionType(e.target.value)}><option value="like">إعجاب</option><option value="follow">متابعة</option><option value="retweet">ريتويت</option></select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">العدد: {count}</label><input type="range" min="10" max="500" value={count} onChange={e => setCount(parseInt(e.target.value))} className="w-full" /></div>
            <div><label className="label-field">الفاصل (ثانية): {delay}</label><input type="range" min="1" max="30" value={delay} onChange={e => setDelay(parseInt(e.target.value))} className="w-full" /></div>
          </div>
          <button onClick={handleRun} disabled={loading} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Zap size={18} /> بدء التشغيل</>}</button>
        </div>
      </div>
    </div>
  )

  const renderAuto = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Instagram size={20} style={{ color: '#e4405f' }} /> تبادل تفاعل انستجرام</h3>
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.2)', color: '#ea580c' }}>
          <AlertCircle size={16} className="inline ml-1" /> هذه الأداة تعمل عبر مواقع تبادل خارجية — تحتاج تسجيل دخول يدوي على الموقع
        </div>
        <div className="space-y-4">
          <div><label className="label-field">الموقع</label>
            <div className="space-y-2">
              {sites.map(s => (<label key={s.value} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors" style={{ background: site === s.value ? 'rgba(249,115,22,0.06)' : 'transparent', border: site === s.value ? '1px solid rgba(249,115,22,0.2)' : '1px solid transparent' }}>
                <input type="radio" name="site-auto" value={s.value} checked={site === s.value} onChange={() => setSite(s.value)} className="w-4 h-4" />
                <div><p className="font-medium text-sm text-secondary-900">{s.label}</p><p className="text-xs text-secondary-500">{s.desc}</p></div>
              </label>))}
            </div>
          </div>
          <div><label className="label-field">نوع التفاعل</label><select className="select-field" value={interactionType} onChange={e => setInteractionType(e.target.value)}><option value="like">إعجاب</option><option value="follow">متابعة</option><option value="comment">تعليق</option></select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">العدد: {count}</label><input type="range" min="10" max="500" value={count} onChange={e => setCount(parseInt(e.target.value))} className="w-full" /></div>
            <div><label className="label-field">الفاصل (ثانية): {delay}</label><input type="range" min="1" max="30" value={delay} onChange={e => setDelay(parseInt(e.target.value))} className="w-full" /></div>
          </div>
          <button onClick={handleRun} disabled={loading} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Zap size={18} /> بدء التشغيل</>}</button>
        </div>
      </div>
    </div>
  )

  const renderTools = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}><Settings size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">أدوات Auto Point الإضافية</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
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
      case 'get': return renderGet()
      case 'auto': return renderAuto()
      case 'tools': return renderTools()
      default: return renderGet()
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
              style={isActive ? { color: '#f97316', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(249,115,22,0.15), 0 4px 12px rgba(249,115,22,0.08)', fontWeight: 600 } : {}}>
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