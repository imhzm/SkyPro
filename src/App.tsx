import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/appStore'
import Layout from './components/layout/Layout'
import LoginPage from './components/common/LoginPage'
import ActivationPage from './components/common/ActivationPage'
import ErrorBoundary from './components/common/ErrorBoundary'
import { activationApi } from './services/api/activation'
import { useEffect, useState } from 'react'
import './index.css'

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
        if (!result.success || result.data?.status !== 'active') {
          setActivation(null)
          logout()
        }
      } catch (err) {
        console.error('Startup validation failed:', err)
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
