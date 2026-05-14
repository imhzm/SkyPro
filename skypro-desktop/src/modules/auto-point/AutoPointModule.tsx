import { useState } from 'react'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import { Zap, Twitter, Instagram, AlertCircle, CheckCircle, Loader2, Settings, ExternalLink } from 'lucide-react'

type ActiveTool = 'get' | 'auto' | 'tools' | null

const ACCENT = '#f59e0b'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #f59e0b, #d97706)'

export default function AutoPointModule() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
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
        platform: activeTool === 'get' ? 'twitter' : 'instagram',
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

  const tools: Array<{
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: typeof Twitter
    accent: string
    accentGradient: string
    requiresSession: boolean
  }> = [
    { id: 'get', name: 'تبادل إعجابات تويتر', description: 'تبادل التفاعل عبر مواقع خارجية', icon: Twitter, accent: '#1da1f2', accentGradient: 'linear-gradient(135deg, #1da1f2, #0d8bd9)', requiresSession: false },
    { id: 'auto', name: 'تبادل تفاعل انستجرام', description: 'إعجابات ومتابعات انستجرام', icon: Instagram, accent: '#e4405f', accentGradient: 'linear-gradient(135deg, #e4405f, #c13584)', requiresSession: false },
    { id: 'tools', name: 'أدوات إضافية', description: 'أدوات مساعدة قادمة قريباً', icon: Settings, accent: '#64748b', accentGradient: 'linear-gradient(135deg, #64748b, #475569)', requiresSession: false },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  const renderExchangeBody = (radioName: string, interactionOptions: { value: string; label: string }[]) => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', color: '#b45309' }}>
        <AlertCircle size={16} className="inline ml-1" /> هذه الأداة تعمل عبر مواقع تبادل خارجية — تحتاج تسجيل دخول يدوي على الموقع
      </div>
      <div>
        <label className="label-field">الموقع</label>
        <div className="space-y-2">
          {sites.map(s => (
            <label
              key={s.value}
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors"
              style={{
                background: site === s.value ? 'rgba(245,158,11,0.06)' : 'transparent',
                border: site === s.value ? '1px solid rgba(245,158,11,0.2)' : '1px solid transparent',
              }}
            >
              <input type="radio" name={radioName} value={s.value} checked={site === s.value} onChange={() => setSite(s.value)} className="w-4 h-4" />
              <div><p className="font-medium text-sm text-secondary-900">{s.label}</p><p className="text-xs text-secondary-500">{s.desc}</p></div>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label-field">نوع التفاعل</label>
        <select className="select-field" value={interactionType} onChange={e => setInteractionType(e.target.value)}>
          {interactionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label-field">العدد: {count}</label><input type="range" min="10" max="500" value={count} onChange={e => setCount(parseInt(e.target.value))} className="w-full" /></div>
        <div><label className="label-field">الفاصل (ثانية): {delay}</label><input type="range" min="1" max="30" value={delay} onChange={e => setDelay(parseInt(e.target.value))} className="w-full" /></div>
      </div>
    </div>
  )

  const exchangeFooter = (
    <button
      onClick={handleRun}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Zap size={18} /> بدء التشغيل</>}
    </button>
  )

  const renderToolsBody = () => (
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
  )

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    get: {
      body: renderExchangeBody('site-get', [
        { value: 'like', label: 'إعجاب' },
        { value: 'follow', label: 'متابعة' },
        { value: 'retweet', label: 'ريتويت' },
      ]),
      footer: exchangeFooter,
    },
    auto: {
      body: renderExchangeBody('site-auto', [
        { value: 'like', label: 'إعجاب' },
        { value: 'follow', label: 'متابعة' },
        { value: 'comment', label: 'تعليق' },
      ]),
      footer: exchangeFooter,
    },
    tools: { body: renderToolsBody(), footer: null },
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      <ToolGrid
        title="أدوات Auto Point"
        subtitle="تبادل التفاعل عبر مواقع خارجية"
        icon={Zap}
        accent={ACCENT}
        cols={3}
      >
        {tools.map(tool => (
          <ToolCard
            key={tool.id}
            icon={tool.icon}
            name={tool.name}
            description={tool.description}
            accent={tool.accent}
            accentGradient={tool.accentGradient}
            onClick={() => setActiveTool(tool.id)}
          />
        ))}
      </ToolGrid>

      <ToolPanel
        open={activeTool !== null}
        onClose={() => setActiveTool(null)}
        title={currentTool?.name ?? ''}
        subtitle={currentTool?.description}
        icon={currentTool?.icon}
        accent={currentTool?.accent ?? ACCENT}
        accentGradient={currentTool?.accentGradient}
        width="lg"
        footer={activeTool ? panelMap[activeTool].footer : null}
      >
        {activeTool ? panelMap[activeTool].body : null}
      </ToolPanel>
    </div>
  )
}
