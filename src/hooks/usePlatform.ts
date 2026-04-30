import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAccountsStore } from '../stores/accountsStore'

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

  const showMsg = useCallback((msg: string, isError = false) => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current)
    if (isError) { setError(msg); setMessage('') }
    else { setMessage(msg); setError('') }
    msgTimerRef.current = setTimeout(() => { setMessage(''); setError(''); msgTimerRef.current = null }, 6000)
  }, [])

  const loadResults = useCallback(async () => {
    try {
      const res = await window.electronAPI.dbQuery({ table: 'leads', where: `platform = '${String(platformId).replace(/'/g, "''")}'`, limit: 500 })
      if (res.success && res.data) setResults(res.data || [])
    } catch (err: any) { console.error('Failed to load results:', err.message) }
  }, [platformId])

  const checkSession = useCallback(async () => {
    try {
      const res = await window.electronAPI.checkPlatformSession({ platform: platformId, headless: false })
      if (res.success && res.alreadyLoggedIn) {
        setSessionId(res.sessionId)
        return { alreadyLoggedIn: true, sessionId: res.sessionId }
      }
      return { alreadyLoggedIn: false, sessionId: '' }
    } catch (err: any) {
      console.error('checkSession error:', err.message)
      return { alreadyLoggedIn: false, sessionId: '' }
    }
  }, [platformId])

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
      headers.forEach(h => {
        switch (h) {
          case 'الاسم': row[h] = r.name || extraData.name || ''; break
          case 'معرف المستخدم': row[h] = extraData.userId || extraData.id || r.extra_data?.userId || ''; break
          case 'المعرف': row[h] = r.username || extraData.username || extraData.userId || extraData.id || ''; break
          case 'الرابط': row[h] = r.url || extraData.profile || extraData.url || r.link || ''; break
          case 'الهاتف': row[h] = r.phone || extraData.phone || ''; break
          case 'البريد': row[h] = r.email || extraData.email || ''; break
          case 'النص': row[h] = r.text || r.content || extraData.text || extraData.extra || ''; break
          case 'المصدر': row[h] = r.source || extraData.source || ''; break
          case 'التاريخ': row[h] = r.created_at || ''; break
          case 'العنوان': row[h] = r.title || r.name || extraData.title || extraData.name || ''; break
          case 'السعر': row[h] = r.price || extraData.price || ''; break
          case 'الموقع': row[h] = r.location || r.address || extraData.location || ''; break
          case 'التقييم': row[h] = r.rating || extraData.rating || ''; break
          case 'النوع': row[h] = r.type || r.category || extraData.type || ''; break
          case 'الصورة': row[h] = r.image || r.thumbnail || extraData.image || extraData.thumbnail || ''; break
          case 'الأعضاء': row[h] = r.members || r.memberCount || extraData.members || extraData.memberCount || ''; break
          case 'المجموعة': row[h] = r.group || r.groupName || extraData.group || extraData.groupName || ''; break
          case 'الرقم': row[h] = r.phone || r.number || extraData.phone || extraData.number || ''; break
          case 'المستلم': row[h] = r.recipient || r.username || extraData.recipient || extraData.username || ''; break
          case 'الحالة': row[h] = r.status || r.state || extraData.status || ''; break
          case 'خطأ': row[h] = r.error || r.message || extraData.error || extraData.message || ''; break
          case 'المستخدم': row[h] = r.username || r.user || extraData.username || extraData.user || r.name || ''; break
          case 'Name': row[h] = r.name || extraData.name || ''; break
          case 'UserID': row[h] = extraData.userId || extraData.id || ''; break
          case 'Profile': row[h] = r.url || extraData.profile || ''; break
          case 'Phone': row[h] = r.phone || extraData.phone || ''; break
          case 'Email': row[h] = r.email || extraData.email || ''; break
          case 'Text': row[h] = extraData.text || ''; break
          case 'Source': row[h] = r.source || ''; break
          case 'Date': row[h] = r.created_at || ''; break
          case 'Recipient': row[h] = r.recipient || r.username || extraData.recipient || ''; break
          case 'Status': row[h] = r.status || extraData.status || ''; break
          case 'Error': row[h] = r.error || extraData.error || ''; break
          default: row[h] = r[h] || extraData[h] || ''; break
        }
      })
      return row
    })
    const res = await window.electronAPI.exportToCSV({
      filename: `${filenamePrefix}-${Date.now()}.csv`, data, headers
    })
    if (res.success) showMsg(`تم التصدير إلى: ${res.path}`)
    else showMsg(res.error || 'فشل التصدير', true)
  }, [results, showMsg])

  const clearResults = useCallback(async () => {
    try {
      const res = await window.electronAPI.dbQuery({ table: 'leads', where: `platform = '${String(platformId).replace(/'/g, "''")}'` })
      if (res.success && res.data) {
        for (const row of (res.data || [])) {
          await window.electronAPI.dbDelete({ table: 'leads', id: row.id })
        }
      }
      setResults([])
      showMsg('تم مسح جميع النتائج')
    } catch (err: any) {
      showMsg('خطأ في مسح النتائج: ' + err.message, true)
    }
  }, [platformId, showMsg])

  const deleteResult = useCallback(async (id: number) => {
    await window.electronAPI.dbDelete({ table: 'leads', id })
    await loadResults()
  }, [loadResults])

  const startCycle = useCallback(async (accountList: any[], task: any, settings?: any) => {
    setCycleProgress(null)
    setCycleActive(true)
    try {
      const res = await window.electronAPI.cycleAccounts({
        platform: platformId,
        accounts: accountList,
        task,
        settings: settings || {}
      })
      if (res.success && res.data) {
        const data = (Array.isArray(res.data) ? res.data : [res.data]) as any[]
        setResults(prev => [...prev, ...data.map((d: any) => ({ ...d, platform: platformId }))])
        const accountSummary = (res.log || []).map((l: any) => `${l.account}: ${l.status}`).join(' | ')
        showMsg(`تمت الدورة بنجاح: ${data.length} نتيجة${accountSummary ? ' | ' + accountSummary : ''}`)
      } else {
        showMsg(res.error || 'فشلت الدورة', true)
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