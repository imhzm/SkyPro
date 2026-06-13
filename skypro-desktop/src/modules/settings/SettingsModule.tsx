import { useState, useEffect } from 'react'
import { Settings, RotateCcw, Info, CheckCircle, AlertCircle, Loader2, Globe, Monitor, Code, Cpu } from 'lucide-react'
import ModuleHeader from '../../components/common/ModuleHeader'

export default function SettingsModule() {
  const [version, setVersion] = useState('1.0.0')
  const [platform, setPlatform] = useState('')
  const [downloadPath, setDownloadPath] = useState('')
  const [language, setLanguage] = useState('ar')
  const [updateState, setUpdateState] = useState<{
    status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'up-to-date'
    version?: string
    percent?: number
    speed?: number
    error?: string
  }>({ status: 'idle' })
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

  useEffect(() => {
    const cleanup = window.electronAPI.onUpdateStatus((data: { status: string; version?: string; percent?: number; bytesPerSecond?: number; error?: string }) => {
      switch (data.status) {
        case 'available':
          setUpdateState({ status: 'available', version: data.version })
          break
        case 'downloading':
          setUpdateState(prev => ({ ...prev, status: 'downloading', percent: data.percent, speed: data.bytesPerSecond }))
          break
        case 'downloaded':
          setUpdateState(prev => ({ ...prev, status: 'downloaded' }))
          break
        case 'not-available':
          setUpdateState({ status: 'up-to-date', version: data.version })
          break
        case 'error':
          setUpdateState({ status: 'error', error: data.error })
          break
      }
    })
    return cleanup
  }, [])

  const handleCheckUpdate = async () => {
    setUpdateState({ status: 'checking' })
    const res = await window.electronAPI.checkForUpdates()
    if (!res.success) {
      setUpdateState({ status: 'error', error: (res as { error?: string; message?: string }).error || (res as { message?: string }).message })
    }
  }

  const handleDownloadUpdate = async () => {
    setUpdateState(prev => ({ ...prev, status: 'downloading', percent: 0 }))
    const res = await window.electronAPI.downloadUpdate()
    if (!res.success) {
      setUpdateState({ status: 'error', error: (res as { error?: string }).error })
    }
  }

  const handleInstallUpdate = async () => {
    await window.electronAPI.installUpdate()
  }

  const handleReset = async () => {
    if (!confirmReset) { setConfirmReset(true); return }
    setResetting(true)
    try {
      const tables = ['leads', 'accounts', 'campaigns', 'proxies', 'smtp_settings']
      for (const table of tables) {
        try {
          const countRes = await window.electronAPI.dbCount({ table, filters: [] })
          if ((countRes.count ?? 0) > 0) {
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
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-300' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      <ModuleHeader
        title="الإعدادات"
        subtitle="إدارة إعدادات التطبيق والتحديثات والنسخ الاحتياطي"
        icon={Settings}
        badge={{ label: `v${version}`, tone: 'neutral' }}
      />

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
              <div key={item.label} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
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
        {/* Update Section */}
        <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-secondary-900">التحديثات</p>
              <p className="text-xs text-secondary-500 mt-0.5">v{version}</p>
            </div>

            {updateState.status === 'idle' && (
              <button onClick={handleCheckUpdate} className="px-4 py-2 text-xs font-medium rounded-lg transition-colors" style={{ background: 'rgba(10,108,241,0.08)', color: '#0A6CF1', border: '1px solid rgba(10,108,241,0.2)' }}>
                التحقق من التحديثات
              </button>
            )}

            {updateState.status === 'checking' && (
              <div className="flex items-center gap-2 text-xs text-secondary-500">
                <Loader2 size={14} className="animate-spin" style={{ color: '#0A6CF1' }} />
                جارٍ التحقق...
              </div>
            )}

            {updateState.status === 'up-to-date' && (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#34d399' }}>
                  <CheckCircle size={14} className="inline ml-1" />
                  أحدث إصدار
                </span>
                <button onClick={handleCheckUpdate} className="px-3 py-1.5 text-xs text-secondary-500 hover:text-secondary-900 transition-colors">
                  إعادة التحقق
                </button>
              </div>
            )}

            {updateState.status === 'available' && (
              <button onClick={handleDownloadUpdate} className="px-4 py-2 text-xs font-medium rounded-lg transition-colors" style={{ background: 'rgba(16,185,129,0.08)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                تحميل v{updateState.version}
              </button>
            )}

            {updateState.status === 'downloaded' && (
              <button onClick={handleInstallUpdate} className="px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors" style={{ background: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)' }}>
                تثبيت وإعادة التشغيل
              </button>
            )}

            {updateState.status === 'error' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500">{updateState.error}</span>
                <button onClick={handleCheckUpdate} className="px-3 py-1.5 text-xs text-secondary-500 hover:text-secondary-900 transition-colors">
                  إعادة المحاولة
                </button>
              </div>
            )}
          </div>

          {/* Download Progress Bar */}
          {updateState.status === 'downloading' && (
            <div className="space-y-2">
              <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${updateState.percent || 0}%`, background: 'linear-gradient(90deg, #0A6CF1, #8B2CF5)' }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-secondary-500">
                <span>جارٍ التحميل... {Math.round(updateState.percent || 0)}%</span>
                {updateState.speed != null && updateState.speed > 0 && (
                  <span>{(updateState.speed / 1024 / 1024).toFixed(1)} MB/s</span>
                )}
              </div>
            </div>
          )}
        </div>
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
            <h3 className="font-bold text-red-300">إعادة تعيين</h3>
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
