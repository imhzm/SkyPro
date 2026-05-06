'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Ban,
  Check,
  Copy,
  Key,
  Mail,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X
} from 'lucide-react'

interface LatestKey {
  keyCode: string
  status: string
  expiresAt: string | null
  maxDevices: number
}

interface Subscription {
  status?: string
  trialEndsAt?: string | null
  expiresAt?: string | null
}

interface User {
  id: number
  email: string
  name: string | null
  role: string
  status: string
  emailVerifiedAt: string | null
  createdAt: string
  keysCount: number
  devicesCount: number
  subscription: Subscription | null
  latestKey: LatestKey | null
}

interface NewUser {
  email: string
  name: string
  sendEmail: boolean
  emailSent?: boolean
  emailError?: string
  password?: string
  serial?: string
}

interface Notice {
  type: 'success' | 'error' | 'warning'
  message: string
}

const statusLabel: Record<string, string> = {
  active: 'نشط',
  suspended: 'محظور',
  deleted: 'محذوف',
  available: 'متاح',
  assigned: 'مخصص',
  expired: 'منتهي',
  revoked: 'ملغي',
  trial: 'تجريبي',
  cancelled: 'ملغي'
}

function badgeClass(status: string) {
  if (status === 'active' || status === 'available' || status === 'trial') return 'admin-badge-success'
  if (status === 'suspended' || status === 'deleted' || status === 'revoked' || status === 'cancelled') return 'admin-badge-danger'
  if (status === 'expired') return 'admin-badge-warning'
  return 'admin-badge-info'
}

function formatDate(value?: string | null) {
  if (!value) return 'غير محدد'
  return new Date(value).toLocaleDateString('ar-EG')
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [reloadToken, setReloadToken] = useState(0)

  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createdUser, setCreatedUser] = useState<NewUser | null>(null)
  const [copied, setCopied] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)

  const [pendingBanUser, setPendingBanUser] = useState<User | null>(null)
  const [suspensionReason, setSuspensionReason] = useState('')
  const [actionUserId, setActionUserId] = useState<number | null>(null)

  const loadUsers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
      search: searchTerm,
      status: statusFilter,
      role: roleFilter
    })

    fetch(`/api/admin/users?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUsers(data.data.users)
          setStatusCounts(data.data.statusCounts || {})
          setTotal(data.data.total)
          setTotalPages(data.data.totalPages)
        } else {
          setNotice({ type: 'error', message: data.error || 'فشل تحميل المستخدمين' })
        }
      })
      .catch(() => setNotice({ type: 'error', message: 'فشل الاتصال بالخادم' }))
      .finally(() => setLoading(false))
  }, [page, searchTerm, statusFilter, roleFilter])

  useEffect(() => {
    loadUsers()
  }, [loadUsers, reloadToken])

  const summaryCards = useMemo(() => {
    const active = statusCounts.active || 0
    const suspended = statusCounts.suspended || 0
    const deleted = statusCounts.deleted || 0
    const all = Object.values(statusCounts).reduce((sum, count) => sum + count, 0)

    return [
      { label: 'كل المستخدمين', value: all, icon: Users, className: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
      { label: 'نشط', value: active, icon: ShieldCheck, className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
      { label: 'محظور', value: suspended, icon: ShieldAlert, className: 'text-red-400 bg-red-500/10 border-red-500/20' },
      { label: 'محذوف', value: deleted, icon: Ban, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
    ]
  }, [statusCounts])

  const runSearch = () => {
    setPage(1)
    setSearchTerm(searchInput.trim())
    setReloadToken((value) => value + 1)
  }

  const refreshUsers = () => setReloadToken((value) => value + 1)

  const updateStatus = async (user: User, status: 'active' | 'suspended', reason?: string) => {
    setActionUserId(user.id)
    setNotice(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, status, suspensionReason: reason })
      })
      const data = await res.json()

      if (data.success) {
        setNotice({
          type: data.data?.emailSent === false ? 'warning' : 'success',
          message: data.message || 'تم تحديث المستخدم بنجاح'
        })
        setPendingBanUser(null)
        setSuspensionReason('')
        refreshUsers()
      } else {
        setNotice({ type: 'error', message: data.error || 'فشلت العملية' })
      }
    } catch {
      setNotice({ type: 'error', message: 'فشل الاتصال بالخادم' })
    } finally {
      setActionUserId(null)
    }
  }

  const handleCreate = async () => {
    if (!newEmail.trim()) return
    setCreating(true)
    setNotice(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim(), name: newName.trim(), sendEmail })
      })
      const data = await res.json()

      if (data.success) {
        setCreatedUser({
          email: data.data.user.email,
          name: data.data.user.name || '',
          password: data.data.password,
          serial: data.data.serial,
          sendEmail,
          emailSent: data.data.emailSent,
          emailError: data.data.emailError
        })
        setNotice({
          type: data.data.emailSent === false ? 'warning' : 'success',
          message: data.message || 'تم إنشاء المستخدم بنجاح'
        })
        setNewEmail('')
        setNewName('')
        refreshUsers()
      } else {
        setNotice({ type: 'error', message: data.error || 'فشل إنشاء المستخدم' })
      }
    } catch {
      setNotice({ type: 'error', message: 'فشل الاتصال بالخادم' })
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة المستخدمين</h1>
          <p className="mt-1 text-sm text-slate-400">إدارة الحسابات، الحظر، السيريالات، والأجهزة المرتبطة بالبرنامج.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={refreshUsers} className="admin-btn-secondary">
            <RefreshCw size={16} />
            تحديث
          </button>
          <button onClick={() => { setShowAdd(!showAdd); setCreatedUser(null) }} className="admin-btn-primary">
            <Plus size={18} />
            {showAdd ? 'إغلاق الإضافة' : 'إضافة مستخدم'}
          </button>
        </div>
      </div>

      {notice && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          notice.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
            : notice.type === 'warning'
              ? 'border-amber-500/20 bg-amber-500/10 text-amber-300'
              : 'border-red-500/20 bg-red-500/10 text-red-300'
        }`}>
          {notice.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-slate-400">{card.label}</div>
                <div className="mt-1 text-2xl font-bold text-white">{card.value.toLocaleString('ar-EG')}</div>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${card.className}`}>
                <card.icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="admin-card !border !border-sky-500/30">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">إضافة مستخدم جديد</h2>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-white" aria-label="إغلاق">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="admin-label">البريد الإلكتروني *</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="admin-input"
                placeholder="user@example.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className="admin-label">الاسم</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="admin-input"
                placeholder="اسم المستخدم"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="sendEmail" className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                id="sendEmail"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="h-4 w-4"
              />
              <Mail size={14} />
              إرسال بيانات التفعيل عبر الإيميل
            </label>
            <button
              onClick={handleCreate}
              disabled={creating || !newEmail.trim()}
              className="admin-btn-success disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? 'جارٍ الإنشاء...' : 'إنشاء مستخدم وسيريال'}
            </button>
          </div>

          {createdUser && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <h3 className="mb-3 font-bold text-emerald-300">تم الإنشاء بنجاح</h3>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <CredentialValue label="البريد" value={createdUser.email} copied={copied} copyKey="email" onCopy={copyToClipboard} />
                {createdUser.password && <CredentialValue label="كلمة المرور" value={createdUser.password} copied={copied} copyKey="pass" onCopy={copyToClipboard} />}
                {createdUser.serial && <CredentialValue label="السيريال" value={createdUser.serial} copied={copied} copyKey="serial" onCopy={copyToClipboard} />}
              </div>
              {createdUser.sendEmail && (
                <p className={`mt-3 text-xs ${createdUser.emailSent ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {createdUser.emailSent
                    ? 'تم إرسال الإيميل بنجاح.'
                    : `تم إنشاء الحساب لكن فشل إرسال الإيميل.${createdUser.emailError ? ` (${createdUser.emailError})` : ''}`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="admin-card">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="بحث بالاسم أو البريد..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="admin-input pr-10"
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="admin-select"
          >
            <option value="">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="suspended">محظور</option>
            <option value="deleted">محذوف</option>
          </select>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            className="admin-select"
          >
            <option value="">كل الصلاحيات</option>
            <option value="user">مستخدم</option>
            <option value="admin">أدمن</option>
          </select>
          <button onClick={runSearch} className="admin-btn-primary">
            <Search size={16} />
            بحث
          </button>
        </div>
      </div>

      <div className="admin-card">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-bold text-white">قائمة المستخدمين</h2>
          <span className="text-sm text-slate-500">النتائج الحالية: {total.toLocaleString('ar-EG')}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center text-slate-400">
            لا توجد نتائج مطابقة.
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الحالة</th>
                  <th>آخر سيريال</th>
                  <th>الاشتراك</th>
                  <th>الأجهزة</th>
                  <th>تاريخ التسجيل</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="font-medium text-white">{user.name || 'بدون اسم'}</div>
                      <div className="mt-1 text-xs text-slate-400" dir="ltr">{user.email}</div>
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        <span className={badgeClass(user.status)}>{statusLabel[user.status] || user.status}</span>
                        <span className={user.role === 'admin' ? 'admin-badge-info' : 'admin-badge-warning'}>
                          {user.role === 'admin' ? 'أدمن' : 'مستخدم'}
                        </span>
                      </div>
                    </td>
                    <td>
                      {user.latestKey ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Key size={14} />
                            <code dir="ltr">{user.latestKey.keyCode}</code>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={badgeClass(user.latestKey.status)}>{statusLabel[user.latestKey.status] || user.latestKey.status}</span>
                            <span className="text-xs text-slate-500">حتى {formatDate(user.latestKey.expiresAt)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">لا يوجد</span>
                      )}
                    </td>
                    <td>
                      {user.subscription?.status ? (
                        <div className="space-y-1">
                          <span className={badgeClass(user.subscription.status)}>{statusLabel[user.subscription.status] || user.subscription.status}</span>
                          <div className="text-xs text-slate-500">حتى {formatDate(user.subscription.expiresAt || user.subscription.trialEndsAt)}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500">لا يوجد</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 text-xs text-slate-300">
                        <span className="flex items-center gap-2"><Monitor size={14} /> {user.devicesCount} جهاز</span>
                        <span className="flex items-center gap-2"><Key size={14} /> {user.keysCount} مفتاح</span>
                      </div>
                    </td>
                    <td className="text-slate-500">{formatDate(user.createdAt)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {user.status === 'active' && (
                          <button
                            onClick={() => setPendingBanUser(user)}
                            disabled={actionUserId === user.id}
                            className="admin-btn-danger !px-3 !py-2 disabled:cursor-not-allowed disabled:opacity-50"
                            title="حظر المستخدم"
                          >
                            <Ban size={15} />
                            حظر
                          </button>
                        )}
                        {user.status === 'suspended' && (
                          <button
                            onClick={() => updateStatus(user, 'active')}
                            disabled={actionUserId === user.id}
                            className="admin-btn-success !px-3 !py-2 disabled:cursor-not-allowed disabled:opacity-50"
                            title="فك الحظر"
                          >
                            <UserCheck size={15} />
                            فك الحظر
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="admin-btn-secondary !px-3 !py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              السابق
            </button>
            <span className="text-sm text-slate-500">{page} من {totalPages}</span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="admin-btn-secondary !px-3 !py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        )}
      </div>

      {pendingBanUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-red-500/20 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">حظر المستخدم</h2>
                <p className="mt-1 text-sm text-slate-400">سيتم تعطيل السيريالات والأجهزة والجلسات، وإرسال رسالة واضحة على الإيميل.</p>
              </div>
              <button onClick={() => setPendingBanUser(null)} className="text-slate-400 hover:text-white" aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm">
              <div className="font-medium text-white">{pendingBanUser.name || 'بدون اسم'}</div>
              <div className="mt-1 text-slate-400" dir="ltr">{pendingBanUser.email}</div>
            </div>
            <label className="admin-label">سبب الحظر الظاهر في الإيميل</label>
            <textarea
              value={suspensionReason}
              onChange={(e) => setSuspensionReason(e.target.value)}
              className="admin-input min-h-28 resize-none"
              maxLength={500}
              placeholder="مثال: تم رصد استخدام مخالف لشروط الخدمة."
            />
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => setPendingBanUser(null)} className="admin-btn-secondary">
                إلغاء
              </button>
              <button
                onClick={() => updateStatus(pendingBanUser, 'suspended', suspensionReason.trim())}
                disabled={actionUserId === pendingBanUser.id}
                className="admin-btn-danger disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Ban size={16} />
                تأكيد الحظر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CredentialValue({
  label,
  value,
  copied,
  copyKey,
  onCopy
}: {
  label: string
  value: string
  copied: string
  copyKey: string
  onCopy: (text: string, label: string) => void
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
      <div className="mb-1 text-xs text-slate-400">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <code className="min-w-0 truncate text-sm text-white" dir="ltr">{value}</code>
        <button onClick={() => onCopy(value, copyKey)} className="shrink-0 text-slate-400 hover:text-white" aria-label={`نسخ ${label}`}>
          {copied === copyKey ? <Check size={15} className="text-emerald-300" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  )
}
