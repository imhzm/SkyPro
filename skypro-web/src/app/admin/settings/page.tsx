'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save } from 'lucide-react'

const DEFAULT_SETTINGS: Record<string, string> = {
  trial_days: '2',
  max_devices: '1',
  max_resets_per_year: '2',
  key_price: '2000',
  key_currency: 'EGP',
  key_duration_days: '365',
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (data.success) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.data })
      }
    } catch {
      setSettings(DEFAULT_SETTINGS)
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'فشل حفظ الإعدادات')
      }
      setMessage('تم حفظ الإعدادات بنجاح')
    } catch {
      setMessage('فشل حفظ الإعدادات')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'trial_days', label: 'فترة التجربة (أيام)', type: 'number' },
    { key: 'max_devices', label: 'الحد الأقصى للأجهزة لكل مفتاح', type: 'number' },
    { key: 'max_resets_per_year', label: 'الحد الأقصى لإعادة التعيين (سنوياً)', type: 'number' },
    { key: 'key_price', label: 'سعر المفتاح', type: 'number' },
    { key: 'key_currency', label: 'العملة', type: 'text' },
    { key: 'key_duration_days', label: 'مدة المفتاح (أيام)', type: 'number' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">إعدادات النظام</h1>
        <button onClick={handleSave} disabled={saving} className="admin-btn-primary">
          <Save size={18} />
          {saving ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${message.includes('بنجاح') ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'}`}>
          {message}
        </div>
      )}

      <div className="admin-card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.key}>
              <label htmlFor={`setting-${field.key}`} className="admin-label">{field.label}</label>
              <input
                id={`setting-${field.key}`}
                type={field.type}
                value={settings[field.key] || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                className="admin-input"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}