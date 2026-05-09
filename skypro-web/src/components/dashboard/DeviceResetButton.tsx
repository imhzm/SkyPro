'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function DeviceResetButton({
  keyCode,
  deviceFingerprint,
  resetCount,
  maxResets,
}: {
  keyCode: string
  deviceFingerprint: string
  resetCount: number
  maxResets: number
}) {
  const [submitting, setSubmitting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  const exhausted = resetCount >= maxResets

  const handleReset = async () => {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyCode, deviceFingerprint }),
      })
      const data = await res.json()
      if (res.ok && data?.success) {
        // Reload to reflect new state
        window.location.reload()
      } else {
        setError(data?.message || data?.error || 'تعذّر إعادة التعيين')
        setSubmitting(false)
      }
    } catch {
      setError('تعذّر الاتصال بالخادم')
      setSubmitting(false)
    }
  }

  if (exhausted) {
    return (
      <span className="text-[11px] text-red-400 self-center px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
        تجاوزت الحد السنوي
      </span>
    )
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 text-amber-300 transition shrink-0 self-center"
      >
        <RefreshCw className="w-3 h-3" />
        إعادة تعيين
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 shrink-0 self-center min-w-[7rem]">
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      <div className="flex gap-1">
        <button
          onClick={handleReset}
          disabled={submitting}
          className="flex-1 rounded-lg px-2 py-1 text-[11px] font-bold bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-50"
        >
          {submitting ? '...' : 'تأكيد'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={submitting}
          className="flex-1 rounded-lg px-2 py-1 text-[11px] font-bold bg-white/5 hover:bg-white/10 text-slate-300 transition disabled:opacity-50"
        >
          إلغاء
        </button>
      </div>
    </div>
  )
}
