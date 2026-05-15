import { useEffect, useState, useCallback } from 'react'
import { Mail, Lock, Key, Loader2, AlertCircle, CheckCircle, Download, RefreshCw } from 'lucide-react'
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

type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'up-to-date'; version: string }
  | { state: 'error'; message: string }

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
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })
  const [appVersion, setAppVersion] = useState('')
  const { setActivation, setLoginUser, setToken } = useAuthStore()

  // Fetch app version on mount
  useEffect(() => {
    window.electronAPI.getAppVersion?.()
      .then((res) => {
        if (res?.success) setAppVersion(String(res.data || res.version || ''))
      })
      .catch(() => {})
  }, [])

  // Listen for update events from main process
  useEffect(() => {
    const unsub = window.electronAPI.onUpdateStatus?.((data) => {
      switch (data.status) {
        case 'available':
          setUpdateStatus({ state: 'available', version: data.version || '' })
          break
        case 'not-available':
          setUpdateStatus({ state: 'up-to-date', version: data.version || appVersion })
          break
        case 'downloading':
          setUpdateStatus({ state: 'downloading', percent: data.percent || 0 })
          break
        case 'downloaded':
          setUpdateStatus({ state: 'downloaded', version: data.version || '' })
          break
        case 'error':
          setUpdateStatus({ state: 'error', message: data.error || 'فشل التحديث' })
          break
      }
    })
    return () => { unsub?.() }
  }, [appVersion])

  // Remember login effects
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
      .finally(() => { if (!cancelled) setRememberLoaded(true) })
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
        email: email.trim(), password, serial: serial.trim(), remember: true,
      }).catch(() => {})
    }, 350)
    return () => window.clearTimeout(timer)
  }, [email, password, serial, rememberDetails, rememberLoaded])

  const rememberCurrentLogin = async () => {
    if (!rememberDetails) return
    await window.electronAPI.saveRememberedLogin({
      email: email.trim(), password, serial: serial.trim(), remember: true,
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
      const result = await activationApi.login(normalizedEmail, password, normalizedSerial, deviceFingerprint, deviceInfo ? { ...deviceInfo } : undefined)

      if (result.success && result.data) {
        await rememberCurrentLogin().catch(() => {})
        setSuccess('تم تسجيل الدخول بنجاح!')
        setLoginUser({ email: result.data.email, role: result.data.role })
        if (result.data.token) setToken(result.data.token)
        if (result.data.key) {
          setActivation({
            key: result.data.key,
            status: result.data.status || 'active',
            expiryDate: result.data.expiryDate || '',
            deviceId: result.data.deviceId || deviceFingerprint,
          })
        }
      } else {
        setError(result.message || result.error || 'فشل تسجيل الدخول')
      }
    } catch {
      setError('فشل الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckForUpdates = useCallback(async () => {
    setUpdateStatus({ state: 'checking' })
    try {
      const res = await window.electronAPI.checkForUpdates()
      if (!res?.success) {
        setUpdateStatus({ state: 'error', message: res?.message || res?.error || 'فشل التحقق' })
        return
      }
      if (res.data?.updateAvailable) {
        setUpdateStatus({ state: 'available', version: res.data.version })
      } else {
        setUpdateStatus({ state: 'up-to-date', version: res.data?.currentVersion || appVersion })
      }
    } catch {
      setUpdateStatus({ state: 'error', message: 'فشل الاتصال بخادم التحديثات' })
    }
  }, [appVersion])

  const handleDownloadUpdate = useCallback(async () => {
    setUpdateStatus((prev) => prev.state === 'available' ? { ...prev, state: 'downloading', percent: 0 } as UpdateStatus : prev)
    try {
      const res = await window.electronAPI.downloadUpdate()
      if (!res?.success) {
        setUpdateStatus({ state: 'error', message: res?.error || 'فشل تحميل التحديث' })
      }
    } catch {
      setUpdateStatus({ state: 'error', message: 'فشل تحميل التحديث' })
    }
  }, [])

  const handleInstallUpdate = useCallback(async () => {
    try {
      await window.electronAPI.installUpdate()
    } catch {
      setUpdateStatus({ state: 'error', message: 'فشل تثبيت التحديث' })
    }
  }, [])

  const renderUpdateSection = () => {
    const { state } = updateStatus

    if (state === 'idle') {
      return (
        <button
          onClick={handleCheckForUpdates}
          className="flex items-center justify-center gap-2 text-sm text-white/50 hover:text-blue-400 transition-colors"
        >
          <RefreshCw size={14} />
          <span>التحقق من التحديثات</span>
        </button>
      )
    }

    if (state === 'checking') {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
          <Loader2 size={14} className="animate-spin" />
          <span>جاري التحقق...</span>
        </div>
      )
    }

    if (state === 'up-to-date') {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-green-400">
          <CheckCircle size={14} />
          <span>البرنامج محدث - الإصدار {updateStatus.version}</span>
        </div>
      )
    }

    if (state === 'available') {
      return (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-amber-400">يتوفر تحديث جديد: v{updateStatus.version}</p>
          <button
            onClick={handleDownloadUpdate}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{
              background: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)',
              boxShadow: '0 2px 12px rgba(10,108,241,0.3)',
            }}
          >
            <Download size={14} />
            <span>تحميل التحديث</span>
          </button>
        </div>
      )
    }

    if (state === 'downloading') {
      return (
        <div className="flex flex-col items-center gap-2 w-full">
          <p className="text-sm text-blue-400">جاري التحميل... {updateStatus.percent}%</p>
          <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${updateStatus.percent}%`,
                background: 'linear-gradient(90deg, #0A6CF1, #8B2CF5)',
              }}
            />
          </div>
        </div>
      )
    }

    if (state === 'downloaded') {
      return (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-green-400">التحديث جاهز للتثبيت: v{updateStatus.version}</p>
          <button
            onClick={handleInstallUpdate}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
            style={{
              background: 'linear-gradient(135deg, #16a34a, #059669)',
              boxShadow: '0 2px 12px rgba(22,163,74,0.3)',
            }}
          >
            <Download size={14} />
            <span>تثبيت وإعادة التشغيل</span>
          </button>
        </div>
      )
    }

    if (state === 'error') {
      return (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-red-400">{updateStatus.message}</p>
          <button
            onClick={handleCheckForUpdates}
            className="flex items-center justify-center gap-2 text-sm text-white/50 hover:text-blue-400 transition-colors"
          >
            <RefreshCw size={14} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )
    }

    return null
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

          {/* Update Section */}
          <div
            className="mt-5 pt-4 flex flex-col items-center gap-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            {renderUpdateSection()}
          </div>

          <div className="mt-4 pt-4 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-sm text-white/40">تواصل معنا للحصول على السيريال</p>
            <p className="text-sm text-white/25 mt-1">السعر: 2,000 ج.م / سنة</p>
            {appVersion && <p className="text-xs text-white/20 mt-2">v{appVersion}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
