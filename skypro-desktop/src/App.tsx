import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/appStore'
import Layout from './components/layout/Layout'
import LoginPage from './components/common/LoginPage'
import ActivationPage from './components/common/ActivationPage'
import ErrorBoundary from './components/common/ErrorBoundary'
import { activationApi } from './services/api/activation'
import LicenseLockScreen from './components/common/LicenseLockScreen'
import { useCallback, useEffect, useState } from 'react'
import './index.css'

// Allow offline usage for up to 24h after the last successful server validation, then fail-closed.
const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000
// While online, silently re-validate the license on this interval (and on window focus / reconnect).
const REVALIDATE_INTERVAL_MS = 45 * 60 * 1000
const LAST_VALIDATED_KEY = 'skypro_last_validated_at'

function isGracePeriodExpired(): boolean {
  const lastValidated = localStorage.getItem(LAST_VALIDATED_KEY)
  if (!lastValidated) return true
  const parsed = Number(lastValidated)
  if (!Number.isFinite(parsed) || parsed <= 0) return true
  const elapsed = Date.now() - parsed
  return elapsed > GRACE_PERIOD_MS
}

function markValidationSuccess() {
  localStorage.setItem(LAST_VALIDATED_KEY, String(Date.now()))
}

function clearValidationTimestamp() {
  localStorage.removeItem(LAST_VALIDATED_KEY)
}

type LockState = { message: string; variant: 'rejected' | 'offline' }

function AppContent() {
  const { isAuthenticated, activation, setActivation, logout } = useAuthStore()
  const [isValidating, setIsValidating] = useState(false)
  const [lockState, setLockState] = useState<LockState | null>(null)

  // Single validation routine reused on startup, on an interval, and on focus / reconnect.
  // Reads the live store inside so it stays referentially stable (no stale-closure re-subscribes).
  const runValidation = useCallback(async (opts?: { initial?: boolean }) => {
    const current = useAuthStore.getState().activation
    if (!current?.key) return
    if (opts?.initial) setIsValidating(true)
    try {
      const deviceInfo = await activationApi.getDeviceInfo()
      const deviceId = deviceInfo?.fingerprint || current.deviceId || ''
      const result = await activationApi.validateKey(current.key, deviceId)

      if (result.success && result.data?.status === 'active') {
        // Server confirmed the license is active — refresh the offline grace window.
        markValidationSuccess()
        setLockState(null)
        return
      }

      if (result.rejected) {
        // Server reachable and explicitly rejected (suspended/expired/revoked/device) → fail-closed now.
        console.warn('License rejected by server:', result.message)
        clearValidationTimestamp()
        setLockState({ message: result.message || 'تم إيقاف اشتراكك. يرجى التواصل مع الدعم الفني.', variant: 'rejected' })
        setActivation(null)
        logout()
        return
      }

      // Offline / unreachable / ambiguous — honor the offline grace period.
      if (isGracePeriodExpired()) {
        clearValidationTimestamp()
        setLockState({
          message: result.message || 'تعذر الاتصال بالخادم للتحقق من اشتراكك. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.',
          variant: 'offline',
        })
        setActivation(null)
        logout()
      }
      // Within grace period → allow continued use silently.
    } catch (err) {
      // Unexpected error — treat as offline and honor grace.
      console.error('License validation error:', err)
      if (isGracePeriodExpired()) {
        clearValidationTimestamp()
        setLockState({ message: 'تعذر التحقق من اشتراكك. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.', variant: 'offline' })
        setActivation(null)
        logout()
      }
    } finally {
      if (opts?.initial) setIsValidating(false)
    }
  }, [setActivation, logout])

  // Validate on startup and whenever the activation key changes (e.g. right after login).
  useEffect(() => {
    runValidation({ initial: true })
  }, [activation?.key, runValidation])

  // While authenticated, re-validate periodically and on window focus / regained connectivity.
  // This is what makes a mid-session suspend/revoke take effect without an app restart.
  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(() => runValidation(), REVALIDATE_INTERVAL_MS)
    const onWake = () => runValidation()
    window.addEventListener('focus', onWake)
    window.addEventListener('online', onWake)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onWake)
      window.removeEventListener('online', onWake)
    }
  }, [isAuthenticated, runValidation])

  if (lockState) {
    return (
      <LicenseLockScreen
        message={lockState.message}
        variant={lockState.variant}
        onReLogin={() => setLockState(null)}
      />
    )
  }

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, #001A3A, #0A1628, #0D1137)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-4" />
          <p className="text-white/50 text-sm">جاري التحقق من الاشتراك...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
        />
        <Route
          path="/activate"
          element={isAuthenticated ? <Navigate to="/" /> : <ActivationPage />}
        />
        <Route
          path="*"
          element={isAuthenticated ? <Layout /> : <Navigate to="/login" />}
        />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  )
}

export default App
