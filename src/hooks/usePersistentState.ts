import { useEffect, useState } from 'react'

export function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const rawValue = window.localStorage.getItem(key)
      return rawValue ? (JSON.parse(rawValue) as T) : initialValue
    } catch {
      console.error('localStorage read failed for key:', key)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      console.error('localStorage write failed for key:', key)
    }
  }, [key, state])

  return [state, setState] as const
}
