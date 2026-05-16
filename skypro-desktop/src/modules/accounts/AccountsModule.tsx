import { useState, useEffect } from 'react'
import { useAccountsStore } from '../../stores/accountsStore'
import { getPlatformGradient } from '../../data/platformGradients'
import { Users, Plus, Trash2, Edit3, Save, X, Search, Facebook, MessageCircle, Instagram, Twitter, Linkedin, Send, Globe, AtSign, Bookmark, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'
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

export default function AccountsModule() {
  const { accounts, loadAccounts, addAccount, updateAccount, deleteAccount } = useAccountsStore()
  const [filterPlatform, setFilterPlatform] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [form, setForm] = useState({
    platform: 'facebook',
    username: '',
    password: '',
    proxy: '',
    notes: '',
    status: 'active',
  })

  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') } else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 5000)
  }

  useEffect(() => { loadAccounts() }, [loadAccounts])

  const filtered = accounts.filter(a => {
    const matchPlatform = !filterPlatform || a.platform === filterPlatform
    const matchSearch = !searchQuery || a.username.toLowerCase().includes(searchQuery.toLowerCase()) || (a.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchPlatform && matchSearch
  })

  const handleSave = async () => {
    if (!form.username) {
      showMsg('يرجى إدخال اسم المستخدم', true)
      return
    }
    const payload = { ...form }
    if (editingId && !payload.password) {
      delete (payload as Record<string, unknown>).password
    }
    try {
      if (editingId) {
        await updateAccount(editingId, payload)
      } else {
        await addAccount(payload)
      }
      showMsg('تم الحفظ بنجاح!')
    } catch (err: any) {
      showMsg(err.message || 'خطأ غير معروف', true)
    }
    setForm({ platform: 'facebook', username: '', password: '', proxy: '', notes: '', status: 'active' })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (acc: { id: number; platform: string; username: string; password?: string; proxy?: string; notes?: string; status: string }) => {
    setForm({
      platform: acc.platform,
      username: acc.username,
      password: acc.password || '',
      proxy: acc.proxy || '',
      notes: acc.notes || '',
      status: acc.status,
    })
    setEditingId(acc.id)
    setShowForm(true)
  }

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (deleteConfirmId !== id) { setDeleteConfirmId(id); return }
    await deleteAccount(id)
    setDeleteConfirmId(null)
    showMsg('تم حذف الحساب')
  }

  const platformInfo = (pid: string) => PLATFORMS.find(p => p.id === pid) || { id: pid, label: pid, icon: Globe }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-medium" style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
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
            onClick={() => {
              setShowForm(!showForm)
              setEditingId(null)
              setForm({ platform: 'facebook', username: '', password: '', proxy: '', notes: '', status: 'active' })
            }}
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

      {/* Platform Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-2.5">
        {PLATFORMS.slice(0, 6).map(p => {
          const count = accounts.filter(a => a.platform === p.id).length
          const gradient = getPlatformGradient(p.id)
          const isActive = filterPlatform === p.id
          return (
            <button
              key={p.id}
              onClick={() => setFilterPlatform(filterPlatform === p.id ? '' : p.id)}
              className="group flex items-center gap-2.5 p-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', border: `1px solid ${isActive ? p.id === 'facebook' ? '#1877f2' : '#e2e8f0' : 'rgba(226,232,240,0.5)'}`, boxShadow: isActive ? '0 4px 16px rgba(0,0,0,0.08)' : 'none' }}
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

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card-gradient-border">
          <h3 className="font-bold text-secondary-900 mb-4">{editingId ? 'تعديل الحساب' : 'إضافة حساب جديد'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label-field">المنصة</label><select className="select-field" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select></div>
            <div><label className="label-field">اسم المستخدم / البريد</label><input type="text" className="input-field" dir="ltr" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="username أو email" /></div>
            <div><label className="label-field">كلمة المرور</label><div className="relative"><input type={showPassword ? 'text' : 'password'} className="input-field pr-10" dir="ltr" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" /><button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" dir="ltr" value={form.proxy} onChange={e => setForm({...form, proxy: e.target.value})} placeholder="IP:Port" /></div>
            <div className="col-span-2"><label className="label-field">ملاحظات</label><input type="text" className="input-field" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="ملاحظات عن الحساب..." /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={!form.username} className="btn-primary"><Save size={18} /> حفظ</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary"><X size={18} /> إلغاء</button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400" />
          <input type="text" className="input-field pr-10" placeholder="بحث في الحسابات..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="w-48"><select className="select-field" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
          <option value="">كل المنصات</option>
          {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select></div>
      </div>

      {/* Accounts Table */}
      <div className="card-gradient-border" style={{ padding: '0' }}>
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(22,163,74,0.1))' }}>
              <Users size={32} style={{ color: '#94a3b8' }} />
            </div>
            <p className="text-secondary-500 font-medium">لا توجد حسابات</p>
            <p className="text-xs text-secondary-400 mt-1">أضف حساباتك من مختلف المنصات لإدارتها بسهولة</p>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="data-table">
              <thead><tr><th>المنصة</th><th>اسم المستخدم</th><th>البروكسي</th><th>الملاحظات</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead>
              <tbody>
                {filtered.map(acc => {
                  const p = platformInfo(acc.platform)
                  const gradient = getPlatformGradient(acc.platform)
                  return (
                    <tr key={acc.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: gradient }}>
                            <p.icon size={14} />
                          </div>
                          <span className="font-medium text-sm">{p.label}</span>
                        </div>
                      </td>
                      <td className="font-medium">{acc.username}</td>
                      <td className="text-xs text-secondary-500 font-mono">{acc.proxy || '-'}</td>
                      <td className="text-xs text-secondary-500 max-w-[200px] truncate">{acc.notes || '-'}</td>
                      <td><span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'} text-[10px]`}>{acc.status === 'active' ? 'نشط' : 'غير نشط'}</span></td>
                      <td className="text-xs">{new Date(acc.created_at).toLocaleDateString('ar-EG')}</td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => handleEdit(acc)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                          <button onClick={() => handleDelete(acc.id)} className={`p-1.5 rounded-lg transition-colors ${deleteConfirmId === acc.id ? 'bg-red-50 text-red-600 animate-pulse' : 'text-red-400 hover:bg-red-50 hover:text-red-600'}`}><Trash2 size={14} /></button>
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
