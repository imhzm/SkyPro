import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Calendar, Clock, CheckCircle, Pause, Trash2, Loader2,
  AlertCircle, Rocket, Repeat, FilterIcon, X, Save, Edit3,
  Sparkles, AlertOctagon,
} from 'lucide-react'
import { getPlatformGradient } from '../../data/platformGradients'
import { platforms as ALL_PLATFORMS } from '../../data/platforms'
import { useConfirm } from './confirmContext'

// ============================================================================
// TYPES
// ============================================================================
type ScheduleType = 'once' | 'daily' | 'weekly' | 'monthly'
type CampaignStatus = 'pending' | 'running' | 'completed' | 'paused' | 'failed'

interface ScheduleData {
  scheduleType: ScheduleType
  daysOfWeek?: number[]       // 0 (Sunday) - 6 (Saturday) for weekly
  dayOfMonth?: number         // 1-31 for monthly
  time?: string                // HH:MM for recurring
  message?: string             // optional message content
  retries?: number             // retry count on failure
  retryDelayMinutes?: number   // delay between retries
}

interface ScheduledTask {
  id: number
  name: string
  platform: string
  type: string
  status: CampaignStatus | string
  scheduled_at: string
  data?: string                // JSON string of ScheduleData
}

// Days of week — Sunday is 0 in JS Date convention
const WEEKDAYS = [
  { idx: 6, label: 'سبت', short: 'سبت' },
  { idx: 0, label: 'أحد', short: 'أحد' },
  { idx: 1, label: 'اثنين', short: 'إثن' },
  { idx: 2, label: 'ثلاثاء', short: 'ثلا' },
  { idx: 3, label: 'أربعاء', short: 'أرب' },
  { idx: 4, label: 'خميس', short: 'خمي' },
  { idx: 5, label: 'جمعة', short: 'جمع' },
]

// Action types per platform — what kind of automated task can run.
const PLATFORM_ACTIONS: Record<string, { value: string; label: string; needsMessage?: boolean }[]> = {
  facebook:    [{ value: 'post-groups', label: 'نشر على المجموعات', needsMessage: true }, { value: 'send-messages', label: 'إرسال رسائل Messenger', needsMessage: true }, { value: 'extract-friends', label: 'استخراج الأصدقاء' }, { value: 'extract-group-members', label: 'استخراج أعضاء المجموعات' }, { value: 'extract-post-likers', label: 'استخراج المعجبين بالمنشورات' }, { value: 'mention', label: 'منشن العملاء', needsMessage: true }, { value: 'invite-friends', label: 'دعوة الأصدقاء' }, { value: 'join-groups', label: 'الانضمام للمجموعات' }],
  whatsapp:    [{ value: 'send-individual', label: 'إرسال فردي للأرقام', needsMessage: true }, { value: 'send-groups', label: 'بث على المجموعات', needsMessage: true }, { value: 'extract-group', label: 'استخراج أعضاء جروب' }, { value: 'filter-numbers', label: 'تصفية الأرقام' }, { value: 'add-to-group', label: 'إضافة أعضاء لجروب' }],
  instagram:   [{ value: 'send-dm', label: 'إرسال رسائل DM', needsMessage: true }, { value: 'follow', label: 'متابعة حسابات' }, { value: 'extract-followers', label: 'استخراج المتابعين' }, { value: 'mention', label: 'منشن في التعليقات', needsMessage: true }, { value: 'extract-hashtag', label: 'استخراج بوستات هاشتاج' }],
  twitter:     [{ value: 'tweet', label: 'تغريد', needsMessage: true }, { value: 'send-dm', label: 'رسائل خاصة DM', needsMessage: true }, { value: 'retweet', label: 'إعادة تغريد' }, { value: 'follow', label: 'متابعة' }, { value: 'extract-followers', label: 'استخراج المتابعين' }, { value: 'mention', label: 'منشن', needsMessage: true }],
  linkedin:    [{ value: 'send-dm', label: 'رسائل خاصة', needsMessage: true }, { value: 'connect', label: 'طلبات تواصل' }, { value: 'follow-companies', label: 'متابعة شركات' }, { value: 'extract-people', label: 'استخراج عملاء' }, { value: 'post', label: 'نشر منشور', needsMessage: true }],
  telegram:    [{ value: 'send-username', label: 'إرسال بـ Username', needsMessage: true }, { value: 'send-phone', label: 'إرسال برقم الهاتف', needsMessage: true }, { value: 'post-groups', label: 'نشر على المجموعات', needsMessage: true }, { value: 'extract-members', label: 'استخراج أعضاء' }, { value: 'join-groups', label: 'انضمام لمجموعات' }, { value: 'add-to-group', label: 'إضافة أعضاء' }],
  'telegram-premium': [{ value: 'extract-hidden', label: 'استخراج أعضاء مخفيين' }, { value: 'add-username', label: 'إضافة بـ Username' }, { value: 'add-phone', label: 'إضافة برقم' }, { value: 'react', label: 'تفاعل بـ Emojis' }],
  pinterest:   [{ value: 'follow', label: 'متابعة' }, { value: 'send-dm', label: 'رسائل', needsMessage: true }, { value: 'extract-board', label: 'استخراج لوحة' }],
  reddit:      [{ value: 'post', label: 'نشر منشور', needsMessage: true }, { value: 'upvote', label: 'تصويت إيجابي' }, { value: 'join', label: 'الانضمام لمجتمعات' }],
  tiktok:      [{ value: 'follow', label: 'متابعة' }, { value: 'mention', label: 'منشن', needsMessage: true }, { value: 'extract-comments', label: 'استخراج تعليقات' }],
  snapchat:    [{ value: 'send-dm', label: 'إرسال رسائل', needsMessage: true }, { value: 'extract-friends', label: 'استخراج الأصدقاء' }],
  threads:     [{ value: 'post', label: 'نشر', needsMessage: true }, { value: 'send-dm', label: 'رسائل', needsMessage: true }, { value: 'mention', label: 'منشن', needsMessage: true }],
  google:      [{ value: 'extract-maps', label: 'استخراج Google Maps' }, { value: 'extract-olx', label: 'استخراج OLX' }],
  'send-emails':[{ value: 'send-bulk', label: 'إرسال بريد جماعي', needsMessage: true }],
}

// Status display config
const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  pending:   { color: '#60a5fa', bg: 'rgba(10,108,241,0.14)',  label: 'في الانتظار',  icon: Clock },
  running:   { color: '#4ade80', bg: 'rgba(34,197,94,0.14)',   label: 'قيد التشغيل', icon: Loader2 },
  completed: { color: '#34d399', bg: 'rgba(5,150,105,0.14)',   label: 'مكتمل',         icon: CheckCircle },
  paused:    { color: '#fbbf24', bg: 'rgba(245,158,11,0.14)',  label: 'متوقف',         icon: Pause },
  failed:    { color: '#f87171', bg: 'rgba(220,38,38,0.14)',   label: 'فشل',           icon: AlertOctagon },
}

const DEFAULT_FORM: Partial<ScheduledTask> & { scheduleData: ScheduleData } = {
  name: '',
  platform: 'facebook',
  type: 'post-groups',
  status: 'pending',
  scheduleData: { scheduleType: 'once', retries: 0, retryDelayMinutes: 5 },
}

export default function CampaignScheduler() {
  const confirm = useConfirm()
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<typeof DEFAULT_FORM>(DEFAULT_FORM)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'all' | CampaignStatus>('all')

  const showMsg = useCallback((msg: string, isError = false) => {
    if (isError) { setError(msg); setMessage('') } else { setMessage(msg); setError('') }
    setTimeout(() => { setMessage(''); setError('') }, 4000)
  }, [])

  const loadTasks = useCallback(async () => {
    try {
      const res = await window.electronAPI.getScheduledCampaigns()
      if (res.success && res.data) setTasks((res.data as ScheduledTask[]) || [])
    } catch { showMsg('فشل تحميل الحملات المجدولة', true) }
  }, [showMsg])

  useEffect(() => { loadTasks() }, [loadTasks])

  // Helpers for working with the JSON `data` column
  const parseScheduleData = (raw?: string): ScheduleData => {
    if (!raw) return { scheduleType: 'once' }
    try { return JSON.parse(raw) as ScheduleData } catch { return { scheduleType: 'once' } }
  }

  // Platforms that have actions defined
  const schedulablePlatforms = useMemo(
    () => ALL_PLATFORMS.filter((p) => PLATFORM_ACTIONS[p.id]),
    [],
  )

  const currentActions = PLATFORM_ACTIONS[form.platform || 'facebook'] || []
  const currentAction = currentActions.find((a) => a.value === form.type)

  const resetForm = () => {
    setForm(DEFAULT_FORM)
    setEditingId(null)
    setShowForm(false)
  }

  const handleStartEdit = (task: ScheduledTask) => {
    const scheduleData = parseScheduleData(task.data)
    setForm({
      name: task.name,
      platform: task.platform,
      type: task.type,
      status: task.status,
      scheduled_at: task.scheduled_at,
      scheduleData,
    })
    setEditingId(task.id)
    setShowForm(true)
  }

  const handleStartAdd = () => {
    setForm(DEFAULT_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.name?.trim()) { showMsg('يرجى إدخال اسم المهمة', true); return }
    if (form.scheduleData.scheduleType === 'once' && !form.scheduled_at) {
      showMsg('يرجى تحديد موعد التشغيل', true); return
    }
    if (form.scheduleData.scheduleType !== 'once' && !form.scheduleData.time) {
      showMsg('يرجى تحديد وقت التشغيل', true); return
    }
    if (form.scheduleData.scheduleType === 'weekly' && (!form.scheduleData.daysOfWeek || form.scheduleData.daysOfWeek.length === 0)) {
      showMsg('يرجى اختيار يوم واحد على الأقل', true); return
    }
    if (currentAction?.needsMessage && !form.scheduleData.message?.trim()) {
      showMsg('هذا النوع يحتاج نص الرسالة', true); return
    }

    // Compute the actual scheduled_at timestamp for one-time. For recurring,
    // compute the NEXT run from now based on schedule pattern.
    let scheduledAt = form.scheduled_at
    if (form.scheduleData.scheduleType !== 'once') {
      scheduledAt = computeNextRun(form.scheduleData)
    }

    setLoading(true)
    try {
      if (editingId) {
        await window.electronAPI.deleteCampaign({ id: editingId })
      }
      await window.electronAPI.scheduleCampaign({
        name: form.name.trim(),
        platform: form.platform || 'facebook',
        type: form.type || 'post-groups',
        // Coerce the typed ScheduleData into the open Record shape expected
        // by the IPC binding — the runtime serializes it as JSON anyway.
        data: form.scheduleData as unknown as Record<string, unknown>,
        scheduledAt: scheduledAt!,
      })
      showMsg(editingId ? 'تم تحديث المهمة ✓' : 'تم جدولة المهمة بنجاح ✓')
      resetForm()
      await loadTasks()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطأ غير معروف'
      showMsg(`فشل: ${msg}`, true)
    }
    setLoading(false)
  }

  const handleDelete = async (id: number) => {
    if (!(await confirm({ title: 'حذف المهمة', message: 'حذف هذه المهمة نهائياً؟', confirmLabel: 'حذف', danger: true }))) return
    try {
      await window.electronAPI.deleteCampaign({ id })
      showMsg('تم حذف المهمة ✓')
      await loadTasks()
    } catch { showMsg('فشل حذف المهمة', true) }
  }

  // ========================================================================
  // Compute next run timestamp for recurring schedules
  // ========================================================================
  const computeNextRun = (sched: ScheduleData): string => {
    if (!sched.time) return new Date(Date.now() + 60_000).toISOString()
    const [hh, mm] = sched.time.split(':').map(Number)
    const now = new Date()
    const candidate = new Date(now)
    candidate.setHours(hh, mm, 0, 0)

    if (sched.scheduleType === 'daily') {
      if (candidate.getTime() <= now.getTime()) candidate.setDate(candidate.getDate() + 1)
      return candidate.toISOString()
    }
    if (sched.scheduleType === 'weekly' && sched.daysOfWeek && sched.daysOfWeek.length > 0) {
      const today = now.getDay()
      // Find next day-of-week from today that matches
      for (let offset = 0; offset < 8; offset++) {
        const day = (today + offset) % 7
        if (sched.daysOfWeek.includes(day)) {
          const target = new Date(now)
          target.setDate(now.getDate() + offset)
          target.setHours(hh, mm, 0, 0)
          if (target.getTime() > now.getTime()) return target.toISOString()
        }
      }
    }
    if (sched.scheduleType === 'monthly' && sched.dayOfMonth) {
      candidate.setDate(sched.dayOfMonth)
      if (candidate.getTime() <= now.getTime()) candidate.setMonth(candidate.getMonth() + 1)
      return candidate.toISOString()
    }
    return candidate.toISOString()
  }

  // Min datetime for date inputs — computed once per render but stable enough.
  // We use the moment when the form OPENED rather than re-computing on every
  // render to satisfy React's purity rules.
  const [formOpenedAt] = useState(() => Date.now())
  const minDateTime = useMemo(
    () => new Date(formOpenedAt + 60000).toISOString().slice(0, 16),
    [formOpenedAt],
  )

  const counts = useMemo(() => {
    const result = { all: tasks.length, pending: 0, running: 0, completed: 0, paused: 0, failed: 0 }
    for (const t of tasks) {
      const status = t.status as CampaignStatus
      if (status in result) result[status]++
    }
    return result
  }, [tasks])

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)

  const platformLabel = (pid: string) => ALL_PLATFORMS.find((p) => p.id === pid)?.name || pid
  const actionLabel = (pid: string, type: string) => PLATFORM_ACTIONS[pid]?.find((a) => a.value === type)?.label || type

  return (
    <div className="space-y-5">
      {/* Notification */}
      {(message || error) && (
        <div
          className={`flex items-center gap-3 p-3.5 rounded-xl text-sm font-medium ${message ? 'text-emerald-300' : 'text-red-600'}`}
          style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(135deg, #8B2CF5, #FF4FD8)' }}>
            <Rocket size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-secondary-900 text-base">جدولة الحملات</h2>
            <p className="text-xs text-secondary-500">شغّل مهامك تلقائياً مرة واحدة أو بتكرار يومي/أسبوعي/شهري</p>
          </div>
        </div>
        <button onClick={handleStartAdd} className="btn-primary text-sm">
          <Calendar size={16} /> مهمة جديدة
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap items-center p-1 rounded-xl bg-secondary-50/50 border border-secondary-100">
        {(['all', 'pending', 'running', 'completed', 'paused', 'failed'] as const).map((f) => {
          const label = f === 'all' ? 'الكل' : STATUS_CONFIG[f]?.label || f
          const count = counts[f as keyof typeof counts] ?? 0
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => setFilter(f as 'all' | CampaignStatus)}
              className={`flex-1 sm:flex-initial text-xs font-semibold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                active ? 'bg-white/[0.10] text-secondary-900 shadow-sm' : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              {label}
              <span className={`mr-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold ${
                active ? 'bg-violet-500/20 text-violet-200' : 'bg-secondary-200 text-secondary-600'
              }`}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card-gradient-border sw-fade-in-up" style={{ padding: '1.25rem' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-secondary-900 text-sm flex items-center gap-2">
              {editingId ? <Edit3 size={16} className="text-violet-600" /> : <Sparkles size={16} className="text-violet-600" />}
              {editingId ? 'تعديل المهمة' : 'إنشاء مهمة جديدة'}
            </h3>
            <button onClick={resetForm} className="text-secondary-400 hover:text-secondary-700">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label-field">اسم المهمة <span className="text-red-500">*</span></label>
              <input
                type="text"
                className="input-field"
                placeholder="مثال: حملة عروض الجمعة على Facebook"
                value={form.name || ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="label-field">المنصة</label>
              <select
                className="select-field"
                value={form.platform}
                onChange={(e) => {
                  const newPlatform = e.target.value
                  const firstAction = PLATFORM_ACTIONS[newPlatform]?.[0]?.value || 'post'
                  setForm({ ...form, platform: newPlatform, type: firstAction })
                }}
              >
                {schedulablePlatforms.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-field">نوع الإجراء</label>
              <select
                className="select-field"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {currentActions.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>

            {/* SCHEDULE TYPE */}
            <div className="sm:col-span-2">
              <label className="label-field flex items-center gap-1.5">
                <Repeat size={13} className="text-violet-600" /> نوع الجدولة
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { value: 'once', label: 'مرة واحدة', icon: Calendar },
                  { value: 'daily', label: 'يومياً', icon: Clock },
                  { value: 'weekly', label: 'أسبوعياً', icon: Repeat },
                  { value: 'monthly', label: 'شهرياً', icon: Calendar },
                ] as const).map((opt) => {
                  const Icon = opt.icon
                  const active = form.scheduleData.scheduleType === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, scheduleData: { ...form.scheduleData, scheduleType: opt.value } })}
                      className={`p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                        active
                          ? 'border-violet-500 bg-violet-500/20 text-violet-200'
                          : 'border-secondary-200 bg-white/[0.04] text-secondary-600 hover:border-secondary-300'
                      }`}
                    >
                      <Icon size={16} />
                      <span className="text-xs font-semibold">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ONE-TIME: date + time picker */}
            {form.scheduleData.scheduleType === 'once' && (
              <div className="sm:col-span-2">
                <label className="label-field">الموعد الكامل (التاريخ + الوقت) <span className="text-red-500">*</span></label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={form.scheduled_at || ''}
                  min={minDateTime}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>
            )}

            {/* RECURRING: time of day */}
            {form.scheduleData.scheduleType !== 'once' && (
              <div>
                <label className="label-field">وقت التشغيل (يومياً) <span className="text-red-500">*</span></label>
                <input
                  type="time"
                  className="input-field"
                  value={form.scheduleData.time || ''}
                  onChange={(e) => setForm({ ...form, scheduleData: { ...form.scheduleData, time: e.target.value } })}
                />
              </div>
            )}

            {/* WEEKLY: days picker */}
            {form.scheduleData.scheduleType === 'weekly' && (
              <div className="sm:col-span-2">
                <label className="label-field">أيام الأسبوع <span className="text-red-500">*</span></label>
                <div className="flex gap-1.5 flex-wrap">
                  {WEEKDAYS.map((d) => {
                    const selected = form.scheduleData.daysOfWeek?.includes(d.idx) || false
                    return (
                      <button
                        key={d.idx}
                        type="button"
                        onClick={() => {
                          const current = form.scheduleData.daysOfWeek || []
                          const next = selected ? current.filter((x) => x !== d.idx) : [...current, d.idx]
                          setForm({ ...form, scheduleData: { ...form.scheduleData, daysOfWeek: next } })
                        }}
                        className={`min-w-[44px] px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selected
                            ? 'bg-violet-600 text-white shadow-md'
                            : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                        }`}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* MONTHLY: day of month */}
            {form.scheduleData.scheduleType === 'monthly' && (
              <div>
                <label className="label-field">يوم الشهر <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  className="input-field"
                  placeholder="1 - 31"
                  value={form.scheduleData.dayOfMonth || ''}
                  onChange={(e) => setForm({ ...form, scheduleData: { ...form.scheduleData, dayOfMonth: parseInt(e.target.value) || 1 } })}
                />
              </div>
            )}

            {/* MESSAGE BODY — for tasks that send something */}
            {currentAction?.needsMessage && (
              <div className="sm:col-span-2">
                <label className="label-field">نص الرسالة <span className="text-red-500">*</span></label>
                <textarea
                  className="input-field min-h-[80px]"
                  placeholder="اكتب نص الرسالة هنا... يمكنك استخدام رموز تعبيرية وروابط"
                  value={form.scheduleData.message || ''}
                  onChange={(e) => setForm({ ...form, scheduleData: { ...form.scheduleData, message: e.target.value } })}
                  rows={4}
                />
                <p className="text-[10px] text-secondary-500 mt-1">
                  💡 لتنويع الرسالة استخدم {`{ السلام عليكم | مرحباً | أهلاً }`} (يختار واحدة عشوائياً)
                </p>
              </div>
            )}

            {/* RETRY POLICY */}
            <div>
              <label className="label-field">عدد محاولات إعادة المحاولة عند الفشل</label>
              <input
                type="number"
                min={0}
                max={10}
                className="input-field"
                value={form.scheduleData.retries ?? 0}
                onChange={(e) => setForm({ ...form, scheduleData: { ...form.scheduleData, retries: parseInt(e.target.value) || 0 } })}
              />
            </div>
            <div>
              <label className="label-field">فاصل بين المحاولات (دقائق)</label>
              <input
                type="number"
                min={1}
                max={120}
                className="input-field"
                value={form.scheduleData.retryDelayMinutes ?? 5}
                onChange={(e) => setForm({ ...form, scheduleData: { ...form.scheduleData, retryDelayMinutes: parseInt(e.target.value) || 5 } })}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-5 pt-4 border-t border-secondary-100">
            <button onClick={handleSubmit} disabled={loading} className="btn-primary text-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {loading ? 'جاري الحفظ...' : (editingId ? 'حفظ التعديلات' : 'جدولة المهمة')}
            </button>
            <button onClick={resetForm} className="btn-secondary text-sm" disabled={loading}>إلغاء</button>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="card-gradient-border text-center py-12" style={{ padding: '2rem 1.5rem' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, rgba(139,44,245,0.1), rgba(255,79,216,0.1))' }}>
              <FilterIcon size={28} style={{ color: '#94a3b8' }} />
            </div>
            <p className="text-secondary-700 font-bold mb-1">
              {filter === 'all' ? 'لا توجد مهام مجدولة' : `لا توجد مهام بحالة "${STATUS_CONFIG[filter]?.label}"`}
            </p>
            <p className="text-xs text-secondary-500 mb-4">
              {filter === 'all' ? 'أنشئ مهمة جديدة لبدء الأتمتة التلقائية' : 'جرّب فلتر مختلف'}
            </p>
            {filter === 'all' && (
              <button onClick={handleStartAdd} className="btn-primary text-sm">
                <Calendar size={16} /> إنشاء أول مهمة
              </button>
            )}
          </div>
        ) : (
          filtered.map((task) => {
            const sd = parseScheduleData(task.data)
            const st = STATUS_CONFIG[task.status as CampaignStatus] || STATUS_CONFIG.pending
            const StatusIcon = st.icon
            const gradient = getPlatformGradient(task.platform)
            const scheduleLabel = sd.scheduleType === 'once'
              ? 'مرة واحدة'
              : sd.scheduleType === 'daily' ? `يومياً ${sd.time}`
              : sd.scheduleType === 'weekly' ? `أسبوعياً ${sd.time}`
              : `شهرياً يوم ${sd.dayOfMonth}`

            return (
              <div
                key={task.id}
                className="card-gradient-border flex items-center justify-between gap-3 transition-all hover:-translate-y-0.5"
                style={{ padding: '1rem 1.25rem' }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: st.bg }}>
                    <StatusIcon size={18} style={{ color: st.color }} className={task.status === 'running' ? 'animate-spin' : ''} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-secondary-900 text-sm truncate">{task.name}</h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: gradient }}>
                        {platformLabel(task.platform)}
                      </span>
                      <span className="text-[10px] text-secondary-500">{actionLabel(task.platform, task.type)}</span>
                      <span className="text-[10px] text-secondary-400">·</span>
                      <span className="text-[10px] text-violet-300 font-semibold flex items-center gap-1">
                        <Repeat size={9} />
                        {scheduleLabel}
                      </span>
                      <span className="text-[10px] text-secondary-400">·</span>
                      <span className="text-[10px] text-secondary-500">
                        التالي: {task.scheduled_at ? new Date(task.scheduled_at).toLocaleString('ar-EG') : 'غير محدد'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="badge text-[10px]" style={{ background: st.bg, color: st.color, border: 'none' }}>{st.label}</span>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(task)}
                    className="p-1.5 rounded-lg transition-colors text-violet-400 hover:bg-violet-500/15"
                    title="تعديل"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 rounded-lg transition-colors text-red-400 hover:bg-red-500/15"
                    title="حذف"
                  >
                    <Trash2 size={14} />
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
