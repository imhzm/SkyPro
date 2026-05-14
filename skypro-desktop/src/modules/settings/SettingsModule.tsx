import { useState, useEffect } from 'react'
import { Settings, RotateCcw, Info, Download, CheckCircle, AlertCircle, Loader2, Globe, Monitor, Code, Cpu } from 'lucide-react'

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
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    try {
      window.electronAPI.getAppVersion().then((res: { success: boolean; version?: string }) => { if (res.success && res.version) setVersion(res.version) }).catch(() => {})
      setPlatform(window.electronAPI.getPlatform())
      setDownloadPath(localStorage.getItem('senderpro-download-path') || '')
      setLanguage(localStorage.getItem('senderpro-lang') || 'ar')
    } catch { /* settings will use defaults */ }
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
      if (res.success && (res as { updateAvailable?: boolean }).updateAvailable) setUpdateMsg(`تحديث جديد متاح: ${(res as { version?: string }).version}`)
      else if (res.success) setUpdateMsg('لا يوجد تحديثات جديدة — أنت على آخر إصدار')
      else setUpdateMsg((res as { error?: string }).error || 'فشل التحقق من التحديثات')
    } catch { setUpdateMsg('فشل التحقق من التحديثات — تحقق من الاتصال بالإنترنت') }
    setCheckingUpdate(false)
  }

  const handleReset = async () => {
    if (!confirmReset) { setConfirmReset(true); return }
    setResetting(true)
    try {
      const tables = ['leads', 'accounts', 'campaigns', 'proxies', 'smtp_settings']
      for (const table of tables) {
        try {
          const countRes = await window.electronAPI.dbCount({ table, filters: [] })
          if (countRes.count > 0) {
            const queryRes = await window.electronAPI.dbQuery({ table, filters: [], limit: 1000 })
            const rows = (queryRes.data as { id: number }[]) || []
            for (const row of rows) {
              await window.electronAPI.dbDelete({ table, id: row.id })
            }
          }
        } catch { /* table may not exist, skip */ }
      }
      localStorage.clear()
      showMsg('تم مسح جميع البيانات بنجاح. يرجى إعادة التشغيل لتطبيق التغييرات.')
    } catch {
      showMsg('حدث خطأ أثناء مسح البيانات', true)
    }
    setResetting(false)
    setConfirmReset(false)
  }

  const handleSavePath = () => {
    localStorage.setItem('senderpro-download-path', downloadPath)
    showMsg('تم حفظ المسار')
  }

  const systemInfo = [
    { label: 'الإصدار', value: version, icon: Code, color: '#0A6CF1' },
    { label: 'النظام', value: platform, icon: Monitor, color: '#8B2CF5' },
    { label: 'المطور', value: 'SkyPro', icon: Cpu, color: '#10b981' },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      {/* About Section */}
      <div className="card-gradient-border">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)' }}>
            <Info size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900">عن التطبيق</h3>
            <p className="text-xs text-secondary-500">معلومات النظام والإصدار</p>
          </div>
        </div>
        <div className="space-y-2.5 mb-4">
          {systemInfo.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.4)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15` }}>
                    <Icon size={14} style={{ color: item.color }} />
                  </div>
                  <span className="text-sm text-secondary-600">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-secondary-900">{item.value}</span>
              </div>
            )
          })}
        </div>
        <button onClick={handleCheckUpdate} disabled={checkingUpdate} className="btn-primary w-full">
          {checkingUpdate ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> التحقق من التحديثات</>}
        </button>
        {updateMsg && (
          <div className="mt-3 p-3 rounded-xl text-sm font-medium" style={{ background: updateMsg.includes('جديد') ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)', color: updateMsg.includes('جديد') ? '#b45309' : '#16a34a', border: `1px solid ${updateMsg.includes('جديد') ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}` }}>
            {updateMsg}
          </div>
        )}
      </div>

      {/* General Settings */}
      <div className="card-gradient-border">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900">الإعدادات العامة</h3>
            <p className="text-xs text-secondary-500">تخصيص سلوك التطبيق</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label-field">مجلد التحميل الافتراضي</label>
            <div className="flex gap-2">
              <input type="text" className="input-field flex-1" placeholder="C:\Downloads" dir="ltr" value={downloadPath} onChange={e => setDownloadPath(e.target.value)} />
              <button onClick={handleSavePath} className="btn-secondary">حفظ</button>
            </div>
          </div>
          <div>
            <label className="label-field flex items-center gap-2"><Globe size={14} /> اللغة</label>
            <select className="select-field" value={language} onChange={e => { setLanguage(e.target.value); localStorage.setItem('senderpro-lang', e.target.value) }}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl p-5" style={{ background: confirmReset ? 'rgba(239,68,68,0.06)' : 'rgba(239,68,68,0.03)', border: `1px solid ${confirmReset ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.15)'}`, transition: 'all 0.3s ease' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
            <RotateCcw size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-red-700">إعادة تعيين</h3>
            <p className="text-xs text-red-500">حذف جميع البيانات المحلية والإعدادات{confirmReset ? ' — اضغط مرة أخرى للتأكيد' : ''}</p>
          </div>
        </div>
        <button onClick={handleReset} disabled={resetting} className={`btn-danger w-full ${confirmReset ? 'animate-pulse' : ''}`}>
          {resetting ? <Loader2 size={18} className="animate-spin" /> : confirmReset ? '⚠️ تأكيد حذف كل البيانات' : 'إعادة تعيين كل البيانات'}
        </button>
      </div>
    </div>
  )
}
