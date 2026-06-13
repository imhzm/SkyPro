import { useState, useEffect, useCallback } from 'react'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import { Settings, PenTool, Send, Save, AlertCircle, CheckCircle, Loader2, Trash2, Eye, EyeOff, Mail } from 'lucide-react'

type ActiveTool = 'smtp' | 'compose' | 'send' | null

const ACCENT = '#6366F1'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #6366F1, #4f46e5)'

export default function SendEmailsModule() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [smtp, setSmtp] = useState({ email: '', password: '', host: 'smtp.gmail.com', port: 587, ssl: 'yes' })
  const [compose, setCompose] = useState({ company: '', subject: '', body: '', html: '' })
  const [recipients, setRecipients] = useState('')
  const [timer, setTimer] = useState(10)
  const [smtpList, setSmtpList] = useState<any[]>([])
  const [selectedSmtpId, setSelectedSmtpId] = useState<number | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') } else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 5000)
  }

  const loadSmtpList = useCallback(async () => {
    try {
      const res = await window.electronAPI.getSmtpSettings()
      if (res.success && res.data) {
        setSmtpList((res.data as any[]) || [])
        setSelectedSmtpId(prev => prev || (((res.data as any[]) || []).length > 0 ? (res.data as any[])[0].id : null))
      }
    } catch (err: any) { console.error('Failed to load SMTP:', err.message) }
  }, [])

  useEffect(() => { loadSmtpList() }, [loadSmtpList])

  const handleSaveSMTP = async () => {
    if (!smtp.email || !smtp.password || !smtp.host) { showMsg('أدخل كل بيانات SMTP', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.dbInsert({
        table: 'smtp_settings',
        data: { email: smtp.email, password: smtp.password, host: smtp.host, port: smtp.port, ssl: smtp.ssl }
      })
      if (res.success) {
        showMsg('تم حفظ الإعدادات')
        await loadSmtpList()
        setSmtp({ email: '', password: '', host: 'smtp.gmail.com', port: 587, ssl: 'yes' })
      }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleDeleteSMTP = async (id: number) => {
    try {
      await window.electronAPI.deleteSmtpSetting({ id })
      await loadSmtpList()
      showMsg('تم حذف الحساب')
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
  }

  const handleSend = async () => {
    const toList = recipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (!compose.subject || !compose.body || toList.length === 0) { showMsg('أدخل كل البيانات', true); return }
    if (!selectedSmtpId) { showMsg('اختر حساب SMTP أولاً', true); return }
    const selectedSmtp = smtpList.find(s => s.id === selectedSmtpId)
    if (!selectedSmtp) { showMsg('حساب SMTP غير موجود', true); return }
    setLoading(true)
    let sent = 0
    let failed = 0
    try {
      for (const to of toList) {
        try {
          const res = await window.electronAPI.sendSmtpEmail({
            smtp: { email: selectedSmtp.email, password: selectedSmtp.password, host: selectedSmtp.host, port: selectedSmtp.port, ssl: selectedSmtp.ssl },
            to, subject: compose.company ? `[${compose.company}] ${compose.subject}` : compose.subject, body: compose.html || compose.body.replace(/\n/g, '<br/>')
          })
          if (res.success) sent++
          else failed++
        } catch (err: any) { console.error(`Failed to send to ${to}:`, err.message); failed++ }
        // Live progress — the showMsg timer refreshes so the counter updates in place.
        showMsg(`جاري الإرسال المباشر... ${sent + failed}/${toList.length} — نجح ${sent}، فشل ${failed}`)
        if (timer > 0 && toList.length > 1) await new Promise(r => setTimeout(r, timer * 1000))
      }
      showMsg(`تم إرسال ${sent} بنجاح، فشل ${failed} من ${toList.length}`)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const tools: Array<{
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: typeof Settings
    accent: string
    accentGradient: string
    requiresSession: boolean
  }> = [
    { id: 'smtp', name: 'إعدادات SMTP', description: 'إضافة وإدارة حسابات SMTP', icon: Settings, accent: '#6366F1', accentGradient: 'linear-gradient(135deg, #6366F1, #4f46e5)', requiresSession: false },
    { id: 'compose', name: 'كتابة الرسالة', description: 'إنشاء محتوى الرسالة والقالب', icon: PenTool, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: false },
    { id: 'send', name: 'إرسال الرسائل', description: 'إرسال الرسائل لقائمة المستلمين', icon: Send, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: false },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  // ----- Tool panel bodies -----
  const renderSmtpBody = () => (
    <div className="space-y-5">
      <div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label-field">الإيميل</label><input type="email" className="input-field" placeholder="smtp@example.com" value={smtp.email} onChange={e => setSmtp({ ...smtp, email: e.target.value })} /></div>
          <div><label className="label-field">كلمة المرور (App Password)</label><div className="relative"><input type={showPassword ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" value={smtp.password} onChange={e => setSmtp({ ...smtp, password: e.target.value })} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div><label className="label-field">HOST</label><input type="text" className="input-field" placeholder="smtp.gmail.com" value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} /></div>
          <div><label className="label-field">PORT</label><input type="number" className="input-field" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: parseInt(e.target.value) })} /></div>
          <div><label className="label-field">SSL</label><select className="select-field" value={smtp.ssl} onChange={e => setSmtp({ ...smtp, ssl: e.target.value })}><option value="yes">TLS/SSL</option><option value="no">بدون</option></select></div>
        </div>
      </div>

      {smtpList.length > 0 && (
        <div className="mt-5 rounded-xl border border-secondary-200 bg-white/60 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
            <h4 className="font-bold text-secondary-900 text-sm">حسابات SMTP المحفوظة ({smtpList.length})</h4>
          </div>
          <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>#</th><th>الإيميل</th><th>HOST</th><th>PORT</th><th>SSL</th><th></th></tr></thead>
              <tbody>{smtpList.map((s, i) => (<tr key={s.id}><td className="text-secondary-500">{i + 1}</td><td className="font-medium text-sm">{s.email}</td><td className="text-sm">{s.host}</td><td className="text-sm">{s.port}</td><td><span className={`badge ${s.ssl === 'yes' ? 'badge-success' : 'badge-warning'}`}>{s.ssl === 'yes' ? 'TLS' : 'بدون'}</span></td><td><button onClick={() => handleDeleteSMTP(s.id)} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const smtpFooter = (
    <button
      onClick={handleSaveSMTP}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> حفظ الإعدادات</>}
    </button>
  )

  const renderComposeBody = () => (
    <div className="space-y-5">
      <div><label className="label-field">اسم الشركة</label><input type="text" className="input-field" placeholder="اسم شركتك..." value={compose.company} onChange={e => setCompose({ ...compose, company: e.target.value })} /></div>
      <div><label className="label-field">عنوان الرسالة</label><input type="text" className="input-field" placeholder="عنوان الرسالة..." value={compose.subject} onChange={e => setCompose({ ...compose, subject: e.target.value })} /></div>
      <div><label className="label-field">المحتوى النصي</label><textarea className="textarea-field" rows={6} value={compose.body} onChange={e => setCompose({ ...compose, body: e.target.value })} placeholder="اكتب محتوى الرسالة هنا..." /></div>
      <div><label className="label-field">قالب HTML (اختياري - يتجاوز النص)</label><textarea className="textarea-field" rows={4} value={compose.html} onChange={e => setCompose({ ...compose, html: e.target.value })} placeholder="<html>...</html>" /></div>
    </div>
  )

  const composeFooter = (
    <button
      onClick={() => { showMsg('تم حفظ محتوى الرسالة. انتقل إلى تبويب الإرسال.'); setActiveTool(null) }}
      className="btn-primary w-full"
      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
    >
      <CheckCircle size={18} /> حفظ المحتوى
    </button>
  )

  const renderSendBody = () => (
    <div className="space-y-5">
      {smtpList.length === 0 && (
        <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          <AlertCircle size={16} className="inline ml-1" /> يرجى إضافة حساب SMTP أولاً من أداة SMTP
        </div>
      )}
      <div>
        <label className="label-field">حساب SMTP المرسل</label>
        <select className="select-field" value={selectedSmtpId || ''} onChange={e => setSelectedSmtpId(parseInt(e.target.value))}>
          <option value="">-- اختر حساب SMTP --</option>
          {smtpList.map(s => <option key={s.id} value={s.id}>{s.email} ({s.host})</option>)}
        </select>
      </div>
      <div><label className="label-field">قائمة المستلمين (سطر لكل إيميل)</label><textarea className="textarea-field" rows={6} value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="email1@example.com&#10;email2@example.com" /></div>
      <div><label className="label-field">الفاصل الزمني: {timer} ثانية</label><input type="range" min="1" max="60" value={timer} onChange={e => setTimer(parseInt(e.target.value))} className="w-full" /></div>
    </div>
  )

  const sendFooter = (
    <button
      onClick={handleSend}
      disabled={loading || smtpList.length === 0 || !selectedSmtpId}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال الرسائل ({recipients.split('\n').filter(s => s.trim()).length} مستلم)</>}
    </button>
  )

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    smtp: { body: renderSmtpBody(), footer: smtpFooter },
    compose: { body: renderComposeBody(), footer: composeFooter },
    send: { body: renderSendBody(), footer: sendFooter },
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-300' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      <ToolGrid
        title="أدوات Send Emails"
        subtitle="إعداد SMTP، كتابة الرسائل، وإرسالها"
        icon={Mail}
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
