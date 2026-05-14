import { useAuthStore } from '../../stores/appStore'

const WEB_API_URL = import.meta.env.VITE_WEB_API_URL || import.meta.env.VITE_API_URL || ''
const SERVER_API_URL = import.meta.env.VITE_API_URL || ''

if (!WEB_API_URL) console.warn('[activation] VITE_WEB_API_URL or VITE_API_URL is not set')
if (!SERVER_API_URL) console.warn('[activation] VITE_API_URL is not set')

function assertHttps(url: string): string {
  if (url && !url.startsWith('https://')) {
    throw new Error('Refusing insecure API connection')
  }
  return url
}

function getToken(): string | null {
  return useAuthStore.getState().token || null
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

type ActivationStatus = NonNullable<ActivationResponse['data']>['status']

function normalizeActivationResult(result: unknown, fallbackKey: string, fallbackDeviceId?: string): ActivationResponse {
  if (!result || typeof result !== 'object') {
    return { success: false, message: 'Empty response from server' }
  }
  const resultObj = result as Record<string, unknown>
  const resultData = (resultObj.data && typeof resultObj.data === 'object')
    ? (resultObj.data as Record<string, unknown>)
    : {}
  const keyData = (resultData.key && typeof resultData.key === 'object')
    ? (resultData.key as Record<string, unknown>)
    : resultData
  const rawKey = keyData.keyCode || keyData.key || fallbackKey
  if (!rawKey) {
    return { success: false, message: 'Missing activation key in response' }
  }
  const expiryDate = String(keyData.expiresAt || keyData.expiryDate || resultData.expiresAt || '')

  return {
    success: true,
    message: String(resultObj.message || 'تم التحقق من الاشتراك بنجاح'),
    data: {
      key: String(rawKey),
      status: String(keyData.status || resultData.status || 'active') as ActivationStatus,
      expiryDate,
      expiresAt: expiryDate,
      deviceId: String(resultData.sessionId || keyData.deviceId || fallbackDeviceId || ''),
      maxDevices: Number(keyData.maxDevices || resultData.maxDevices || 0) || undefined,
    }
  }
}

export interface LoginResponse {
  success: boolean
  message?: string
  data?: {
    token?: string
    email: string
    role: 'admin' | 'customer'
    key?: string
    status?: 'active' | 'expired' | 'pending' | 'invalid' | 'available' | 'revoked' | 'assigned'
    expiryDate?: string
    deviceId?: string
  }
}

export interface ActivationResponse {
  success: boolean
  message?: string
  data?: {
    key: string
    status: 'active' | 'expired' | 'pending' | 'invalid' | 'available' | 'revoked' | 'assigned'
    expiryDate: string
    deviceId?: string
    maxDevices?: number
    expiresAt?: string
  }
}

export interface SerialRequestResponse {
  success: boolean
  message: string
  data?: {
    serial: string
    key: string
    expiryDate: string
  }
}

export const activationApi = {
  activateKey: async (key: string, deviceId: string, deviceInfo?: Record<string, unknown>): Promise<ActivationResponse> => {
    if (window.electronAPI?.activateKey) {
      try {
        const result = await window.electronAPI.activateKey({ key, deviceId, deviceInfo })
        if (result) return result as unknown as ActivationResponse
      } catch (e) { console.error('IPC activateKey failed:', e) }
    }

    try {
      const response = await fetch(`${assertHttps(WEB_API_URL)}/auth/verify-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceFingerprint: deviceId, deviceInfo })
      })
      const result = await response.json()
      return result.success ? normalizeActivationResult(result, key, deviceId) : result
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  },

  validateKey: async (key: string, deviceId: string): Promise<ActivationResponse> => {
    if (window.electronAPI?.validateKey) {
      try {
        const result = await window.electronAPI.validateKey({ key, deviceId })
        if (result) return result as unknown as ActivationResponse
      } catch (e) { console.error('IPC validateKey failed:', e) }
    }

    try {
      const response = await fetch(`${assertHttps(WEB_API_URL)}/auth/verify-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceFingerprint: deviceId })
      })
      const result = await response.json()
      return result.success ? normalizeActivationResult(result, key, deviceId) : result
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  },

  checkStatus: async (key: string): Promise<ActivationResponse> => {
    if (window.electronAPI?.checkKeyStatus) {
      try {
        const result = await window.electronAPI.checkKeyStatus({ key })
        if (result) return result as unknown as ActivationResponse
      } catch (e) { console.error('IPC checkStatus failed:', e) }
    }

    try {
      const response = await fetch(`${assertHttps(WEB_API_URL)}/keys/status?key=${encodeURIComponent(key)}`)
      const result = await response.json()
      return result.success ? normalizeActivationResult(result, key) : result
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  },

  resetDevice: async (key: string, deviceId: string): Promise<ActivationResponse> => {
    const token = getToken()
    if (window.electronAPI?.resetDevice) {
      try {
        const result = await window.electronAPI.resetDevice({ key, deviceId, token })
        if (result) return result as unknown as ActivationResponse
      } catch (e) { console.error('IPC resetDevice failed:', e) }
    }

    try {
      const response = await fetch(`${assertHttps(WEB_API_URL)}/auth/reset-device`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ key, deviceFingerprint: deviceId })
      })
      return response.json()
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  },

  getDeviceInfo: async () => {
    if (window.electronAPI?.getDeviceInfo) {
      try {
        return await window.electronAPI.getDeviceInfo()
      } catch (e) { console.error('IPC getDeviceInfo failed:', e) }
    }
    return null
  },

  login: async (email: string, password: string, serial: string, deviceFingerprint: string, deviceInfo?: Record<string, unknown>): Promise<LoginResponse> => {
    if (window.electronAPI?.login) {
      try {
        const result = await window.electronAPI.login({ email, password, serial, deviceFingerprint, deviceInfo })
        if (result) return result as unknown as LoginResponse
      } catch (e) { console.error('IPC login failed:', e) }
    }

    try {
      const response = await fetch(`${assertHttps(WEB_API_URL)}/desktop/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, serial, deviceFingerprint, deviceInfo })
      })
      return response.json()
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  },

  requestActivation: async (email: string, months: number = 12): Promise<SerialRequestResponse> => {
    try {
      const response = await fetch(`${assertHttps(SERVER_API_URL)}/request-activation.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, months })
      })
      return response.json()
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  }
}
