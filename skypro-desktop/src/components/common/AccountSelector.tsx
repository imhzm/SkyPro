import { useState, useCallback } from 'react'
import { Users, CheckSquare, Square, Play, SquareDot, Loader2 } from 'lucide-react'
import type { CycleProgress } from '../../hooks/usePlatform'

interface Account {
  id: number
  platform: string
  username: string
  password?: string
  proxy?: string
  status?: string
}

interface CycleSettings {
  intervalMinutes: number
  maxOperations: number
  stopOnError: boolean
  delayBetweenAccounts: number
}

type CycleTask = {
  type: string
  params: Record<string, unknown>
}

interface AccountSelectorProps {
  platformId: string
  accounts: Account[]
  cycleActive: boolean
  cycleProgress: CycleProgress | null
  onStartCycle: (selectedAccounts: Account[], task: CycleTask, settings: CycleSettings) => void
  onStopCycle: () => void
  onAddAccount?: () => void
  extractTask?: CycleTask
  sendTask?: CycleTask
}

export default function AccountSelector({
  platformId,
  accounts,
  cycleActive,
  cycleProgress,
  onStartCycle,
  onStopCycle,
  onAddAccount,
  extractTask,
  sendTask,
}: AccountSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [settings, setSettings] = useState<CycleSettings>({
    intervalMinutes: 5,
    maxOperations: 50,
    stopOnError: true,
    delayBetweenAccounts: 10,
  })
  const [showSettings, setShowSettings] = useState(false)
  const [taskType, setTaskType] = useState<'extract' | 'send'>('extract')

  const platformAccounts = accounts.filter(a => a.platform === platformId)

  const toggleAccount = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedIds.size === platformAccounts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(platformAccounts.map(a => a.id)))
    }
  }, [selectedIds.size, platformAccounts])

  const handleStart = useCallback(() => {
    const selected = platformAccounts.filter(a => selectedIds.has(a.id))
    if (selected.length === 0) return

    const defaultExtractTask = { type: 'extract', params: {} }
    const defaultSendTask = { type: 'send', params: {} }

    const task = taskType === 'extract'
      ? (extractTask || defaultExtractTask)
      : (sendTask || defaultSendTask)

    onStartCycle(selected, task, settings)
  }, [platformAccounts, selectedIds, taskType, settings, onStartCycle, extractTask, sendTask])

  const allSelected = platformAccounts.length > 0 && selectedIds.size === platformAccounts.length

  const hasNoTaskParams = taskType === 'extract'
    ? !extractTask || Object.keys(extractTask.params || {}).length === 0
    : !sendTask || Object.keys(sendTask.params || {}).length === 0

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-sw-primary" />
          <h3 className="font-bold text-secondary-800">تدوير الحسابات ({platformAccounts.length})</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleAll} className="flex items-center gap-1 text-xs text-sw-primary hover:underline">
            {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
          </button>
          {onAddAccount && (
            <button onClick={onAddAccount} className="text-xs btn-primary px-2 py-1">+ إضافة حساب</button>
          )}
        </div>
      </div>

      {platformAccounts.length === 0 ? (
        <p className="text-sm text-secondary-500 text-center py-4">لا توجد حسابات محفوظة لهذه المنصة. أضف حساب من تبويب تسجيل الدخول.</p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-1">
          {platformAccounts.map(account => (
            <label key={account.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.has(account.id)}
                onChange={() => toggleAccount(account.id)}
                className="w-4 h-4 text-sw-primary rounded border-secondary-300 focus:ring-sw-primary"
                disabled={cycleActive}
              />
              <span className="text-sm text-secondary-700 flex-1">{account.username}</span>
              {account.proxy && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">بروكسي</span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded ${account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-secondary-100 text-secondary-500'}`}>
                {account.status === 'active' ? 'نشط' : 'غير نشط'}
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <label className="text-xs text-secondary-600">نوع المهمة:</label>
        <select
          value={taskType}
          onChange={e => setTaskType(e.target.value as 'extract' | 'send')}
          className="select-field text-xs"
          disabled={cycleActive}
        >
          <option value="extract">استخراج بيانات</option>
          <option value="send">إرسال رسائل</option>
        </select>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-xs text-sw-primary hover:underline"
        >
          {showSettings ? 'إخفاء الإعدادات' : 'إعدادات الدورة'}
        </button>
      </div>

      {hasNoTaskParams && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-2 rounded-lg">
          {taskType === 'extract'
            ? 'حدد نوع الاستخراج وأدخل البيانات المطلوبة في حقل الاستخراج أعلاه قبل بدء الدورة'
            : 'أدخل نص الرسالة والمستلمين في حقول الإرسال أعلاه قبل بدء الدورة'}
        </div>
      )}

      {showSettings && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-secondary-50 rounded-lg">
          <div>
            <label className="label-field">الحد الأقصى للعمليات لكل حساب</label>
            <input
              type="number"
              value={settings.maxOperations}
              onChange={e => setSettings(s => ({ ...s, maxOperations: parseInt(e.target.value) || 50 }))}
              className="input-field text-sm"
              min={1}
              max={1000}
              disabled={cycleActive}
            />
          </div>
          <div>
            <label className="label-field">التأخير بين الحسابات (ثواني)</label>
            <input
              type="number"
              value={settings.delayBetweenAccounts}
              onChange={e => setSettings(s => ({ ...s, delayBetweenAccounts: parseInt(e.target.value) || 10 }))}
              className="input-field text-sm"
              min={1}
              max={300}
              disabled={cycleActive}
            />
          </div>
          <div>
            <label className="label-field">فترة الانتظار (دقائق)</label>
            <input
              type="number"
              value={settings.intervalMinutes}
              onChange={e => setSettings(s => ({ ...s, intervalMinutes: parseInt(e.target.value) || 5 }))}
              className="input-field text-sm"
              min={1}
              max={60}
              disabled={cycleActive}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="label-field">إيقاف عند الخطأ</label>
            <input
              type="checkbox"
              checked={settings.stopOnError}
              onChange={e => setSettings(s => ({ ...s, stopOnError: e.target.checked }))}
              className="w-4 h-4 text-sw-primary rounded"
              disabled={cycleActive}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!cycleActive ? (
          <button
            onClick={handleStart}
            disabled={selectedIds.size === 0 || cycleActive || hasNoTaskParams}
            className="btn-success flex items-center gap-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            بدء الدورة ({selectedIds.size} حساب)
          </button>
        ) : (
          <button onClick={onStopCycle} className="btn-danger flex items-center gap-1 text-sm">
            <SquareDot className="w-4 h-4" />
            إيقاف الدورة
          </button>
        )}
      </div>

      {cycleActive && cycleProgress && (
        <div className="p-3 bg-blue-50 rounded-lg space-y-1">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {cycleProgress.type === 'cycle_progress' && `جاري المعالجة: ${cycleProgress.accountName} (${cycleProgress.currentAccount}/${cycleProgress.totalAccounts})`}
              {cycleProgress.type === 'cycle_waiting_login' && `بانتظار تسجيل الدخول: ${cycleProgress.accountName}`}
              {cycleProgress.type === 'cycle_account_done' && `تم الحساب: ${cycleProgress.accountName} - ${cycleProgress.ops} عملية`}
              {cycleProgress.type === 'cycle_error' && `خطأ: ${cycleProgress.error}`}
            </span>
          </div>
          {cycleProgress.totalAccounts && cycleProgress.currentAccount && (
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-sw-primary h-2 rounded-full transition-all"
                style={{ width: `${(cycleProgress.currentAccount / cycleProgress.totalAccounts) * 100}%` }}
              />
            </div>
          )}
          {cycleProgress.totalResults !== undefined && (
            <p className="text-xs text-blue-600">إجمالي النتائج: {cycleProgress.totalResults}</p>
          )}
        </div>
      )}

      {!cycleActive && cycleProgress && cycleProgress.type === 'cycle_account_done' && (
        <div className="p-2 bg-green-50 text-green-700 text-sm rounded-lg flex items-center gap-2">
          <CheckSquare className="w-4 h-4" />
          تمت الدورة بنجاح ({cycleProgress.totalResults || 0} نتيجة)
        </div>
      )}
    </div>
  )
}
