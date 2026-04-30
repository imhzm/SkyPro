import { useState, useEffect } from 'react'
import { Shield, Settings, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setSettings(JSON.parse(saved))
    } catch (err: any) { console.error('Failed to load anti-ban settings:', err.message) }
  }, [])

  const handleToggle = (key: keyof AntiBanSettings) => {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const handleChange = (key: keyof AntiBanSettings, value: number) => {
    const updated = { ...settings, [key]: value }
    setSettings(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-secondary-900">نظام الحماية من الحظر</h2>
          <p className="text-sm text-secondary-500">إعدادات الحماية والتجنب من الحظر</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${settings.enabled ? 'badge-success' : 'badge-danger'}`}>
            {settings.enabled ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
            {settings.enabled ? 'مفعل' : 'معطل'}
          </span>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield size={24} className="text-primary-500" />
            <div>
              <h3 className="font-bold text-secondary-900">تفعيل الحماية</h3>
              <p className="text-sm text-secondary-500">تفعيل جميع ميزات الحماية</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={() => handleToggle('enabled')}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
          </label>
        </div>
      </div>

      {settings.enabled && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-primary-500" />
                التأخير العشوائي
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-secondary-700">تفعيل التأخير العشوائي</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.randomDelays}
                      onChange={() => handleToggle('randomDelays')}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-secondary-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                {settings.randomDelays && (
                  <>
                    <div>
                      <label className="label-field">الحد الأدنى (ملي ثانية)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={settings.minDelay}
                        onChange={(e) => handleChange('minDelay', parseInt(e.target.value))}
                        min={1000}
                        max={30000}
                      />
                    </div>
                    <div>
                      <label className="label-field">الحد الأقصى (ملي ثانية)</label>
                      <input
                        type="number"
                        className="input-field"
                        value={settings.maxDelay}
                        onChange={(e) => handleChange('maxDelay', parseInt(e.target.value))}
                        min={1000}
                        max={60000}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2">
                <Settings size={18} className="text-primary-500" />
                إعدادات عامة
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="label-field">الحد الأقصى للإجراءات/ساعة</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.maxActionsPerHour}
                    onChange={(e) => handleChange('maxActionsPerHour', parseInt(e.target.value))}
                    min={10}
                    max={200}
                  />
                </div>
                <div>
                  <label className="label-field">عدد المحاولات</label>
                  <input
                    type="number"
                    className="input-field"
                    value={settings.maxRetries}
                    onChange={(e) => handleChange('maxRetries', parseInt(e.target.value))}
                    min={1}
                    max={10}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-bold text-secondary-900 mb-4">ميزات الحماية المتقدمة</h3>
            
            <div className="space-y-3">
              {[
                { key: 'rotateUserAgent', label: 'تدويل User-Agent', desc: 'تغيير User-Agent بين كل طلب' },
                { key: 'randomizeViewport', label: 'تغيير حجم الشاشة', desc: 'تغيير viewport بشكل عشوائي' },
                { key: 'useStealthMode', label: 'وضع التخفي', desc: 'إخفاء علامات الأتمتة' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary-50">
                  <div>
                    <span className="font-medium text-secondary-900">{feature.label}</span>
                    <p className="text-sm text-secondary-500">{feature.desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings[feature.key as keyof AntiBanSettings] as boolean}
                      onChange={() => handleToggle(feature.key as keyof AntiBanSettings)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-secondary-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="card bg-warning-50 border-warning-200">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-warning-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-warning-800">تنبيه</h4>
                <p className="text-sm text-warning-700">
                  هذه الإعدادات تساعد في تقليل خطر الحظر، لكنها لا تضمن الحماية 100%. 
                  استخدم بروكسيات ولا تبالغ في عدد الإجراءات.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
