import { create } from 'zustand'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export interface Account {
  id: number
  platform: string
  username: string
  password?: string
  has_password?: boolean
  proxy?: string
  notes?: string
  status: string
  created_at: string
}

/**
 * Returns the account row as-is (with the decrypted password) but ALSO
 * surfaces a `has_password` boolean so consumers that only need to check
 * presence don't have to look at the actual secret. Keeping the password
 * in the renderer store fixes the bug where editing a saved account
 * showed the password field empty (data appeared lost to the user).
 */
function normalizeAccount(raw: Record<string, unknown>): Account {
  const password = typeof raw.password === 'string' ? raw.password : ''
  return {
    id: Number(raw.id),
    platform: String(raw.platform ?? ''),
    username: String(raw.username ?? ''),
    password: password || undefined,
    has_password: password.length > 0,
    proxy: typeof raw.proxy === 'string' ? raw.proxy : undefined,
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    status: String(raw.status ?? 'active'),
    created_at: String(raw.created_at ?? new Date().toISOString()),
  }
}

interface AccountsStore {
  accounts: Account[]
  loading: boolean
  loadAccounts: () => Promise<void>
  addAccount: (account: Omit<Account, 'id' | 'created_at'>) => Promise<void>
  updateAccount: (id: number, data: Partial<Account>) => Promise<void>
  deleteAccount: (id: number) => Promise<void>
  bulkDeleteAccounts: (ids: number[]) => Promise<number>
  deleteEmptyAccounts: () => Promise<number>
  deleteAllAccounts: () => Promise<number>
  getAccountsByPlatform: (platform: string) => Account[]
}

export const useAccountsStore = create<AccountsStore>((set, get) => ({
  accounts: [],
  loading: false,

  loadAccounts: async () => {
    set({ loading: true })
    try {
      const res = await window.electronAPI.dbQuery({ table: 'accounts', limit: 1000 })
      if (res?.success && Array.isArray(res.data)) {
        set({ accounts: res.data.map(normalizeAccount) })
      } else {
        console.error('loadAccounts: query failed', res)
      }
    } catch (err: unknown) {
      console.error('Failed to load accounts:', errorMessage(err))
    } finally {
      set({ loading: false })
    }
  },

  addAccount: async (account) => {
    // Strip undefined/empty optional fields before sending to IPC so the
    // DB doesn't store literal "undefined" strings.
    const payload: Record<string, unknown> = {
      platform: String(account.platform || '').trim(),
      username: String(account.username || '').trim(),
      status: String(account.status || 'active'),
    }
    if (account.password && account.password.trim().length > 0) {
      payload.password = account.password.trim()
    }
    if (account.proxy && account.proxy.trim().length > 0) {
      payload.proxy = account.proxy.trim()
    }
    if (account.notes && account.notes.trim().length > 0) {
      payload.notes = account.notes.trim()
    }

    if (!payload.platform || !payload.username) {
      throw new Error('المنصة واسم المستخدم مطلوبان')
    }

    try {
      const res = await window.electronAPI.dbInsert({ table: 'accounts', data: payload })
      if (!res?.success) {
        throw new Error(res?.error || 'فشل حفظ الحساب')
      }
      await get().loadAccounts()
    } catch (err: unknown) {
      console.error('dbInsert error:', err)
      throw err
    }
  },

  updateAccount: async (id, data) => {
    // Only send fields that actually changed (password stays unchanged if
    // omitted) and trim strings to avoid whitespace surprises.
    const payload: Record<string, unknown> = {}
    if (data.platform !== undefined) payload.platform = String(data.platform).trim()
    if (data.username !== undefined) payload.username = String(data.username).trim()
    if (data.status !== undefined) payload.status = String(data.status)
    if (data.password !== undefined && data.password.trim().length > 0) {
      payload.password = data.password.trim()
    }
    if (data.proxy !== undefined) {
      payload.proxy = data.proxy.trim().length > 0 ? data.proxy.trim() : ''
    }
    if (data.notes !== undefined) {
      payload.notes = data.notes.trim().length > 0 ? data.notes.trim() : ''
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('لا توجد تعديلات للحفظ')
    }

    try {
      const res = await window.electronAPI.dbUpdate({ table: 'accounts', id, data: payload })
      if (!res?.success) {
        throw new Error(res?.error || 'فشل تحديث الحساب')
      }
      await get().loadAccounts()
    } catch (err: unknown) {
      console.error('dbUpdate error:', err)
      throw err
    }
  },

  deleteAccount: async (id) => {
    // Previously this swallowed IPC errors so callers couldn't show the
    // user *why* delete failed (e.g. row already gone, DB locked). Now we
    // surface the failure so the UI toast can report it.
    try {
      const res = await window.electronAPI.dbDelete({ table: 'accounts', id })
      if (!res?.success) {
        throw new Error(res?.error || 'فشل حذف الحساب')
      }
      await get().loadAccounts()
    } catch (err: unknown) {
      console.error('Failed to delete account:', errorMessage(err))
      throw err
    }
  },

  bulkDeleteAccounts: async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return 0
    try {
      const res = await window.electronAPI.dbBulkDelete({ table: 'accounts', ids })
      if (!res?.success) throw new Error(res?.error || 'فشل الحذف الجماعي')
      await get().loadAccounts()
      // IPC returns { success, changes } at top level (not inside .data).
      // Be defensive — accept either location to survive shape drift.
      const r = res as { changes?: number; data?: { changes?: number } }
      return r.changes ?? r.data?.changes ?? 0
    } catch (err: unknown) {
      console.error('Failed bulk-delete accounts:', errorMessage(err))
      throw err
    }
  },

  deleteEmptyAccounts: async () => {
    try {
      const res = await window.electronAPI.dbDeleteEmptyAccounts()
      if (!res?.success) throw new Error(res?.error || 'فشل حذف الحسابات الفارغة')
      await get().loadAccounts()
      const r = res as { changes?: number; data?: { changes?: number } }
      return r.changes ?? r.data?.changes ?? 0
    } catch (err: unknown) {
      console.error('Failed delete-empty-accounts:', errorMessage(err))
      throw err
    }
  },

  deleteAllAccounts: async () => {
    try {
      const res = await window.electronAPI.dbDeleteAllAccounts()
      if (!res?.success) throw new Error(res?.error || 'فشل حذف الحسابات')
      await get().loadAccounts()
      const r = res as { changes?: number; data?: { changes?: number } }
      return r.changes ?? r.data?.changes ?? 0
    } catch (err: unknown) {
      console.error('Failed delete-all-accounts:', errorMessage(err))
      throw err
    }
  },

  getAccountsByPlatform: (platform) => {
    return get().accounts.filter((a) => a.platform === platform)
  },
}))
