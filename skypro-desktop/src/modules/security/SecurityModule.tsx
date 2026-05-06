import { useState, useEffect, useCallback } from 'react'
import { Shield, AlertTriangle, CheckCircle, Save, Loader2, AlertCircle } from 'lucide-react'

const DEFAULT_SETTINGS = {
  enabled: true,
  randomDelays: true,
  minDelay: 2000,
  maxDelay: 8000,
  maxActionsPerHour: 50,
  rotateUserAgent: true,
  randomizeViewport: true,
  useStealthMode: true,
  maxRetries: 3,
}

export default function SecurityModule() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadSettings = useCallback(async () => {
    try {
      const res = await window.electronAPI.getSecuritySettings()
      if (res.success && res.data) {
        const d = res.data
        setSettings({
          enabled: !!d.enabled,
          randomDelays: !!d.randomDelays,
          minDelay: d.minDelay || 2000,
          maxDelay: d.maxDelay || 8000,
          maxActionsPerHour: d.maxActionsPerHour || 50,
          rotateUserAgent: !!d.rotateUserAgent,
          randomizeViewport: !!d.randomizeViewport,
          useStealthMode: !!d.useStealthMode,
          maxRetries: d.maxRetries || 3,
        })
      }
    } catch (err: any) { console.error('Failed to load security settings:', err.message) }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') } else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 5000)
  }

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.saveSecuritySettings(settings)
      if (res.success) showMsg('تم حفظ الإعدادات')
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const features = [
    { key: 'enabled' as const, label: 'تفعيل الحماية', desc: 'تفعيل جميع ميزات الحماية من الحظر' },
    { key: 'randomDelays' as const, label: 'التأخير العشوائي', desc: `تأخير عشوائي بين ${settings.minDelay.toLocaleString()}ms و ${settings.maxDelay.toLocaleString()}ms` },
    { key: 'rotateUserAgent' as const, label: 'تدوير User-Agent', desc: 'تغيير User-Agent بين كل طلب' },
    { key: 'randomizeViewport' as const, label: 'تغيير حجم الشاشة', desc: 'تغيير viewport بشكل عشوائي' },
    { key: 'useStealthMode' as const, label: 'وضع التخفي', desc: 'إخفاء علامات الأتمتة والتشغيل الآلي' },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-secondary-900">الحماية والأمان</h3>
              <p className="text-sm text-secondary-500">إعدادات الحماية من الحظر</p>
            </div>
          </div>
          <span className={`badge ${settings.enabled ? 'badge-success' : 'badge-danger'}`}>{settings.enabled ? 'مفعّل' : 'معطّل'}</span>
        </div>
        <div className="space-y-3">
          {features.map((feature) => (
            <div key={feature.key} className="flex items-center justify-between p-4 rounded-xl bg-secondary-50 border border-secondary-100">
              <div>
                <span className="font-medium text-secondary-900">{feature.label}</span>
                <p className="text-sm text-secondary-500">{feature.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={settings[feature.key] as boolean} onChange={() => handleToggle(feature.key)} className="sr-only peer" />
                <div className="w-9 h-5 bg-secondary-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-secondary-100">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div><label className="label-field">أقل تأخير (ms)</label><input type="number" className="input-field" value={settings.minDelay || 2000} onChange={e => { const v = parseInt(e.target.value) || 2000; if (v > 0) setSettings(prev => ({ ...prev, minDelay: v })) }} /></div>
            <div><label className="label-field">أقصى تأخير (ms)</label><input type="number" className="input-field" value={settings.maxDelay || 8000} onChange={e => { const v = parseInt(e.target.value) || 8000; if (v > 0) setSettings(prev => ({ ...prev, maxDelay: v })) }} /></div>
            <div><label className="label-field">إجراءات/ساعة</label><input type="number" className="input-field" value={settings.maxActionsPerHour || 50} onChange={e => { const v = parseInt(e.target.value) || 50; if (v > 0) setSettings(prev => ({ ...prev, maxActionsPerHour: v })) }} /></div>
          </div>
          <button onClick={handleSave} disabled={loading} className="btn-primary w-full">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> حفظ الإعدادات</>}</button>
        </div>
      </div>
      <div className="card" style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.2)' }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800">تنبيه</h4>
            <p className="text-sm text-amber-700">هذه الإعدادات تساعد في تقليل خطر الحظر، لكنها لا تضمن الحماية 100%. استخدم بروكسي للحماية الأفضل.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
