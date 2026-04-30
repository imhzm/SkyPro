import { useState, useEffect } from 'react'
import { Settings, RotateCcw, Info, Download, CheckCircle, AlertCircle, Loader2, Globe } from 'lucide-react'

export default function SettingsModule() {
  const [version, setVersion] = useState('1.0.0')
  const [platform, setPlatform] = useState('')
  const [downloadPath, setDownloadPath] = useState('')
  const [language, setLanguage] = useState('ar')
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [updateMsg, setUpdateMsg] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    try {
      window.electronAPI.getAppVersion().then((res: any) => { if (res.success) setVersion(res.version) }).catch(() => {})
      setPlatform(window.electronAPI.getPlatform())
      setDownloadPath(localStorage.getItem('senderpro-download-path') || '')
      setLanguage(localStorage.getItem('senderpro-lang') || 'ar')
    } catch (err: any) { console.error('Failed to load settings:', err.message) }
  }, [])

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') } else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 5000)
  }

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true)
    setUpdateMsg('')
    try {
      const res = await window.electronAPI.checkForUpdates()
      if (res.success && res.updateAvailable) setUpdateMsg(`تحديث جديد متاح: ${res.version}`)
      else if (res.success && !res.updateAvailable) setUpdateMsg('لا يوجد تحديثات جديدة')
      else setUpdateMsg(res.error || 'فشل التحقق من التحديثات')
    } catch (err: any) { setUpdateMsg(err.message || 'فشل التحقق من التحديثات') }
    setCheckingUpdate(false)
  }

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    localStorage.clear()
    showMsg('تم إعادة تعيين الإعدادات - أعد تشغيل التطبيق')
    setConfirmReset(false)
  }

  const handleSavePath = () => {
    localStorage.setItem('senderpro-download-path', downloadPath)
    showMsg('تم حفظ المسار')
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><Info size={20} style={{ color: '#64748b' }} /> عن التطبيق</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl"><span className="text-secondary-600">الإصدار</span><span className="font-medium">{version}</span></div>
          <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl"><span className="text-secondary-600">النظام</span><span className="font-medium">{platform}</span></div>
          <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl"><span className="text-secondary-600">المطور</span><span className="font-medium">SkyPro</span></div>
          <button onClick={handleCheckUpdate} disabled={checkingUpdate} className="btn-primary w-full">{checkingUpdate ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> التحقق من التحديثات</>}</button>
        </div>
        {updateMsg && <div className="mt-3 p-3 rounded-lg text-sm" style={{ background: updateMsg.includes('جديد') ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)', color: updateMsg.includes('جديد') ? '#b45309' : '#16a34a' }}>{updateMsg}</div>}
      </div>
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><Settings size={20} style={{ color: '#64748b' }} /> الإعدادات العامة</h3>
        <div className="space-y-4">
          <div><label className="label-field">مجلد التحميل الافتراضي</label><div className="flex gap-2"><input type="text" className="input-field flex-1" placeholder="C:\Downloads" value={downloadPath} onChange={e => setDownloadPath(e.target.value)} /><button onClick={handleSavePath} className="btn-secondary">حفظ</button></div></div>
          <div><label className="label-field flex items-center gap-2"><Globe size={16} /> اللغة</label><select className="select-field" value={language} onChange={e => { setLanguage(e.target.value); localStorage.setItem('senderpro-lang', e.target.value) }}><option value="ar">العربية</option><option value="en">English</option></select></div>
        </div>
      </div>
      <div className="card" style={{ borderColor: confirmReset ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.3)' }}>
        <h3 className="font-bold text-danger-700 mb-4 flex items-center gap-2"><RotateCcw size={20} /> إعادة تعيين</h3>
        <p className="text-sm text-secondary-500 mb-4">سيحذف هذا كل البيانات المحلية والإعدادات{confirmReset ? ' — اضغط مرة أخرى للتأكيد' : ''}.</p>
        <button onClick={handleReset} className={`btn-danger ${confirmReset ? 'animate-pulse' : ''}`}>{confirmReset ? '⚠️ تأكيد حذف كل البيانات' : 'إعادة تعيين كل البيانات'}</button>
      </div>
    </div>
  )
}