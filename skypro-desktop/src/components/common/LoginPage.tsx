import { useEffect, useState } from 'react'
import { Mail, Lock, Key, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import logoSrc from '../../assets/logo.png'
import { useAuthStore } from '../../stores/appStore'
import { activationApi } from '../../services/api/activation'
import AppTitleBar from '../layout/AppTitleBar'

interface RememberedLogin {
  email: string
  password?: string
  serial: string
  remember: boolean
}

const emptyRememberedLogin: RememberedLogin = { email: '', serial: '', remember: false }

export default function LoginPage() {
  const [email, setEmail] = useState(emptyRememberedLogin.email)
  const [password, setPassword] = useState('')
  const [serial, setSerial] = useState(emptyRememberedLogin.serial)
  const [rememberDetails, setRememberDetails] = useState(emptyRememberedLogin.remember)
  const [rememberLoaded, setRememberLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { setActivation, setLoginUser, setToken } = useAuthStore()

  useEffect(() => {
    let cancelled = false

    window.electronAPI.getRememberedLogin()
      .then((res) => {
        if (cancelled || !res?.success || !res.data?.remember) return
        const data = res.data as Partial<RememberedLogin>
        setEmail(data.email || '')
        setPassword('')
        setSerial(data.serial || '')
        setRememberDetails(true)
      })
      .finally(() => {
        if (!cancelled) setRememberLoaded(true)
      })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!rememberLoaded) return

    if (!rememberDetails) {
      window.electronAPI.clearRememberedLogin().catch(() => {})
      return
    }

    const timer = window.setTimeout(() => {
      window.electronAPI.saveRememberedLogin({
        email: email.trim(),
        password,
        serial: serial.trim(),
        remember: true,
      }).catch(() => {})
    }, 350)

    return () => window.clearTimeout(timer)
  }, [email, password, serial, rememberDetails, rememberLoaded])

  const rememberCurrentLogin = async () => {
    if (!rememberDetails) return
    await window.electronAPI.saveRememberedLogin({
      email: email.trim(),
      password,
      serial: serial.trim(),
      remember: true,
    })
  }

  const handleLogin = async () => {
    const normalizedEmail = email.trim()
    const normalizedSerial = serial.trim().toUpperCase()

    if (!normalizedEmail || !password || !normalizedSerial) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور والسيريال')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const deviceInfo = await activationApi.getDeviceInfo()
      const deviceFingerprint = deviceInfo?.fingerprint || deviceInfo?.hostname || ''
      const result = await activationApi.login(normalizedEmail, password, normalizedSerial, deviceFingerprint, deviceInfo as any)

      if (result.success && result.data) {
        await rememberCurrentLogin().catch(() => {})
        setSuccess('تم تسجيل الدخول بنجاح!')
        setLoginUser({ email: result.data.email, role: result.data.role })

        if (result.data.token) {
          setToken(result.data.token)
        }

        if (result.data.key) {
          setActivation({
            key: result.data.key,
            status: result.data.status || 'active',
            expiryDate: result.data.expiryDate || '',
            deviceId: result.data.deviceId || deviceFingerprint,
          })
        }
      } else {
        setError(result.message || 'فشل تسجيل الدخول')
      }
    } catch {
      setError('فشل الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <AppTitleBar />
      <div
        className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-6"
        style={{ background: 'linear-gradient(135deg, #001A3A, #0A1628, #0D1137)' }}
      >
        <div
          className="card max-w-md w-full"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(10,108,241,0.15)',
            boxShadow: '0 0 60px rgba(10,108,241,0.08), 0 0 120px rgba(139,44,245,0.04)',
          }}
        >
          <div className="text-center mb-6">
            <img
              src={logoSrc}
              alt="SkyPro"
              className="w-20 h-20 mx-auto mb-4 object-contain"
              style={{ filter: 'drop-shadow(0 4px 20px rgba(10, 108, 241, 0.4))' }}
            />
            <h2 className="text-2xl font-bold text-white mb-2">تسجيل الدخول</h2>
            <p className="text-white/50">أدخل البيانات للدخول إلى التطبيق</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">البريد الإلكتروني</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-right"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(10,108,241,0.3)',
                    color: '#EAF3FF',
                  }}
                  placeholder="admin@skywaveads.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); setSuccess('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoComplete="email"
                  dir="ltr"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">كلمة المرور</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-right"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(10,108,241,0.3)',
                    color: '#EAF3FF',
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); setSuccess('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoComplete="current-password"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1">السيريال</label>
              <div className="relative">
                <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 rounded-xl font-mono text-lg tracking-wider text-right"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1.5px solid rgba(10,108,241,0.3)',
                    color: '#EAF3FF',
                  }}
                  placeholder="SKY-XXXX-XXXX"
                  value={serial}
                  onChange={(e) => { setSerial(e.target.value.toUpperCase()); setError(''); setSuccess('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  autoComplete="off"
                  dir="ltr"
                />
              </div>
            </div>

            <label
              className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(10,108,241,0.18)',
              }}
            >
              <span className="text-sm text-white/70">تذكر بياناتي</span>
              <input
                type="checkbox"
                checked={rememberDetails}
                onChange={(e) => setRememberDetails(e.target.checked)}
                className="h-4 w-4 accent-blue-500"
              />
            </label>

            {error && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                }}
              >
                <AlertCircle size={18} /> {error}
              </div>
            )}

            {success && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-sm"
                style={{
                  background: 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.2)',
                  color: '#4ade80',
                }}
              >
                <CheckCircle size={18} /> {success}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading || !email.trim() || !password || !serial.trim()}
              className="btn-primary w-full"
              style={
                !loading && email.trim() && password && serial.trim()
                  ? { boxShadow: '0 4px 20px rgba(10, 108, 241, 0.4), 0 0 30px rgba(139, 44, 245, 0.15)' }
                  : {}
              }
            >
              {loading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'تسجيل الدخول'}
            </button>
          </div>

          <div className="mt-6 pt-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm text-white/40">تواصل معنا للحصول على السيريال</p>
            <p className="text-sm text-white/25 mt-1">السعر: 2,000 ج.م / سنة</p>
          </div>
        </div>
      </div>
    </div>
  )
}
