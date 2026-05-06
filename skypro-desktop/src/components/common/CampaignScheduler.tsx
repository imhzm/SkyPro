import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, CheckCircle, Pause, Trash2, Loader2 } from 'lucide-react'

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

  const loadTasks = useCallback(async () => {
    try {
      const res = await window.electronAPI.getScheduledCampaigns()
      if (res.success && res.data) setTasks(res.data || [])
    } catch (err: any) { console.error('Failed to load campaigns:', err.message) }
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
    if (!newTask.name || !newTask.scheduled_at) return
    const scheduledDate = new Date(newTask.scheduled_at)
    if (scheduledDate <= new Date()) { setTasks(prev => prev); return }
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
      await loadTasks()
    } catch (err: any) { console.error('Failed to add campaign:', err.message) }
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    try { await window.electronAPI.deleteCampaign({ id }); await loadTasks() } catch (err: any) { console.error('Failed to delete campaign:', err.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-secondary-900">جدولة الحملات</h2>
          <p className="text-sm text-secondary-500">جدولة المهام للتشغيل التلقائي</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary"><Calendar size={18} /> مهمة جديدة</button>
      </div>

      {showAdd && (
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4">مهمة جديدة</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label-field">اسم المهمة</label><input type="text" className="input-field" placeholder="حملة تسويق 1" value={newTask.name || ''} onChange={(e) => setNewTask({ ...newTask, name: e.target.value })} /></div>
            <div><label className="label-field">المنصة</label><select className="select-field" value={newTask.platform} onChange={(e) => setNewTask({ ...newTask, platform: e.target.value, type: 'post' })}>{platforms.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}</select></div>
            <div><label className="label-field">الإجراء</label><select className="select-field" value={newTask.type} onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}>{actions[newTask.platform as keyof typeof actions]?.map((a) => (<option key={a.value} value={a.value}>{a.label}</option>))}</select></div>
            <div><label className="label-field">الموعد</label><input type="datetime-local" className="input-field" value={newTask.scheduled_at || ''} onChange={(e) => setNewTask({ ...newTask, scheduled_at: e.target.value })} /></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAdd} disabled={loading} className="btn-primary">{loading ? <Loader2 size={18} className="animate-spin"/> : 'إضافة'}</button>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">إلغاء</button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {tasks.length === 0 ? (
          <div className="card text-center py-12"><Calendar size={48} className="mx-auto mb-4 text-secondary-300" /><p className="text-secondary-500">لا توجد مهام مجدولة</p></div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${task.status === 'completed' ? 'bg-success-50' : task.status === 'pending' ? 'bg-secondary-50' : 'bg-warning-50'}`}>
                  {task.status === 'completed' ? <CheckCircle size={20} className="text-success-500" /> : task.status === 'pending' ? <Clock size={20} className="text-secondary-500" /> : <Pause size={20} className="text-warning-500" />}
                </div>
                <div>
                  <h4 className="font-bold text-secondary-900">{task.name}</h4>
                  <p className="text-sm text-secondary-500">{task.platform} - {task.type} | {task.scheduled_at ? new Date(task.scheduled_at).toLocaleString('ar-EG') : 'غير محدد'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${task.status === 'completed' ? 'badge-success' : task.status === 'pending' ? 'badge-primary' : 'badge-warning'}`}>{task.status === 'pending' ? 'معلق' : task.status === 'completed' ? 'مكتمل' : 'متوقف'}</span>
                <button onClick={() => handleDelete(task.id)} className="p-2 text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
