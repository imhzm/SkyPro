import { useEffect, useState, useCallback } from 'react'
import {
  Mail,
  Lock,
  Key,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  RefreshCw,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Zap,
} from 'lucide-react'
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

interface SavedLoginPreview {
  email: string
  serial: string
  hasPassword: boolean
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
  const [savedLogin, setSavedLogin] = useState<SavedLoginPreview | null>(null)
  const [savedPasswordCache, setSavedPasswordCache] = useState<string>('')
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

  // Remember-login effects + saved-login preview
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
        // Stash the saved-login preview so the user can one-click Quick Login.
        if (data.email && data.serial) {
          setSavedLogin({
            email: data.email,
            serial: data.serial,
            hasPassword: !!(data.password && data.password.length > 0),
          })
          // Keep the password in renderer memory only for the quick-login button
          // (the IPC already returned it, so this isn't a new leak).
          setSavedPasswordCache(data.password || '')
        }
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

  const submitLogin = useCallback(async (overrideEmail?: string, overridePassword?: string, overrideSerial?: string) => {
    const normalizedEmail = (overrideEmail ?? email).trim()
    const finalPassword = overridePassword ?? password
    const normalizedSerial = (overrideSerial ?? serial).trim().toUpperCase()
    if (!normalizedEmail || !finalPassword || !normalizedSerial) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور والسيريال')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const deviceInfo = await activationApi.getDeviceInfo()
      const deviceFingerprint = deviceInfo?.fingerprint || deviceInfo?.hostname || ''
      const result = await activationApi.login(
        normalizedEmail,
        finalPassword,
        normalizedSerial,
        deviceFingerprint,
        deviceInfo ? { ...deviceInfo } : undefined,
      )

      if (result.success && result.data) {
        await rememberCurrentLogin().catch(() => {})
        setSuccess('تم تسجيل الدخول بنجاح')
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
  }, [email, password, serial, setActivation, setLoginUser, setToken])

  const handleLogin = useCallback(() => submitLogin(), [submitLogin])

  const handleQuickLogin = useCallback(() => {
    if (!savedLogin) return
    setEmail(savedLogin.email)
    setSerial(savedLogin.serial)
    if (savedPasswordCache) {
      setPassword(savedPasswordCache)
      // Fire-and-forget; submitLogin reads from overrides.
      submitLogin(savedLogin.email, savedPasswordCache, savedLogin.serial)
    } else {
      setError('كلمة المرور غير محفوظة. يرجى إدخالها يدوياً.')
    }
  }, [savedLogin, savedPasswordCache, submitLogin])

  const handleForgetSavedLogin = useCallback(async () => {
    try {
      await window.electronAPI.clearRememberedLogin()
    } catch { /* ignore */ }
    setSavedLogin(null)
    setSavedPasswordCache('')
    setEmail('')
    setPassword('')
    setSerial('')
    setRememberDetails(false)
  }, [])

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
    setUpdateStatus((prev) =>
      prev.state === 'available'
        ? ({ ...prev, state: 'downloading', percent: 0 } as UpdateStatus)
        : prev,
    )
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
          className="group flex items-center justify-center gap-2 text-xs text-white/45 hover:text-white/85 transition-colors"
        >
          <RefreshCw size={12} className="transition-transform group-hover:rotate-180 duration-500" />
          <span>التحقق من وجود تحديثات</span>
        </button>
      )
    }

    if (state === 'checking') {
      return (
        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#7da8ff' }}>
          <Loader2 size={12} className="animate-spin" />
          <span>جاري التحقق…</span>
        </div>
      )
    }

    if (state === 'up-to-date') {
      return (
        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: '#86efac' }}>
          <CheckCircle2 size={13} />
          <span>أحدث إصدار · v{updateStatus.version}</span>
        </div>
      )
    }

    if (state === 'available') {
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} style={{ color: '#fbbf24' }} />
            <p className="text-xs font-semibold" style={{ color: '#fbbf24' }}>
              يتوفر تحديث جديد · v{updateStatus.version}
            </p>
          </div>
          <button
            onClick={handleDownloadUpdate}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #0a6cf1, #5c3df0, #8b2cf5)',
              boxShadow: '0 4px 14px rgba(10,108,241,0.35)',
            }}
          >
            <Download size={12} />
            <span>تحميل التحديث</span>
          </button>
        </div>
      )
    }

    if (state === 'downloading') {
      return (
        <div className="flex flex-col items-center gap-2 w-full">
          <p className="text-xs font-medium" style={{ color: '#7da8ff' }}>
            جاري التحميل… {updateStatus.percent}%
          </p>
          <div
            className="w-full h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${updateStatus.percent}%`,
                background: 'linear-gradient(90deg, #0a6cf1, #5c3df0, #8b2cf5)',
                boxShadow: '0 0 12px rgba(10,108,241,0.5)',
              }}
            />
          </div>
        </div>
      )
    }

    if (state === 'downloaded') {
      return (
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs font-semibold" style={{ color: '#86efac' }}>
            ✦ التحديث جاهز للتثبيت · v{updateStatus.version}
          </p>
          <button
            onClick={handleInstallUpdate}
            className="flex items-center justify-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              boxShadow: '0 4px 14px rgba(34,197,94,0.4)',
            }}
          >
            <Download size={12} />
            <span>تثبيت وإعادة التشغيل</span>
          </button>
        </div>
      )
    }

    if (state === 'error') {
      return (
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-xs" style={{ color: '#fca5a5' }}>{updateStatus.message}</p>
          <button
            onClick={handleCheckForUpdates}
            className="flex items-center justify-center gap-1.5 text-xs text-white/55 hover:text-white/90 transition-colors"
          >
            <RefreshCw size={11} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )
    }

    return null
  }

  const formValid = !!email.trim() && !!password && !!serial.trim()

  return (
    <div className="flex h-screen flex-col overflow-hidden relative">
      <AppTitleBar />

      {/* ===== Animated aurora background ===== */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          /* Deeper indigo base with very subtle violet tint at top. */
          background:
            'radial-gradient(ellipse 80% 60% at top, #1e1b4b 0%, #0e0d2e 50%, #050518 100%)',
        }}
        aria-hidden
      >
        {/* Aurora — indigo blob, top-left */}
        <div
          className="absolute w-[60rem] h-[60rem] rounded-full sw-aurora -z-10"
          style={{
            top: '-25%',
            insetInlineStart: '-20%',
            background:
              'radial-gradient(circle at center, rgba(99, 102, 241, 0.38) 0%, rgba(99, 102, 241, 0) 60%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Aurora — violet blob, bottom-right */}
        <div
          className="absolute w-[55rem] h-[55rem] rounded-full sw-aurora-alt -z-10"
          style={{
            bottom: '-30%',
            insetInlineEnd: '-15%',
            background:
              'radial-gradient(circle at center, rgba(168, 85, 247, 0.34) 0%, rgba(168, 85, 247, 0) 60%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Aurora — magenta accent, mid-right */}
        <div
          className="absolute w-[45rem] h-[45rem] rounded-full sw-aurora -z-10"
          style={{
            top: '15%',
            insetInlineEnd: '25%',
            background:
              'radial-gradient(circle at center, rgba(236, 72, 153, 0.20) 0%, rgba(236, 72, 153, 0) 60%)',
            filter: 'blur(80px)',
            animationDelay: '-8s',
          }}
        />
        {/* Aurora — cyan accent for cool contrast */}
        <div
          className="absolute w-[35rem] h-[35rem] rounded-full sw-aurora-alt -z-10"
          style={{
            bottom: '15%',
            insetInlineStart: '25%',
            background:
              'radial-gradient(circle at center, rgba(56, 189, 248, 0.14) 0%, transparent 60%)',
            filter: 'blur(70px)',
            animationDelay: '-12s',
          }}
        />

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
          }}
        />
      </div>

      {/* ===== Main content ===== */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-8">
        <div className="w-full max-w-md sw-fade-in-up">
          {/* Logo + brand */}
          <div className="text-center mb-7">
            <div className="inline-flex relative mb-4">
              <div
                className="absolute inset-0 -m-3 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(10,108,241,0.3) 0%, transparent 65%)',
                  filter: 'blur(20px)',
                }}
              />
              <img
                src={logoSrc}
                alt="SkyPro"
                className="relative w-20 h-20 object-contain"
                style={{ filter: 'drop-shadow(0 8px 32px rgba(10, 108, 241, 0.4))' }}
              />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-white">Sky</span>
              <span className="text-gradient">Pro</span>
            </h1>
            <p className="mt-1.5 text-xs uppercase tracking-[0.32em] font-medium"
               style={{ color: 'rgba(167, 139, 250, 0.7)' }}>
              Marketing Automation Suite
            </p>
          </div>

          {/* Card */}
          <div
            className="relative rounded-2xl p-7"
            style={{
              background:
                'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow:
                '0 24px 60px rgba(5, 10, 28, 0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Gradient border accent */}
            <div
              aria-hidden
              className="absolute inset-x-12 -top-px h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(139, 44, 245, 0.6), transparent)',
              }}
            />

            <div className="mb-5">
              <h2 className="text-xl font-bold text-white">تسجيل الدخول</h2>
              <p className="text-xs mt-1" style={{ color: 'rgba(234, 243, 255, 0.5)' }}>
                ادخل بياناتك للوصول إلى لوحة التحكم
              </p>
            </div>

            {/* Quick-login chip for saved account */}
            {savedLogin && (
              <div
                className="mb-4 rounded-xl p-3 flex items-center gap-3 sw-fade-in-up"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(10, 108, 241, 0.16) 0%, rgba(139, 44, 245, 0.10) 100%)',
                  border: '1px solid rgba(125, 168, 255, 0.30)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #0a6cf1, #5c3df0, #8b2cf5)',
                    boxShadow: '0 4px 12px rgba(10,108,241,0.35)',
                  }}
                >
                  <UserCheck size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold mb-0.5"
                     style={{ color: 'rgba(167, 139, 250, 0.7)' }}>
                    حساب محفوظ
                  </p>
                  <p className="text-xs font-mono text-white truncate" dir="ltr">{savedLogin.email}</p>
                </div>
                {savedLogin.hasPassword ? (
                  <button
                    type="button"
                    onClick={handleQuickLogin}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #0a6cf1, #5c3df0, #8b2cf5)',
                      boxShadow: '0 4px 14px rgba(10,108,241,0.40)',
                    }}
                    title="دخول مباشر بالحساب المحفوظ"
                  >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                    دخول سريع
                  </button>
                ) : (
                  <span className="text-[10px]" style={{ color: 'rgba(234, 243, 255, 0.45)' }}>
                    أدخل كلمة المرور
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleForgetSavedLogin}
                  className="text-[10px] text-white/40 hover:text-white/80 transition-colors px-2"
                  title="نسيان الحساب"
                >
                  حذف
                </button>
              </div>
            )}

            <div className="space-y-3.5">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-semibold mb-1.5 tracking-wide"
                       style={{ color: 'rgba(234, 243, 255, 0.7)' }}>
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(125, 168, 255, 0.55)' }}
                  />
                  <input
                    type="email"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(125, 168, 255, 0.18)',
                      color: '#EAF3FF',
                      fontFamily: "'Inter', sans-serif",
                    }}
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); setSuccess('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    autoComplete="email"
                    dir="ltr"
                    autoFocus
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(125, 168, 255, 0.5)'
                      e.target.style.boxShadow = '0 0 0 4px rgba(10, 108, 241, 0.12)'
                      e.target.style.background = 'rgba(255,255,255,0.06)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(125, 168, 255, 0.18)'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = 'rgba(255,255,255,0.04)'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold mb-1.5 tracking-wide"
                       style={{ color: 'rgba(234, 243, 255, 0.7)' }}>
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(125, 168, 255, 0.55)' }}
                  />
                  <input
                    type="password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(125, 168, 255, 0.18)',
                      color: '#EAF3FF',
                      fontFamily: "'Inter', sans-serif",
                    }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); setSuccess('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    autoComplete="current-password"
                    dir="ltr"
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(125, 168, 255, 0.5)'
                      e.target.style.boxShadow = '0 0 0 4px rgba(10, 108, 241, 0.12)'
                      e.target.style.background = 'rgba(255,255,255,0.06)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(125, 168, 255, 0.18)'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = 'rgba(255,255,255,0.04)'
                    }}
                  />
                </div>
              </div>

              {/* Serial */}
              <div>
                <label className="block text-[11px] font-semibold mb-1.5 tracking-wide"
                       style={{ color: 'rgba(234, 243, 255, 0.7)' }}>
                  مفتاح التفعيل
                </label>
                <div className="relative">
                  <Key
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgba(125, 168, 255, 0.55)' }}
                  />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm font-mono tracking-widest transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(125, 168, 255, 0.18)',
                      color: '#EAF3FF',
                    }}
                    placeholder="SKY-XXXX-XXXX"
                    value={serial}
                    onChange={(e) => { setSerial(e.target.value.toUpperCase()); setError(''); setSuccess('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    autoComplete="off"
                    dir="ltr"
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(125, 168, 255, 0.5)'
                      e.target.style.boxShadow = '0 0 0 4px rgba(10, 108, 241, 0.12)'
                      e.target.style.background = 'rgba(255,255,255,0.06)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(125, 168, 255, 0.18)'
                      e.target.style.boxShadow = 'none'
                      e.target.style.background = 'rgba(255,255,255,0.04)'
                    }}
                  />
                </div>
              </div>

              {/* Remember */}
              <label
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(125, 168, 255, 0.12)',
                }}
              >
                <span className="flex items-center gap-2 text-xs" style={{ color: 'rgba(234, 243, 255, 0.7)' }}>
                  <ShieldCheck size={13} style={{ color: 'rgba(125, 168, 255, 0.7)' }} />
                  تذكر بياناتي
                </span>
                <button
                  type="button"
                  className={`sw-toggle ${rememberDetails ? 'active' : ''}`}
                  onClick={() => setRememberDetails(!rememberDetails)}
                  aria-pressed={rememberDetails}
                />
              </label>

              {/* Error / Success */}
              {error && (
                <div
                  className="flex items-center gap-2 p-3 rounded-xl text-xs sw-fade-in-up"
                  style={{
                    background: 'rgba(239, 68, 68, 0.10)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#fca5a5',
                  }}
                >
                  <AlertCircle size={15} />
                  <span className="flex-1 leading-snug">{error}</span>
                </div>
              )}

              {success && (
                <div
                  className="flex items-center gap-2 p-3 rounded-xl text-xs sw-fade-in-up"
                  style={{
                    background: 'rgba(34, 197, 94, 0.10)',
                    border: '1px solid rgba(34, 197, 94, 0.25)',
                    color: '#86efac',
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>{success}</span>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleLogin}
                disabled={loading || !formValid}
                className="relative w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background:
                    'linear-gradient(135deg, #0a6cf1 0%, #5c3df0 55%, #8b2cf5 100%)',
                  boxShadow:
                    !loading && formValid
                      ? '0 8px 28px rgba(10,108,241,0.45), 0 0 24px rgba(139,44,245,0.18), inset 0 1px 0 rgba(255,255,255,0.2)'
                      : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!loading && formValid) e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {loading ? (
                  <Loader2 size={18} className="animate-spin mx-auto" />
                ) : (
                  <span className="relative inline-flex items-center justify-center gap-1.5">
                    تسجيل الدخول
                  </span>
                )}
              </button>
            </div>

            {/* Update section */}
            <div
              className="mt-5 pt-4 flex flex-col items-center gap-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {renderUpdateSection()}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 flex flex-col items-center gap-2 text-center">
            <button
              onClick={() => window.open('https://www.skywaveads.com', '_blank', 'noopener,noreferrer')}
              className="group inline-flex items-center gap-1.5 text-xs hover:text-white/85 transition-colors"
              style={{ color: 'rgba(234, 243, 255, 0.5)' }}
            >
              <span>زوّر موقعنا</span>
              <span className="font-semibold text-gradient">www.skywaveads.com</span>
              <ExternalLink size={11} className="opacity-60 group-hover:opacity-100" />
            </button>
            {appVersion && (
              <p className="text-[10px] tracking-widest font-mono uppercase"
                 style={{ color: 'rgba(234, 243, 255, 0.25)' }}>
                build v{appVersion}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
