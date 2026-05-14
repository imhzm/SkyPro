import { useState, useEffect } from 'react'
import { Shield, Clock, AlertTriangle, CheckCircle, Lock, Fingerprint, Eye, Timer, Gauge, Save } from 'lucide-react'

interface AntiBanSettings {
  enabled: boolean
  randomDelays: boolean
  minDelay: number
  maxDelay: number
  maxActionsPerHour: number
  rotateUserAgent: boolean
  randomizeViewport: boolean
  useStealthMode: boolean
  maxRetries: number
}

const STORAGE_KEY = 'senderpro-security'

export default function AntiBanSystem() {
  const [settings, setSettings] = useState<AntiBanSettings>({
    enabled: true,
    randomDelays: true,
    minDelay: 2000,
    maxDelay: 8000,
    maxActionsPerHour: 50,
    rotateUserAgent: true,
    randomizeViewport: true,
    useStealthMode: true,
    maxRetries: 3,
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY)
      if (s) setSettings(JSON.parse(s))
    } catch { /* use defaults */ }
  }, [])

  const persist = (updated: AntiBanSettings) => {
    setSettings(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleToggle = (key: keyof AntiBanSettings) => {
    persist({ ...settings, [key]: !settings[key] })
  }

  const handleChange = (key: keyof AntiBanSettings, value: number) => {
    persist({ ...settings, [key]: value })
  }

  const features = [
    { key: 'enabled' as const, label: 'تفعيل الحماية', desc: 'تفعيل جميع ميزات الحماية من الحظر', icon: Shield, color: '#10b981' },
    { key: 'randomDelays' as const, label: 'التأخير العشوائي', desc: `تأخير عشوائي بين ${settings.minDelay.toLocaleString()}ms و ${settings.maxDelay.toLocaleString()}ms`, icon: Timer, color: '#0A6CF1' },
    { key: 'rotateUserAgent' as const, label: 'تدوير User-Agent', desc: 'تغيير User-Agent بين كل طلب', icon: Fingerprint, color: '#8B2CF5' },
    { key: 'randomizeViewport' as const, label: 'تغيير حجم الشاشة', desc: 'تغيير viewport بشكل عشوائي', icon: Eye, color: '#f59e0b' },
    { key: 'useStealthMode' as const, label: 'وضع التخفي', desc: 'إخفاء علامات الأتمتة والتشغيل الآلي', icon: Lock, color: '#ef4444' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-secondary-900">نظام الحماية من الحظر</h2>
            <p className="text-xs text-secondary-500">إعدادات الحماية والتجنب من الحظر</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <Save size={12} /> تم الحفظ
            </span>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: settings.enabled ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${settings.enabled ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            {settings.enabled ? <CheckCircle size={12} className="text-emerald-500" /> : <AlertTriangle size={12} className="text-red-500" />}
            <span className={`text-xs font-semibold ${settings.enabled ? 'text-emerald-600' : 'text-red-600'}`}>{settings.enabled ? 'مفعل' : 'معطل'}</span>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="card-gradient-border">
        <div className="space-y-1">
          {features.map((feature) => {
            const Icon = feature.icon
            const isActive = settings[feature.key] as boolean
            return (
              <div key={feature.key} className="flex items-center justify-between p-3.5 rounded-xl transition-all duration-200" style={{ background: isActive ? 'rgba(248,250,252,0.8)' : 'rgba(248,250,252,0.4)', border: `1px solid ${isActive ? 'rgba(226,232,240,0.6)' : 'rgba(226,232,240,0.3)'}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all" style={{ background: isActive ? `${feature.color}15` : 'rgba(226,232,240,0.5)' }}>
                    <Icon size={16} style={{ color: isActive ? feature.color : '#94a3b8' }} />
                  </div>
                  <div>
                    <span className={`text-sm font-medium ${isActive ? 'text-secondary-900' : 'text-secondary-500'}`}>{feature.label}</span>
                    <p className="text-[11px] text-secondary-400 mt-0.5">{feature.desc}</p>
                  </div>
                </div>
                <button type="button" className={`sw-toggle ${isActive ? 'active' : ''}`} onClick={() => handleToggle(feature.key)} aria-label={feature.label} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Numeric Settings */}
      {settings.enabled && (
        <div className="card-gradient-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(10,108,241,0.1), rgba(139,44,245,0.1))' }}>
              <Gauge size={16} style={{ color: '#0A6CF1' }} />
            </div>
            <h3 className="font-bold text-secondary-900 text-sm">إعدادات متقدمة</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field flex items-center gap-1.5"><Clock size={12} /> الحد الأدنى (ms)</label>
              <input type="number" className="input-field" value={settings.minDelay} onChange={(e) => handleChange('minDelay', parseInt(e.target.value) || 2000)} min={1000} max={30000} />
            </div>
            <div>
              <label className="label-field flex items-center gap-1.5"><Clock size={12} /> الحد الأقصى (ms)</label>
              <input type="number" className="input-field" value={settings.maxDelay} onChange={(e) => handleChange('maxDelay', parseInt(e.target.value) || 8000)} min={1000} max={60000} />
            </div>
            <div>
              <label className="label-field">إجراءات/ساعة</label>
              <input type="number" className="input-field" value={settings.maxActionsPerHour} onChange={(e) => handleChange('maxActionsPerHour', parseInt(e.target.value) || 50)} min={10} max={200} />
            </div>
            <div>
              <label className="label-field">عدد المحاولات</label>
              <input type="number" className="input-field" value={settings.maxRetries} onChange={(e) => handleChange('maxRetries', parseInt(e.target.value) || 3)} min={1} max={10} />
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800 text-sm">تنبيه</h4>
            <p className="text-xs text-amber-700 mt-1">هذه الإعدادات تساعد في تقليل خطر الحظر، لكنها لا تضمن الحماية 100%. استخدم بروكسيات ولا تبالغ في عدد الإجراءات.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
