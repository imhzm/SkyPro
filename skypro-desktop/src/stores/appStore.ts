import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppSettings, ActivationData, PlatformId } from '../types'

interface AppState {
  settings: AppSettings
  activePlatform: PlatformId
  isSidebarOpen: boolean
  isLoading: boolean
  notification: { type: 'success' | 'error' | 'warning'; message: string } | null

  setSettings: (settings: Partial<AppSettings>) => void
  setActivePlatform: (platform: PlatformId) => void
  toggleSidebar: () => void
  setLoading: (loading: boolean) => void
  showNotification: (type: 'success' | 'error' | 'warning', message: string) => void
  clearNotification: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      settings: {
        theme: 'light',
        language: 'ar',
        defaultHeadless: false,
        autoSave: true,
        notifications: true,
      },
      activePlatform: 'dashboard',
      isSidebarOpen: true,
      isLoading: false,
      notification: null,

      setSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      setActivePlatform: (platform) =>
        set({ activePlatform: platform }),

      toggleSidebar: () =>
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      setLoading: (loading) => set({ isLoading: loading }),

      showNotification: (type, message) =>
        set({ notification: { type, message } }),

      clearNotification: () => set({ notification: null }),
    }),
    {
      name: 'sender-pro-app',
      partialize: (state) => ({ settings: state.settings, activePlatform: state.activePlatform, isSidebarOpen: state.isSidebarOpen }),
    }
  )
)

interface AuthState {
  activation: ActivationData | null
  isAuthenticated: boolean
  keyData: { key: string; expiryDate: string } | null
  loginUser: { email: string; role: 'admin' | 'customer' } | null
  token: string | null

  setActivation: (activation: ActivationData | null) => void
  setLoginUser: (user: { email: string; role: 'admin' | 'customer' } | null) => void
  setToken: (token: string | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      activation: null,
      isAuthenticated: false,
      keyData: null,
      loginUser: null,
      token: null,

      setActivation: (activation) =>
        set({
          activation,
          isAuthenticated: !!activation && activation.status === 'active' && (!activation.expiryDate || new Date(activation.expiryDate) > new Date()),
          keyData: activation ? { key: activation.key, expiryDate: activation.expiryDate } : null,
        }),

      setLoginUser: (user) =>
        set({ loginUser: user }),

      setToken: (token) =>
        set({ token }),

      logout: () => set({ activation: null, isAuthenticated: false, keyData: null, loginUser: null, token: null }),
    }),
    {
      name: 'sender-pro-auth',
      partialize: (state) => ({
        activation: state.activation,
        isAuthenticated: state.isAuthenticated,
        keyData: state.keyData,
        loginUser: null,
        token: null,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.loginUser = null
          state.token = null
        }
        if (state?.activation) {
          const isValid = state.activation.status === 'active' && (!state.activation.expiryDate || new Date(state.activation.expiryDate) > new Date())
          if (!isValid) {
            state.isAuthenticated = false
            state.activation = null
            state.keyData = null
            state.token = null
          }
        }
      },
    }
  )
)
