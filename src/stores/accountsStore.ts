import { create } from 'zustand'

export interface Account {
  id: number
  platform: string
  username: string
  password?: string
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
    } catch (err: any) { console.error('Failed to load accounts:', err.message) }
  },

  addAccount: async (account) => {
    try {
      await window.electronAPI.dbInsert({ table: 'accounts', data: account })
      await get().loadAccounts()
    } catch (err: any) {
      console.error('dbInsert error:', err)
      throw err
    }
  },

  updateAccount: async (id, data) => {
    try {
      await window.electronAPI.dbUpdate({ table: 'accounts', id, data })
      await get().loadAccounts()
    } catch (err: any) {
      console.error('dbUpdate error:', err)
      throw err
    }
  },

  deleteAccount: async (id) => {
    try {
      await window.electronAPI.dbDelete({ table: 'accounts', id })
      await get().loadAccounts()
    } catch (err: any) { console.error('Failed to delete account:', err.message) }
  },

  getAccountsByPlatform: (platform) => {
    return get().accounts.filter(a => a.platform === platform)
  },
}))
