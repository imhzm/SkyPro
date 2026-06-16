import { useCallback, useRef, useState, type ReactNode } from 'react'
import ConfirmDialog from './ConfirmDialog'
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirmContext'

/**
 * Promise-based confirmation. Replaces native `window.confirm()` — that dialog
 * is SYNCHRONOUS and freezes the renderer thread in sandboxed Electron when
 * called from a React event handler. This provider renders the styled
 * <ConfirmDialog> and resolves a Promise<boolean>, so existing call sites keep
 * their natural flow:
 *
 *   const confirm = useConfirm()
 *   if (!(await confirm({ title: '...', message: '...', danger: true }))) return
 *
 * The `useConfirm` hook lives in ./confirmContext so this file only exports a
 * component (required for React Fast Refresh).
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions>({ title: '', message: '' })
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const settle = useCallback((value: boolean) => {
    setOpen(false)
    resolverRef.current?.(value)
    resolverRef.current = null
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={open}
        title={opts.title}
        message={opts.message}
        confirmLabel={opts.confirmLabel}
        cancelLabel={opts.cancelLabel}
        danger={opts.danger}
        onConfirm={() => settle(true)}
        onClose={() => settle(false)}
      />
    </ConfirmContext.Provider>
  )
}
