import { useState } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { getBackgroundMode } from '../../lib/backgroundMode'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import {
  MapPin, Globe, Star,
  AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet,
  Download, Eye, EyeOff, ExternalLink, LogIn, LogOut, Search, Wrench, Layers,
} from 'lucide-react'

type ActiveTool = 'maps' | 'bulk-maps' | 'bulk-matrix' | 'olx' | 'rate' | 'reviews-extract' | null
type ResultsOwner = 'maps' | 'bulk-maps' | 'bulk-matrix' | 'olx' | 'reviews-extract' | null
type RateMode = 'single' | 'bulk'

interface ReviewItem {
  id: string
  text: string
  rating: number
}

interface RateBulkResult {
  accountId: number
  username?: string
  rating?: number
  reviewText?: string
  success: boolean
  error?: string
}

interface BulkProgress {
  type: string
  // Keyword-bulk mode
  keywordIndex?: number
  totalKeywords?: number
  keyword?: string
  // Matrix mode
  comboIndex?: number
  totalCombos?: number
  totalCities?: number
  city?: string
  // Common
  count?: number
  target?: number
  grandTotal?: number
  added?: number
  error?: string
}

const ACCENT = '#4285F4'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #4285F4, #1a73e8)'

// Monotonic per-session job id used to route live-stream events to the tool
// that started them. A counter (not Date.now/Math.random) keeps it pure from
// React's render-purity analysis while staying unique within the session.
let __gJobSeq = 0
const makeJobId = (prefix: string): string => `${prefix}-${++__gJobSeq}`

export default function GoogleModule() {
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle, liveRows, beginLiveJob, endLiveJob } = usePlatform('google')

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)

  const [mapsQuery, setMapsQuery] = useState('')
  const [mapsLocation, setMapsLocation] = useState('')
  const [mapsLimit, setMapsLimit] = useState(50)
  const [mapsResults, setMapsResults] = useState<any[]>([])
  const [olxCountry, setOlxCountry] = useState('egypt')
  const [olxKeyword, setOlxKeyword] = useState('')
  const [olxLimit, setOlxLimit] = useState(50)
  const [olxResults, setOlxResults] = useState<any[]>([])
  const [rateUrl, setRateUrl] = useState('')
  const [rateStars, setRateStars] = useState(5)
  const [rateReview, setRateReview] = useState('')
  const [rateMode, setRateMode] = useState<RateMode>('single')
  const [rateReviewsList, setRateReviewsList] = useState<ReviewItem[]>([
    { id: 'r1', text: '', rating: 5 },
  ])
  const [rateSelectedAccountIds, setRateSelectedAccountIds] = useState<number[]>([])
  const [rateDelaySec, setRateDelaySec] = useState(20)
  const [rateBulkResults, setRateBulkResults] = useState<RateBulkResult[]>([])
  const [rateBulkProgress, setRateBulkProgress] = useState<{ index: number; total: number; username?: string; success?: boolean } | null>(null)
  // Reviews extract
  const [reviewsUrl, setReviewsUrl] = useState('')
  const [reviewsLimit, setReviewsLimit] = useState(100)
  const [reviewsSort, setReviewsSort] = useState<'newest' | 'highest' | 'lowest' | 'relevant'>('newest')
  const [reviewsResults, setReviewsResults] = useState<any[]>([])
  // Bulk-maps state
  const [bulkKeywordsText, setBulkKeywordsText] = useState('')
  const [bulkLocation, setBulkLocation] = useState('')
  const [bulkLimit, setBulkLimit] = useState(200)
  const [bulkResults, setBulkResults] = useState<any[]>([])
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null)
  // Matrix mode state (cities × keywords)
  const [matrixKeywordsText, setMatrixKeywordsText] = useState('')
  const [matrixCitiesText, setMatrixCitiesText] = useState('')
  const [matrixLimit, setMatrixLimit] = useState(200)
  const [matrixResults, setMatrixResults] = useState<any[]>([])
  const [matrixProgress, setMatrixProgress] = useState<BulkProgress | null>(null)
  const { accounts: allAccounts } = useAccountsStore()
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [showPassword, setShowPassword] = useState(false)

  // Live-or-final display rows: while a job streams, the final results array is
  // empty and `liveRows` fills in real time; once the run finishes the enriched
  // final results take over. Only the active tool (resultsOwner) shows liveRows.
  const mapsDisplay = mapsResults.length ? mapsResults : (resultsOwner === 'maps' ? liveRows : mapsResults)
  const olxDisplay = olxResults.length ? olxResults : (resultsOwner === 'olx' ? liveRows : olxResults)
  const reviewsDisplay = reviewsResults.length ? reviewsResults : (resultsOwner === 'reviews-extract' ? liveRows : reviewsResults)
  const bulkDisplay = bulkResults.length ? bulkResults : (resultsOwner === 'bulk-maps' ? liveRows : bulkResults)
  const matrixDisplay = matrixResults.length ? matrixResults : (resultsOwner === 'bulk-matrix' ? liveRows : matrixResults)

  const googleAccounts = allAccounts.filter(a => a.platform === 'google')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleMapsExtract = async () => {
    if (!mapsQuery || !mapsLocation) { showMsg('أدخل نوع النشاط والمدينة', true); return }
    setLoading(true)
    setResultsOwner('maps')
    setMapsResults([])
    const jobId = makeJobId('gmaps-ui')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.googleMapsExtract({ searchQuery: mapsQuery, location: mapsLocation, limit: mapsLimit, jobId })
      if (res.success && res.data) { setMapsResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count ?? res.data?.length ?? 0}`) }
      else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleBulkMapsExtract = async () => {
    const keywords = bulkKeywordsText
      .split('\n')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
    if (keywords.length === 0) {
      showMsg('أدخل كلمة مفتاحية واحدة على الأقل (سطر منفصل لكل كلمة)', true)
      return
    }
    if (keywords.length > 50) {
      showMsg('الحد الأقصى 50 كلمة في المرة الواحدة', true)
      return
    }
    setLoading(true)
    setResultsOwner('bulk-maps')
    setBulkResults([])
    setBulkProgress({ type: 'starting', totalKeywords: keywords.length, keyword: keywords[0] })

    const jobId = makeJobId('gmaps-bulk-ui')
    beginLiveJob(jobId)
    // Listen to progress events from main
    let cleanupProgress: (() => void) | undefined
    try {
      // Adapter — onExtractionProgress typings expect `{ type, count, total }`
      // but the bulk handler sends a richer payload. Cast through unknown to
      // satisfy TS while preserving runtime behavior.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleanupProgress = (window.electronAPI as any).onExtractionProgress?.((progress: { jobId?: string; status?: BulkProgress }) => {
        if (progress?.jobId !== jobId) return
        if (progress.status) setBulkProgress(progress.status)
      })
    } catch { /* progress is optional */ }

    try {
      const res = await window.electronAPI.googleMapsBulkExtract({
        keywords,
        location: bulkLocation,
        limitPerKeyword: bulkLimit,
        jobId,
      })
      if (res.success && res.data) {
        setBulkResults((res.data as any[]) || [])
        showMsg(`تم استخراج ${res.count ?? 0} نشاط تجاري عبر ${res.keywordsProcessed ?? keywords.length} كلمة مفتاحية ✓`)
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
      }
    } catch (err: any) {
      showMsg(err.message || 'خطأ غير معروف', true)
    } finally {
      try { cleanupProgress?.() } catch { /* defensive */ }
      endLiveJob()
      setLoading(false)
      setBulkProgress(null)
    }
  }

  // Build a properly-structured CSV row with the columns users actually want
  // (name → phone → rating → reviewCount → category → address → city →
  // keyword → URL). All values pre-stringified so the IPC layer just writes.
  const sanitize = (v: unknown): string => {
    if (v === undefined || v === null) return ''
    const s = String(v)
    // Defang Excel/Sheets formula injection at the start of a cell — leading
    // = + - @ get prefixed with apostrophe. Matches what usePlatform does.
    return /^[=+\-@]/.test(s) ? `'${s}` : s
  }

  const handleExportBulkMaps = async () => {
    if (bulkResults.length === 0) { showMsg('لا توجد نتائج للتصدير', true); return }
    const headers = ['الاسم', 'الكلمة المفتاحية', 'الهاتف', 'البريد', 'الموقع', 'التقييم', 'عدد التقييمات', 'النوع', 'العنوان', 'الرابط', 'الصورة', 'المصدر', 'تاريخ الاستخراج']
    const today = new Date().toISOString().slice(0, 10)
    const data = bulkResults.map((r) => ({
      'الاسم': sanitize(r.name),
      'الكلمة المفتاحية': sanitize(r.keyword),
      'الهاتف': sanitize(r.phone),
      'البريد': sanitize(r.email),
      'الموقع': sanitize(r.website),
      'التقييم': sanitize(r.rating),
      'عدد التقييمات': sanitize(r.reviewCount),
      'النوع': sanitize(r.type),
      'العنوان': sanitize(r.address),
      'الرابط': sanitize(r.profile || r.url),
      'الصورة': sanitize(r.image),
      'المصدر': sanitize(r.source),
      'تاريخ الاستخراج': today,
    }))
    const filename = `google-maps-bulk-${today}-${Date.now()}.csv`
    const res = await window.electronAPI.exportToCSV({ filename, data, headers })
    if (res.success) showMsg(`تم التصدير إلى: ${res.path}`)
    else showMsg(res.error || 'فشل التصدير', true)
  }

  const handleExportMatrix = async () => {
    if (matrixResults.length === 0) { showMsg('لا توجد نتائج للتصدير', true); return }
    const headers = ['الاسم', 'المدينة', 'الكلمة المفتاحية', 'الهاتف', 'البريد', 'الموقع', 'التقييم', 'عدد التقييمات', 'النوع', 'العنوان', 'الرابط', 'الصورة', 'المصدر', 'تاريخ الاستخراج']
    const today = new Date().toISOString().slice(0, 10)
    const data = matrixResults.map((r) => ({
      'الاسم': sanitize(r.name),
      'المدينة': sanitize(r.city),
      'الكلمة المفتاحية': sanitize(r.keyword),
      'الهاتف': sanitize(r.phone),
      'البريد': sanitize(r.email),
      'الموقع': sanitize(r.website),
      'التقييم': sanitize(r.rating),
      'عدد التقييمات': sanitize(r.reviewCount),
      'النوع': sanitize(r.type),
      'العنوان': sanitize(r.address),
      'الرابط': sanitize(r.profile || r.url),
      'الصورة': sanitize(r.image),
      'المصدر': sanitize(r.source),
      'تاريخ الاستخراج': today,
    }))
    const filename = `google-maps-matrix-${today}-${Date.now()}.csv`
    const res = await window.electronAPI.exportToCSV({ filename, data, headers })
    if (res.success) showMsg(`تم التصدير إلى: ${res.path}`)
    else showMsg(res.error || 'فشل التصدير', true)
  }

  const handleMatrixExtract = async () => {
    const keywords = matrixKeywordsText.split('\n').map((k) => k.trim()).filter(Boolean)
    const cities = matrixCitiesText.split('\n').map((c) => c.trim()).filter(Boolean)
    if (keywords.length === 0) { showMsg('أدخل كلمة مفتاحية واحدة على الأقل', true); return }
    if (cities.length === 0) { showMsg('أدخل مدينة واحدة على الأقل', true); return }
    const combos = keywords.length * cities.length
    if (combos > 200) {
      showMsg(`عدد التركيبات (${combos}) يتجاوز 200. قلّل المدن أو الكلمات.`, true)
      return
    }
    setLoading(true)
    setResultsOwner('bulk-matrix')
    setMatrixResults([])
    setMatrixProgress({ type: 'starting', totalCombos: combos, totalCities: cities.length, totalKeywords: keywords.length } as BulkProgress)

    const jobId = makeJobId('gmaps-matrix-ui')
    beginLiveJob(jobId)
    let cleanupProgress: (() => void) | undefined
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleanupProgress = (window.electronAPI as any).onExtractionProgress?.((progress: { jobId?: string; status?: BulkProgress }) => {
        if (progress?.jobId !== jobId) return
        if (progress.status) setMatrixProgress(progress.status)
      })
    } catch { /* progress is optional */ }

    try {
      const res = await window.electronAPI.googleMapsBulkExtractMatrix({
        keywords,
        cities,
        limitPerCombo: matrixLimit,
        jobId,
      })
      if (res.success && res.data) {
        setMatrixResults((res.data as any[]) || [])
        showMsg(`تم استخراج ${res.count ?? 0} نشاط عبر ${res.combosProcessed ?? combos} تركيبة (${cities.length} مدن × ${keywords.length} كلمات) ✓`)
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
      }
    } catch (err: any) {
      showMsg(err.message || 'خطأ غير معروف', true)
    } finally {
      try { cleanupProgress?.() } catch { /* defensive */ }
      endLiveJob()
      setLoading(false)
      setMatrixProgress(null)
    }
  }

  const handleOlxExtract = async () => {
    if (!olxKeyword.trim()) { showMsg('أدخل كلمة مفتاحية للبحث (مثال: شقق للإيجار، سيارات مستعملة)', true); return }
    setLoading(true)
    setResultsOwner('olx')
    setOlxResults([])
    const jobId = makeJobId('olx-ui')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.olxExtract({ country: olxCountry, keyword: olxKeyword.trim(), limit: olxLimit, jobId })
      if (res.success && res.data) { setOlxResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count ?? res.data?.length ?? 0}`) }
      else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleRate = async () => {
    if (!ensureSession()) return
    if (!rateUrl) { showMsg('أدخل رابط المكان', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.googleRate({ sessionId, placeUrl: rateUrl, rating: rateStars, review: rateReview })
      if (res.success) showMsg(res.message || 'تم التقييم بنجاح')
      else showMsg(res.error || 'فشل التقييم', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleRateBulk = async () => {
    if (!rateUrl.trim()) { showMsg('أدخل رابط المكان', true); return }
    const reviews = rateReviewsList
      .map((r) => ({ text: r.text.trim(), rating: Math.min(5, Math.max(1, r.rating)) }))
      .filter((r) => r.text.length > 0)
    if (reviews.length === 0) { showMsg('أضف تقييماً واحداً على الأقل (مع نص)', true); return }
    if (rateSelectedAccountIds.length === 0) { showMsg('اختر حساباً واحداً على الأقل', true); return }

    setLoading(true)
    setRateBulkResults([])
    setRateBulkProgress({ index: 0, total: rateSelectedAccountIds.length })

    const jobId = makeJobId('gmaps-rate-bulk-ui')
    let cleanupProgress: (() => void) | undefined
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cleanupProgress = (window.electronAPI as any).onExtractionProgress?.((progress: { jobId?: string; status?: any }) => {
        if (progress?.jobId !== jobId) return
        const s = progress.status
        if (!s) return
        if (s.type === 'account-start' || s.type === 'account-done' || s.type === 'account-error') {
          setRateBulkProgress({
            index: s.accountIndex || 0,
            total: s.totalAccounts || rateSelectedAccountIds.length,
            username: s.username,
            success: s.success,
          })
        }
      })
    } catch { /* progress is optional */ }

    try {
      const res = await window.electronAPI.googleRateBulk({
        placeUrl: rateUrl,
        reviews,
        accountIds: rateSelectedAccountIds,
        delayBetweenSec: rateDelaySec,
        jobId,
      })
      if (res.success) {
        setRateBulkResults((res.results as RateBulkResult[]) || [])
        showMsg(`تم: ${res.totalSucceeded ?? 0}/${res.totalAttempted ?? 0} تقييم ✓`)
      } else {
        showMsg(res.error || 'فشل التقييم الجماعي', true)
      }
    } catch (err: any) {
      showMsg(err.message || 'خطأ غير معروف', true)
    } finally {
      try { cleanupProgress?.() } catch { /* defensive */ }
      setLoading(false)
      setRateBulkProgress(null)
    }
  }

  const handleReviewsExtract = async () => {
    if (!reviewsUrl.trim()) { showMsg('أدخل رابط المكان', true); return }
    setLoading(true)
    setResultsOwner('reviews-extract')
    setReviewsResults([])
    const jobId = makeJobId('gmaps-reviews-ui')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.googleReviewsExtract({
        placeUrl: reviewsUrl,
        limit: reviewsLimit,
        sortBy: reviewsSort,
        sessionId: sessionId || undefined,
        jobId,
      })
      if (res.success && res.data) {
        setReviewsResults((res.data as any[]) || [])
        showMsg(`تم استخراج ${res.count ?? res.data?.length ?? 0} تقييم`)
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
      }
    } catch (err: any) {
      showMsg(err.message || 'خطأ', true)
    } finally {
      endLiveJob()
      setLoading(false)
    }
  }

  const handleExportReviews = async () => {
    if (reviewsResults.length === 0) { showMsg('لا توجد نتائج للتصدير', true); return }
    const headers = ['الكاتب', 'التقييم', 'التاريخ', 'النص', 'الرابط', 'المكان', 'تاريخ الاستخراج']
    const today = new Date().toISOString().slice(0, 10)
    const data = reviewsResults.map((r) => ({
      'الكاتب': sanitize(r.author),
      'التقييم': sanitize(r.rating),
      'التاريخ': sanitize(r.date),
      'النص': sanitize(r.text),
      'الرابط': sanitize(r.profileUrl),
      'المكان': sanitize(reviewsUrl),
      'تاريخ الاستخراج': today,
    }))
    const filename = `google-reviews-${today}-${Date.now()}.csv`
    const res = await window.electronAPI.exportToCSV({ filename, data, headers })
    if (res.success) showMsg(`تم التصدير إلى: ${res.path}`)
    else showMsg(res.error || 'فشل التصدير', true)
  }

  const addReviewItem = () => {
    if (rateReviewsList.length >= 30) { showMsg('الحد الأقصى 30 تقييم', true); return }
    setRateReviewsList([...rateReviewsList, { id: `r${Date.now()}`, text: '', rating: 5 }])
  }
  const removeReviewItem = (id: string) => {
    if (rateReviewsList.length <= 1) return
    setRateReviewsList(rateReviewsList.filter((r) => r.id !== id))
  }
  const updateReviewItem = (id: string, patch: Partial<ReviewItem>) => {
    setRateReviewsList(rateReviewsList.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }
  const toggleAccountSelection = (id: number) => {
    setRateSelectedAccountIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleLaunchBrowser = async () => {
    setLoading(true)
    try {
      if (loginForm.username && loginForm.password) {
        const res = await (window.electronAPI as any).googleLogin({
          username: loginForm.username,
          password: loginForm.password,
          proxy: loginForm.proxy || undefined
        })
        if (res.success) {
          setSessionId(res.sessionId || '')
          showMsg(res.message || 'تم فتح المتصفح وتعبئة البيانات تلقائياً')
          setShowLoginPanel(false)
        } else {
          showMsg(res.error || 'فشل فتح المتصفح', true)
        }
      } else {
        const res = await window.electronAPI.launchBrowser({ platform: 'google', headless: getBackgroundMode('google'), proxy: loginForm.proxy || undefined })
        if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم فتح المتصفح - سجل الدخول بحساب Google'); setShowLoginPanel(false) }
        else showMsg(res.error || 'فشل فتح المتصفح', true)
      }
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoginForm({ username: '', password: '', proxy: '' })
    setLoading(false)
  }

  const handleLoginWithAccount = async (account: Account) => {
    setLoading(true)
    const sessionCheck = await checkSession()
    if (sessionCheck.alreadyLoggedIn) { showMsg(`جلسة نشطة - مسجل دخول بحساب ${account.username}`); setLoading(false); return }
    const proxyToUse = account.proxy || loginForm.proxy || undefined
    setLoginForm({ ...loginForm, username: account.username, password: account.password || '' })
    if (!account.password?.trim()) { showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة.', true); setLoading(false); return }
    try {
      const res = await (window.electronAPI as any).googleLogin({
        username: account.username,
        password: account.password,
        proxy: proxyToUse,
        accountId: account.id
      })
      if (res.success) {
        setSessionId(res.sessionId || '')
        showMsg(res.message || `تم تشغيل متصفح تسجيل الدخول التلقائي لحساب ${account.username}`)
      } else {
        showMsg(res.error || 'فشل فتح المتصفح', true)
      }
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExportMaps = async () => {
    if (mapsResults.length === 0) { showMsg('لا توجد نتائج للتصدير', true); return }
    const headers = ['الاسم', 'الهاتف', 'البريد', 'الموقع', 'التقييم', 'العنوان', 'النوع', 'الرابط', 'الصورة', 'المصدر', 'تاريخ الاستخراج']
    const today = new Date().toISOString().slice(0, 10)
    const data = mapsResults.map((r) => ({
      'الاسم': sanitize(r.name),
      'الهاتف': sanitize(r.phone),
      'البريد': sanitize(r.email),
      'الموقع': sanitize(r.website),
      'التقييم': sanitize(r.rating),
      'العنوان': sanitize(r.address),
      'النوع': sanitize(r.type),
      'الرابط': sanitize(r.profile || r.url),
      'الصورة': sanitize(r.image),
      'المصدر': sanitize(mapsLocation ? `${mapsQuery} in ${mapsLocation}` : mapsQuery),
      'تاريخ الاستخراج': today,
    }))
    const filename = `google-maps-single-${today}-${Date.now()}.csv`
    const res = await window.electronAPI.exportToCSV({ filename, data, headers })
    if (res.success) showMsg(`تم التصدير إلى: ${res.path}`)
    else showMsg(res.error || 'فشل التصدير', true)
  }

  const handleExportOlx = async () => {
    if (olxResults.length === 0) { showMsg('لا توجد نتائج للتصدير', true); return }
    const headers = ['العنوان', 'الهاتف', 'السعر', 'الموقع', 'تاريخ النشر', 'الرابط', 'الصورة', 'المصدر', 'تاريخ الاستخراج']
    const today = new Date().toISOString().slice(0, 10)
    const data = olxResults.map((r) => ({
      'العنوان': sanitize(r.title),
      'الهاتف': sanitize(r.phone),
      'السعر': sanitize(r.price),
      'الموقع': sanitize(r.location),
      'تاريخ النشر': sanitize(r.postedDate),
      'الرابط': sanitize(r.link),
      'الصورة': sanitize(r.image),
      'المصدر': sanitize(r.source || (r.link ? new URL(r.link).hostname : '')),
      'تاريخ الاستخراج': today,
    }))
    const filename = `dubizzle-${olxCountry}-${(olxKeyword || 'search').trim().replace(/\s+/g, '-')}-${today}-${Date.now()}.csv`
    const res = await window.electronAPI.exportToCSV({ filename, data, headers })
    if (res.success) showMsg(`تم التصدير إلى: ${res.path}`)
    else showMsg(res.error || 'فشل التصدير', true)
  }

  const countries = [
    { value: 'egypt',  label: 'مصر (Dubizzle)' },
    { value: 'saudi',  label: 'السعودية (Dubizzle)' },
    { value: 'uae',    label: 'الإمارات (Dubizzle)' },
    { value: 'qatar',  label: 'قطر (OLX)' },
    { value: 'kuwait', label: 'الكويت (OLX)' },
  ]

  // Quick-fill presets for the keyword search. Clicking a chip drops a common
  // Arabic search term into the keyword box — the user can still type anything.
  const categories = [
    { value: 'properties',  label: 'عقارات',      keyword: 'شقق للإيجار' },
    { value: 'vehicles',    label: 'سيارات',      keyword: 'سيارات مستعملة' },
    { value: 'electronics', label: 'إلكترونيات',  keyword: 'موبايلات' },
    { value: 'furniture',   label: 'أثاث',        keyword: 'أثاث منزلي' },
  ]

  const tools: Array<{
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: typeof MapPin
    accent: string
    accentGradient: string
    requiresSession: boolean
  }> = [
    { id: 'maps', name: 'خرائط جوجل', description: 'استخراج بيانات الأنشطة التجارية (كلمة واحدة)', icon: MapPin, accent: '#4285F4', accentGradient: 'linear-gradient(135deg, #4285F4, #1a73e8)', requiresSession: false },
    { id: 'bulk-maps', name: 'استخراج جماعي', description: 'كلمات مفتاحية متعددة × حتى 2000 نتيجة لكل كلمة', icon: Layers, accent: '#8B5CF6', accentGradient: 'linear-gradient(135deg, #8B5CF6, #6d28d9)', requiresSession: false },
    { id: 'bulk-matrix', name: 'مصفوفة (مدن × كلمات)', description: 'استخراج كل كلمة في كل مدينة + ملف منسّق', icon: Layers, accent: '#EC4899', accentGradient: 'linear-gradient(135deg, #EC4899, #be185d)', requiresSession: false },
    { id: 'olx', name: 'دوبيزل / OLX', description: 'استخراج إعلانات Dubizzle (OLX سابقاً)', icon: Globe, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: false },
    { id: 'rate', name: 'تقييم Google', description: 'تقييم منفرد أو جماعي بتدوير الحسابات', icon: Star, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: false },
    { id: 'reviews-extract', name: 'استخراج التقييمات', description: 'قراءة تقييمات أي مكان على خرائط جوجل', icon: Download, accent: '#06b6d4', accentGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', requiresSession: false },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  // ----- Session / Login Header Card -----
  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(66,133,244,0.06), rgba(26,115,232,0.04))',
        border: '1px solid rgba(66,133,244,0.18)',
        boxShadow: '0 4px 20px rgba(66,133,244,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(66,133,244,0.3)' }}
          >
            <Search size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Google</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: sessionId ? '#22c55e' : '#94a3b8',
                  boxShadow: sessionId ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                }}
              />
              <span className="text-xs font-medium" style={{ color: sessionId ? '#16a34a' : '#64748b' }}>
                {sessionId ? 'جلسة نشطة — جاهز للعمل' : 'لا توجد جلسة — سجل الدخول للتقييم'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessionId ? (
            <button onClick={clearSession} className="btn-secondary text-xs">
              <LogOut size={14} /> إنهاء الجلسة
            </button>
          ) : (
            <button
              onClick={() => setShowLoginPanel(true)}
              className="btn-primary text-sm"
              style={{ background: ACCENT_GRADIENT }}
            >
              <LogIn size={16} /> تسجيل الدخول
            </button>
          )}
        </div>
      </div>

      {googleAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(66,133,244,0.12)', background: 'var(--panel-bg)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value
              setSelectedAccountId(id)
              const acc = googleAccounts.find(a => a.id.toString() === id)
              if (acc) setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' })
            }}
          >
            <option value="">-- اختر حساب --</option>
            {googleAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.username}</option>
            ))}
          </select>
          {selectedAccountId && (
            <button
              onClick={() => {
                const acc = googleAccounts.find(a => a.id.toString() === selectedAccountId)
                if (acc) handleLoginWithAccount(acc)
              }}
              disabled={loading}
              className="btn-success text-xs"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <><LogIn size={14} /> دخول</>}
            </button>
          )}
        </div>
      )}
    </div>
  )

  // ----- Login Panel content -----
  const renderLoginPanelContent = () => (
    <div className="space-y-5">
      {sessionId && (
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-success-600" />
            <p className="font-semibold text-success-700 text-sm">جلسة نشطة — يمكنك استخدام جميع الأدوات</p>
          </div>
        </div>
      )}
      <div>
        <label className="label-field">البريد الإلكتروني</label>
        <input
          type="text"
          className="input-field"
          placeholder="example@gmail.com"
          value={loginForm.username}
          onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
        />
      </div>
      <div>
        <label className="label-field">كلمة المرور</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className="input-field pl-10"
            placeholder="••••••••"
            value={loginForm.password}
            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <div>
        <label className="label-field">بروكسي (اختياري)</label>
        <input
          type="text"
          className="input-field"
          placeholder="IP:Port"
          value={loginForm.proxy}
          onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })}
        />
      </div>
      <p className="text-xs text-secondary-500">
        ملاحظة: تسجيل الدخول إلى Google يتم يدوياً عبر المتصفح بعد فتحه.
      </p>
    </div>
  )

  const loginFooter = (
    <button
      onClick={handleLaunchBrowser}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><ExternalLink size={18} /> فتح المتصفح يدوياً</>}
    </button>
  )

  // ----- Tool panel bodies -----
  const renderMapsBody = () => (
    <div className="space-y-5">
      <AccountSelector
        platformId="google"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType: 'maps', searchQuery: mapsQuery, location: mapsLocation, limit: mapsLimit } }}
        sendTask={{ type: 'send', params: { placeUrl: rateUrl, rating: rateStars, review: rateReview } }}
      />
      <div className="grid grid-cols-2 gap-4">
        <div><label className="label-field">نوع النشاط التجاري</label><input type="text" className="input-field" placeholder="مثال: مطاعم، عيادات، محلات..." value={mapsQuery} onChange={e => setMapsQuery(e.target.value)} /></div>
        <div><label className="label-field">المدينة / المنطقة</label><input type="text" className="input-field" placeholder="مثال: القاهرة، جدة، دبي..." value={mapsLocation} onChange={e => setMapsLocation(e.target.value)} /></div>
      </div>
      <div><label className="label-field">الحد الأقصى: {mapsLimit}</label><input type="range" min="10" max="500" value={mapsLimit} onChange={e => setMapsLimit(parseInt(e.target.value))} className="w-full" /></div>

      {resultsOwner === 'maps' && mapsDisplay.length > 0 && (
        <div className="mt-5 rounded-xl border border-secondary-200 bg-white/[0.04] overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
            <h4 className="font-bold text-secondary-900 text-sm">النتائج ({mapsDisplay.length}){loading && resultsOwner === 'maps' && <span className="text-emerald-600 animate-pulse"> • مباشر ⚡</span>}</h4>
            <div className="flex gap-2">
              <button onClick={handleExportMaps} className="btn-success text-xs"><FileSpreadsheet size={14} /> تصدير CSV</button>
              <button onClick={() => { setMapsResults([]); setResultsOwner(null) }} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>#</th><th>الصورة</th><th>الاسم</th><th>الهاتف</th><th>البريد</th><th>الموقع</th><th>التقييم</th><th>العنوان</th><th>النوع</th><th>الرابط</th>
                </tr>
              </thead>
              <tbody>
                {mapsDisplay.map((b, i) => (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td>
                      {b.image ? (
                        <img src={b.image} alt={b.name} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <span className="text-secondary-300">-</span>
                      )}
                    </td>
                    <td className="font-medium">{b.name || '-'}</td>
                    <td className="text-xs font-mono">{b.phone || '-'}</td>
                    <td className="text-xs">{b.email || '-'}</td>
                    <td className="text-xs truncate max-w-[150px]">
                      {b.website ? <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{b.website.replace(/^https?:\/\/(www\.)?/, '')}</a> : '-'}
                    </td>
                    <td><span className="flex items-center gap-1"><Star size={12} className="text-warning-500" />{b.rating || '-'}</span></td>
                    <td className="text-[11px]">{b.address || '-'}</td>
                    <td className="text-[11px]">{b.type || '-'}</td>
                    <td>{b.profile || b.url ? <a href={b.profile || b.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">خرائط</a> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const mapsFooter = (
    <button
      onClick={handleMapsExtract}
      disabled={loading || !mapsQuery.trim() || !mapsLocation.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #4285F4, #1a73e8)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}
    </button>
  )

  const renderBulkMapsBody = () => (
    <div className="space-y-5">
      <div className="p-4 rounded-xl border" style={{ background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.2)' }}>
        <div className="flex items-start gap-3">
          <Layers size={20} className="flex-shrink-0 mt-0.5" style={{ color: '#8B5CF6' }} />
          <div className="text-xs leading-relaxed text-secondary-700">
            <strong>استخراج جماعي:</strong> اكتب الكلمات المفتاحية في سطور منفصلة (كل سطر = كلمة).
            البرنامج هيمر على كل كلمة بالترتيب ويسحب حتى <strong>2000 نشاط</strong> لكل واحدة.
            النتايج مدمجة وبدون تكرار، والملف المُصدّر منسّق بأعمدة عربية واضحة. الحد الأقصى 50 كلمة في المرة.
          </div>
        </div>
      </div>

      <div>
        <label className="label-field">الكلمات المفتاحية (سطر لكل كلمة)</label>
        <textarea
          className="textarea-field min-h-[120px] font-mono text-sm"
          placeholder={`مطاعم\nصالونات تجميل\nعيادات اسنان\nصيدليات\nمحلات ملابس`}
          value={bulkKeywordsText}
          onChange={(e) => setBulkKeywordsText(e.target.value)}
          dir="auto"
        />
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-secondary-500">
            عدد الكلمات: {bulkKeywordsText.split('\n').filter((k) => k.trim()).length} / 50
          </p>
          <p className="text-[10px] text-secondary-500">
            ⏱ تقدير: ~{Math.max(1, Math.round((bulkKeywordsText.split('\n').filter((k) => k.trim()).length * bulkLimit * 0.25) / 60))} دقيقة
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-field">المدينة / المنطقة (اختياري)</label>
          <input
            type="text"
            className="input-field"
            placeholder="مثال: القاهرة، الرياض، دبي..."
            value={bulkLocation}
            onChange={(e) => setBulkLocation(e.target.value)}
          />
        </div>
        <div>
          <label className="label-field">الحد لكل كلمة: {bulkLimit}</label>
          <input
            type="range"
            min="50"
            max="2000"
            step="50"
            value={bulkLimit}
            onChange={(e) => setBulkLimit(parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-secondary-400 mt-1">
            <span>50</span><span>500</span><span>1000</span><span>2000</span>
          </div>
        </div>
      </div>

      {/* Progress display */}
      {bulkProgress && (
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Loader2 size={16} className="animate-spin" style={{ color: '#8B5CF6' }} />
            <span className="text-sm font-bold text-secondary-900">جاري الاستخراج...</span>
          </div>
          {bulkProgress.keyword && (
            <p className="text-xs text-secondary-600 mb-1">
              الكلمة الحالية: <span className="font-semibold text-violet-700">{bulkProgress.keyword}</span>
              {bulkProgress.keywordIndex && bulkProgress.totalKeywords && (
                <span className="text-secondary-500"> ({bulkProgress.keywordIndex}/{bulkProgress.totalKeywords})</span>
              )}
            </p>
          )}
          {bulkProgress.count !== undefined && bulkProgress.target !== undefined && (
            <p className="text-xs text-secondary-600">
              النتايج للكلمة: {bulkProgress.count} / {bulkProgress.target}
            </p>
          )}
          {bulkProgress.grandTotal !== undefined && (
            <p className="text-xs text-secondary-600 font-semibold">
              إجمالي النتايج المجمّعة: {bulkProgress.grandTotal}
            </p>
          )}
          {bulkProgress.totalKeywords && bulkProgress.keywordIndex && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-secondary-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(bulkProgress.keywordIndex / bulkProgress.totalKeywords) * 100}%`,
                    background: 'linear-gradient(90deg, #8B5CF6, #6d28d9)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {resultsOwner === 'bulk-maps' && bulkDisplay.length > 0 && (
        <div className="mt-5 rounded-xl border border-secondary-200 bg-white/[0.04] overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
            <h4 className="font-bold text-secondary-900 text-sm">النتائج ({bulkDisplay.length}){loading && resultsOwner === 'bulk-maps' && <span className="text-emerald-600 animate-pulse"> • مباشر ⚡</span>}</h4>
            <div className="flex gap-2">
              <button onClick={handleExportBulkMaps} className="btn-success text-xs"><FileSpreadsheet size={14} /> تصدير CSV</button>
              <button onClick={() => { setBulkResults([]); setResultsOwner(null) }} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>الصورة</th><th>الاسم</th><th>الهاتف</th><th>البريد</th><th>الموقع</th><th>العنوان</th><th>التقييم</th><th>الكلمة</th><th>الرابط</th>
                </tr>
              </thead>
              <tbody>
                {bulkDisplay.slice(0, 200).map((b, i) => (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td>
                      {b.image ? (
                        <img src={b.image} alt={b.name} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <span className="text-secondary-300">-</span>
                      )}
                    </td>
                    <td className="font-medium">{b.name || '-'}</td>
                    <td className="text-xs font-mono">{b.phone || '-'}</td>
                    <td className="text-xs">{b.email || '-'}</td>
                    <td className="text-xs truncate max-w-[150px]">
                      {b.website ? <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{b.website.replace(/^https?:\/\/(www\.)?/, '')}</a> : '-'}
                    </td>
                    <td className="text-xs">{b.address || '-'}</td>
                    <td><span className="flex items-center gap-1"><Star size={11} className="text-warning-500" />{b.rating || '-'}</span></td>
                    <td className="text-xs text-violet-700 font-semibold">{b.keyword || '-'}</td>
                    <td>{b.profile || b.url ? <a href={b.profile || b.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">خرائط</a> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bulkResults.length > 200 && (
              <p className="text-[11px] text-center py-2 text-secondary-500 bg-secondary-50">
                عرض أول 200 نتيجة فقط — استخدم زر التصدير CSV لتنزيل الكل ({bulkResults.length})
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const bulkMapsFooter = (
    <button
      onClick={handleBulkMapsExtract}
      disabled={loading || bulkKeywordsText.split('\n').filter((k) => k.trim()).length === 0}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #8B5CF6, #6d28d9)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Layers size={18} /> بدء الاستخراج الجماعي</>}
    </button>
  )

  // ----- Matrix (cities × keywords) -----
  const renderMatrixBody = () => {
    const keywords = matrixKeywordsText.split('\n').map((k) => k.trim()).filter(Boolean)
    const cities = matrixCitiesText.split('\n').map((c) => c.trim()).filter(Boolean)
    const combos = keywords.length * cities.length
    const overLimit = combos > 200
    const estimateMin = Math.max(1, Math.round((combos * matrixLimit * 0.25) / 60))

    return (
      <div className="space-y-5">
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(236,72,153,0.06)', borderColor: 'rgba(236,72,153,0.2)' }}>
          <div className="flex items-start gap-3">
            <Layers size={20} className="flex-shrink-0 mt-0.5" style={{ color: '#EC4899' }} />
            <div className="text-xs leading-relaxed text-secondary-700">
              <strong>وضع المصفوفة:</strong> اكتب قائمة كلمات مفتاحية + قائمة مدن.
              البرنامج يبحث كل كلمة في كل مدينة (مثال: 5 كلمات × 4 مدن = 20 بحث) ويدمج النتائج بدون تكرار.
              كل نتيجة مُعلَّمة بمدينتها وكلمتها. الحد الأقصى <strong>200 تركيبة</strong>.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">الكلمات المفتاحية (سطر لكل كلمة)</label>
            <textarea
              className="textarea-field min-h-[140px] font-mono text-sm"
              placeholder={`مطاعم\nصيدليات\nعيادات اسنان\nمحلات ملابس`}
              value={matrixKeywordsText}
              onChange={(e) => setMatrixKeywordsText(e.target.value)}
              dir="auto"
            />
            <p className="text-[10px] text-secondary-500 mt-1">عدد الكلمات: {keywords.length} / 30</p>
          </div>
          <div>
            <label className="label-field">المدن (سطر لكل مدينة)</label>
            <textarea
              className="textarea-field min-h-[140px] font-mono text-sm"
              placeholder={`القاهرة\nالاسكندرية\nالجيزة\nالمنصورة`}
              value={matrixCitiesText}
              onChange={(e) => setMatrixCitiesText(e.target.value)}
              dir="auto"
            />
            <p className="text-[10px] text-secondary-500 mt-1">عدد المدن: {cities.length} / 20</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">الحد لكل تركيبة: {matrixLimit}</label>
            <input
              type="range"
              min="50"
              max="2000"
              step="50"
              value={matrixLimit}
              onChange={(e) => setMatrixLimit(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-secondary-400 mt-1">
              <span>50</span><span>500</span><span>1000</span><span>2000</span>
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: overLimit ? 'rgba(239,68,68,0.08)' : 'rgba(236,72,153,0.06)', border: `1px solid ${overLimit ? 'rgba(239,68,68,0.25)' : 'rgba(236,72,153,0.15)'}` }}>
            <p className="text-[11px] text-secondary-600 leading-relaxed">
              عدد التركيبات: <strong className={overLimit ? 'text-red-600' : 'text-pink-700'}>{combos}</strong> {overLimit && '(يتجاوز الحد!)'}
              <br />⏱ تقدير الوقت: ~{estimateMin} دقيقة
              <br />📊 أقصى نتائج محتملة: {combos * matrixLimit}
            </p>
          </div>
        </div>

        {matrixProgress && (
          <div className="p-4 rounded-xl border" style={{ background: 'rgba(236,72,153,0.06)', borderColor: 'rgba(236,72,153,0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Loader2 size={16} className="animate-spin" style={{ color: '#EC4899' }} />
              <span className="text-sm font-bold text-secondary-900">جاري الاستخراج...</span>
            </div>
            {matrixProgress.city && matrixProgress.keyword && (
              <p className="text-xs text-secondary-600 mb-1">
                التركيبة الحالية: <span className="font-semibold text-pink-700">{matrixProgress.keyword}</span>
                {' في '}
                <span className="font-semibold text-pink-700">{matrixProgress.city}</span>
                {matrixProgress.comboIndex && matrixProgress.totalCombos && (
                  <span className="text-secondary-500"> ({matrixProgress.comboIndex}/{matrixProgress.totalCombos})</span>
                )}
              </p>
            )}
            {matrixProgress.count !== undefined && matrixProgress.target !== undefined && (
              <p className="text-xs text-secondary-600">
                نتائج التركيبة: {matrixProgress.count} / {matrixProgress.target}
              </p>
            )}
            {matrixProgress.grandTotal !== undefined && (
              <p className="text-xs text-secondary-600 font-semibold">
                إجمالي النتايج المجمّعة: {matrixProgress.grandTotal}
              </p>
            )}
            {matrixProgress.totalCombos && matrixProgress.comboIndex && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-secondary-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(matrixProgress.comboIndex / matrixProgress.totalCombos) * 100}%`,
                      background: 'linear-gradient(90deg, #EC4899, #be185d)',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {resultsOwner === 'bulk-matrix' && matrixDisplay.length > 0 && (
          <div className="mt-5 rounded-xl border border-secondary-200 bg-white/[0.04] overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
              <h4 className="font-bold text-secondary-900 text-sm">النتائج ({matrixDisplay.length}){loading && resultsOwner === 'bulk-matrix' && <span className="text-emerald-600 animate-pulse"> • مباشر ⚡</span>}</h4>
              <div className="flex gap-2">
                <button onClick={handleExportMatrix} className="btn-success text-xs"><FileSpreadsheet size={14} /> تصدير CSV منسّق</button>
                <button onClick={() => { setMatrixResults([]); setResultsOwner(null) }} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>الصورة</th><th>الاسم</th><th>المدينة</th><th>الكلمة</th><th>الهاتف</th><th>البريد</th><th>الموقع</th><th>التقييم</th><th>العنوان</th><th>الرابط</th>
                  </tr>
                </thead>
                <tbody>
                  {matrixDisplay.slice(0, 200).map((b, i) => (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td>
                        {b.image ? (
                          <img src={b.image} alt={b.name} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <span className="text-secondary-300">-</span>
                        )}
                      </td>
                      <td className="font-medium">{b.name || '-'}</td>
                      <td className="text-xs font-semibold text-pink-700">{b.city || '-'}</td>
                      <td className="text-xs text-violet-700">{b.keyword || '-'}</td>
                      <td className="text-xs font-mono">{b.phone || '-'}</td>
                      <td className="text-xs">{b.email || '-'}</td>
                      <td className="text-xs truncate max-w-[150px]">
                        {b.website ? <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{b.website.replace(/^https?:\/\/(www\.)?/, '')}</a> : '-'}
                      </td>
                      <td><span className="flex items-center gap-1"><Star size={11} className="text-warning-500" />{b.rating || '-'}</span></td>
                      <td className="text-xs">{b.address || '-'}</td>
                      <td>{b.profile || b.url ? <a href={b.profile || b.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-xs">خرائط</a> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {matrixResults.length > 200 && (
                <p className="text-[11px] text-center py-2 text-secondary-500 bg-secondary-50">
                  عرض أول 200 نتيجة فقط — استخدم زر التصدير CSV لتنزيل الكل ({matrixResults.length})
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const matrixFooter = (
    <button
      onClick={handleMatrixExtract}
      disabled={
        loading ||
        matrixKeywordsText.split('\n').filter((k) => k.trim()).length === 0 ||
        matrixCitiesText.split('\n').filter((c) => c.trim()).length === 0
      }
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #EC4899, #be185d)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Layers size={18} /> بدء استخراج المصفوفة</>}
    </button>
  )

  const renderOlxBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">كلمة البحث</label>
        <input
          type="text"
          className="input-field"
          placeholder="مثال: شقق للإيجار، سيارات مستعملة، آيفون 15..."
          value={olxKeyword}
          onChange={e => setOlxKeyword(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !loading && olxKeyword.trim()) handleOlxExtract() }}
          dir="rtl"
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {categories.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setOlxKeyword(c.keyword)}
              className="px-2.5 py-1 rounded-lg text-[11px] border transition-colors hover:bg-emerald-100"
              style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.25)', color: '#047857' }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label-field">الدولة / المنصة</label>
        <select className="select-field" value={olxCountry} onChange={e => setOlxCountry(e.target.value)}>{countries.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {olxLimit}</label>
        <input type="range" min="20" max="500" step="20" value={olxLimit} onChange={e => setOlxLimit(parseInt(e.target.value))} className="w-full" />
        <div className="flex justify-between text-[10px] text-secondary-400 mt-1">
          <span>20</span><span>100</span><span>250</span><span>500</span>
        </div>
      </div>

      <div className="p-3 rounded-xl border" style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}>
        <p className="text-[11px] leading-relaxed text-secondary-700">
          ℹ️ البحث الآن <strong>بالكلمات المفتاحية</strong> على <strong>Dubizzle</strong> (مصر/السعودية/الإمارات)
          و <strong>OLX</strong> (قطر/الكويت). اكتب أي كلمة بحث ويتم التنقل تلقائياً بين الصفحات لجمع الإعلانات.
        </p>
      </div>

      {resultsOwner === 'olx' && olxDisplay.length > 0 && (
        <div className="mt-5 rounded-xl border border-secondary-200 bg-white/[0.04] overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
            <h4 className="font-bold text-secondary-900 text-sm">الإعلانات ({olxDisplay.length}){loading && resultsOwner === 'olx' && <span className="text-emerald-600 animate-pulse"> • مباشر ⚡</span>}</h4>
            <div className="flex gap-2">
              <button onClick={handleExportOlx} className="btn-success text-xs"><FileSpreadsheet size={14} /> تصدير CSV</button>
              <button onClick={() => { setOlxResults([]); setResultsOwner(null) }} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>#</th><th>الصورة</th><th>العنوان</th><th>الهاتف</th><th>السعر</th><th>الموقع</th><th>التاريخ</th><th>الرابط</th></tr></thead>
              <tbody>
                {olxDisplay.slice(0, 200).map((l, i) => (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td>
                      {l.image ? (
                        <img src={l.image} alt={l.title} className="w-8 h-8 rounded object-cover" />
                      ) : (
                        <span className="text-secondary-300">-</span>
                      )}
                    </td>
                    <td className="font-medium">{l.title || '-'}</td>
                    <td className="text-xs font-mono font-bold text-emerald-600">{l.phone || 'جاري السحب...'}</td>
                    <td className="font-bold" style={{ color: '#16a34a' }}>{l.price || '-'}</td>
                    <td className="text-sm flex items-center gap-1"><MapPin size={14} />{l.location || '-'}</td>
                    <td className="text-xs text-secondary-500">{l.postedDate || '-'}</td>
                    <td>{l.link ? <a href={l.link} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline text-sm">عرض</a> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {olxResults.length > 200 && (
              <p className="text-[11px] text-center py-2 text-secondary-500 bg-secondary-50">
                عرض أول 200 — صدّر CSV لتنزيل الكل ({olxResults.length})
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const olxFooter = (
    <button
      onClick={handleOlxExtract}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}
    </button>
  )

  const renderRateBody = () => {
    const reviewsReady = rateReviewsList.filter((r) => r.text.trim()).length
    const estimateMin = rateSelectedAccountIds.length > 0
      ? Math.max(1, Math.round((rateSelectedAccountIds.length * (rateDelaySec + 25)) / 60))
      : 0
    return (
      <div className="space-y-5">
        {/* Mode switcher */}
        <div className="flex rounded-xl p-1 gap-1" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <button
            type="button"
            onClick={() => setRateMode('single')}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: rateMode === 'single' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: rateMode === 'single' ? '#fff' : '#92400e',
              boxShadow: rateMode === 'single' ? '0 2px 8px rgba(245,158,11,0.3)' : 'none',
            }}
          >
            تقييم منفرد (الجلسة الحالية)
          </button>
          <button
            type="button"
            onClick={() => setRateMode('bulk')}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: rateMode === 'bulk' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: rateMode === 'bulk' ? '#fff' : '#92400e',
              boxShadow: rateMode === 'bulk' ? '0 2px 8px rgba(245,158,11,0.3)' : 'none',
            }}
          >
            جماعي بتدوير الحسابات
          </button>
        </div>

        <div>
          <label className="label-field">رابط المكان على Google Maps</label>
          <input
            type="url"
            className="input-field"
            placeholder="https://maps.google.com/..."
            value={rateUrl}
            onChange={(e) => setRateUrl(e.target.value)}
            dir="ltr"
          />
        </div>

        {rateMode === 'single' ? (
          <>
            {!sessionId && (
              <div className="p-3 rounded-xl border" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)' }}>
                <p className="text-xs text-red-700 font-semibold flex items-center gap-2">
                  <AlertCircle size={14} /> النمط المنفرد يحتاج جلسة نشطة — سجّل دخول أولاً
                </p>
              </div>
            )}
            <div>
              <label className="label-field">التقييم: {rateStars} نجوم</label>
              <input type="range" min="1" max="5" value={rateStars} onChange={(e) => setRateStars(parseInt(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="label-field">نص المراجعة</label>
              <textarea className="textarea-field" rows={4} value={rateReview} onChange={(e) => setRateReview(e.target.value)} placeholder="اكتب مراجعتك هنا..." />
            </div>
          </>
        ) : (
          <>
            {/* Bulk mode: reviews list + account selector + delay */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label-field !mb-0">قائمة التقييمات ({reviewsReady} جاهز / {rateReviewsList.length})</label>
                <button
                  type="button"
                  onClick={addReviewItem}
                  className="btn-secondary text-xs"
                  disabled={rateReviewsList.length >= 30}
                >
                  + إضافة تقييم
                </button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {rateReviewsList.map((r, idx) => (
                  <div key={r.id} className="p-3 rounded-xl border" style={{ background: 'rgba(245,158,11,0.04)', borderColor: 'rgba(245,158,11,0.15)' }}>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <span className="text-[11px] font-bold text-amber-800">تقييم #{idx + 1}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => updateReviewItem(r.id, { rating: n })}
                              className="hover:scale-110 transition-transform"
                              title={`${n} نجوم`}
                            >
                              <Star
                                size={16}
                                className={n <= r.rating ? 'fill-amber-500 text-amber-500' : 'text-amber-200'}
                              />
                            </button>
                          ))}
                        </div>
                        {rateReviewsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReviewItem(r.id)}
                            className="text-red-500 hover:text-red-700"
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <textarea
                      className="textarea-field text-sm"
                      rows={2}
                      placeholder="نص التقييم..."
                      value={r.text}
                      onChange={(e) => updateReviewItem(r.id, { text: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-secondary-500 mt-1">
                ℹ️ التقييمات تدور على الحسابات: لو عدد الحسابات &gt; عدد التقييمات، يُعاد استخدام التقييمات بالترتيب.
              </p>
            </div>

            {/* Account multi-selector */}
            <div>
              <label className="label-field">الحسابات ({rateSelectedAccountIds.length} / {googleAccounts.length} محدد)</label>
              {googleAccounts.length === 0 ? (
                <div className="p-3 rounded-xl border text-xs text-secondary-500" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  لا توجد حسابات Google محفوظة. أضف حسابات من قسم الحسابات أولاً.
                </div>
              ) : (
                <div className="space-y-1 max-h-[180px] overflow-y-auto rounded-xl border p-2" style={{ borderColor: 'rgba(245,158,11,0.2)' }}>
                  <div className="flex gap-2 pb-2 border-b border-amber-100">
                    <button
                      type="button"
                      onClick={() => setRateSelectedAccountIds(googleAccounts.map((a) => a.id as number))}
                      className="text-[10px] text-amber-700 hover:underline"
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setRateSelectedAccountIds([])}
                      className="text-[10px] text-red-600 hover:underline"
                    >
                      إلغاء الكل
                    </button>
                  </div>
                  {googleAccounts.map((acc) => (
                    <label
                      key={acc.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-amber-50 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={rateSelectedAccountIds.includes(acc.id as number)}
                        onChange={() => toggleAccountSelection(acc.id as number)}
                        className="accent-amber-600"
                      />
                      <span className="font-mono text-secondary-700">{acc.username}</span>
                      {acc.proxy && <span className="text-[9px] text-secondary-400 mr-auto">{String(acc.proxy).split('@').pop()}</span>}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">فاصل بين الحسابات (ثانية): {rateDelaySec}</label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={rateDelaySec}
                  onChange={(e) => setRateDelaySec(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <p className="text-[11px] text-secondary-700">
                  ⏱ تقدير الوقت: ~{estimateMin} دقيقة
                  <br />🔄 سيتم فتح جلسة لكل حساب على حدة
                </p>
              </div>
            </div>

            {/* Progress */}
            {rateBulkProgress && (
              <div className="p-3 rounded-xl border" style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <Loader2 size={14} className="animate-spin text-amber-600" />
                  <span className="text-xs font-bold">
                    جاري التقييم ({rateBulkProgress.index}/{rateBulkProgress.total})
                    {rateBulkProgress.username && <span className="text-amber-700"> — {rateBulkProgress.username}</span>}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-secondary-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(rateBulkProgress.index / Math.max(1, rateBulkProgress.total)) * 100}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Results table */}
            {rateBulkResults.length > 0 && (
              <div className="rounded-xl border border-secondary-200 bg-white/[0.04] overflow-hidden">
                <div className="px-3 py-2 border-b border-secondary-100">
                  <h4 className="font-bold text-secondary-900 text-xs">
                    النتائج: {rateBulkResults.filter((r) => r.success).length} ناجح / {rateBulkResults.length} حساب
                  </h4>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  <table className="data-table text-xs">
                    <thead><tr><th>#</th><th>الحساب</th><th>النجوم</th><th>الحالة</th><th>التفاصيل</th></tr></thead>
                    <tbody>
                      {rateBulkResults.map((r, i) => (
                        <tr key={i}>
                          <td className="text-secondary-500">{i + 1}</td>
                          <td className="font-mono">{r.username || r.accountId}</td>
                          <td><span className="inline-flex items-center gap-0.5">{Array.from({ length: r.rating || 0 }).map((_, j) => <Star key={j} size={10} className="fill-amber-500 text-amber-500" />)}</span></td>
                          <td>
                            {r.success ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1"><CheckCircle size={12} /> نجح</span>
                            ) : (
                              <span className="text-red-700 font-semibold flex items-center gap-1"><AlertCircle size={12} /> فشل</span>
                            )}
                          </td>
                          <td className="text-[10px] text-secondary-500">{r.error || (r.reviewText ? r.reviewText.slice(0, 40) + (r.reviewText.length > 40 ? '...' : '') : '-')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const rateFooter = rateMode === 'single' ? (
    <button
      onClick={handleRate}
      disabled={loading || !sessionId || !rateUrl.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Star size={18} /> تقييم</>}
    </button>
  ) : (
    <button
      onClick={handleRateBulk}
      disabled={loading || !rateUrl.trim() || rateSelectedAccountIds.length === 0 || rateReviewsList.filter((r) => r.text.trim()).length === 0}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Star size={18} /> بدء التقييم الجماعي ({rateSelectedAccountIds.length} حساب)</>}
    </button>
  )

  // ----- Reviews Extract -----
  const renderReviewsExtractBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-xl border" style={{ background: 'rgba(6,182,212,0.06)', borderColor: 'rgba(6,182,212,0.2)' }}>
        <p className="text-xs leading-relaxed text-secondary-700">
          <strong>استخراج تقييمات Google:</strong> اكتب رابط أي مكان على خرائط جوجل،
          وستحصل على كل التقييمات (الكاتب، النجوم، التاريخ، النص) مع إمكانية ترتيبها وتصديرها لـ CSV.
        </p>
      </div>
      <div>
        <label className="label-field">رابط المكان</label>
        <input type="url" className="input-field" placeholder="https://maps.google.com/..." value={reviewsUrl} onChange={(e) => setReviewsUrl(e.target.value)} dir="ltr" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">الحد الأقصى: {reviewsLimit}</label>
          <input type="range" min="20" max="500" step="20" value={reviewsLimit} onChange={(e) => setReviewsLimit(parseInt(e.target.value))} className="w-full" />
        </div>
        <div>
          <label className="label-field">الترتيب</label>
          <select className="select-field" value={reviewsSort} onChange={(e) => setReviewsSort(e.target.value as 'newest' | 'highest' | 'lowest' | 'relevant')}>
            <option value="newest">الأحدث أولاً</option>
            <option value="relevant">الأكثر صلة</option>
            <option value="highest">الأعلى تقييماً</option>
            <option value="lowest">الأقل تقييماً</option>
          </select>
        </div>
      </div>

      {resultsOwner === 'reviews-extract' && reviewsDisplay.length > 0 && (
        <div className="mt-5 rounded-xl border border-secondary-200 bg-white/[0.04] overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
            <h4 className="font-bold text-secondary-900 text-sm">التقييمات ({reviewsDisplay.length}){loading && resultsOwner === 'reviews-extract' && <span className="text-emerald-600 animate-pulse"> • مباشر ⚡</span>}</h4>
            <div className="flex gap-2">
              <button onClick={handleExportReviews} className="btn-success text-xs"><FileSpreadsheet size={14} /> تصدير CSV</button>
              <button onClick={() => { setReviewsResults([]); setResultsOwner(null) }} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
            </div>
          </div>
          <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>#</th><th>الكاتب</th><th>التقييم</th><th>التاريخ</th><th>النص</th></tr></thead>
              <tbody>
                {reviewsDisplay.slice(0, 200).map((r, i) => (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium text-xs">{r.author || '-'}</td>
                    <td>
                      <span className="inline-flex items-center gap-0.5">
                        {Array.from({ length: r.rating || 0 }).map((_, j) => <Star key={j} size={11} className="fill-amber-500 text-amber-500" />)}
                      </span>
                    </td>
                    <td className="text-[11px] text-secondary-500">{r.date || '-'}</td>
                    <td className="text-xs" style={{ maxWidth: '400px' }}>{r.text || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reviewsResults.length > 200 && (
              <p className="text-[11px] text-center py-2 text-secondary-500 bg-secondary-50">
                عرض أول 200 — صدّر CSV لتنزيل الكل ({reviewsResults.length})
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const reviewsExtractFooter = (
    <button
      onClick={handleReviewsExtract}
      disabled={loading || !reviewsUrl.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> بدء الاستخراج</>}
    </button>
  )

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    maps: { body: renderMapsBody(), footer: mapsFooter },
    'bulk-maps': { body: renderBulkMapsBody(), footer: bulkMapsFooter },
    'bulk-matrix': { body: renderMatrixBody(), footer: matrixFooter },
    olx: { body: renderOlxBody(), footer: olxFooter },
    rate: { body: renderRateBody(), footer: rateFooter },
    'reviews-extract': { body: renderReviewsExtractBody(), footer: reviewsExtractFooter },
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      {renderSessionCard()}

      <AccountCycleBanner
        platformId="google"
        platformName="Google"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('maps')}
      />

      <ToolGrid
        title="أدوات Google"
        subtitle="اختر أداة لفتح إعداداتها"
        icon={Wrench}
        accent={ACCENT}
        cols={6}
      >
        {tools.map(tool => (
          <ToolCard
            key={tool.id}
            icon={tool.icon}
            name={tool.name}
            description={tool.description}
            accent={tool.accent}
            accentGradient={tool.accentGradient}
            locked={tool.requiresSession && !sessionId}
            onClick={() => {
              if (tool.requiresSession && !sessionId) {
                showMsg('يرجى تسجيل الدخول أولاً', true)
                setShowLoginPanel(true)
                return
              }
              setActiveTool(tool.id)
            }}
          />
        ))}
      </ToolGrid>

      <ToolPanel
        open={showLoginPanel}
        onClose={() => setShowLoginPanel(false)}
        title="تسجيل الدخول إلى Google"
        subtitle="افتح المتصفح وسجل الدخول بحساب Google"
        icon={LogIn}
        accent={ACCENT}
        accentGradient={ACCENT_GRADIENT}
        width="md"
        footer={loginFooter}
      >
        {renderLoginPanelContent()}
      </ToolPanel>

      <ToolPanel
        open={activeTool !== null}
        onClose={() => setActiveTool(null)}
        title={currentTool?.name ?? ''}
        subtitle={currentTool?.description}
        icon={currentTool?.icon}
        accent={currentTool?.accent ?? ACCENT}
        accentGradient={currentTool?.accentGradient}
        width="lg"
        footer={activeTool ? panelMap[activeTool].footer : null}
      >
        {activeTool ? panelMap[activeTool].body : null}
      </ToolPanel>
    </div>
  )
}
