import { useState, useEffect, useCallback } from 'react'
import {
  Shield, AlertTriangle, CheckCircle, Save, Loader2, AlertCircle, Lock,
  Fingerprint, Eye, Timer, Gauge, Zap, Snail, Rocket, Settings,
} from 'lucide-react'
import ModuleHeader from '../../components/common/ModuleHeader'

interface SecuritySettings {
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

const DEFAULT_SETTINGS: SecuritySettings = {
  enabled: true, randomDelays: true,
  minDelay: 2000, maxDelay: 8000, maxActionsPerHour: 50,
  rotateUserAgent: true, randomizeViewport: true, useStealthMode: true, maxRetries: 3,
}

// Security presets — quick start configurations.
const PRESETS: Array<{
  key: 'conservative' | 'balanced' | 'aggressive' | 'custom'
  label: string
  desc: string
  icon: typeof Snail
  color: string
  settings: Partial<SecuritySettings>
}> = [
  {
    key: 'conservative',
    label: 'محافظ — أقصى أمان',
    desc: 'حركة بطيئة جداً، حدود منخفضة، كل الحمايات مفعلة',
    icon: Snail,
    color: '#10b981',
    settings: { enabled: true, randomDelays: true, minDelay: 5000, maxDelay: 15000, maxActionsPerHour: 20, rotateUserAgent: true, randomizeViewport: true, useStealthMode: true, maxRetries: 5 },
  },
  {
    key: 'balanced',
    label: 'متوازن — موصى به',
    desc: 'توازن بين السرعة والأمان للحسابات الاعتيادية',
    icon: Shield,
    color: '#0A6CF1',
    settings: { enabled: true, randomDelays: true, minDelay: 2000, maxDelay: 8000, maxActionsPerHour: 50, rotateUserAgent: true, randomizeViewport: true, useStealthMode: true, maxRetries: 3 },
  },
  {
    key: 'aggressive',
    label: 'سريع — حسابات قديمة فقط',
    desc: 'سرعة عالية، استخدمه على حسابات قديمة موثوقة فقط',
    icon: Rocket,
    color: '#f59e0b',
    settings: { enabled: true, randomDelays: true, minDelay: 800, maxDelay: 3000, maxActionsPerHour: 100, rotateUserAgent: true, randomizeViewport: false, useStealthMode: true, maxRetries: 2 },
  },
]

function presetMatches(settings: SecuritySettings, preset: typeof PRESETS[number]) {
  const s = preset.settings
  return (
    settings.enabled === s.enabled &&
    settings.randomDelays === s.randomDelays &&
    settings.minDelay === s.minDelay &&
    settings.maxDelay === s.maxDelay &&
    settings.maxActionsPerHour === s.maxActionsPerHour &&
    settings.rotateUserAgent === s.rotateUserAgent &&
    settings.randomizeViewport === s.randomizeViewport &&
    settings.useStealthMode === s.useStealthMode &&
    settings.maxRetries === s.maxRetries
  )
}

export default function SecurityModule() {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadSettings = useCallback(async () => {
    try {
      const res = await window.electronAPI.getSecuritySettings()
      if (res.success && res.data) {
        const d = res.data as Partial<SecuritySettings>
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

  const handleToggle = (key: keyof SecuritySettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleApplyPreset = (preset: typeof PRESETS[number]) => {
    setSettings((prev) => ({ ...prev, ...preset.settings } as SecuritySettings))
    showMsg(`تم تطبيق إعداد "${preset.label}" — اضغط حفظ للتأكيد`)
  }

  const handleSave = async () => {
    if (settings.minDelay >= settings.maxDelay) {
      showMsg('أقل تأخير يجب أن يكون أقل من أقصى تأخير', true)
      return
    }
    setLoading(true)
    try {
      const res = await window.electronAPI.saveSecuritySettings(settings)
      if (res.success) showMsg('تم حفظ الإعدادات ✓')
      else showMsg(res.error || 'فشلت العملية', true)
    } catch { showMsg('فشلت العملية', true) }
    setLoading(false)
  }

  const features = [
    { key: 'enabled' as const, label: 'تفعيل الحماية', desc: 'تفعيل جميع ميزات الحماية من الحظر', icon: Shield, color: '#10b981' },
    { key: 'randomDelays' as const, label: 'التأخير العشوائي', desc: `تأخير عشوائي بين ${settings.minDelay.toLocaleString('en')}ms و ${settings.maxDelay.toLocaleString('en')}ms`, icon: Timer, color: '#0A6CF1' },
    { key: 'rotateUserAgent' as const, label: 'تدوير User-Agent', desc: 'تغيير بصمة المتصفح بين كل طلب', icon: Fingerprint, color: '#8B2CF5' },
    { key: 'randomizeViewport' as const, label: 'تغيير حجم الشاشة', desc: 'تغيير viewport بشكل عشوائي', icon: Eye, color: '#f59e0b' },
    { key: 'useStealthMode' as const, label: 'وضع التخفي (Stealth)', desc: 'إخفاء علامات الأتمتة الكاشفة', icon: Lock, color: '#ef4444' },
  ]

  // Find which preset (if any) currently matches
  const activePreset = PRESETS.find((p) => presetMatches(settings, p))

  return (
    <div className="space-y-5 max-w-4xl">
      {(message || error) && (
        <div
          className={`flex items-center gap-3 p-3.5 rounded-xl text-sm font-medium ${message ? 'text-emerald-300' : 'text-red-600'}`}
          style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      <ModuleHeader
        title="الحماية والأمان"
        subtitle="نظام شامل لمنع الحظر والكشف عبر كل المنصات"
        icon={Shield}
        badge={{ label: settings.enabled ? 'مفعّل' : 'معطّل', tone: settings.enabled ? 'success' : 'danger' }}
      />

      {/* ============= PRESETS ============= */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #10b981, #0A6CF1)' }}>
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-sm">إعدادات جاهزة</h3>
            <p className="text-xs text-secondary-500">اختر التهيئة المناسبة لنشاطك — يمكنك تعديلها لاحقاً</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESETS.map((preset) => {
            const Icon = preset.icon
            const active = activePreset?.key === preset.key
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-4 rounded-xl text-right transition-all duration-200 hover:-translate-y-0.5 ${
                  active ? 'shadow-md' : 'hover:shadow-md'
                }`}
                style={{
                  background: active ? `${preset.color}10` : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${active ? preset.color : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ background: `${preset.color}20` }}
                  >
                    <Icon size={18} style={{ color: preset.color }} />
                  </div>
                  {active && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: preset.color }}
                    >
                      ● نشط
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-sm" style={{ color: active ? preset.color : 'var(--color-secondary-900)' }}>{preset.label}</h4>
                <p className="text-[11px] text-secondary-500 mt-0.5 leading-relaxed">{preset.desc}</p>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-secondary-600 font-mono">
                  <span>{preset.settings.minDelay}-{preset.settings.maxDelay}ms</span>
                  <span>·</span>
                  <span>{preset.settings.maxActionsPerHour}/h</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ============= FEATURE TOGGLES ============= */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #8B2CF5, #FF4FD8)' }}>
            <Settings size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-sm">مفاتيح الحماية</h3>
            <p className="text-xs text-secondary-500">تحكم في كل ميزة على حدة</p>
          </div>
        </div>
        <div className="space-y-2">
          {features.map((feature) => {
            const Icon = feature.icon
            const isActive = settings[feature.key] as boolean
            return (
              <div
                key={feature.key}
                className="flex items-center justify-between p-3.5 rounded-xl transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0"
                    style={{ background: isActive ? `${feature.color}15` : 'rgba(255,255,255,0.08)' }}
                  >
                    <Icon size={17} style={{ color: isActive ? feature.color : '#94a3b8' }} />
                  </div>
                  <div className="min-w-0">
                    <span className={`font-medium text-sm ${isActive ? 'text-secondary-900' : 'text-secondary-500'}`}>{feature.label}</span>
                    <p className="text-[11px] text-secondary-500 mt-0.5">{feature.desc}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className={`sw-toggle ${isActive ? 'active' : ''} flex-shrink-0`}
                  onClick={() => handleToggle(feature.key)}
                  aria-label={feature.label}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* ============= ADVANCED NUMERIC SETTINGS ============= */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--panel-bg)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)' }}>
            <Gauge size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-sm">القيم المتقدمة</h3>
            <p className="text-xs text-secondary-500">ضبط دقيق لأوقات التأخير والحدود</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="label-field">أقل تأخير (ms)</label>
            <input
              type="number"
              className="input-field"
              value={settings.minDelay}
              min={100}
              max={60000}
              onChange={(e) => { const v = parseInt(e.target.value) || 2000; setSettings((prev) => ({ ...prev, minDelay: v })) }}
            />
            <p className="text-[10px] text-secondary-500 mt-1">الحد الأدنى للفاصل الزمني بين العمليات</p>
          </div>
          <div>
            <label className="label-field">أقصى تأخير (ms)</label>
            <input
              type="number"
              className="input-field"
              value={settings.maxDelay}
              min={500}
              max={120000}
              onChange={(e) => { const v = parseInt(e.target.value) || 8000; setSettings((prev) => ({ ...prev, maxDelay: v })) }}
            />
            <p className="text-[10px] text-secondary-500 mt-1">الحد الأقصى — الفاصل الفعلي عشوائي بين الحدين</p>
          </div>
          <div>
            <label className="label-field">إجراءات/ساعة</label>
            <input
              type="number"
              className="input-field"
              value={settings.maxActionsPerHour}
              min={5}
              max={500}
              onChange={(e) => { const v = parseInt(e.target.value) || 50; setSettings((prev) => ({ ...prev, maxActionsPerHour: v })) }}
            />
            <p className="text-[10px] text-secondary-500 mt-1">السقف الأعلى للحماية من التشغيل المكثف</p>
          </div>
        </div>

        {/* Delay range visualization */}
        <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-between text-xs text-secondary-500 mb-2">
            <span className="font-mono">{settings.minDelay.toLocaleString('en')}ms</span>
            <span className="font-bold text-secondary-700">نطاق التأخير الفعلي</span>
            <span className="font-mono">{settings.maxDelay.toLocaleString('en')}ms</span>
          </div>
          <div className="relative h-2 rounded-full bg-secondary-100 overflow-hidden">
            <div
              className="absolute h-full rounded-full"
              style={{
                left: `${Math.min((settings.minDelay / 30000) * 100, 100)}%`,
                right: `${Math.max(100 - (settings.maxDelay / 30000) * 100, 0)}%`,
                background: 'linear-gradient(90deg, #10b981, #0A6CF1, #8B2CF5)',
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-secondary-400 mt-1">
            <span>0ms</span>
            <span>15s</span>
            <span>30s</span>
          </div>
        </div>

        <button onClick={handleSave} disabled={loading} className="btn-primary w-full text-sm">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> حفظ الإعدادات</>}
        </button>
      </div>

      {/* ============= WARNING ============= */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-300 text-sm">تنبيه مهم</h4>
            <p className="text-sm text-amber-300 mt-1 leading-relaxed">
              هذه الإعدادات تقلل احتمال الحظر بشكل كبير لكن لا تضمنه 100%.
              <strong> لأقصى حماية:</strong> استخدم بروكسي مخصص لكل حساب + لا تتجاوز الحد الأقصى للإجراءات في الساعة.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
