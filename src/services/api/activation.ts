const API_BASE_URL = 'https://www.skywaveads.com/sender-pro-api'

export interface ActivationResponse {
  success: boolean
  message: string
  data?: {
    key: string
    status: 'active' | 'expired' | 'pending' | 'invalid'
    expiryDate: string
    deviceId?: string
  }
}

export const activationApi = {
  validateKey: async (key: string, deviceId: string): Promise<ActivationResponse> => {
    if (window.electronAPI?.validateKey) {
      try {
        const result = await window.electronAPI.validateKey({ key, deviceId })
        if (result) return result
      } catch (e) {
        console.error('IPC validateKey failed:', e)
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceId }),
      })
      return response.json()
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  },

  activateKey: async (key: string, deviceId: string): Promise<ActivationResponse> => {
    if (window.electronAPI?.activateKey) {
      try {
        const result = await window.electronAPI.activateKey({ key, deviceId })
        if (result) return result
      } catch (e) {
        console.error('IPC activateKey failed:', e)
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceId }),
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
      } catch (e) {
        console.error('IPC checkStatus failed:', e)
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/status?key=${encodeURIComponent(key)}`)
      return response.json()
    } catch {
      return { success: false, message: 'فشل الاتصال بالخادم' }
    }
  },
}