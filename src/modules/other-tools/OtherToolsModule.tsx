import { useState } from 'react'
import { Download, FileText, Hash, Shield, Calendar, Settings, AlertCircle, CheckCircle, Loader2, Star, Wand2, Contact, Sparkles, Trash2 } from 'lucide-react'
import ProxyManager from '../../components/common/ProxyManager'
import CampaignScheduler from '../../components/common/CampaignScheduler'
import AntiBanSystem from '../../components/common/AntiBanSystem'

type ToolTab = 'proxy' | 'scheduler' | 'antiban' | 'download' | 'text-editor' | 'text-as-vcf' | 'generate' | 'hashtags'

export default function OtherToolsModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('proxy')
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
      if (res.success) { setHashtagsResult(res.data || []); showMsg('تم التوليد') }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleConvertVcf = () => {
    if (!vcfData.trim()) { showMsg('أدخل البيانات أولاً', true); return }
    const lines = vcfData.split('\n').filter(l => l.trim())
    let vcf = ''
    lines.forEach((line, idx) => {
      const parts = line.split(',').map(p => p.trim())
      const name = parts[0] || `Contact ${idx + 1}`
      const phone = parts[1] || ''
      const email = parts[2] || ''
      vcf += `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\n`
      if (phone) vcf += `TEL;TYPE=${vcfType.toUpperCase()}:${phone}\n`
      if (email) vcf += `EMAIL:${email}\n`
      vcf += `END:VCARD\n`
    })
    const blob = new Blob([vcf], { type: 'text/vcard' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'contacts.vcf'
    a.click()
    URL.revokeObjectURL(url)
    showMsg('تم تحويل وتحميل ملف VCF')
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

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'proxy', label: 'بروكسي', icon: Settings },
    { id: 'scheduler', label: 'جدولة', icon: Calendar },
    { id: 'antiban', label: 'حماية', icon: Shield },
    { id: 'download', label: 'تحميل', icon: Download },
    { id: 'hashtags', label: 'هاشتاج', icon: Hash },
    { id: 'text-editor', label: 'محرر نصوص', icon: FileText },
    { id: 'text-as-vcf', label: 'تحويل VCF', icon: Contact },
    { id: 'generate', label: 'توليد', icon: Sparkles },
  ]

  const disabledTools = [
    { id: 'haraj-rate', name: 'تقييم حراج', desc: 'تقييمات حراج آلي', icon: Star },
    { id: 'magic-editor', name: 'محرر سحري', desc: 'تحرير متقدم للملفات', icon: Wand2 },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'proxy': return <ProxyManager />
      case 'scheduler': return <CampaignScheduler />
      case 'antiban': return <AntiBanSystem />
      case 'download': return (
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Download size={20} style={{ color: '#8b5cf6' }} /> تحميل الفيديوهات</h3>
          <div className="space-y-4">
            <div><label className="label-field">رابط الفيديو</label><input type="url" className="input-field" placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} /></div>
            <div><label className="label-field">مسار الحفظ (اختياري)</label><input type="text" className="input-field" placeholder="C:\Downloads" value={savePath} onChange={e => setSavePath(e.target.value)} /></div>
            <button onClick={handleDownload} disabled={loading || !videoUrl.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء التحميل</>}</button>
          </div>
        </div>
      )
      case 'hashtags': return (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Hash size={20} style={{ color: '#8b5cf6' }} /> توليد الهاشتاجات</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="label-field">المنصة</label><select className="select-field" value={hashtagPlatform} onChange={e => setHashtagPlatform(e.target.value)}><option value="instagram">إنستجرام</option><option value="twitter">تويتر</option><option value="tiktok">تيك توك</option><option value="youtube">يوتيوب</option></select></div>
                <div><label className="label-field">الكلمة المفتاحية</label><input type="text" className="input-field" placeholder="marketing" value={hashtagKeyword} onChange={e => setHashtagKeyword(e.target.value)} /></div>
              </div>
              <button onClick={handleHashtags} disabled={loading || !hashtagKeyword.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Hash size={18} /> توليد</>}</button>
            </div>
          </div>
          {hashtagsResult.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-2"><h4 className="font-bold">النتائج ({hashtagsResult.length})</h4><div className="flex gap-2"><button onClick={() => { try { navigator.clipboard.writeText(hashtagsResult.join(' ')); showMsg('تم نسخ الهاشتاجات') } catch { showMsg('فشل النسخ', true) } }} className="btn-secondary text-sm">نسخ الكل</button><button onClick={() => setHashtagsResult([])} className="btn-danger text-sm"><Trash2 size={14} /> مسح</button></div></div>
              <div className="flex flex-wrap gap-2">
                {hashtagsResult.map((h, i) => <span key={i} className="badge badge-primary">{h}</span>)}
              </div>
            </div>
          )}
        </div>
      )
      case 'text-editor': return (
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><FileText size={20} style={{ color: '#8b5cf6' }} /> محرر النصوص</h3>
          <div className="space-y-4">
            <div><label className="label-field">النص</label><textarea className="textarea-field" rows={10} value={editorText} onChange={e => setEditorText(e.target.value)} placeholder="ألصق النص هنا..." /></div>
            <div className="grid grid-cols-2 gap-4">
<div><label className="label-field">عدد التقسيم</label><input type="number" className="input-field" placeholder="100" value={splitCount} onChange={e => setSplitCount(parseInt(e.target.value) || 100)} min={10} max={1000} /></div>
               <div><label className="label-field">تعديل من سطر</label><input type="number" className="input-field" placeholder="1" value={splitStartLine} onChange={e => setSplitStartLine(parseInt(e.target.value) || 1)} min={1} /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
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
               }} className="btn-primary text-sm" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>تقسيم إلى ملفات</button>
              <button onClick={() => setEditorText(editorText.split('\n').reverse().join('\n'))} className="btn-secondary text-sm">عكس النص</button>
              <button onClick={() => { try { navigator.clipboard.writeText(editorText); showMsg('تم النسخ') } catch { showMsg('فشل النسخ', true) } }} className="btn-secondary text-sm">نسخ</button>
            </div>
          </div>
        </div>
      )
      case 'text-as-vcf': return (
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Contact size={20} style={{ color: '#8b5cf6' }} /> تحويل لجهات اتصال (VCF)</h3>
          <div className="space-y-4">
            <div><label className="label-field">نوع الرقم</label><select className="select-field" value={vcfType} onChange={e => setVcfType(e.target.value)}><option value="mobile">موبايل</option><option value="work">عمل</option></select></div>
            <div><label className="label-field">البيانات (الاسم, الرقم, الإيميل — سطر لكل جهة)</label><textarea className="textarea-field" rows={8} placeholder="Ahmed,+2010...,ahmed@email.com&#10;Sara,+2011...,sara@email.com" value={vcfData} onChange={e => setVcfData(e.target.value)} /></div>
            <button onClick={handleConvertVcf} disabled={!vcfData.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>تحويل وتحميل VCF</button>
          </div>
        </div>
      )
      case 'generate': return (
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Sparkles size={20} style={{ color: '#8b5cf6' }} /> توليد أسماء مستخدمين</h3>
          <div className="space-y-4">
            <div><label className="label-field">البادئة</label><input type="text" className="input-field" placeholder="user" value={generatePrefix} onChange={e => setGeneratePrefix(e.target.value)} /></div>
            <div><label className="label-field">العدد: {generateCount}</label><input type="range" min="10" max="1000" value={generateCount} onChange={e => setGenerateCount(parseInt(e.target.value))} className="w-full" /></div>
            <div className="flex gap-2">
              <button onClick={handleGenerateUsernames} className="btn-primary text-sm" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}><Sparkles size={16} /> توليد</button>
              <button onClick={handleSaveGenerated} disabled={!generatedResults.length} className="btn-secondary text-sm">حفظ TXT</button>
              <button onClick={() => { setGeneratedResults([]); showMsg('تم الحذف') }} className="btn-secondary text-sm">مسح</button>
            </div>
            {generatedResults.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto bg-secondary-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2"><span className="text-sm font-bold text-secondary-700">{generatedResults.length} نتيجة</span></div>
                <div className="space-y-1">{generatedResults.slice(0, 100).map((item, i) => <div key={i} className="text-sm text-secondary-800 font-mono">{item}</div>)}
                  {generatedResults.length > 100 && <div className="text-sm text-secondary-500 text-center mt-2">... و {generatedResults.length - 100} أخرى</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )
      default: return <ProxyManager />
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
              style={isActive ? { color: '#8b5cf6', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(139,92,246,0.15), 0 4px 12px rgba(139,92,246,0.08)', fontWeight: 600 } : {}}>
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
      {renderContent()}
      <div className="grid grid-cols-2 gap-4">
        {disabledTools.map(tool => (
          <div key={tool.id} className="tool-card text-center relative opacity-60 cursor-not-allowed">
            <span className="absolute top-1 left-1 text-[9px] bg-secondary-200 text-secondary-600 px-1.5 py-0.5 rounded font-medium">قريباً</span>
            <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center bg-secondary-100"><tool.icon size={20} className="text-secondary-400" /></div>
            <h4 className="font-bold text-secondary-900 text-xs mt-2">{tool.name}</h4>
            <p className="text-[10px] text-secondary-500">{tool.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}