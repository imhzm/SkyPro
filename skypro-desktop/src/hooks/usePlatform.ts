import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAccountsStore } from '../stores/accountsStore'

// Unified limits for bulk operations
const BULK_LIMITS = {
  maxResultsDisplay: 500,
  maxCycleAccounts: 20,
  maxBulkInput: 1000,
} as const

export interface CycleProgress {
  type: string
  currentAccount?: number
  totalAccounts?: number
  accountName?: string
  round?: number
  totalResults?: number
  ops?: number
  totalOps?: number
  error?: string
}

export interface LiveProgress {
  jobId?: string
  type?: string
  count?: number
  total?: number
  data?: Record<string, unknown>[]
  last?: Record<string, unknown>
  [key: string]: unknown
}

export function usePlatform(platformId: string) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [cycleActive, setCycleActive] = useState(false)
  const [cycleProgress, setCycleProgress] = useState<CycleProgress | null>(null)
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ---- Live extraction streaming (real-time rows as the bot finds them) ----
  // Rows arrive over the shared `extraction-progress` channel tagged with a
  // jobId. We isolate by the ACTIVE jobId so two platforms (or two tools) can
  // run concurrently without their rows bleeding together. A module calls
  // `beginLiveJob(jobId)` right before invoking an extraction, renders
  // `liveRows` while it runs, then drops in the final result when it returns.
  const [liveRows, setLiveRows] = useState<any[]>([])
  const [liveProgress, setLiveProgress] = useState<LiveProgress | null>(null)
  const liveRowsRef = useRef<any[]>([])
  const activeJobRef = useRef<string | null>(null)

  const beginLiveJob = useCallback((jobId: string) => {
    activeJobRef.current = jobId
    liveRowsRef.current = []
    setLiveRows([])
    setLiveProgress(null)
  }, [])

  const endLiveJob = useCallback(() => { activeJobRef.current = null }, [])

  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()
  const accounts = useMemo(() => allAccounts.filter((a: any) => a.platform === platformId), [allAccounts, platformId])

  // Load accounts the first time any platform module mounts — this is what
  // makes AccountCycleBanner actually show the saved accounts the user has
  // for the current platform. Previously the store would be empty unless
  // the user visited /accounts first.
  useEffect(() => {
    void loadAllAccounts()
  }, [loadAllAccounts])

  const showMsg = useCallback((msg: string, isError = false) => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current)
    if (isError) { setError(msg); setMessage('') }
    else { setMessage(msg); setError('') }
    msgTimerRef.current = setTimeout(() => { setMessage(''); setError(''); msgTimerRef.current = null }, 6000)
  }, [])

  const sanitizeCsvValue = useCallback((value: unknown): string => {
    const str = String(value ?? '')
    if (/^[=+\-@\t\r]/.test(str)) {
      return "'" + str.replace(/"/g, '""')
    }
    return str
  }, [])

  const loadResults = useCallback(async () => {
    try {
      const res = await window.electronAPI.dbQuery({ table: 'leads', filters: [{ column: 'platform', op: '=', value: platformId }], limit: 500 })
      if (res.success && res.data) setResults(Array.isArray(res.data) ? res.data : [])
    } catch (err: any) { console.error('Failed to load results:', err.message) }
  }, [platformId])

  const checkSession = useCallback(async (opts: { silent?: boolean } = {}) => {
    try {
      const res = await window.electronAPI.checkPlatformSession({ platform: platformId, headless: false })
      if (res.success && res.alreadyLoggedIn) {
        setSessionId((current) => current || res.sessionId || '')
        return { alreadyLoggedIn: true, sessionId: res.sessionId }
      }
      return { alreadyLoggedIn: false, sessionId: '' }
    } catch (err: any) {
      if (!opts.silent) console.error('checkSession error:', err.message)
      return { alreadyLoggedIn: false, sessionId: '' }
    }
  }, [platformId])

  // Live login detection — when the user is on a platform page without an
  // active session, poll every 4s in the background so we catch them the
  // instant they finish logging in (manually, via 2FA, or via persistent
  // cookies). Stops automatically as soon as a session is detected, and
  // pauses when the tab is hidden so we don't waste cycles.
  useEffect(() => {
    if (sessionId) return // Already logged in — no need to poll.

    let cancelled = false
    const POLL_MS = 4000
    const tick = async () => {
      if (cancelled || document.hidden || sessionId) return
      const res = await checkSession({ silent: true })
      if (res.alreadyLoggedIn && !cancelled) {
        setSessionId(res.sessionId || '')
      }
    }
    const handle = window.setInterval(tick, POLL_MS)
    // Also check immediately when the window regains focus.
    const onVisible = () => { if (!document.hidden && !sessionId) void tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      window.clearInterval(handle)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [sessionId, checkSession])

  const clearSession = useCallback(async () => {
    if (!sessionId) return
    try {
      await window.electronAPI.closeBrowser(sessionId)
      setSessionId('')
      showMsg('تم إغلاق الجلسة')
    } catch (err: any) {
      showMsg('خطأ في إغلاق الجلسة: ' + err.message, true)
    }
  }, [sessionId, showMsg])

  const handleExport = useCallback(async (headers: string[], filenamePrefix: string, customData?: any[]) => {
    const dataToExport = customData && customData.length > 0 ? customData : results.length > 0 ? results : []
    if (dataToExport.length === 0) { showMsg('لا توجد نتائج للتصدير', true); return }
    // Helper that prefers top-level property over extra_data JSON. This is
    // critical: when toolResults are fed in directly (live IPC results), the
    // fields are at the top level (r.userId, r.profile). When loaded from
    // the DB, they sit inside extra_data. The CSV exporter must work for
    // both — try direct prop first, then extra_data, then any alias.
    const pick = (r: any, extra: any, keys: string[]): string => {
      for (const k of keys) {
        const v = r?.[k]
        if (v !== undefined && v !== null && v !== '') return String(v)
      }
      for (const k of keys) {
        const v = extra?.[k]
        if (v !== undefined && v !== null && v !== '') return String(v)
      }
      return ''
    }
    const data = dataToExport.map(r => {
      const row: any = {}
      let extraData: any = {}
      try { extraData = JSON.parse(r.extra_data || '{}') } catch { extraData = {} }
      const raw: Record<string, unknown> = {}
      headers.forEach(h => {
        switch (h) {
          case 'الاسم':           raw[h] = pick(r, extraData, ['name', 'title', 'fullName', 'displayName']); break
          case 'معرف المستخدم':   raw[h] = pick(r, extraData, ['userId', 'user_id', 'id', 'uid', 'fbId']); break
          case 'المعرف':          raw[h] = pick(r, extraData, ['username', 'handle', 'userId', 'user_id', 'id']); break
          case 'الرابط':          raw[h] = pick(r, extraData, ['url', 'profile', 'link', 'href', 'profileUrl']); break
          case 'الهاتف':          raw[h] = pick(r, extraData, ['phone', 'phoneNumber', 'mobile', 'number']); break
          case 'البريد':          raw[h] = pick(r, extraData, ['email', 'emailAddress', 'mail']); break
          case 'النص':            raw[h] = pick(r, extraData, ['text', 'content', 'message', 'caption', 'extra', 'comment']); break
          case 'المصدر':          raw[h] = pick(r, extraData, ['source', 'src', 'origin']); break
          case 'التاريخ':         raw[h] = pick(r, extraData, ['created_at', 'date', 'timestamp', 'time']); break
          case 'العنوان':         raw[h] = pick(r, extraData, ['title', 'name', 'heading']); break
          case 'السعر':           raw[h] = pick(r, extraData, ['price', 'cost', 'amount']); break
          case 'الموقع':          raw[h] = pick(r, extraData, ['location', 'address', 'city', 'country']); break
          case 'التقييم':         raw[h] = pick(r, extraData, ['rating', 'score', 'stars']); break
          case 'النوع':           raw[h] = pick(r, extraData, ['type', 'category', 'kind']); break
          case 'الصورة':          raw[h] = pick(r, extraData, ['image', 'thumbnail', 'avatar', 'photo']); break
          case 'الأعضاء':         raw[h] = pick(r, extraData, ['members', 'memberCount', 'membersCount']); break
          case 'المتابعين':       raw[h] = pick(r, extraData, ['followers', 'followersCount', 'followerCount']); break
          case 'المتابعون':       raw[h] = pick(r, extraData, ['following', 'followingCount']); break
          case 'المجموعة':        raw[h] = pick(r, extraData, ['group', 'groupName', 'groupTitle']); break
          case 'الرقم':           raw[h] = pick(r, extraData, ['phone', 'number', 'phoneNumber']); break
          case 'المستلم':         raw[h] = pick(r, extraData, ['recipient', 'username', 'target', 'name']); break
          case 'الحالة':          raw[h] = pick(r, extraData, ['status', 'state', 'result']); break
          case 'خطأ':             raw[h] = pick(r, extraData, ['error', 'message', 'errorMessage']); break
          case 'المستخدم':        raw[h] = pick(r, extraData, ['username', 'user', 'name', 'handle']); break
          case 'آخر نشاط':        raw[h] = pick(r, extraData, ['lastActive', 'lastSeen', 'lastActivity', 'time']); break
          case 'آخر ظهور':        raw[h] = pick(r, extraData, ['lastSeen', 'lastActive', 'lastActivity']); break
          case 'تفاصيل':          raw[h] = pick(r, extraData, ['details', 'description', 'bio', 'about']); break
          case 'البلد':           raw[h] = pick(r, extraData, ['country', 'location']); break
          case 'الجنس':           raw[h] = pick(r, extraData, ['gender', 'sex']); break
          case 'اللغة':           raw[h] = pick(r, extraData, ['language', 'lang']); break
          // English headers (legacy + bilingual modules)
          case 'Name':            raw[h] = pick(r, extraData, ['name', 'title']); break
          case 'UserID':          raw[h] = pick(r, extraData, ['userId', 'user_id', 'id']); break
          case 'Username':        raw[h] = pick(r, extraData, ['username', 'handle']); break
          case 'Profile':         raw[h] = pick(r, extraData, ['profile', 'url', 'link']); break
          case 'URL':             raw[h] = pick(r, extraData, ['url', 'profile', 'link']); break
          case 'Phone':           raw[h] = pick(r, extraData, ['phone', 'phoneNumber']); break
          case 'Email':           raw[h] = pick(r, extraData, ['email']); break
          case 'Text':            raw[h] = pick(r, extraData, ['text', 'content', 'message']); break
          case 'Source':          raw[h] = pick(r, extraData, ['source']); break
          case 'Date':            raw[h] = pick(r, extraData, ['created_at', 'date', 'timestamp']); break
          case 'Recipient':       raw[h] = pick(r, extraData, ['recipient', 'username', 'name']); break
          case 'Status':          raw[h] = pick(r, extraData, ['status', 'state']); break
          case 'Error':           raw[h] = pick(r, extraData, ['error', 'message']); break
          // # column is just the row index — emit nothing, table component handles it
          case '#':               raw[h] = ''; break
          // Fallback: try the header itself, then extra_data, then aliases
          default:                raw[h] = pick(r, extraData, [h]); break
        }
      })
      for (const k of headers) row[k] = sanitizeCsvValue(raw[k])
      return row
    })
    // Filter `#` column out of CSV — it's just a UI row counter, not data.
    const csvHeaders = headers.filter(h => h !== '#')
    // Export filename = tool name + date + time, so repeated exports never
    // overwrite each other (e.g. "facebook-friends_2026-06-14_153042.csv").
    const _d = new Date()
    const _p = (n: number) => String(n).padStart(2, '0')
    const _stamp = `${_d.getFullYear()}-${_p(_d.getMonth() + 1)}-${_p(_d.getDate())}_${_p(_d.getHours())}${_p(_d.getMinutes())}${_p(_d.getSeconds())}`
    const _safePrefix = (filenamePrefix || 'export').replace(/[^\w؀-ۿ.-]+/g, '-')
    const res = await window.electronAPI.exportToCSV({
      filename: `${_safePrefix}_${_stamp}.csv`, data, headers: csvHeaders
    })
    if (res.success) showMsg(`تم التصدير إلى: ${res.path}`)
    else showMsg(res.error || 'فشل التصدير', true)
  }, [results, showMsg, sanitizeCsvValue])

  const clearResults = useCallback(async () => {
    if (results.length === 0) {
      showMsg('لا توجد نتائج لمسحها', true)
      return
    }
    // Require explicit user confirmation for bulk delete
    const confirmed = window.confirm(
      `هل تريد حذف ${results.length} نتيجة من منصة ${platformId}؟ لا يمكن التراجع عن هذا الإجراء.`
    )
    if (!confirmed) return
    try {
      const res = await window.electronAPI.clearLeadsByPlatform({ platform: platformId })
      if (!res.success) {
        showMsg(res.error || 'خطأ في مسح النتائج', true)
        return
      }
      setResults([])
      showMsg(`تم مسح ${res.changes || 0} نتيجة`)
    } catch (err: any) {
      showMsg('خطأ في مسح النتائج: ' + err.message, true)
    }
  }, [platformId, results.length, showMsg])

  const deleteResult = useCallback(async (id: number) => {
    await window.electronAPI.dbDelete({ table: 'leads', id })
    await loadResults()
  }, [loadResults])

  const startCycle = useCallback(async (accountList: any[], task: any, settings?: any) => {
    // Validate account list
    if (!accountList || accountList.length === 0) {
      showMsg('لا توجد حسابات للتدوير', true)
      return
    }
    const validAccounts = accountList.filter((a: any) => a.username || a.email)
    if (validAccounts.length === 0) {
      showMsg('لا توجد حسابات صالحة (بدون اسم مستخدم)', true)
      return
    }
    if (validAccounts.length > BULK_LIMITS.maxCycleAccounts) {
      showMsg(`الحد الأقصى للحسابات في الدورة هو ${BULK_LIMITS.maxCycleAccounts}`, true)
      return
    }
    setCycleProgress(null)
    setCycleActive(true)
    try {
      const res = await window.electronAPI.cycleAccounts({
        platform: platformId,
        accounts: validAccounts.map((a: any) => ({ id: a.id, username: a.username, platform: a.platform })),
        task,
        settings: settings || {}
      })
      if (res.success && res.data) {
        const data = (Array.isArray(res.data) ? res.data : [res.data]) as any[]
        setResults(prev => [...prev, ...data.map((d: any) => ({ ...d, platform: platformId }))])
        const accountSummary = (Array.isArray((res as any).log) ? (res as any).log : []).map((l: any) => `${l.account}: ${l.status}`).join(' | ')
        showMsg(`تمت الدورة بنجاح: ${data.length} نتيجة${accountSummary ? ' | ' + accountSummary : ''}`)
      } else {
        showMsg(String((res as any).error || 'فشلت الدورة'), true)
      }
    } catch (err: any) {
      showMsg('خطأ في الدورة: ' + err.message, true)
    } finally {
      setCycleActive(false)
    }
  }, [platformId, showMsg])

  const stopCycle = useCallback(async () => {
    try {
      await window.electronAPI.stopCycle()
      showMsg('جاري إيقاف الدورة...')
    } catch (err: any) {
      showMsg('خطأ في إيقاف الدورة: ' + err.message, true)
    }
  }, [showMsg])

  useEffect(() => {
    const cleanup = window.electronAPI.onExtractionProgress((data: any) => {
      // Multi-account cycle progress (existing behaviour).
      if (data.type?.startsWith('cycle_') || data.type === 'cycle_progress' || data.type === 'cycle_waiting_login') {
        setCycleProgress(data as CycleProgress)
      }
      // Live extraction rows — only for THIS module's active job, so concurrent
      // runs on other platforms never cross-contaminate this table.
      const job = activeJobRef.current
      if (job && data.jobId === job) {
        setLiveProgress(data as LiveProgress)
        const batch: any[] = Array.isArray(data.data) ? data.data : (data.last ? [data.last] : [])
        if (batch.length) {
          liveRowsRef.current = liveRowsRef.current.concat(batch)
          setLiveRows(liveRowsRef.current.slice())
        }
      }
    })
    return () => cleanup()
  }, [])

  useEffect(() => { loadAllAccounts(); loadResults() }, [loadAllAccounts, loadResults])

  return {
    loading, setLoading, message, error, showMsg,
    sessionId, setSessionId, accounts, results, setResults,
    loadAccounts: loadAllAccounts, loadResults, handleExport, clearResults,
    deleteResult, checkSession, clearSession,
    cycleActive, cycleProgress, startCycle, stopCycle,
    liveRows, liveProgress, beginLiveJob, endLiveJob
  }
}
