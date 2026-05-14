import { useState } from 'react'
import { Download, FileText, Hash, Shield, Calendar, Settings, AlertCircle, CheckCircle, Loader2, Star, Wand2, Contact, Sparkles, Trash2, Wrench } from 'lucide-react'
import ProxyManager from '../../components/common/ProxyManager'
import CampaignScheduler from '../../components/common/CampaignScheduler'
import AntiBanSystem from '../../components/common/AntiBanSystem'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'

type ActiveTool = 'proxy' | 'scheduler' | 'antiban' | 'download' | 'text-editor' | 'text-as-vcf' | 'generate' | 'hashtags' | null

const ACCENT = '#8b5cf6'

export default function OtherToolsModule() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [videoUrl, setVideoUrl] = useState('')
  const [savePath, setSavePath] = useState('')
  const [editorText, setEditorText] = useState('')
  const [hashtagKeyword, setHashtagKeyword] = useState('')
  const [hashtagPlatform, setHashtagPlatform] = useState('instagram')
  const [hashtagsResult, setHashtagsResult] = useState<string[]>([])
  const [vcfType, setVcfType] = useState('mobile')
  const [vcfData, setVcfData] = useState('')
  const [generatePrefix, setGeneratePrefix] = useState('')
  const [generateCount, setGenerateCount] = useState(100)
  const [splitCount, setSplitCount] = useState(100)
  const [splitStartLine, setSplitStartLine] = useState(1)
  const [generatedResults, setGeneratedResults] = useState<string[]>([])

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') } else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 5000)
  }

  const handleDownload = async () => {
    if (!videoUrl) { showMsg('أدخل رابط الفيديو', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.videoDownload({ url: videoUrl, saveDir: savePath })
      if (res.success) showMsg(`تم التحميل: ${res.path}`)
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleHashtags = async () => {
    if (!hashtagKeyword) { showMsg('أدخل الكلمة المفتاحية', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.generateHashtags({ keyword: hashtagKeyword, platform: hashtagPlatform })
      if (res.success) { setHashtagsResult((res.data as any[]) || []); showMsg('تم التوليد') }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleConvertVcf = () => {
    if (!vcfData.trim()) { showMsg('أدخل البيانات أولاً', true); return }
    const lines = vcfData.split('\n').filter(l => l.trim())
    if (lines.length === 0) return

    const CHUNK_SIZE = 500
    const chunks = []
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      chunks.push(lines.slice(i, i + CHUNK_SIZE))
    }

    chunks.forEach((chunk, index) => {
      let vcf = ''
      for (const line of chunk) {
        const parts = line.split(',')
        const name = parts[0]?.trim() || 'Unknown'
        const phone = parts[1]?.trim() || ''
        const email = parts[2]?.trim() || ''
        vcf += `BEGIN:VCARD\nVERSION:3.0\nFN;CHARSET=UTF-8:${name}\n`
        if (phone) vcf += `TEL;TYPE=${vcfType.toUpperCase()}:${phone}\n`
        if (email) vcf += `EMAIL:${email}\n`
        vcf += `END:VCARD\n`
      }
      const blob = new Blob(['﻿' + vcf], { type: 'text/vcard;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = chunks.length > 1 ? `contacts_part${index + 1}.vcf` : 'contacts.vcf'
      a.click()
      URL.revokeObjectURL(url)
    })
    showMsg(`تم تحويل وتحميل ${chunks.length} ملف VCF`)
    setVcfData('')
  }

  const handleGenerateUsernames = () => {
    const prefix = generatePrefix.trim() || 'user'
    const count = Math.min(generateCount || 100, 1000)
    const list: string[] = []
    for (let i = 0; i < count; i++) {
      const random = Math.random().toString(36).substring(2, 8)
      list.push(`${prefix}_${random}`)
    }
    setGeneratedResults(list)
    showMsg(`تم توليد ${list.length} اسم`)
  }

  const handleSaveGenerated = () => {
    if (!generatedResults.length) { showMsg('لا يوجد بيانات لحفظها', true); return }
    const blob = new Blob([generatedResults.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'generated-usernames.txt'
    a.click()
    URL.revokeObjectURL(url)
    showMsg('تم حفظ الملف')
  }

  const handleSplitText = () => {
    const lines = editorText.split('\n').slice(splitStartLine - 1)
    const chunks: string[] = []
    for (let i = 0; i < lines.length; i += splitCount) chunks.push(lines.slice(i, i + splitCount).join('\n'))
    chunks.forEach((chunk, idx) => {
      const blob = new Blob([chunk], { type: 'text/plain' })
      const a = document.createElement('a')
      const url = URL.createObjectURL(blob)
      a.href = url
      a.download = `part-${idx + 1}.txt`
      a.click()
      URL.revokeObjectURL(url)
    })
    if (chunks.length > 0) showMsg(`تم تقسيم الملف إلى ${chunks.length} ملف`)
  }

  const tools: Array<{
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: typeof Settings
    accent: string
    accentGradient: string
    width: 'sm' | 'md' | 'lg' | 'xl'
  }> = [
    { id: 'proxy', name: 'إدارة البروكسي', description: 'إضافة وفحص البروكسيات', icon: Settings, accent: '#0A6CF1', accentGradient: 'linear-gradient(135deg, #0A6CF1, #1d4ed8)', width: 'xl' },
    { id: 'scheduler', name: 'جدولة الحملات', description: 'تشغيل الحملات في أوقات محددة', icon: Calendar, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', width: 'xl' },
    { id: 'antiban', name: 'حماية الحسابات', description: 'إعدادات منع الحظر والأمان', icon: Shield, accent: '#ef4444', accentGradient: 'linear-gradient(135deg, #ef4444, #b91c1c)', width: 'xl' },
    { id: 'download', name: 'تحميل الفيديوهات', description: 'تنزيل فيديوهات من المنصات', icon: Download, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', width: 'md' },
    { id: 'hashtags', name: 'توليد هاشتاجات', description: 'هاشتاجات احترافية لكل منصة', icon: Hash, accent: '#ec4899', accentGradient: 'linear-gradient(135deg, #ec4899, #be185d)', width: 'lg' },
    { id: 'text-editor', name: 'محرر النصوص', description: 'تقسيم وعكس ونسخ النصوص', icon: FileText, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', width: 'lg' },
    { id: 'text-as-vcf', name: 'تحويل لـ VCF', description: 'تحويل قوائم لجهات اتصال', icon: Contact, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', width: 'md' },
    { id: 'generate', name: 'توليد أسماء', description: 'توليد أسماء مستخدمين عشوائية', icon: Sparkles, accent: '#a855f7', accentGradient: 'linear-gradient(135deg, #a855f7, #7e22ce)', width: 'md' },
  ]

  const disabledTools = [
    { id: 'haraj-rate', name: 'تقييم حراج', desc: 'تقييمات حراج آلي', icon: Star },
    { id: 'magic-editor', name: 'محرر سحري', desc: 'تحرير متقدم للملفات', icon: Wand2 },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  // Tool panel bodies
  const renderProxyBody = () => <ProxyManager />
  const renderSchedulerBody = () => <CampaignScheduler />
  const renderAntibanBody = () => <AntiBanSystem />

  const renderDownloadBody = () => (
    <div className="space-y-4">
      <div>
        <label className="label-field">رابط الفيديو</label>
        <input type="url" className="input-field" placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
      </div>
      <div>
        <label className="label-field">مسار الحفظ (اختياري)</label>
        <input type="text" className="input-field" placeholder="C:\Downloads" value={savePath} onChange={e => setSavePath(e.target.value)} />
      </div>
    </div>
  )
  const downloadFooter = (
    <button onClick={handleDownload} disabled={loading || !videoUrl.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء التحميل</>}
    </button>
  )

  const renderHashtagsBody = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-field">المنصة</label>
          <select className="select-field" value={hashtagPlatform} onChange={e => setHashtagPlatform(e.target.value)}>
            <option value="instagram">إنستجرام</option>
            <option value="twitter">تويتر</option>
            <option value="tiktok">تيك توك</option>
            <option value="youtube">يوتيوب</option>
          </select>
        </div>
        <div>
          <label className="label-field">الكلمة المفتاحية</label>
          <input type="text" className="input-field" placeholder="marketing" value={hashtagKeyword} onChange={e => setHashtagKeyword(e.target.value)} />
        </div>
      </div>
      {hashtagsResult.length > 0 && (
        <div className="rounded-xl border border-secondary-200 bg-white/60 p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h4 className="font-bold text-sm text-secondary-900">النتائج ({hashtagsResult.length})</h4>
            <div className="flex gap-2">
              <button onClick={() => { try { navigator.clipboard.writeText(hashtagsResult.join(' ')); showMsg('تم نسخ الهاشتاجات') } catch { showMsg('فشل النسخ', true) } }} className="btn-secondary text-xs">نسخ الكل</button>
              <button onClick={() => setHashtagsResult([])} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {hashtagsResult.map((h, i) => <span key={i} className="badge badge-primary">{h}</span>)}
          </div>
        </div>
      )}
    </div>
  )
  const hashtagsFooter = (
    <button onClick={handleHashtags} disabled={loading || !hashtagKeyword.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Hash size={18} /> توليد</>}
    </button>
  )

  const renderTextEditorBody = () => (
    <div className="space-y-4">
      <div>
        <label className="label-field">النص</label>
        <textarea className="textarea-field" rows={10} value={editorText} onChange={e => setEditorText(e.target.value)} placeholder="ألصق النص هنا..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-field">عدد التقسيم</label>
          <input type="number" className="input-field" placeholder="100" value={splitCount} onChange={e => setSplitCount(parseInt(e.target.value) || 100)} min={10} max={1000} />
        </div>
        <div>
          <label className="label-field">تعديل من سطر</label>
          <input type="number" className="input-field" placeholder="1" value={splitStartLine} onChange={e => setSplitStartLine(parseInt(e.target.value) || 1)} min={1} />
        </div>
      </div>
    </div>
  )
  const textEditorFooter = (
    <div className="flex gap-2">
      <button onClick={handleSplitText} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>تقسيم إلى ملفات</button>
      <button onClick={() => setEditorText(editorText.split('\n').reverse().join('\n'))} className="btn-secondary">عكس النص</button>
      <button onClick={() => { try { navigator.clipboard.writeText(editorText); showMsg('تم النسخ') } catch { showMsg('فشل النسخ', true) } }} className="btn-secondary">نسخ</button>
    </div>
  )

  const renderVcfBody = () => (
    <div className="space-y-4">
      <div>
        <label className="label-field">نوع الرقم</label>
        <select className="select-field" value={vcfType} onChange={e => setVcfType(e.target.value)}>
          <option value="mobile">موبايل</option>
          <option value="work">عمل</option>
        </select>
      </div>
      <div>
        <label className="label-field">البيانات (الاسم, الرقم, الإيميل — سطر لكل جهة)</label>
        <textarea className="textarea-field" rows={10} placeholder="Ahmed,+2010...,ahmed@email.com&#10;Sara,+2011...,sara@email.com" value={vcfData} onChange={e => setVcfData(e.target.value)} />
      </div>
    </div>
  )
  const vcfFooter = (
    <button onClick={handleConvertVcf} disabled={!vcfData.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
      تحويل وتحميل VCF
    </button>
  )

  const renderGenerateBody = () => (
    <div className="space-y-4">
      <div>
        <label className="label-field">البادئة</label>
        <input type="text" className="input-field" placeholder="user" value={generatePrefix} onChange={e => setGeneratePrefix(e.target.value)} />
      </div>
      <div>
        <label className="label-field">العدد: {generateCount}</label>
        <input type="range" min="10" max="1000" value={generateCount} onChange={e => setGenerateCount(parseInt(e.target.value))} className="w-full accent-purple-600" />
      </div>
      {generatedResults.length > 0 && (
        <div className="mt-2 max-h-64 overflow-y-auto bg-secondary-50 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-secondary-700">{generatedResults.length} نتيجة</span>
          </div>
          <div className="space-y-1">
            {generatedResults.slice(0, 100).map((item, i) => <div key={i} className="text-sm text-secondary-800 font-mono">{item}</div>)}
            {generatedResults.length > 100 && <div className="text-sm text-secondary-500 text-center mt-2">... و {generatedResults.length - 100} أخرى</div>}
          </div>
        </div>
      )}
    </div>
  )
  const generateFooter = (
    <div className="flex gap-2">
      <button onClick={handleGenerateUsernames} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}>
        <Sparkles size={16} /> توليد
      </button>
      <button onClick={handleSaveGenerated} disabled={!generatedResults.length} className="btn-secondary">حفظ TXT</button>
      <button onClick={() => { setGeneratedResults([]); showMsg('تم الحذف') }} className="btn-secondary">مسح</button>
    </div>
  )

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode | null }> = {
    proxy: { body: renderProxyBody(), footer: null },
    scheduler: { body: renderSchedulerBody(), footer: null },
    antiban: { body: renderAntibanBody(), footer: null },
    download: { body: renderDownloadBody(), footer: downloadFooter },
    hashtags: { body: renderHashtagsBody(), footer: hashtagsFooter },
    'text-editor': { body: renderTextEditorBody(), footer: textEditorFooter },
    'text-as-vcf': { body: renderVcfBody(), footer: vcfFooter },
    generate: { body: renderGenerateBody(), footer: generateFooter },
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
        title="أدوات مساعدة"
        subtitle="مجموعة أدوات مساعدة لتعزيز حملاتك التسويقية"
        icon={Wrench}
        accent={ACCENT}
        cols={4}
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
        {disabledTools.map(tool => (
          <ToolCard
            key={tool.id}
            icon={tool.icon}
            name={tool.name}
            description={tool.desc}
            badge="قريباً"
            badgeTone="warning"
            disabled
            onClick={() => {}}
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
        width={currentTool?.width ?? 'lg'}
        footer={activeTool ? panelMap[activeTool].footer : null}
      >
        {activeTool ? panelMap[activeTool].body : null}
      </ToolPanel>
    </div>
  )
}
