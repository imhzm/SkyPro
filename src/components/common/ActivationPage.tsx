import { useState } from 'react'
import { useAuthStore } from '../../stores/appStore'
import { activationApi } from '../../services/api/activation'
import { Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function ActivationPage() {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { setActivation, isAuthenticated } = useAuthStore()

  const handleActivate = async () => {
    if (!key.trim()) { setError('يرجى إدخال مفتاح التفعيل'); return }
    setLoading(true); setError(''); setSuccess('')
    const deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    try {
      const result = await activationApi.activateKey(key.trim(), deviceId)
      if (result.success && result.data) {
        setActivation({ key: result.data.key, status: result.data.status, expiryDate: result.data.expiryDate || '2027-04-23', deviceId: result.data.deviceId || deviceId })
        setSuccess('تم تفعيل الاشتراك بنجاح! جاري التحميل...')
        setTimeout(() => window.location.reload(), 1500)
      } else { setError(result.message || 'مفتاح التفعيل غير صالح') }
    } catch (err) {
      setError('فشل التحقق من مفتاح التفعيل')
    } finally { setLoading(false) }
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, #001A3A, #0A1628, #0D1137)' }}>
        <div className="card text-center max-w-md w-full" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(10,108,241,0.15)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.1)', boxShadow: '0 0 20px rgba(34,197,94,0.2)' }}>
            <CheckCircle size={32} style={{ color: '#22c55e' }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">الاشتراك مفعل</h2>
          <p className="text-white/50 mb-6">تم تفعيل الاشتراك بنجاح. يمكنك الآن استخدام جميع مميزات التطبيق.</p>
          <button onClick={() => window.location.reload()} className="btn-primary w-full">الذهاب للتطبيق</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, #001A3A, #0A1628, #0D1137)' }}>
      <div className="card max-w-md w-full" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(10,108,241,0.15)' }}>
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)', boxShadow: '0 4px 20px rgba(10, 108, 241, 0.3)' }}
          >
            <Key size={32} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">تفعيل الاشتراك</h2>
          <p className="text-white/50">أدخل مفتاح التفعيل لبدء استخدام التطبيق</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">مفتاح التفعيل</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl text-center font-mono text-lg tracking-wider"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(10,108,241,0.3)', color: '#EAF3FF' }}
              placeholder="SKY1-PRO2-XXXX-2026"
              value={key}
              onChange={(e) => { setKey(e.target.value.toUpperCase()); setError(''); setSuccess('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
              dir="ltr"
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}>
              <CheckCircle size={18} /> {success}
            </div>
          )}

          <button
            onClick={handleActivate}
            disabled={loading || !key.trim()}
            className="btn-primary w-full"
            style={!loading && key.trim() ? { boxShadow: '0 4px 20px rgba(10, 108, 241, 0.4), 0 0 30px rgba(139, 44, 245, 0.15)' } : {}}
          >
            {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'تفعيل الاشتراك'}
          </button>
        </div>

        <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-sm text-white/40">للحصول على مفتاح تفعيل، تواصل معنا</p>
          <p className="text-sm text-white/25 mt-1">السعر: 2,000 ج.م / سنة</p>
        </div>
      </div>
    </div>
  )
}