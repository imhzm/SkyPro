import { createContext, useContext } from 'react'

/**
 * Context + hook for the promise-based confirmation dialog. Kept separate from
 * <ConfirmProvider> so the provider file only exports a component (required for
 * React Fast Refresh / HMR — see react-refresh/only-export-components).
 */
export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<ConfirmFn | null>(null)

/**
 * Returns an async `confirm(opts) => Promise<boolean>`. Must be used within
 * <ConfirmProvider>. Falls back to native window.confirm only if the provider
 * is somehow absent (keeps callers safe during isolated unit tests).
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (ctx) return ctx
  return async (opts) => window.confirm(opts.message)
}
