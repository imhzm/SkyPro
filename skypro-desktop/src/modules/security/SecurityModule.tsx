import { useState, useEffect, useCallback } from 'react'
import { Shield, AlertTriangle, CheckCircle, Save, Loader2, AlertCircle, Lock, Fingerprint, Eye, Timer, Gauge } from 'lucide-react'
import ModuleHeader from '../../components/common/ModuleHeader'

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
    } catch { /* settings will use defaults */ }
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
    if (settings.minDelay >= settings.maxDelay) {
      showMsg('أقل تأخير يجب أن يكون أقل من أقصى تأخير', true)
      return
    }
    setLoading(true)
    try {
      const res = await window.electronAPI.saveSecuritySettings(settings)
      if (res.success) showMsg('تم حفظ الإعدادات')
      else showMsg(res.error || 'فشلت العملية', true)
    } catch { showMsg('فشلت العملية', true) }
    setLoading(false)
  }

  const features = [
    { key: 'enabled' as const, label: 'تفعيل الحماية', desc: 'تفعيل جميع ميزات الحماية من الحظر', icon: Shield, color: '#10b981' },
    { key: 'randomDelays' as const, label: 'التأخير العشوائي', desc: `تأخير عشوائي بين ${settings.minDelay.toLocaleString()}ms و ${settings.maxDelay.toLocaleString()}ms`, icon: Timer, color: '#0A6CF1' },
    { key: 'rotateUserAgent' as const, label: 'تدوير User-Agent', desc: 'تغيير User-Agent بين كل طلب', icon: Fingerprint, color: '#8B2CF5' },
    { key: 'randomizeViewport' as const, label: 'تغيير حجم الشاشة', desc: 'تغيير viewport بشكل عشوائي', icon: Eye, color: '#f59e0b' },
    { key: 'useStealthMode' as const, label: 'وضع التخفي', desc: 'إخفاء علامات الأتمتة والتشغيل الآلي', icon: Lock, color: '#ef4444' },
  ]

  return (
    <div className="space-y-6 max-w-3xl">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      <ModuleHeader
        title="الحماية والأمان"
        subtitle="إعدادات الحماية التلقائية من الحظر والكشف"
        icon={Shield}
        badge={{ label: settings.enabled ? 'مفعّل' : 'معطّل', tone: settings.enabled ? 'success' : 'danger' }}
      />

      {/* Feature Toggles */}
      <div className="card-gradient-border">
        <div className="space-y-1">
          {features.map((feature, i) => {
            const Icon = feature.icon
            const isActive = settings[feature.key] as boolean
            return (
              <div key={feature.key} className={`flex items-center justify-between p-4 rounded-xl transition-all duration-200 ${i < features.length - 1 ? 'mb-1' : ''}`} style={{ background: isActive ? 'rgba(248,250,252,0.8)' : 'rgba(248,250,252,0.4)', border: `1px solid ${isActive ? 'rgba(226,232,240,0.6)' : 'rgba(226,232,240,0.3)'}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200" style={{ background: isActive ? `${feature.color}15` : 'rgba(226,232,240,0.5)' }}>
                    <Icon size={18} style={{ color: isActive ? feature.color : '#94a3b8' }} />
                  </div>
                  <div>
                    <span className={`font-medium ${isActive ? 'text-secondary-900' : 'text-secondary-500'}`}>{feature.label}</span>
                    <p className="text-xs text-secondary-400 mt-0.5">{feature.desc}</p>
                  </div>
                </div>
                <button type="button" className={`sw-toggle ${isActive ? 'active' : ''}`} onClick={() => handleToggle(feature.key)} aria-label={feature.label} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Numeric Settings */}
      <div className="card-gradient-border">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)' }}>
            <Gauge size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900">إعدادات متقدمة</h3>
            <p className="text-xs text-secondary-500">ضبط أوقات التأخير والحدود</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div>
            <label className="label-field">أقل تأخير (ms)</label>
            <input type="number" className="input-field" value={settings.minDelay} onChange={e => { const v = parseInt(e.target.value) || 2000; if (v > 0) setSettings(prev => ({ ...prev, minDelay: v })) }} />
          </div>
          <div>
            <label className="label-field">أقصى تأخير (ms)</label>
            <input type="number" className="input-field" value={settings.maxDelay} onChange={e => { const v = parseInt(e.target.value) || 8000; if (v > 0) setSettings(prev => ({ ...prev, maxDelay: v })) }} />
          </div>
          <div>
            <label className="label-field">إجراءات/ساعة</label>
            <input type="number" className="input-field" value={settings.maxActionsPerHour} onChange={e => { const v = parseInt(e.target.value) || 50; if (v > 0) setSettings(prev => ({ ...prev, maxActionsPerHour: v })) }} />
          </div>
        </div>

        {/* Delay Visual Bar */}
        <div className="p-3 rounded-xl mb-5" style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.4)' }}>
          <div className="flex items-center justify-between text-xs text-secondary-500 mb-2">
            <span>{settings.minDelay.toLocaleString()}ms</span>
            <span className="font-medium text-secondary-700">نطاق التأخير</span>
            <span>{settings.maxDelay.toLocaleString()}ms</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${Math.min((settings.maxDelay / 15000) * 100, 100)}%` }} />
          </div>
        </div>

        <button onClick={handleSave} disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> حفظ الإعدادات</>}
        </button>
      </div>

      {/* Warning */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800 text-sm">تنبيه</h4>
            <p className="text-sm text-amber-700 mt-1">هذه الإعدادات تساعد في تقليل خطر الحظر، لكنها لا تضمن الحماية 100%. استخدم بروكسي للحماية الأفضل.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
