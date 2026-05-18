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

export function usePlatform(platformId: string) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sessionId, setSessionId] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [cycleActive, setCycleActive] = useState(false)
  const [cycleProgress, setCycleProgress] = useState<CycleProgress | null>(null)
  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    const data = dataToExport.map(r => {
      const row: any = {}
      let extraData: any = {}
      try { extraData = JSON.parse(r.extra_data || '{}') } catch { extraData = {} }
      const raw: Record<string, unknown> = {}
      headers.forEach(h => {
        switch (h) {
          case 'الاسم': raw[h] = r.name || extraData.name || ''; break
          case 'معرف المستخدم': raw[h] = extraData.userId || extraData.id || r.extra_data?.userId || ''; break
          case 'المعرف': raw[h] = r.username || extraData.username || extraData.userId || extraData.id || ''; break
          case 'الرابط': raw[h] = r.url || extraData.profile || extraData.url || r.link || ''; break
          case 'الهاتف': raw[h] = r.phone || extraData.phone || ''; break
          case 'البريد': raw[h] = r.email || extraData.email || ''; break
          case 'النص': raw[h] = r.text || r.content || extraData.text || extraData.extra || ''; break
          case 'المصدر': raw[h] = r.source || extraData.source || ''; break
          case 'التاريخ': raw[h] = r.created_at || ''; break
          case 'العنوان': raw[h] = r.title || r.name || extraData.title || extraData.name || ''; break
          case 'السعر': raw[h] = r.price || extraData.price || ''; break
          case 'الموقع': raw[h] = r.location || r.address || extraData.location || ''; break
          case 'التقييم': raw[h] = r.rating || extraData.rating || ''; break
          case 'النوع': raw[h] = r.type || r.category || extraData.type || ''; break
          case 'الصورة': raw[h] = r.image || r.thumbnail || extraData.image || extraData.thumbnail || ''; break
          case 'الأعضاء': raw[h] = r.members || r.memberCount || extraData.members || extraData.memberCount || ''; break
          case 'المجموعة': raw[h] = r.group || r.groupName || extraData.group || extraData.groupName || ''; break
          case 'الرقم': raw[h] = r.phone || r.number || extraData.phone || extraData.number || ''; break
          case 'المستلم': raw[h] = r.recipient || r.username || extraData.recipient || extraData.username || ''; break
          case 'الحالة': raw[h] = r.status || r.state || extraData.status || ''; break
          case 'خطأ': raw[h] = r.error || r.message || extraData.error || extraData.message || ''; break
          case 'المستخدم': raw[h] = r.username || r.user || extraData.username || extraData.user || r.name || ''; break
          case 'Name': raw[h] = r.name || extraData.name || ''; break
          case 'UserID': raw[h] = extraData.userId || extraData.id || ''; break
          case 'Profile': raw[h] = r.url || extraData.profile || ''; break
          case 'Phone': raw[h] = r.phone || extraData.phone || ''; break
          case 'Email': raw[h] = r.email || extraData.email || ''; break
          case 'Text': raw[h] = extraData.text || ''; break
          case 'Source': raw[h] = r.source || ''; break
          case 'Date': raw[h] = r.created_at || ''; break
          case 'Recipient': raw[h] = r.recipient || r.username || extraData.recipient || ''; break
          case 'Status': raw[h] = r.status || extraData.status || ''; break
          case 'Error': raw[h] = r.error || extraData.error || ''; break
          default: raw[h] = r[h] || extraData[h] || ''; break
        }
      })
      for (const k of headers) row[k] = sanitizeCsvValue(raw[k])
      return row
    })
    const res = await window.electronAPI.exportToCSV({
      filename: `${filenamePrefix}-${Date.now()}.csv`, data, headers
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
      if (data.type?.startsWith('cycle_') || data.type === 'cycle_progress' || data.type === 'cycle_waiting_login') {
        setCycleProgress(data as CycleProgress)
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
    cycleActive, cycleProgress, startCycle, stopCycle
  }
}
