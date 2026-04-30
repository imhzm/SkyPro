import { useState, useEffect, useCallback } from 'react'
import { Settings, PenTool, Send, Save, AlertCircle, CheckCircle, Loader2, Trash2, Eye, EyeOff } from 'lucide-react'

type ToolTab = 'smtp' | 'compose' | 'send'

export default function SendEmailsModule() {
  const [activeTab, setActiveTab] = useState<ToolTab>('smtp')
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
        setSmtpList(res.data || [])
        setSelectedSmtpId(prev => prev || (res.data.length > 0 ? res.data[0].id : null))
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
        if (timer > 0 && toList.length > 1) await new Promise(r => setTimeout(r, timer * 1000))
      }
      showMsg(`تم إرسال ${sent} بنجاح، فشل ${failed} من ${toList.length}`)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const tabs: { id: ToolTab; label: string; icon: any }[] = [
    { id: 'smtp', label: 'SMTP', icon: Settings },
    { id: 'compose', label: 'كتابة', icon: PenTool },
    { id: 'send', label: 'إرسال', icon: Send },
  ]

  const renderSmtp = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Settings size={20} style={{ color: '#ea4335' }} /> إعدادات SMTP</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">الإيميل</label><input type="email" className="input-field" placeholder="smtp@example.com" value={smtp.email} onChange={e => setSmtp({ ...smtp, email: e.target.value })} /></div>
            <div><label className="label-field">كلمة المرور (App Password)</label><div className="relative"><input type={showPassword ? 'text' : 'password'} className="input-field pr-10" placeholder="••••••••" value={smtp.password} onChange={e => setSmtp({ ...smtp, password: e.target.value })} /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label-field">HOST</label><input type="text" className="input-field" placeholder="smtp.gmail.com" value={smtp.host} onChange={e => setSmtp({ ...smtp, host: e.target.value })} /></div>
            <div><label className="label-field">PORT</label><input type="number" className="input-field" value={smtp.port} onChange={e => setSmtp({ ...smtp, port: parseInt(e.target.value) })} /></div>
            <div><label className="label-field">SSL</label><select className="select-field" value={smtp.ssl} onChange={e => setSmtp({ ...smtp, ssl: e.target.value })}><option value="yes">TLS/SSL</option><option value="no">بدون</option></select></div>
          </div>
          <button onClick={handleSaveSMTP} disabled={loading} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ea4335, #dd4b39)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> حفظ الإعدادات</>}</button>
        </div>
      </div>
      {smtpList.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4">حسابات SMTP المحفوظة ({smtpList.length})</h3>
          <div className="table-container"><table className="data-table"><thead><tr><th>#</th><th>الإيميل</th><th>HOST</th><th>PORT</th><th>SSL</th><th></th></tr></thead>
            <tbody>{smtpList.map((s, i) => (<tr key={s.id}><td className="text-secondary-500">{i + 1}</td><td className="font-medium text-sm">{s.email}</td><td className="text-sm">{s.host}</td><td className="text-sm">{s.port}</td><td><span className={`badge ${s.ssl === 'yes' ? 'badge-success' : 'badge-warning'}`}>{s.ssl === 'yes' ? 'TLS' : 'بدون'}</span></td><td><button onClick={() => handleDeleteSMTP(s.id)} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td></tr>))}</tbody>
          </table></div>
        </div>
      )}
    </div>
  )

  const renderCompose = () => (
    <div className="card">
      <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><PenTool size={20} style={{ color: '#ea4335' }} /> كتابة الرسالة</h3>
      <div className="space-y-4">
        <div><label className="label-field">اسم الشركة</label><input type="text" className="input-field" placeholder="اسم شركتك..." value={compose.company} onChange={e => setCompose({ ...compose, company: e.target.value })} /></div>
        <div><label className="label-field">عنوان الرسالة</label><input type="text" className="input-field" placeholder="عنوان الرسالة..." value={compose.subject} onChange={e => setCompose({ ...compose, subject: e.target.value })} /></div>
        <div><label className="label-field">المحتوى النصي</label><textarea className="textarea-field" rows={6} value={compose.body} onChange={e => setCompose({ ...compose, body: e.target.value })} placeholder="اكتب محتوى الرسالة هنا..." /></div>
        <div><label className="label-field">قالب HTML (اختياري - يتجاوز النص)</label><textarea className="textarea-field" rows={4} value={compose.html} onChange={e => setCompose({ ...compose, html: e.target.value })} placeholder="<html>...</html>" /></div>
      </div>
    </div>
  )

  const renderSend = () => (
    <div className="card">
      <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Send size={20} style={{ color: '#ea4335' }} /> إرسال الرسائل</h3>
      <div className="space-y-4">
        {smtpList.length === 0 && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}><AlertCircle size={16} className="inline ml-1" /> يرجى إضافة حساب SMTP أولاً من تبويب SMTP</div>}
        <div><label className="label-field">حساب SMTP المرسل</label><select className="select-field" value={selectedSmtpId || ''} onChange={e => setSelectedSmtpId(parseInt(e.target.value))}>
          <option value="">-- اختر حساب SMTP --</option>
          {smtpList.map(s => <option key={s.id} value={s.id}>{s.email} ({s.host})</option>)}
        </select></div>
        <div><label className="label-field">قائمة المستلمين (سطر لكل إيميل)</label><textarea className="textarea-field" rows={6} value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="email1@example.com&#10;email2@example.com" /></div>
        <div><label className="label-field">الفاصل الزمني: {timer} ثانية</label><input type="range" min="1" max="60" value={timer} onChange={e => setTimer(parseInt(e.target.value))} className="w-full" /></div>
        <button onClick={handleSend} disabled={loading || smtpList.length === 0 || !selectedSmtpId} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ea4335, #dd4b39)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال الرسائل ({recipients.split('\n').filter(s => s.trim()).length} مستلم)</>}</button>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'smtp': return renderSmtp()
      case 'compose': return renderCompose()
      case 'send': return renderSend()
      default: return renderSmtp()
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
              style={isActive ? { color: '#ea4335', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 4px rgba(234,67,53,0.15), 0 4px 12px rgba(234,67,53,0.08)', fontWeight: 600 } : {}}>
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