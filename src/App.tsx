import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/appStore'
import Layout from './components/layout/Layout'
import LoginPage from './components/common/LoginPage'
import ActivationPage from './components/common/ActivationPage'
import ErrorBoundary from './components/common/ErrorBoundary'
import { activationApi } from './services/api/activation'
import { useEffect, useState } from 'react'
import './index.css'

// Grace period: allow offline usage for up to 72 hours after last successful validation
const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000
const LAST_VALIDATED_KEY = 'skypro_last_validated_at'

function isGracePeriodExpired(): boolean {
  const lastValidated = localStorage.getItem(LAST_VALIDATED_KEY)
  if (!lastValidated) return true
  const elapsed = Date.now() - Number(lastValidated)
  return elapsed > GRACE_PERIOD_MS
}

function markValidationSuccess() {
  localStorage.setItem(LAST_VALIDATED_KEY, String(Date.now()))
}

function clearValidationTimestamp() {
  localStorage.removeItem(LAST_VALIDATED_KEY)
}

function AppContent() {
  const { isAuthenticated, activation, setActivation, logout } = useAuthStore()
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    async function validateOnStart() {
      if (!activation?.key) return
      setIsValidating(true)
      try {
        const deviceInfo = await activationApi.getDeviceInfo()
        const deviceId = deviceInfo?.fingerprint || activation.deviceId || ''
        const result = await activationApi.validateKey(activation.key, deviceId)

        if (result.success && result.data?.status === 'active') {
          // Server confirmed key is active — update grace period timestamp
          markValidationSuccess()
        } else {
          // Server explicitly rejected the key — invalidate immediately
          console.warn('Key rejected by server:', result.data?.status)
          clearValidationTimestamp()
          setActivation(null)
          logout()
        }
      } catch (err) {
        // Network error or server unreachable — check grace period
        console.error('Startup validation failed (network):', err)
        if (isGracePeriodExpired()) {
          console.warn('Grace period expired — forcing logout')
          clearValidationTimestamp()
          setActivation(null)
          logout()
        }
        // If within grace period, allow continued use silently
      } finally {
        setIsValidating(false)
      }
    }
    validateOnStart()
  }, [activation?.key, activation?.deviceId, setActivation, logout])

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
