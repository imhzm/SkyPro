'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  type: ToastType
  message: string
  duration: number
}

interface ToastContextValue {
  toast: (message: string, options?: { type?: ToastType; duration?: number }) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastIdSeq = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, options?: { type?: ToastType; duration?: number }) => {
      const id = ++toastIdSeq
      const next: Toast = {
        id,
        type: options?.type ?? 'info',
        message,
        duration: options?.duration ?? 4500,
      }
      setToasts((prev) => [...prev, next])
      if (next.duration > 0) {
        setTimeout(() => remove(id), next.duration)
      }
    },
    [remove]
  )

  const value: ToastContextValue = {
    toast,
    success: (m, d) => toast(m, { type: 'success', duration: d }),
    error: (m, d) => toast(m, { type: 'error', duration: d }),
    warning: (m, d) => toast(m, { type: 'warning', duration: d }),
    info: (m, d) => toast(m, { type: 'info', duration: d }),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

const CONFIG = {
  success: {
    Icon: CheckCircle2,
    cls: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200',
    iconCls: 'text-emerald-400',
  },
  error: {
    Icon: XCircle,
    cls: 'bg-red-500/10 border-red-500/30 text-red-200',
    iconCls: 'text-red-400',
  },
  warning: {
    Icon: AlertTriangle,
    cls: 'bg-amber-500/10 border-amber-500/30 text-amber-200',
    iconCls: 'text-amber-400',
  },
  info: {
    Icon: Info,
    cls: 'bg-sky-500/10 border-sky-500/30 text-sky-200',
    iconCls: 'text-sky-400',
  },
} as const

function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none px-4"
      dir="rtl"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => {
        const cfg = CONFIG[t.type]
        return (
          <ToastItem key={t.id} toast={t} cfg={cfg} onDismiss={onDismiss} />
        )
      })}
    </div>
  )
}

function ToastItem({
  toast,
  cfg,
  onDismiss,
}: {
  toast: Toast
  cfg: typeof CONFIG[ToastType]
  onDismiss: (id: number) => void
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  return (
    <div
      role="status"
      className={`pointer-events-auto rounded-2xl border backdrop-blur-md px-4 py-3 shadow-2xl shadow-black/50 flex items-start gap-3 transition-all duration-300 ${cfg.cls} ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
      }`}
    >
      <cfg.Icon className={`w-5 h-5 shrink-0 mt-0.5 ${cfg.iconCls}`} />
      <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-current opacity-60 hover:opacity-100 shrink-0"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
