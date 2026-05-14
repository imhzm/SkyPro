import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, CheckCircle, Pause, Trash2, Loader2, AlertCircle, Rocket } from 'lucide-react'
import { getPlatformGradient } from '../../data/platformGradients'

interface ScheduledTask {
  id: number
  name: string
  platform: string
  type: string
  status: string
  scheduled_at: string
  data?: string
}

export default function CampaignScheduler() {
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newTask, setNewTask] = useState<Partial<ScheduledTask>>({ platform: 'facebook', type: 'post', status: 'pending' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const showMsg = (msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') } else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 4000)
  }

  const loadTasks = useCallback(async () => {
    try {
      const res = await window.electronAPI.getScheduledCampaigns()
      if (res.success && res.data) setTasks(res.data || [])
    } catch { showMsg('فشل تحميل الحملات المجدولة', true) }
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])

  const platforms = [
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'telegram', label: 'Telegram' },
  ]

  const actions: Record<string, { value: string; label: string }[]> = {
    facebook: [{ value: 'post', label: 'نشر منشور' }, { value: 'send-messages', label: 'إرسال رسائل' }, { value: 'extract', label: 'استخراج بيانات' }],
    instagram: [{ value: 'post', label: 'نشر صورة' }, { value: 'follow', label: 'متابعة حسابات' }, { value: 'extract', label: 'استخراج متابعين' }],
    twitter: [{ value: 'tweet', label: 'تغريدة' }, { value: 'retweet', label: 'ريتويت' }, { value: 'follow', label: 'متابعة' }],
    telegram: [{ value: 'send', label: 'إرسال رسالة' }, { value: 'extract', label: 'استخراج أعضاء' }],
  }

  const handleAdd = async () => {
    if (!newTask.name) {
      showMsg('يرجى إدخال اسم المهمة', true)
      return
    }
    if (!newTask.scheduled_at) {
      showMsg('يرجى تحديد الموعد', true)
      return
    }
    const scheduledDate = new Date(newTask.scheduled_at)
    if (scheduledDate <= new Date()) {
      showMsg('يرجى اختيار تاريخ في المستقبل', true)
      return
    }
    setLoading(true)
    try {
      await window.electronAPI.scheduleCampaign({
        name: newTask.name,
        platform: newTask.platform || 'facebook',
        type: newTask.type || 'post',
        data: {},
        scheduledAt: newTask.scheduled_at,
      })
      setNewTask({ platform: 'facebook', type: 'post', status: 'pending' })
      setShowAdd(false)
      showMsg('تم جدولة المهمة بنجاح')
      await loadTasks()
    } catch { showMsg('فشل جدولة المهمة', true) }
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    try {
      await window.electronAPI.deleteCampaign({ id })
      showMsg('تم حذف المهمة')
      await loadTasks()
    } catch { showMsg('فشل حذف المهمة', true) }
  }

  const getStatusStyle = (status: string) => {
    if (status === 'completed') return { bg: 'rgba(34,197,94,0.1)', color: '#16a34a', label: 'مكتمل', badge: 'badge-success' }
    if (status === 'pending') return { bg: 'rgba(10,108,241,0.1)', color: '#0A6CF1', label: 'معلق', badge: 'badge-primary' }
    return { bg: 'rgba(245,158,11,0.1)', color: '#d97706', label: 'متوقف', badge: 'badge-warning' }
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B2CF5, #FF4FD8)' }}>
            <Rocket size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-secondary-900">جدولة الحملات</h2>
            <p className="text-xs text-secondary-500">جدولة المهام للتشغيل التلقائي</p>
          </div>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary"><Calendar size={18} /> مهمة جديدة</button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="card-gradient-border">
          <h3 className="font-bold text-secondary-900 mb-4">مهمة جديدة</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">اسم المهمة</label><input type="text" className="input-field" placeholder="حملة تسويق 1" value={newTask.name || ''} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} /></div>
            <div><label className="label-field">المنصة</label><select className="select-field" value={newTask.platform} onChange={(e) => setNewTask({ ...newTask, platform: e.target.value, type: 'post' })}>{platforms.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}</select></div>
            <div><label className="label-field">الإجراء</label><select className="select-field" value={newTask.type} onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}>{actions[newTask.platform as keyof typeof actions]?.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}</select></div>
            <div><label className="label-field">الموعد</label><input type="datetime-local" className="input-field" value={newTask.scheduled_at || ''} onChange={(e) => setNewTask({ ...newTask, scheduled_at: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} disabled={loading} className="btn-primary">{loading ? <Loader2 size={18} className="animate-spin" /> : 'إضافة'}</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">إلغاء</button>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="card-gradient-border text-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(139,44,245,0.1), rgba(255,79,216,0.1))' }}>
              <Calendar size={32} style={{ color: '#94a3b8' }} />
            </div>
            <p className="text-secondary-500 font-medium">لا توجد مهام مجدولة</p>
            <p className="text-xs text-secondary-400 mt-1">أنشئ مهمة جديدة لبدء الأتمتة</p>
          </div>
        ) : (
          tasks.map((task) => {
            const st = getStatusStyle(task.status)
            const gradient = getPlatformGradient(task.platform)
            return (
              <div key={task.id} className="card-gradient-border flex items-center justify-between" style={{ padding: '1rem 1.25rem' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: st.bg }}>
                    {task.status === 'completed' ? <CheckCircle size={20} style={{ color: st.color }} /> : task.status === 'pending' ? <Clock size={20} style={{ color: st.color }} /> : <Pause size={20} style={{ color: st.color }} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-secondary-900 text-sm">{task.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: gradient, color: 'white' }}>
                        {task.platform}
                      </span>
                      <span className="text-[10px] text-secondary-400">{task.type}</span>
                      <span className="text-[10px] text-secondary-400">|</span>
                      <span className="text-[10px] text-secondary-400">{task.scheduled_at ? new Date(task.scheduled_at).toLocaleString('ar-EG') : 'غير محدد'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${st.badge}`}>{st.label}</span>
                  <button onClick={() => handleDelete(task.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
