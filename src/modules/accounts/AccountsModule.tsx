import { useState, useEffect } from 'react'
import { useAccountsStore } from '../../stores/accountsStore'
import { Users, Plus, Trash2, Edit3, Save, X, Search, Facebook, MessageCircle, Instagram, Twitter, Linkedin, Send, Globe, AtSign, Bookmark, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

const PLATFORMS = [
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-600' },
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-pink-600' },
  { id: 'twitter', label: 'Twitter / X', icon: Twitter, color: 'bg-gray-900' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
  { id: 'telegram', label: 'Telegram', icon: Send, color: 'bg-sky-500' },
  { id: 'tiktok', label: 'TikTok', icon: Globe, color: 'bg-pink-500' },
  { id: 'pinterest', label: 'Pinterest', icon: Bookmark, color: 'bg-red-600' },
  { id: 'snapchat', label: 'Snapchat', icon: Globe, color: 'bg-yellow-500' },
  { id: 'threads', label: 'Threads', icon: AtSign, color: 'bg-gray-800' },
  { id: 'reddit', label: 'Reddit', icon: Globe, color: 'bg-orange-600' },
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
    if (!form.username) return
    const payload = { ...form }
    if (editingId && !payload.password) {
      delete (payload as any).password
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

  const handleEdit = (acc: any) => {
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
  }

  const platformInfo = (pid: string) => PLATFORMS.find(p => p.id === pid) || { label: pid, icon: Globe, color: 'bg-gray-500' }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className="flex items-center gap-3 p-4 rounded-xl text-sm font-medium" style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-secondary-900">إدارة الحسابات</h2>
          <p className="text-sm text-secondary-500">إدارة جميع حسابات السوشيال ميديا في مكان واحد</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ platform: 'facebook', username: '', password: '', proxy: '', notes: '', status: 'active' }) }} className="btn-primary">
          {showForm ? <><X size={18}/> إغلاق</> : <><Plus size={18}/> إضافة حساب</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {PLATFORMS.slice(0, 8).map(p => {
          const count = accounts.filter(a => a.platform === p.id).length
          return (
            <div key={p.id} className="card flex items-center gap-3 cursor-pointer hover:shadow-md transition" onClick={() => setFilterPlatform(filterPlatform === p.id ? '' : p.id)}>
              <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center text-white`}><p.icon size={20}/></div>
              <div><p className="font-bold text-secondary-900">{p.label}</p><p className="text-xs text-secondary-500">{count} حساب</p></div>
            </div>
          )
        })}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card border-2 border-blue-100">
          <h3 className="font-bold text-secondary-900 mb-4">{editingId ? 'تعديل الحساب' : 'إضافة حساب جديد'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="label-field">المنصة</label><select className="select-field" value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select></div>
            <div><label className="label-field">اسم المستخدم / البريد</label><input type="text" className="input-field" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="username أو email" /></div>
            <div><label className="label-field">كلمة المرور</label><div className="relative"><input type={showPassword ? 'text' : 'password'} className="input-field pr-10" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" /><button type="button" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></div>
            <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" value={form.proxy} onChange={e => setForm({...form, proxy: e.target.value})} placeholder="IP:Port أو http://user:pass@ip:port" /></div>
            <div className="col-span-2"><label className="label-field">ملاحظات</label><input type="text" className="input-field" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="ملاحظات عن الحساب..." /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={!form.username} className="btn-primary"><Save size={18}/> حفظ</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary"><X size={18}/> إلغاء</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400"/>
          <input type="text" className="input-field pr-10" placeholder="بحث في الحسابات..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="w-48"><select className="select-field" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
          <option value="">كل المنصات</option>
          {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select></div>
      </div>

      {/* Accounts Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-secondary-400">
            <Users size={64} className="mx-auto mb-4 opacity-30"/>
            <p className="text-lg">لا توجد حسابات</p>
            <p className="text-sm">أضف حساباتك من مختلف المنصات لإدارتها بسهولة</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead><tr><th>المنصة</th><th>اسم المستخدم</th><th>البروكسي</th><th>الملاحظات</th><th>الحالة</th><th>التاريخ</th><th></th></tr></thead>
              <tbody>
                {filtered.map(acc => {
                  const p = platformInfo(acc.platform)
                  return (
                    <tr key={acc.id}>
                      <td><div className="flex items-center gap-2"><div className={`w-8 h-8 rounded-lg ${p.color} flex items-center justify-center text-white`}><p.icon size={14}/></div><span className="font-medium text-sm">{p.label}</span></div></td>
                      <td className="font-medium">{acc.username}</td>
                      <td className="text-xs text-secondary-500">{acc.proxy || '-'}</td>
                      <td className="text-xs text-secondary-500 max-w-[200px] truncate">{acc.notes || '-'}</td>
                      <td><span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'} text-[10px]`}>{acc.status === 'active' ? 'نشط' : 'غير نشط'}</span></td>
                      <td className="text-xs">{new Date(acc.created_at).toLocaleDateString('ar-EG')}</td>
                      <td><div className="flex gap-1">
                        <button onClick={() => handleEdit(acc)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit3 size={14}/></button>
                        <button onClick={() => handleDelete(acc.id)} className={`p-1.5 rounded ${deleteConfirmId === acc.id ? 'bg-danger-50 text-danger-500 animate-pulse' : 'text-danger-500 hover:bg-danger-50'}`}><Trash2 size={14}/>{deleteConfirmId === acc.id && <span className="text-[10px] mr-0.5">؟</span>}</button>
                      </div></td>
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
