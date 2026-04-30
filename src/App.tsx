import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/appStore'
import Layout from './components/layout/Layout'
import ActivationPage from './components/common/ActivationPage'
import ErrorBoundary from './components/common/ErrorBoundary'
import './index.css'

function AppContent() {
  const { isAuthenticated } = useAuthStore()

  return (
    <Router>
      <Routes>
        <Route 
          path="/activate" 
          element={isAuthenticated ? <Navigate to="/" /> : <ActivationPage />} 
        />
        <Route 
          path="*" 
          element={isAuthenticated ? <Layout /> : <Navigate to="/activate" />} 
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