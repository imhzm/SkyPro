import { useState, useCallback } from 'react'
import { Users, CheckSquare, Square, Play, SquareDot, Loader2, Settings, ChevronDown, ChevronUp } from 'lucide-react'
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

  const progressPct = cycleProgress?.totalAccounts && cycleProgress?.currentAccount
    ? (cycleProgress.currentAccount / cycleProgress.totalAccounts) * 100
    : 0

  return (
    <div className="card-gradient-border space-y-4" style={{ padding: '1.25rem' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.30)',
            }}
          >
            <Users size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-secondary-900 text-sm tracking-tight">
              تدوير الحسابات
            </h3>
            <p className="text-[10.5px] text-secondary-500 mt-0.5">
              {platformAccounts.length === 0
                ? 'لا توجد حسابات لهذه المنصة'
                : `${platformAccounts.length} حساب متاح · ${selectedIds.size} محدد`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {platformAccounts.length > 1 && (
            <button
              onClick={toggleAll}
              className="flex items-center gap-1 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              style={{
                color: '#6366f1',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.20)',
              }}
            >
              {allSelected ? <CheckSquare size={12} /> : <Square size={12} />}
              {allSelected ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
          )}
          {onAddAccount && (
            <button
              onClick={onAddAccount}
              className="text-[11.5px] font-semibold px-2.5 py-1.5 rounded-lg text-white flex items-center gap-1 transition-all hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.30)',
              }}
            >
              <span>+</span> إضافة
            </button>
          )}
        </div>
      </div>

      {/* Account List */}
      {platformAccounts.length === 0 ? (
        <div
          className="text-center py-6 rounded-xl"
          style={{
            background: 'rgba(248, 250, 252, 0.6)',
            border: '1px dashed rgba(99, 102, 241, 0.25)',
          }}
        >
          <Users size={28} className="mx-auto mb-2" style={{ color: 'rgba(99, 102, 241, 0.40)' }} />
          <p className="text-xs text-secondary-500 font-medium">
            لا توجد حسابات محفوظة لهذه المنصة
          </p>
          {onAddAccount && (
            <button
              onClick={onAddAccount}
              className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg text-white inline-flex items-center gap-1.5"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7)',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.30)',
              }}
            >
              <span>+</span> إضافة حساب
            </button>
          )}
        </div>
      ) : (
        <div
          className="max-h-56 overflow-y-auto space-y-1 scroll-container rounded-xl p-1"
          style={{ background: 'rgba(248, 250, 252, 0.4)' }}
        >
          {platformAccounts.map((account) => {
            const isSelected = selectedIds.has(account.id)
            return (
              <label
                key={account.id}
                className="flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-150"
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.10), rgba(168, 85, 247, 0.06))'
                    : 'rgba(255, 255, 255, 0.6)',
                  border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.30)' : 'rgba(226, 232, 240, 0.5)'}`,
                  opacity: cycleActive ? 0.7 : 1,
                  cursor: cycleActive ? 'not-allowed' : 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleAccount(account.id)}
                  className="sr-only"
                  disabled={cycleActive}
                />
                <div
                  className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all"
                  style={
                    isSelected
                      ? {
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                          boxShadow: '0 2px 6px rgba(99, 102, 241, 0.35)',
                        }
                      : {
                          background: 'white',
                          border: '1.5px solid #cbd5e1',
                        }
                  }
                >
                  {isSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-sm flex-1 truncate"
                  style={{
                    color: isSelected ? '#312e81' : '#475569',
                    fontWeight: isSelected ? 600 : 500,
                  }}
                  dir="ltr"
                >
                  {account.username}
                </span>
                {account.proxy && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      background: 'rgba(99, 102, 241, 0.10)',
                      color: '#4f46e5',
                      border: '1px solid rgba(99, 102, 241, 0.22)',
                    }}
                  >
                    بروكسي
                  </span>
                )}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0"
                  style={
                    account.status === 'active'
                      ? {
                          background: 'rgba(34, 197, 94, 0.10)',
                          color: '#15803d',
                          border: '1px solid rgba(34, 197, 94, 0.25)',
                        }
                      : {
                          background: 'rgba(148, 163, 184, 0.10)',
                          color: '#64748b',
                          border: '1px solid rgba(148, 163, 184, 0.25)',
                        }
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: account.status === 'active' ? '#22c55e' : '#94a3b8' }}
                  />
                  {account.status === 'active' ? 'نشط' : 'معطل'}
                </span>
              </label>
            )
          })}
        </div>
      )}

      {/* Task Type + Settings Toggle */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-secondary-500 flex-shrink-0">نوع المهمة:</label>
        <select
          value={taskType}
          onChange={e => setTaskType(e.target.value as 'extract' | 'send')}
          className="select-field text-xs flex-1"
          style={{ padding: '0.5rem 0.75rem' }}
          disabled={cycleActive}
        >
          <option value="extract">استخراج بيانات</option>
          <option value="send">إرسال رسائل</option>
        </select>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
          style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.5)', color: '#64748b' }}
        >
          <Settings size={12} />
          {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {/* Warning for missing params */}
      {hasNoTaskParams && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#b45309' }}>
          {taskType === 'extract'
            ? 'حدد نوع الاستخراج وأدخل البيانات المطلوبة قبل بدء الدورة'
            : 'أدخل نص الرسالة والمستلمين قبل بدء الدورة'}
        </div>
      )}

      {/* Expandable Settings */}
      {showSettings && (
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl" style={{ background: 'rgba(248,250,252,0.8)', border: '1px solid rgba(226,232,240,0.4)' }}>
          <div>
            <label className="label-field text-[11px]">عمليات/حساب</label>
            <input type="number" value={settings.maxOperations} onChange={e => setSettings(s => ({ ...s, maxOperations: parseInt(e.target.value) || 50 }))} className="input-field text-sm" min={1} max={1000} disabled={cycleActive} />
          </div>
          <div>
            <label className="label-field text-[11px]">تأخير بين الحسابات (ث)</label>
            <input type="number" value={settings.delayBetweenAccounts} onChange={e => setSettings(s => ({ ...s, delayBetweenAccounts: parseInt(e.target.value) || 10 }))} className="input-field text-sm" min={1} max={300} disabled={cycleActive} />
          </div>
          <div>
            <label className="label-field text-[11px]">فترة الانتظار (دقائق)</label>
            <input type="number" value={settings.intervalMinutes} onChange={e => setSettings(s => ({ ...s, intervalMinutes: parseInt(e.target.value) || 5 }))} className="input-field text-sm" min={1} max={60} disabled={cycleActive} />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <button type="button" className={`sw-toggle ${settings.stopOnError ? 'active' : ''}`} onClick={() => setSettings(s => ({ ...s, stopOnError: !s.stopOnError }))} />
              <span className="text-xs text-secondary-600">إيقاف عند خطأ</span>
            </label>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {!cycleActive ? (
          <button
            onClick={handleStart}
            disabled={selectedIds.size === 0}
            className="btn-success flex items-center gap-1.5 text-sm"
          >
            <Play size={16} />
            بدء الدورة ({selectedIds.size} حساب)
          </button>
        ) : (
          <button onClick={onStopCycle} className="btn-danger flex items-center gap-1.5 text-sm">
            <SquareDot size={16} />
            إيقاف الدورة
          </button>
        )}
      </div>

      {/* Cycle Progress */}
      {cycleActive && cycleProgress && (
        <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(10,108,241,0.06)', border: '1px solid rgba(10,108,241,0.15)' }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#1e40af' }}>
            <Loader2 size={14} className="animate-spin" />
            <span className="font-medium">
              {cycleProgress.type === 'cycle_progress' && `جاري المعالجة: ${cycleProgress.accountName} (${cycleProgress.currentAccount}/${cycleProgress.totalAccounts})`}
              {cycleProgress.type === 'cycle_waiting_login' && `بانتظار تسجيل الدخول: ${cycleProgress.accountName}`}
              {cycleProgress.type === 'cycle_account_done' && `تم الحساب: ${cycleProgress.accountName} — ${cycleProgress.ops} عملية`}
              {cycleProgress.type === 'cycle_error' && `خطأ: ${cycleProgress.error}`}
            </span>
          </div>
          {cycleProgress.totalAccounts && cycleProgress.currentAccount && (
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
          )}
          {cycleProgress.totalResults !== undefined && (
            <p className="text-[11px] font-medium" style={{ color: '#0A6CF1' }}>إجمالي النتائج: {cycleProgress.totalResults}</p>
          )}
        </div>
      )}

      {/* Cycle Complete */}
      {!cycleActive && cycleProgress && cycleProgress.type === 'cycle_account_done' && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a' }}>
          <CheckSquare size={16} />
          <span className="font-medium">تمت الدورة بنجاح ({cycleProgress.totalResults || 0} نتيجة)</span>
        </div>
      )}
    </div>
  )
}
