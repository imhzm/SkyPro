import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

/**
 * Modal confirmation dialog. Replaces `window.confirm()` everywhere — that
 * native dialog is SYNCHRONOUS and is known to lock up the renderer thread
 * in sandboxed Electron when called from React event handlers (the page
 * appears completely frozen until the dialog times out internally). This
 * component is fully React-state-driven and never blocks anything.
 *
 * Usage:
 *   const [open, setOpen] = useState(false)
 *   ...
 *   <ConfirmDialog
 *     open={open}
 *     title="حذف الحساب"
 *     message={`حذف "${label}"؟`}
 *     confirmLabel="حذف"
 *     onConfirm={async () => { await deleteAccount(id) }}
 *     onClose={() => setOpen(false)}
 *     danger
 *   />
 */
interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  // Close on Esc key
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  const handleConfirm = async () => {
    try {
      await onConfirm()
    } finally {
      // Caller controls when to close — we don't auto-close to let the
      // parent show success/error toasts in a consistent flow.
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={busy ? undefined : onClose}
    >
      <div
        className="card-gradient-border max-w-md w-full"
        style={{
          background: '#ffffff',
          padding: '1.5rem',
          border: danger ? '2px solid #ef4444' : '1px solid #e5e7eb',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: danger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(99, 102, 241, 0.1)',
              color: danger ? '#dc2626' : '#4f46e5',
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-secondary-900 text-base mb-1">{title}</h3>
            <p className="text-sm text-secondary-600 leading-relaxed whitespace-pre-line">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={busy ? undefined : onClose}
            disabled={busy}
            className="text-secondary-400 hover:text-secondary-700 transition-colors disabled:opacity-50"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-secondary-100">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn-secondary text-sm disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`text-sm text-white font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-60 ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {busy ? 'جاري التنفيذ...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
