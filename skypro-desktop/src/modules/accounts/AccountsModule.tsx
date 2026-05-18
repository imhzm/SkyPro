import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAccountsStore } from '../../stores/accountsStore'
import { getPlatformGradient } from '../../data/platformGradients'
import {
  Users, Plus, Trash2, Edit3, Save, X, Search,
  Facebook, MessageCircle, Instagram, Twitter, Linkedin, Send,
  Globe, AtSign, Bookmark, Eye, EyeOff, CheckCircle, AlertCircle, Shield,
} from 'lucide-react'
import ModuleHeader from '../../components/common/ModuleHeader'

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
  const { accounts, loadAccounts, addAccount, updateAccount, deleteAccount } = useAccountsStore()
  const [filterPlatform, setFilterPlatform] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const showMsg = useCallback((msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') }
    else { setMessage(msg); setError('') }
    window.setTimeout(() => { setMessage(''); setError('') }, 5000)
  }, [])

  useEffect(() => { loadAccounts() }, [loadAccounts])

  // Reset delete-confirm after 4s of inactivity so it doesn't stick forever.
  useEffect(() => {
    if (deleteConfirmId === null) return
    const id = window.setTimeout(() => setDeleteConfirmId(null), 4000)
    return () => window.clearTimeout(id)
  }, [deleteConfirmId])

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
    if (!username) {
      showMsg('يرجى إدخال اسم المستخدم', true)
      return
    }
    setSaving(true)
    try {
      const payload = {
        platform: form.platform,
        username,
        password: form.password,
        proxy: form.proxy,
        notes: form.notes,
        status: form.status,
      }
      if (editingId) {
        await updateAccount(editingId, payload)
        showMsg('تم تحديث الحساب بنجاح ✓')
      } else {
        await addAccount(payload)
        showMsg(`تم حفظ الحساب "${username}" بنجاح ✓`)
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

  const handleDelete = async (acc: { id: number; username: string }) => {
    // First click: ask for confirmation.
    if (deleteConfirmId !== acc.id) {
      setDeleteConfirmId(acc.id)
      showMsg(`اضغط مرة أخرى لتأكيد حذف "${acc.username}"`, false)
      return
    }
    // Second click within 4s: actually delete.
    setDeleteConfirmId(null)
    try {
      await deleteAccount(acc.id)
      showMsg(`تم حذف "${acc.username}" ✓`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف'
      showMsg(`فشل الحذف: ${msg}`, true)
    }
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
                اسم المستخدم / البريد <span className="text-red-500">*</span>
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
                required
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
            <div>
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
            <div className="sm:col-span-2">
              <label htmlFor="acc-notes" className="label-field">ملاحظات</label>
              <input
                id="acc-notes"
                name="notes"
                type="text"
                className="input-field"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="مثال: حساب صفحات المتاجر / حساب رئيسي / ..."
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
                disabled={saving || !form.username.trim()}
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
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>المنصة</th>
                  <th>اسم المستخدم</th>
                  <th>البروكسي</th>
                  <th>الملاحظات</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((acc) => {
                  const p = platformInfo(acc.platform)
                  const gradient = getPlatformGradient(acc.platform)
                  const isConfirming = deleteConfirmId === acc.id
                  return (
                    <tr key={acc.id}>
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
                        <span className="font-medium text-secondary-800" dir="ltr">{acc.username || '—'}</span>
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
                      <td className="text-xs text-secondary-500 max-w-[220px] truncate">
                        {acc.notes || <span className="text-secondary-300">—</span>}
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
                            className={`p-1.5 rounded-lg transition-colors ${isConfirming ? 'animate-pulse' : ''}`}
                            style={{
                              color: isConfirming ? '#dc2626' : '#ef4444',
                              background: isConfirming
                                ? 'rgba(239, 68, 68, 0.20)'
                                : 'rgba(239, 68, 68, 0.08)',
                              border: `1.5px solid rgba(239, 68, 68, ${isConfirming ? 0.45 : 0.15})`,
                            }}
                            title={isConfirming ? 'اضغط مرة أخرى للتأكيد' : 'حذف'}
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
        )}
      </div>
    </div>
  )
}
