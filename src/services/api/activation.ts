const SERVER_API_URL = 'https://skypro.skywaveads.com/api'

export interface ActivationResponse {
  success: boolean
  message: string
  data?: {
    key: string
    status: 'active' | 'expired' | 'pending' | 'invalid' | 'available' | 'revoked' | 'assigned'
    expiryDate: string
    deviceId?: string
    maxDevices?: number
    expiresAt?: string
  }
}

export const activationApi = {
  activateKey: async (key: string, deviceId: string): Promise<ActivationResponse> => {
    if (window.electronAPI?.activateKey) {
      try {
        const result = await window.electronAPI.activateKey({ key, deviceId })
        if (result) return result
      } catch (e) { console.error('IPC activateKey failed:', e) }
    }

    try {
      const response = await fetch(`${SERVER_API_URL}/keys/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceFingerprint: deviceId })
      })
      return response.json()
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  },

  validateKey: async (key: string, deviceId: string): Promise<ActivationResponse> => {
    if (window.electronAPI?.validateKey) {
      try {
        const result = await window.electronAPI.validateKey({ key, deviceId })
        if (result) return result
      } catch (e) { console.error('IPC validateKey failed:', e) }
    }

    try {
      const response = await fetch(`${SERVER_API_URL}/auth/verify-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceFingerprint: deviceId })
      })
      return response.json()
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  },

  checkStatus: async (key: string): Promise<ActivationResponse> => {
    if (window.electronAPI?.checkKeyStatus) {
      try {
        const result = await window.electronAPI.checkKeyStatus({ key })
        if (result) return result
      } catch (e) { console.error('IPC checkStatus failed:', e) }
    }

    try {
      const response = await fetch(`${SERVER_API_URL}/keys/status?key=${encodeURIComponent(key)}`)
      return response.json()
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  },

  resetDevice: async (key: string, deviceId: string): Promise<ActivationResponse> => {
    if (window.electronAPI?.resetDevice) {
      try {
        const result = await window.electronAPI.resetDevice({ key })
        if (result) return result
      } catch (e) { console.error('IPC resetDevice failed:', e) }
    }

    try {
      const response = await fetch(`${SERVER_API_URL}/auth/reset-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  }
}