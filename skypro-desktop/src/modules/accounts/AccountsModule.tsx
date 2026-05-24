import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccountsStore } from '../../stores/accountsStore'
import { getPlatformGradient } from '../../data/platformGradients'
import {
  Users, Plus, Trash2, Edit3, Save, X, Search,
  Facebook, MessageCircle, Instagram, Twitter, Linkedin, Send,
  Globe, AtSign, Bookmark, Eye, EyeOff, CheckCircle, AlertCircle, Shield,
  CheckSquare, Square as SquareIcon, Filter, AlertOctagon,
} from 'lucide-react'
import ModuleHeader from '../../components/common/ModuleHeader'
import ConfirmDialog from '../../components/common/ConfirmDialog'

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'twitter', label: 'Twitter / X', icon: Twitter },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'telegram', label: 'Telegram', icon: Send },
  { id: 'tiktok', label: 'TikTok', icon: Globe },
  { id: 'pinterest', label: 'Pinterest', icon: Bookmark },
  { id: 'snapchat', label: 'Snapchat', icon: Globe },
  { id: 'threads', label: 'Threads', icon: AtSign },
  { id: 'reddit', label: 'Reddit', icon: Globe },
]

interface FormState {
  platform: string
  username: string
  password: string
  proxy: string
  notes: string
  status: 'active' | 'inactive'
}

const EMPTY_FORM: FormState = {
  platform: 'facebook',
  username: '',
  password: '',
  proxy: '',
  notes: '',
  status: 'active',
}

export default function AccountsModule() {
  const { accounts, loadAccounts, addAccount, updateAccount, deleteAccount, bulkDeleteAccounts, deleteEmptyAccounts, deleteAllAccounts } = useAccountsStore()
  const [filterPlatform, setFilterPlatform] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  // Confirmation modal state — replaces window.confirm() which can hang
  // the renderer thread in sandboxed Electron.
  type ConfirmState =
    | { open: false }
    | {
        open: true
        title: string
        message: string
        confirmLabel?: string
        danger?: boolean
        onConfirm: () => void | Promise<void>
      }
  const [confirm, setConfirm] = useState<ConfirmState>({ open: false })
  const [confirmBusy, setConfirmBusy] = useState(false)

  const showMsg = useCallback((msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') }
    else { setMessage(msg); setError('') }
    window.setTimeout(() => { setMessage(''); setError('') }, 5000)
  }, [])

  // On mount: load accounts. The db-query handler now does read-time
  // cleanup of garbage rows automatically, so any stuck empty row from
  // before this fix gets silently purged on first open.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // First call triggers read-time cleanup AND returns the cleaned list.
        await loadAccounts()
        if (cancelled) return
        // Belt + suspenders: also fire the explicit empty-row cleanup so
        // users on older DBs get their leftover garbage rows wiped on first
        // page open after upgrading.
        try {
          await window.electronAPI.dbDeleteEmptyAccounts()
          if (!cancelled) await loadAccounts()
        } catch { /* non-fatal — read-time cleanup already handled it */ }
      } catch (err) {
        console.error('[AccountsModule] initial load failed:', err)
      }
    })()
    return () => { cancelled = true }
  }, [loadAccounts])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return accounts.filter((a) => {
      if (filterPlatform && a.platform !== filterPlatform) return false
      if (!q) return true
      return (
        a.username.toLowerCase().includes(q) ||
        (a.notes || '').toLowerCase().includes(q)
      )
    })
  }, [accounts, filterPlatform, searchQuery])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const username = form.username.trim()
    const notes = form.notes.trim()
    const proxy = form.proxy.trim()
    // Require at least ONE identifying piece of info. Username, label,
    // and proxy are all optional individually — but we need *something*
    // to distinguish this row from a completely empty placeholder.
    if (!username && !notes && !proxy) {
      showMsg('املأ على الأقل: اسم المستخدم، أو الاسم المميز، أو البروكسي', true)
      return
    }
    setSaving(true)
    try {
      const payload = {
        platform: form.platform,
        // Synthesize a placeholder username if user only filled the label.
        // saveAccount triggers + sanitizer require non-empty platform/username,
        // so we derive a stable internal ID from the label/proxy.
        username: username || `[${notes || proxy.substring(0, 20)}]`,
        password: form.password,
        proxy,
        notes,
        status: form.status,
      }
      if (editingId) {
        await updateAccount(editingId, payload)
        showMsg('تم تحديث الحساب بنجاح ✓')
      } else {
        await addAccount(payload)
        const displayLabel = notes || username || proxy
        showMsg(`تم حفظ الحساب "${displayLabel}" بنجاح ✓`)
      }
      setForm(EMPTY_FORM)
      setEditingId(null)
      setShowForm(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف أثناء الحفظ'
      // Show the actual error so the user knows WHY it failed (was hidden before).
      showMsg(`فشل الحفظ: ${msg}`, true)
      console.error('Save account failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (acc: { id: number; platform: string; username: string; password?: string; proxy?: string; notes?: string; status: string }) => {
    setForm({
      platform: acc.platform || 'facebook',
      username: acc.username || '',
      // Pre-fill password from store (kept by normalizeAccount); if it's
      // unset, the placeholder tells the user it stays unchanged.
      password: acc.password || '',
      proxy: acc.proxy || '',
      notes: acc.notes || '',
      status: (acc.status === 'inactive' ? 'inactive' : 'active'),
    })
    setEditingId(acc.id)
    setShowForm(true)
    setError('')
    setMessage('')
    // Bring the form into view since it's at the top of the page.
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Wrap any async operation with a hard timeout so the UI can't hang
  // forever if the IPC never responds. Returns the operation result or
  // throws a clear timeout error the user can see.
  const withTimeout = useCallback(async <T,>(p: Promise<T>, ms = 10000, label = 'العملية'): Promise<T> => {
    return Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} تجاوزت ${ms}ms - حاول مرة أخرى`)), ms))
    ])
  }, [])

  const handleDelete = (acc: { id: number; username: string; notes?: string }) => {
    const label = acc.notes?.trim() || acc.username?.trim() || 'الصف الفارغ'
    setConfirm({
      open: true,
      title: 'حذف الحساب',
      message: `هل تريد فعلاً حذف "${label}"؟\nلا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'نعم، احذف',
      danger: true,
      onConfirm: async () => {
        setDeletingId(acc.id)
        setConfirmBusy(true)
        try {
          await withTimeout(deleteAccount(acc.id), 15000, 'حذف الحساب')
          showMsg(`تم حذف "${label}" ✓`)
          setConfirm({ open: false })
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'خطأ غير معروف'
          showMsg(`فشل الحذف: ${msg}`, true)
          setConfirm({ open: false })
        } finally {
          setDeletingId(null)
          setConfirmBusy(false)
        }
      },
    })
  }

  const handleDeleteAll = () => {
    setConfirm({
      open: true,
      title: 'حذف جميع الحسابات',
      message: `⚠️ تأكيد نهائي: حذف الـ ${accounts.length} حساب جميعها؟\nسيتم مسح كل بيانات الحسابات المحفوظة. لا يمكن التراجع.`,
      confirmLabel: 'حذف الكل نهائياً',
      danger: true,
      onConfirm: async () => {
        setBulkBusy(true)
        setConfirmBusy(true)
        try {
          const removed = await withTimeout(deleteAllAccounts(), 15000, 'حذف الكل')
          showMsg(`تم حذف جميع الحسابات (${removed}) ✓`)
          setSelectedIds(new Set())
          setConfirm({ open: false })
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'خطأ غير معروف'
          showMsg(`فشل الحذف: ${msg}`, true)
          setConfirm({ open: false })
        } finally {
          setBulkBusy(false)
          setConfirmBusy(false)
        }
      },
    })
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id)))
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) { showMsg('لم يتم تحديد أي حسابات', true); return }
    setConfirm({
      open: true,
      title: 'حذف الحسابات المحددة',
      message: `حذف ${selectedIds.size} حساب؟ لا يمكن التراجع.`,
      confirmLabel: 'حذف',
      danger: true,
      onConfirm: async () => {
        setBulkBusy(true)
        setConfirmBusy(true)
        try {
          const removed = await withTimeout(bulkDeleteAccounts(Array.from(selectedIds)), 15000, 'الحذف الجماعي')
          setSelectedIds(new Set())
          showMsg(`تم حذف ${removed} حساب ✓`)
          setConfirm({ open: false })
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'خطأ غير معروف'
          showMsg(`فشل الحذف الجماعي: ${msg}`, true)
          setConfirm({ open: false })
        } finally {
          setBulkBusy(false)
          setConfirmBusy(false)
        }
      },
    })
  }

  const handleDeleteEmpty = async () => {
    // No confirmation — this is a non-destructive "cleanup" action (only
    // affects rows that are already empty/garbage from the user's POV).
    setBulkBusy(true)
    try {
      const removed = await withTimeout(deleteEmptyAccounts(), 10000, 'حذف الفارغة')
      if (removed === 0) {
        // Nothing matched as "empty" but the user clearly sees rows with —.
        // Surface a debug view so we can tell what's actually in the DB.
        try {
          const dbg = await window.electronAPI.dbDebugAccounts()
          if (dbg.success && Array.isArray(dbg.data) && dbg.data.length > 0) {
            const summary = dbg.data
              .slice(0, 5)
              .map((r) => `#${r.id} platform=${JSON.stringify(r.platform)} username=${JSON.stringify(r.username)} (len=${r.username_len}, hex=${r.username_hex || ''})`)
              .join('\n')
            console.warn('[accounts] debug dump after empty-delete returned 0:\n' + summary)
            showMsg(`لا يوجد ما يطابق "فارغ" — تفاصيل الصفوف في الـ console (${dbg.data.length} صف)`, true)
            return
          }
        } catch { /* ignore */ }
        showMsg('مفيش حسابات فارغة للحذف', false)
      } else {
        showMsg(`تم حذف ${removed} حساب فارغ ✓`)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف'
      showMsg(`فشل حذف الحسابات الفارغة: ${msg}`, true)
    }
    setBulkBusy(false)
  }

  const platformInfo = (pid: string) => PLATFORMS.find((p) => p.id === pid) || { id: pid, label: pid, icon: Globe }

  const startAdd = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
    setError('')
    setMessage('')
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl text-sm font-medium sw-fade-in-up"
          style={
            message
              ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a' }
              : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }
          }
        >
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      <ModuleHeader
        title="الحسابات المحفوظة"
        subtitle="إدارة جميع حسابات السوشيال ميديا في مكان واحد · يمكنك استخدامها للتدوير التلقائي بين المنصات"
        icon={Users}
        badge={{ label: `${accounts.length} حساب`, tone: 'neutral' }}
        action={
          <button
            onClick={() => (showForm ? setShowForm(false) : startAdd())}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all flex items-center gap-1.5"
            style={{
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 100%)',
              border: '1px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {showForm ? (<><X size={15} /> إغلاق</>) : (<><Plus size={15} /> إضافة حساب</>)}
          </button>
        }
      />

      {/* Platform Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
        {PLATFORMS.slice(0, 6).map((p) => {
          const count = accounts.filter((a) => a.platform === p.id).length
          const gradient = getPlatformGradient(p.id)
          const isActive = filterPlatform === p.id
          return (
            <button
              key={p.id}
              onClick={() => setFilterPlatform(filterPlatform === p.id ? '' : p.id)}
              className="group flex items-center gap-2.5 p-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${isActive ? '#6366f1' : 'rgba(226,232,240,0.5)'}`,
                boxShadow: isActive ? '0 4px 16px rgba(99,102,241,0.15)' : 'none',
              }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 transition-shadow group-hover:shadow-md" style={{ background: gradient }}>
                <p.icon size={16} />
              </div>
              <div className="min-w-0 text-right">
                <p className="text-xs font-semibold text-secondary-900 truncate">{p.label}</p>
                <p className="text-[10px] text-secondary-400">{count} حساب</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Add/Edit Form — using a real <form> with onSubmit so Enter key works
          AND so the browser surfaces native required-field validation. */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card-gradient-border sw-fade-in-up" noValidate>
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{
                background: editingId
                  ? 'linear-gradient(135deg, #6366f1, #a855f7)'
                  : 'linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7)',
                boxShadow: '0 6px 16px rgba(99, 102, 241, 0.30)',
              }}
            >
              {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
            </div>
            <div>
              <h3 className="font-bold text-secondary-900 text-base leading-tight">
                {editingId ? 'تعديل الحساب' : 'إضافة حساب جديد'}
              </h3>
              <p className="text-xs text-secondary-500 mt-0.5">
                {editingId
                  ? 'حدّث بيانات الحساب — اترك الباسورد فارغاً للإبقاء على القديم'
                  : 'أضف حساب سوشيال ميديا لاستخدامه في الأتمتة والتدوير'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Custom label — shown FIRST and full-width for visibility. */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="acc-notes" className="label-field flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span>
                اسم مميز للحساب
                <span className="text-[10px] font-normal text-secondary-500 mr-2">
                  (تسمية خاصة بك لتمييز هذا الحساب — مثل: حساب المتاجر، حساب رئيسي، إلخ)
                </span>
              </label>
              <input
                id="acc-notes"
                name="notes"
                type="text"
                className="input-field text-base font-medium"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="مثال: حساب صفحات المتاجر • حساب التسويق الرئيسي • حساب احتياطي ..."
                maxLength={100}
              />
            </div>
            <div>
              <label htmlFor="acc-platform" className="label-field">المنصة</label>
              <select
                id="acc-platform"
                name="platform"
                className="select-field"
                value={form.platform}
                onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value }))}
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="acc-username" className="label-field">
                اسم المستخدم / البريد
                <span className="text-[10px] font-normal text-secondary-500 mr-2">(اختياري)</span>
              </label>
              <input
                id="acc-username"
                name="username"
                type="text"
                className="input-field"
                dir="ltr"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="username أو email"
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="acc-password" className="label-field">كلمة المرور</label>
              <div className="relative">
                <input
                  id="acc-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field pl-10"
                  dir="ltr"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editingId ? '••• (اتركه فارغاً للإبقاء)' : '••••••••'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-brand-700 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'إخفاء' : 'إظهار'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="acc-proxy" className="label-field">بروكسي (اختياري)</label>
              <input
                id="acc-proxy"
                name="proxy"
                type="text"
                className="input-field font-mono text-sm"
                dir="ltr"
                value={form.proxy}
                onChange={(e) => setForm((f) => ({ ...f, proxy: e.target.value }))}
                placeholder="user:pass@host:port"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4" style={{ borderTop: '1px solid rgba(226, 232, 240, 0.6)' }}>
            <p className="text-[11px] text-secondary-500 flex items-center gap-1.5">
              <Shield size={12} style={{ color: '#a855f7' }} />
              <span>الباسورد محفوظ مشفر — يستخدم فقط داخل البرنامج</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM) }}
                className="btn-secondary"
                disabled={saving}
              >
                <X size={16} /> إلغاء
              </button>
              <button
                type="submit"
                disabled={saving || (!form.username.trim() && !form.notes.trim() && !form.proxy.trim())}
                className="btn-primary"
              >
                <Save size={16} />
                {saving ? 'جاري الحفظ...' : (editingId ? 'حفظ التعديلات' : 'إضافة الحساب')}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Search + Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input
            type="text"
            className="input-field pr-10"
            placeholder="بحث في الحسابات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-48">
          <select
            className="select-field"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
          >
            <option value="">كل المنصات</option>
            {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card-gradient-border" style={{ padding: '0', overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div
              className="relative w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{
                background:
                  'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(168, 85, 247, 0.08))',
                border: '1px solid rgba(99, 102, 241, 0.20)',
              }}
            >
              <span
                aria-hidden
                className="absolute inset-0 -m-2 rounded-2xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, transparent 65%)',
                  filter: 'blur(12px)',
                }}
              />
              <Users size={34} className="relative" style={{ color: '#7c3aed' }} />
            </div>
            <p className="text-secondary-700 font-bold">
              {searchQuery || filterPlatform ? 'لا توجد نتائج مطابقة' : 'لا توجد حسابات بعد'}
            </p>
            <p className="text-xs text-secondary-400 mt-1.5 max-w-md mx-auto">
              {searchQuery || filterPlatform
                ? 'جرّب تغيير كلمة البحث أو إزالة الفلتر'
                : 'أضف حساباتك من مختلف المنصات لاستخدامها في الأتمتة والتدوير'}
            </p>
            {!(searchQuery || filterPlatform) && (
              <button
                onClick={startAdd}
                className="btn-primary mt-5 mx-auto"
              >
                <Plus size={16} /> أضف حسابك الأول
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Bulk action toolbar */}
            <div className="px-4 py-3 border-b border-secondary-100 flex flex-wrap items-center gap-2 bg-white/40">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="btn-secondary text-xs"
                title={selectedIds.size === filtered.length && filtered.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
              >
                {selectedIds.size === filtered.length && filtered.length > 0
                  ? <><CheckSquare size={14} /> إلغاء تحديد الكل</>
                  : <><SquareIcon size={14} /> تحديد الكل</>}
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={bulkBusy}
                  className="btn-danger text-xs disabled:opacity-50"
                >
                  <Trash2 size={14} /> حذف {selectedIds.size} حساب
                </button>
              )}
              <button
                type="button"
                onClick={handleDeleteEmpty}
                disabled={bulkBusy}
                className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-50"
                style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.25)', color: '#b45309' }}
                title="حذف كل الصفوف بدون اسم مستخدم"
              >
                <Filter size={14} className="inline ml-1" /> حذف الحسابات الفارغة
              </button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={bulkBusy || accounts.length === 0}
                className="text-xs px-3 py-1.5 rounded-lg border disabled:opacity-50"
                style={{ background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.3)', color: '#991b1b' }}
                title="حذف كل الحسابات في الجدول"
              >
                <Trash2 size={14} className="inline ml-1" /> حذف الكل ({accounts.length})
              </button>
              <div className="text-xs text-secondary-500 mr-auto">
                {selectedIds.size > 0 && `${selectedIds.size} محدد • `}
                {filtered.length} حساب{filtered.length !== 1 ? '' : ''}
              </div>
            </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-secondary-500 hover:text-brand-600 transition-colors"
                      title="تحديد الكل"
                    >
                      {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={16} /> : <SquareIcon size={16} />}
                    </button>
                  </th>
                  <th>المنصة</th>
                  <th>الاسم المميز / اسم المستخدم</th>
                  <th>البروكسي</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((acc) => {
                  const p = platformInfo(acc.platform)
                  const gradient = getPlatformGradient(acc.platform)
                  const isSelected = selectedIds.has(acc.id)
                  return (
                    <tr key={acc.id} style={isSelected ? { background: 'rgba(99,102,241,0.05)' } : undefined}>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleSelect(acc.id)}
                          className="text-secondary-500 hover:text-brand-600 transition-colors"
                        >
                          {isSelected ? <CheckSquare size={16} className="text-brand-600" /> : <SquareIcon size={16} />}
                        </button>
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                            style={{ background: gradient }}
                          >
                            <p.icon size={15} />
                          </div>
                          <span className="font-semibold text-sm text-secondary-800">{p.label}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-0.5 max-w-[280px]">
                          {acc.notes ? (
                            <>
                              <span
                                className="font-bold text-sm text-violet-700 truncate"
                                dir="auto"
                                title={acc.notes}
                              >
                                {acc.notes}
                              </span>
                              <span className="text-[11px] text-secondary-500 truncate font-mono" dir="ltr" title={acc.username}>
                                {acc.username || '—'}
                              </span>
                            </>
                          ) : (
                            <span className="font-medium text-secondary-800 truncate" dir="ltr" title={acc.username}>
                              {acc.username || '—'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {acc.proxy ? (
                          <code className="text-[10.5px] font-mono px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200" dir="ltr">
                            {acc.proxy.replace(/^.*@/, '*****@')}
                          </code>
                        ) : (
                          <span className="text-secondary-400">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'} text-[10px]`}>
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{
                              background: acc.status === 'active' ? '#22c55e' : '#94a3b8',
                              boxShadow: acc.status === 'active' ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
                            }}
                          />
                          {acc.status === 'active' ? 'نشط' : 'غير نشط'}
                        </span>
                      </td>
                      <td className="text-xs text-secondary-500">
                        {acc.created_at ? new Date(acc.created_at).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleEdit(acc)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{
                              color: '#6366f1',
                              background: 'rgba(99, 102, 241, 0.08)',
                              border: '1px solid rgba(99, 102, 241, 0.15)',
                            }}
                            title="تعديل"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(acc)}
                            disabled={deletingId === acc.id || bulkBusy}
                            className="p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                              color: '#ef4444',
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1.5px solid rgba(239, 68, 68, 0.15)',
                            }}
                            title="حذف"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Force-clean recovery: emergency button for the case where the
          DB has unkillable garbage rows that don't respond to normal delete.
          Calls db-delete-all-accounts as a last resort. */}
      {accounts.length > 0 && (
        <div className="flex items-center justify-end mt-2">
          <button
            type="button"
            onClick={handleDeleteAll}
            disabled={bulkBusy}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            style={{
              background: 'rgba(239, 68, 68, 0.06)',
              color: '#b91c1c',
              border: '1px solid rgba(239, 68, 68, 0.20)',
            }}
            title="استخدم هذا إذا كانت هناك حسابات لا يمكن حذفها بالطريقة العادية"
          >
            <AlertOctagon size={12} />
            إعادة تعيين قاعدة الحسابات
          </button>
        </div>
      )}

      {/* Confirmation modal — replaces window.confirm() to prevent renderer
          freezes in sandboxed Electron. */}
      {confirm.open && (
        <ConfirmDialog
          open={confirm.open}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          busy={confirmBusy}
          onConfirm={confirm.onConfirm}
          onClose={() => { if (!confirmBusy) setConfirm({ open: false }) }}
        />
      )}
    </div>
  )
}
