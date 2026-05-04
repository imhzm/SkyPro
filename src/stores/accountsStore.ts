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

interface AccountsStore {
  accounts: Account[]
  loading: boolean
  loadAccounts: () => Promise<void>
  addAccount: (account: Omit<Account, 'id' | 'created_at'>) => Promise<void>
  updateAccount: (id: number, data: Partial<Account>) => Promise<void>
  deleteAccount: (id: number) => Promise<void>
  getAccountsByPlatform: (platform: string) => Account[]
}

export const useAccountsStore = create<AccountsStore>((set, get) => ({
  accounts: [],
  loading: false,

  loadAccounts: async () => {
    try {
      const res = await window.electronAPI.dbQuery({ table: 'accounts', limit: 1000 })
      if (res.success && res.data) set({ accounts: res.data || [] })
    } catch (err: unknown) { console.error('Failed to load accounts:', errorMessage(err)) }
  },

  addAccount: async (account) => {
    try {
      await window.electronAPI.dbInsert({ table: 'accounts', data: account })
      await get().loadAccounts()
    } catch (err: unknown) {
      console.error('dbInsert error:', err)
      throw err
    }
  },

  updateAccount: async (id, data) => {
    try {
      await window.electronAPI.dbUpdate({ table: 'accounts', id, data })
      await get().loadAccounts()
    } catch (err: unknown) {
      console.error('dbUpdate error:', err)
      throw err
    }
  },

  deleteAccount: async (id) => {
    try {
      await window.electronAPI.dbDelete({ table: 'accounts', id })
      await get().loadAccounts()
    } catch (err: unknown) { console.error('Failed to delete account:', errorMessage(err)) }
  },

  getAccountsByPlatform: (platform) => {
    return get().accounts.filter(a => a.platform === platform)
  },
}))
