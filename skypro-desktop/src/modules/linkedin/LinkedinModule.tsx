import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { makeJobId } from '../../lib/jobId'
import { getBackgroundMode } from '../../lib/backgroundMode'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import type { LucideIcon } from 'lucide-react'
import {
  LogIn, Search, Download, Send, Play, Eye, EyeOff,
  Users, Globe, CheckCircle, AlertCircle, Loader2, Trash2, FileSpreadsheet,
  UserPlus, LogOut, Wrench, Linkedin as LinkedinIcon, FileText,
  GraduationCap, Database, Heart, MessageSquare, Mail, ListChecks, Building2,
} from 'lucide-react'

type ActiveTool =
  | 'search' | 'extract' | 'broadcast'
  | 'extract-people' | 'connect-requests' | 'follow-companies' | 'post-feed' | 'join-groups'
  | 'extract-deep-data' | 'extract-schools' | 'extract-org-members'
  | 'extract-post-engagement' | 'list-my-groups' | 'post-to-groups' | 'emails-by-interest'
  | 'extract-company-full'
  | null
type ResultsOwner =
  | 'search' | 'extract' | 'broadcast'
  | 'extract-people' | 'connect-requests' | 'follow-companies' | 'join-groups'
  | 'extract-deep-data' | 'extract-schools' | 'extract-org-members'
  | 'extract-post-engagement' | 'list-my-groups' | 'post-to-groups' | 'emails-by-interest'
  | 'extract-company-full'
  | null

const ACCENT = '#0A66C2'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #0A66C2, #084d92)'

export default function LinkedinModule() {
  const {
    loading, setLoading, message, error, showMsg, sessionId, setSessionId,
    checkSession, clearSession, accounts, results, loadAccounts, loadResults,
    handleExport, clearResults, cycleActive, cycleProgress, startCycle, stopCycle,
    liveRows, beginLiveJob, endLiveJob,
  } = usePlatform('linkedin')
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('all')
  const [extractUrl, setExtractUrl] = useState('')
  const [extractLimit, setExtractLimit] = useState(200)
  const [toolResults, setToolResults] = useState<any[]>([])
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)
  const [broadcastRecipients, setBroadcastRecipients] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')

  // --- Extract people ---
  const [peopleQuery, setPeopleQuery] = useState('')
  const [peopleLimit, setPeopleLimit] = useState(100)
  // --- Connect requests ---
  const [connectProfiles, setConnectProfiles] = useState('')
  const [connectNote, setConnectNote] = useState('')
  const [connectDelay, setConnectDelay] = useState(6)
  // --- Follow companies ---
  const [followCompanies, setFollowCompanies] = useState('')
  const [followDelay, setFollowDelay] = useState(4)
  // --- Post feed ---
  const [postContent, setPostContent] = useState('')
  // --- Join groups ---
  const [joinGroupUrls, setJoinGroupUrls] = useState('')
  const [joinDelay, setJoinDelay] = useState(5)
  // --- Extract deep data ---
  const [deepProfiles, setDeepProfiles] = useState('')
  const [deepDelay, setDeepDelay] = useState(3)
  // --- Extract schools ---
  const [schoolsQuery, setSchoolsQuery] = useState('')
  const [schoolsLimit, setSchoolsLimit] = useState(50)
  // --- Extract org members ---
  const [orgUrl, setOrgUrl] = useState('')
  const [orgKind, setOrgKind] = useState<'company' | 'school'>('company')
  const [orgLimit, setOrgLimit] = useState(200)
  // --- Post engagement ---
  const [engagementPostUrl, setEngagementPostUrl] = useState('')
  const [engagementMode, setEngagementMode] = useState<'reactions' | 'comments'>('reactions')
  const [engagementLimit, setEngagementLimit] = useState(200)
  // --- My groups ---
  const [myGroupsLimit, setMyGroupsLimit] = useState(100)
  // --- Post to groups ---
  const [groupPostUrls, setGroupPostUrls] = useState('')
  const [groupPostContent, setGroupPostContent] = useState('')
  const [groupPostDelay, setGroupPostDelay] = useState(7)
  // --- Emails by interest ---
  const [emailsInterest, setEmailsInterest] = useState('')
  const [emailsCountry, setEmailsCountry] = useState('')
  const [emailsLimit, setEmailsLimit] = useState(30)
  // --- Extract company full data ---
  const [companyFullUrls, setCompanyFullUrls] = useState('')
  const [companyFullDelay, setCompanyFullDelay] = useState(3)

  const linkedinAccounts = allAccounts.filter(a => a.platform === 'linkedin')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.linkedinLogin({ username: loginForm.username, password: loginForm.password, headless: getBackgroundMode('linkedin'), proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم تسجيل الدخول بنجاح!'); await loadAccounts(); setShowLoginPanel(false) }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleLoginWithAccount = async (account: Account) => {
    setLoading(true)
    const sessionCheck = await checkSession()
    if (sessionCheck.alreadyLoggedIn) {
      showMsg(`جلسة نشطة - مسجل دخول بحساب ${account.username}`)
      setLoading(false)
      return
    }
    const hasPass = (!!account.has_password || !!(account.password && account.password.trim()))
    if (!hasPass) {
      setLoginForm({ ...loginForm, username: account.username, password: '' })
      setShowLoginPanel(true)
      setTimeout(() => passwordRef.current?.focus(), 200)
      showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة. يرجى إدخال كلمة المرور يدوياً.', true)
      setLoading(false)
      return
    }
    setLoginForm({ ...loginForm, username: account.username, password: account.password || '' })
    try {
      const res = await window.electronAPI.linkedinLogin({ accountId: account.id, username: account.username, password: account.password, headless: getBackgroundMode('linkedin'), proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!ensureSession()) return
    if (!searchQuery) { showMsg('أدخل كلمة البحث', true); return }
    setLoading(true)
    setResultsOwner('search')
    try {
      const res = await window.electronAPI.linkedinSearch({ sessionId, query: searchQuery, type: searchType, limit: extractLimit })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم العثور على ${res.count || 0} نتيجة`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    setLoading(true)
    setResultsOwner('extract')
    try {
      const res = await window.electronAPI.linkedinExtractCompanies({ sessionId, searchUrl: extractUrl || `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(searchQuery)}`, limit: extractLimit })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count || 0} شركة`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleBroadcast = async () => {
    if (!ensureSession()) return
    const recipients = broadcastRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (!broadcastMessage || recipients.length === 0) { showMsg('أدخل المستلمين والرسالة', true); return }
    setLoading(true)
    setResultsOwner('broadcast')
    setToolResults([])
    const jobId = makeJobId('li-send')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.linkedinSendMessages({ sessionId, recipients, message: broadcastMessage, jobId })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'sent').length; showMsg(`تم إرسال ${ok} من ${recipients.length} رسالة`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleClearResults = () => {
    setToolResults([])
    setResultsOwner(null)
    clearResults()
  }

  // ---- Extract people ----
  const handleExtractPeople = async () => {
    if (!ensureSession()) return
    if (!peopleQuery.trim()) { showMsg('أدخل الكلمة المفتاحية', true); return }
    setLoading(true)
    setResultsOwner('extract-people')
    setToolResults([])
    const jobId = makeJobId('li-people')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.linkedinExtractPeople({ sessionId, query: peopleQuery.trim(), limit: peopleLimit, jobId })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} شخص`)
        await loadResults()
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  // ---- Connect requests ----
  const handleConnectRequests = async () => {
    if (!ensureSession()) return
    const profiles = connectProfiles.split('\n').map(s => s.trim()).filter(Boolean)
    if (profiles.length === 0) { showMsg('أدخل قائمة الملفات الشخصية', true); return }
    setLoading(true)
    setResultsOwner('connect-requests')
    setToolResults([])
    const jobId = makeJobId('li-connect')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.linkedinConnectRequests({ sessionId, profiles, note: connectNote.trim() || undefined, delayMs: Math.max(2, connectDelay) * 1000, jobId })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'requested').length
        showMsg(`تم إرسال ${ok} من ${profiles.length} طلب تواصل`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  // ---- Follow companies ----
  const handleFollowCompanies = async () => {
    if (!ensureSession()) return
    const companies = followCompanies.split('\n').map(s => s.trim()).filter(Boolean)
    if (companies.length === 0) { showMsg('أدخل قائمة الشركات', true); return }
    setLoading(true)
    setResultsOwner('follow-companies')
    setToolResults([])
    try {
      const res = await window.electronAPI.linkedinFollowCompanies({ sessionId, companies, delayMs: Math.max(2, followDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'followed').length
        showMsg(`تمت متابعة ${ok} من ${companies.length} شركة`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Post to feed ----
  const handlePostFeed = async () => {
    if (!ensureSession()) return
    if (!postContent.trim()) { showMsg('أدخل نص المنشور', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.linkedinPostFeed({ sessionId, content: postContent })
      if (res.success) {
        showMsg('تم نشر المنشور بنجاح')
        setPostContent('')
      } else showMsg(res.error || 'فشل النشر', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Extract deep data ----
  const handleExtractDeepData = async () => {
    if (!ensureSession()) return
    const urls = deepProfiles.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل الملفات الشخصية', true); return }
    setLoading(true)
    setResultsOwner('extract-deep-data')
    setToolResults([])
    try {
      const res = await window.electronAPI.linkedinExtractDeepData({ sessionId, profileUrls: urls, delayMs: Math.max(1, deepDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'extracted').length
        showMsg(`تم استخراج بيانات ${ok} حساب`)
      } else { showMsg(res.error || 'فشل الاستخراج', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Extract schools ----
  const handleExtractSchools = async () => {
    if (!ensureSession()) return
    if (!schoolsQuery.trim()) { showMsg('أدخل الكلمة المفتاحية', true); return }
    setLoading(true)
    setResultsOwner('extract-schools')
    setToolResults([])
    try {
      const res = await window.electronAPI.linkedinExtractSchools({ sessionId, query: schoolsQuery.trim(), limit: schoolsLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم العثور على ${res.count || items.length} جامعة/مدرسة`)
        await loadResults()
      } else { showMsg(res.error || 'فشل الاستخراج', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Extract organization members ----
  const handleExtractOrgMembers = async () => {
    if (!ensureSession()) return
    if (!orgUrl.trim()) { showMsg('أدخل رابط المنظمة', true); return }
    setLoading(true)
    setResultsOwner('extract-org-members')
    setToolResults([])
    try {
      const res = await window.electronAPI.linkedinExtractOrgMembers({ sessionId, orgUrl: orgUrl.trim(), kind: orgKind, limit: orgLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} عضو`)
        await loadResults()
      } else { showMsg(res.error || 'فشل الاستخراج', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Post engagement ----
  const handleExtractPostEngagement = async () => {
    if (!ensureSession()) return
    if (!engagementPostUrl.trim()) { showMsg('أدخل رابط المنشور', true); return }
    setLoading(true)
    setResultsOwner('extract-post-engagement')
    setToolResults([])
    try {
      const res = await window.electronAPI.linkedinExtractPostEngagement({ sessionId, postUrl: engagementPostUrl.trim(), mode: engagementMode, limit: engagementLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} ${engagementMode === 'reactions' ? 'معجب' : 'معلق'}`)
        await loadResults()
      } else { showMsg(res.error || 'فشل الاستخراج', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- List my groups ----
  const handleListMyGroups = async () => {
    if (!ensureSession()) return
    setLoading(true)
    setResultsOwner('list-my-groups')
    setToolResults([])
    try {
      const res = await window.electronAPI.linkedinListMyGroups({ sessionId, limit: myGroupsLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`أنت منضم لـ ${res.count || items.length} مجموعة`)
        // Auto-fill the post-to-groups field with these URLs for convenience.
        setGroupPostUrls(items.map((g: any) => g.url).join('\n'))
      } else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Post to groups ----
  const handlePostToGroups = async () => {
    if (!ensureSession()) return
    const urls = groupPostUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط المجموعات', true); return }
    if (!groupPostContent.trim()) { showMsg('أدخل نص المنشور', true); return }
    setLoading(true)
    setResultsOwner('post-to-groups')
    setToolResults([])
    try {
      const res = await window.electronAPI.linkedinPostToGroups({ sessionId, groupUrls: urls, content: groupPostContent, delayMs: Math.max(3, groupPostDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'posted').length
        showMsg(`تم النشر في ${ok} من ${urls.length}`)
      } else { showMsg(res.error || 'فشلت العملية', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Extract company full ----
  const handleExtractCompanyFull = async () => {
    if (!ensureSession()) return
    const urls = companyFullUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط الشركات', true); return }
    setLoading(true)
    setResultsOwner('extract-company-full')
    setToolResults([])
    try {
      const res = await window.electronAPI.linkedinExtractCompanyFull({ sessionId, companyUrls: urls, delayMs: Math.max(1, companyFullDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'extracted').length
        showMsg(`تم استخراج ${ok} شركة من ${urls.length}`)
        await loadResults()
      } else { showMsg(res.error || 'فشل الاستخراج', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Emails by interest ----
  const handleEmailsByInterest = async () => {
    if (!ensureSession()) return
    if (!emailsInterest.trim()) { showMsg('أدخل الاهتمام', true); return }
    setLoading(true)
    setResultsOwner('emails-by-interest')
    setToolResults([])
    try {
      const res = await window.electronAPI.linkedinEmailsByInterest({ sessionId, interest: emailsInterest.trim(), country: emailsCountry.trim() || undefined, limit: emailsLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم العثور على ${res.count || items.length} إيميل`)
        await loadResults()
      } else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Join groups ----
  const handleJoinGroups = async () => {
    if (!ensureSession()) return
    const urls = joinGroupUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط المجموعات', true); return }
    setLoading(true)
    setResultsOwner('join-groups')
    setToolResults([])
    try {
      const res = await window.electronAPI.linkedinJoinGroups({ sessionId, groupUrls: urls, delayMs: Math.max(2, joinDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'requested').length
        showMsg(`تم إرسال ${ok} طلب انضمام من ${urls.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const tools: Array<{
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: LucideIcon
    accent: string
    accentGradient: string
    requiresSession: boolean
  }> = [
    { id: 'search', name: 'البحث المتقدم', description: 'البحث عن أشخاص أو شركات', icon: Search, accent: '#0A66C2', accentGradient: 'linear-gradient(135deg, #0A66C2, #084d92)', requiresSession: true },
    { id: 'extract-people', name: 'استخراج الأشخاص', description: 'استخراج تفاصيل من نتائج البحث', icon: Users, accent: '#06b6d4', accentGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', requiresSession: true },
    { id: 'extract', name: 'استخراج الشركات', description: 'استخراج بيانات الشركات', icon: Download, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: true },
    { id: 'connect-requests', name: 'إرسال طلبات تواصل', description: 'دعوات تواصل مع رسالة شخصية', icon: UserPlus, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', requiresSession: true },
    { id: 'follow-companies', name: 'متابعة الشركات', description: 'متابعة قائمة شركات', icon: Globe, accent: '#a855f7', accentGradient: 'linear-gradient(135deg, #a855f7, #7e22ce)', requiresSession: true },
    { id: 'join-groups', name: 'الانضمام للمجموعات', description: 'طلبات انضمام لمجموعات', icon: Users, accent: '#84cc16', accentGradient: 'linear-gradient(135deg, #84cc16, #4d7c0f)', requiresSession: true },
    { id: 'broadcast', name: 'رسائل InMail', description: 'إرسال رسائل لقائمة مستلمين', icon: Send, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: true },
    { id: 'post-feed', name: 'نشر منشور', description: 'نشر محتوى على فيدك', icon: FileText, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: true },
    { id: 'extract-deep-data', name: 'بيانات الحساب الكاملة', description: 'هاتف، إيميل، عنوان، وظيفة', icon: Database, accent: '#dc2626', accentGradient: 'linear-gradient(135deg, #dc2626, #991b1b)', requiresSession: true },
    { id: 'extract-schools', name: 'استخراج الجامعات', description: 'بحث الجامعات بكلمة مفتاحية', icon: GraduationCap, accent: '#7c3aed', accentGradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)', requiresSession: true },
    { id: 'extract-org-members', name: 'أعضاء الشركة/الجامعة', description: 'موظفين/خريجين منظمة', icon: Users, accent: '#0891b2', accentGradient: 'linear-gradient(135deg, #0891b2, #155e75)', requiresSession: true },
    { id: 'extract-post-engagement', name: 'تفاعل المنشور', description: 'معجبين ومعلقين على بوست', icon: Heart, accent: '#f43f5e', accentGradient: 'linear-gradient(135deg, #f43f5e, #be123c)', requiresSession: true },
    { id: 'list-my-groups', name: 'مجموعاتي', description: 'استخراج المجموعات المنضم لها', icon: ListChecks, accent: '#14b8a6', accentGradient: 'linear-gradient(135deg, #14b8a6, #0f766e)', requiresSession: true },
    { id: 'post-to-groups', name: 'نشر في المجموعات', description: 'نشر في عدة مجموعات', icon: MessageSquare, accent: '#d946ef', accentGradient: 'linear-gradient(135deg, #d946ef, #a21caf)', requiresSession: true },
    { id: 'emails-by-interest', name: 'إيميلات بالاهتمام', description: 'إيميلات من Google + بفلتر دولة', icon: Mail, accent: '#ea580c', accentGradient: 'linear-gradient(135deg, #ea580c, #c2410c)', requiresSession: true },
    { id: 'extract-company-full', name: 'بيانات الشركة الكاملة', description: 'مقر/حجم/تأسيس/تخصص/إيميل', icon: Building2, accent: '#0284c7', accentGradient: 'linear-gradient(135deg, #0284c7, #075985)', requiresSession: true },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(10,102,194,0.06), rgba(8,77,146,0.04))',
        border: '1px solid rgba(10,102,194,0.18)',
        boxShadow: '0 4px 20px rgba(10,102,194,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(10,102,194,0.3)' }}
          >
            <LinkedinIcon size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">LinkedIn</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: sessionId ? '#22c55e' : '#94a3b8',
                  boxShadow: sessionId ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                }}
              />
              <span className="text-xs font-medium" style={{ color: sessionId ? '#16a34a' : '#64748b' }}>
                {sessionId ? 'جلسة نشطة — جاهز للعمل' : 'لا توجد جلسة — سجل الدخول أولاً'}
              </span>
              {accounts.length > 0 && (
                <span className="text-[11px] text-secondary-500">• {accounts.length} حساب محفوظ</span>
              )}
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

      {linkedinAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(10,102,194,0.12)', background: 'rgba(255,255,255,0.5)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value
              setSelectedAccountId(id)
              const acc = linkedinAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) {
                setLoginForm({ ...loginForm, username: acc.username, password: acc.password || '' })
                if (!acc.password?.trim()) {
                  setShowLoginPanel(true)
                  setTimeout(() => passwordRef.current?.focus(), 200)
                }
              }
            }}
          >
            <option value="">-- اختر حساب --</option>
            {linkedinAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}
              </option>
            ))}
          </select>
          {selectedAccountId && (
            <button
              onClick={() => {
                const acc = linkedinAccounts.find(a => a.id.toString() === selectedAccountId)
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
        <label className="label-field">البريد الإلكتروني أو اسم المستخدم</label>
        <input
          type="email"
          className="input-field"
          placeholder="example@email.com"
          value={loginForm.username}
          onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
        />
      </div>
      <div>
        <label className="label-field">كلمة المرور</label>
        <div className="relative">
          <input
            ref={passwordRef}
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
          placeholder="IP:Port أو http://user:pass@ip:port"
          value={loginForm.proxy}
          onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })}
        />
      </div>

      {accounts.length > 0 && (
        <div>
          <h4 className="font-bold text-secondary-900 text-sm mb-3">الحسابات المحفوظة على الجهاز</h4>
          <div className="space-y-2 max-h-[280px] overflow-y-auto scroll-container pr-1">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'rgba(10,102,194,0.1)', color: '#0A66C2' }}>
                    {(acc.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 text-sm truncate">{acc.username}</p>
                    <p className="text-[11px] text-secondary-500">
                      {new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}
                      {acc.password?.trim() ? ' • باسورد محفوظ' : ' • بدون باسورد'}
                    </p>
                  </div>
                </div>
                <span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                  {acc.status === 'active' ? 'نشط' : 'غير نشط'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const loginFooter = (
    <button
      onClick={handleLogin}
      disabled={loading || !loginForm.username || !loginForm.password}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}
    </button>
  )

  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string) => {
    if (resultsOwner !== owner) return null
    const displayResults = toolResults.length > 0 ? toolResults : (liveRows.length > 0 ? liveRows : results)
    const list = displayResults
    if (list.length === 0) return null
    return (
      <div className="mt-5 rounded-xl border border-secondary-200 bg-white/60 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
          <h4 className="font-bold text-secondary-900 text-sm">النتائج ({list.length})</h4>
          <div className="flex gap-2">
            <button onClick={() => handleExport(columns, exportKey, toolResults)} className="btn-success text-xs">
              <FileSpreadsheet size={14} /> تصدير CSV
            </button>
            <button onClick={handleClearResults} className="btn-danger text-xs">
              <Trash2 size={14} /> مسح
            </button>
          </div>
        </div>
        <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {list.map((r: any, i: number) => {
                if (owner === 'search') {
                  const extra = (() => { try { return JSON.parse(r.extra_data || '{}') } catch { return {} as any } })()
                  const userId = r.userId || extra.userId || extra.id || '-'
                  const name = r.name || extra.name || '-'
                  const profile = r.url || r.profile || extra.profile || extra.url || '-'
                  const source = r.source || extra.source || '-'
                  return (
                    <tr key={r.id || i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium text-sm">{name}</td>
                      <td className="text-xs font-mono" style={{ color: '#0A66C2' }}>{userId}</td>
                      <td className="text-xs max-w-[150px] truncate">{profile !== '-' ? <a href={profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.substring(0, 40)}...</a> : '-'}</td>
                      <td className="text-xs">{source}</td>
                    </tr>
                  )
                }
                if (owner === 'extract') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || r.group || '-'}</td>
                      <td className="text-xs max-w-[200px] truncate">{r.url || r.link || '-'}</td>
                      <td><span className={`badge ${r.status === 'found' || r.status === 'active' ? 'badge-success' : 'badge-warning'}`}>{r.status || 'found'}</span></td>
                    </tr>
                  )
                }
                if (owner === 'extract-people') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs max-w-[260px] truncate text-secondary-700">{r.title || '-'}</td>
                      <td className="text-xs text-secondary-500">{r.location || '-'}</td>
                      <td className="text-xs">{r.profile ? <a href={r.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'connect-requests') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium" dir="ltr">{r.profile || '-'}</td>
                      <td><span className={`badge ${r.status === 'requested' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'follow-companies') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium" dir="ltr">{r.company || '-'}</td>
                      <td><span className={`badge ${r.status === 'followed' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'join-groups') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[300px] truncate" dir="ltr">{r.url || '-'}</td>
                      <td><span className={`badge ${r.status === 'requested' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-deep-data') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs">{r.email || '-'}</td>
                      <td className="text-xs">{r.phone || '-'}</td>
                      <td className="text-xs">{r.location || '-'}</td>
                      <td className="text-xs">{r.headline || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-schools') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs text-secondary-600">{r.subtitle || '-'}</td>
                      <td className="text-xs">{r.profile ? <a href={r.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-org-members') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs">{r.title || '-'}</td>
                      <td className="text-xs">{r.profile ? <a href={r.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-post-engagement') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs">{r.profile ? <a href={r.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'list-my-groups') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'post-to-groups') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[300px] truncate" dir="ltr">{r.url || '-'}</td>
                      <td><span className={`badge ${r.status === 'posted' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'emails-by-interest') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td dir="ltr" className="font-mono text-sm">{r.email || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-company-full') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs">{r.industry || '-'}</td>
                      <td className="text-xs">{r.companySize || '-'}</td>
                      <td className="text-xs">{r.headquarters || '-'}</td>
                      <td className="text-xs">{r.founded || '-'}</td>
                      <td className="text-xs">{r.website || '-'}</td>
                      <td className="text-xs">{r.email || '-'}</td>
                    </tr>
                  )
                }
                // broadcast
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{r.recipient || r.name || '-'}</td>
                    <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
                    <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderSearchBody = () => (
    <div className="space-y-5">
      <AccountSelector
        platformId="linkedin"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType: 'companies', searchQuery, searchType, url: extractUrl, limit: extractLimit } }}
        sendTask={{ type: 'send', params: { recipients: broadcastRecipients.split('\n').filter(Boolean), message: broadcastMessage } }}
      />
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="label-field">كلمة البحث</label>
          <input type="text" className="input-field" placeholder="ابحث عن شركات، أشخاص..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="w-48">
          <label className="label-field">النوع</label>
          <select className="select-field" value={searchType} onChange={e => setSearchType(e.target.value)}>
            <option value="all">الكل</option>
            <option value="people">أشخاص</option>
            <option value="companies">شركات</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label-field">الحد الأقصى للنتائج: {extractLimit}</label>
        <input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-blue-700" />
      </div>
      {renderResultsTable('search', ['#', 'الاسم', 'معرف المستخدم', 'الرابط', 'المصدر'], 'linkedin-search')}
    </div>
  )

  const searchFooter = (
    <button
      onClick={handleSearch}
      disabled={loading || !searchQuery.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Search size={18} /> بحث</>}
    </button>
  )

  const renderExtractBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط نتائج البحث (اختياري - يُستخدم كلمة البحث إذا تُرك فارغاً)</label>
        <input type="url" className="input-field" placeholder="https://linkedin.com/search/results/companies..." value={extractUrl} onChange={e => setExtractUrl(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-field">كلمة البحث</label>
          <input type="text" className="input-field" placeholder="marketing, sales..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div>
          <label className="label-field">الحد الأقصى: {extractLimit}</label>
          <input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-blue-700" />
        </div>
      </div>
      {renderResultsTable('extract', ['#', 'الاسم', 'الرابط', 'الحالة'], 'linkedin-extract')}
    </div>
  )

  const extractFooter = (
    <button
      onClick={handleExtract}
      disabled={loading || (!extractUrl.trim() && !searchQuery.trim())}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}
    </button>
  )

  // ---- Extract people panel ----
  const renderExtractPeopleBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الكلمة المفتاحية</label>
        <input type="text" className="input-field" value={peopleQuery} onChange={e => setPeopleQuery(e.target.value)} placeholder="مدير تسويق، CEO، Software Engineer" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {peopleLimit}</label>
        <input type="range" min={20} max={1000} step={10} className="w-full accent-cyan-500" value={peopleLimit} onChange={e => setPeopleLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-people', ['#', 'الاسم', 'المسمى', 'الموقع', 'الرابط'], 'linkedin-people')}
    </div>
  )
  const extractPeopleFooter = (
    <button onClick={handleExtractPeople} disabled={loading || !peopleQuery.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Users size={18} /> استخراج الأشخاص</>}
    </button>
  )

  // ---- Connect requests panel ----
  const renderConnectRequestsBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-700" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        LinkedIn يحدد عدد طلبات التواصل اليومية (~100 طلب). استخدم فاصل ≥ 5 ثوانٍ.
      </div>
      <div>
        <label className="label-field">قائمة الملفات الشخصية (URL أو username سطر لكل عنصر)</label>
        <textarea className="textarea-field" rows={5} value={connectProfiles} onChange={e => setConnectProfiles(e.target.value)} placeholder="https://linkedin.com/in/username&#10;username2" />
      </div>
      <div>
        <label className="label-field">رسالة شخصية (اختياري - 300 حرف كحد أقصى)</label>
        <textarea className="textarea-field" rows={3} maxLength={300} value={connectNote} onChange={e => setConnectNote(e.target.value)} placeholder="مرحبًا! أود التواصل معك لأنني مهتم بـ..." />
        <p className="text-[10px] text-secondary-500 mt-1">{connectNote.length}/300</p>
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={120} className="input-field w-32" value={connectDelay} onChange={e => setConnectDelay(Number(e.target.value) || 6)} />
      </div>
      {renderResultsTable('connect-requests', ['#', 'الملف الشخصي', 'الحالة', 'خطأ'], 'linkedin-connects')}
    </div>
  )
  const connectRequestsFooter = (
    <button onClick={handleConnectRequests} disabled={loading || !connectProfiles.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> إرسال طلبات التواصل</>}
    </button>
  )

  // ---- Follow companies panel ----
  const renderFollowCompaniesBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">قائمة الشركات (URL أو slug سطر لكل شركة)</label>
        <textarea className="textarea-field" rows={7} value={followCompanies} onChange={e => setFollowCompanies(e.target.value)} placeholder="https://linkedin.com/company/microsoft&#10;google" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={60} className="input-field w-32" value={followDelay} onChange={e => setFollowDelay(Number(e.target.value) || 4)} />
      </div>
      {renderResultsTable('follow-companies', ['#', 'الشركة', 'الحالة', 'خطأ'], 'linkedin-follow-co')}
    </div>
  )
  const followCompaniesFooter = (
    <button onClick={handleFollowCompanies} disabled={loading || !followCompanies.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Globe size={18} /> متابعة الشركات</>}
    </button>
  )

  // ---- Post feed panel ----
  const renderPostFeedBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">نص المنشور</label>
        <textarea className="textarea-field" rows={8} value={postContent} onChange={e => setPostContent(e.target.value)} placeholder="اكتب منشورك على LinkedIn..." />
      </div>
      <p className="text-[11px] text-secondary-500">سيتم النشر على الفور باستخدام الجلسة النشطة. إذا أردت إضافة صورة، أكمل ذلك يدويًا في النافذة المفتوحة قبل النشر.</p>
    </div>
  )
  const postFeedFooter = (
    <button onClick={handlePostFeed} disabled={loading || !postContent.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><FileText size={18} /> نشر</>}
    </button>
  )

  // ---- Join groups panel ----
  const renderJoinGroupsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط المجموعات (سطر لكل رابط)</label>
        <textarea className="textarea-field" rows={7} value={joinGroupUrls} onChange={e => setJoinGroupUrls(e.target.value)} placeholder="https://linkedin.com/groups/12345" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={60} className="input-field w-32" value={joinDelay} onChange={e => setJoinDelay(Number(e.target.value) || 5)} />
      </div>
      {renderResultsTable('join-groups', ['#', 'المجموعة', 'الحالة', 'خطأ'], 'linkedin-join-groups')}
    </div>
  )
  const joinGroupsFooter = (
    <button onClick={handleJoinGroups} disabled={loading || !joinGroupUrls.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #84cc16, #4d7c0f)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Users size={18} /> الانضمام</>}
    </button>
  )

  const renderBroadcastBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">المستلمين (معرف URL أو اسم مستخدم - سطر لكل مستلم)</label>
        <textarea className="textarea-field" rows={5} value={broadcastRecipients} onChange={e => setBroadcastRecipients(e.target.value)} placeholder="username&#10;https://linkedin.com/in/username" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." />
      </div>
      {renderResultsTable('broadcast', ['#', 'المستلم', 'الحالة', 'خطأ'], 'linkedin-messages')}
    </div>
  )

  const broadcastFooter = (
    <button
      onClick={handleBroadcast}
      disabled={loading || !broadcastRecipients.trim() || !broadcastMessage.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال</>}
    </button>
  )

  // ---- Extract deep data panel ----
  const renderExtractDeepDataBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.2)' }}>
        تستخرج بيانات الاتصال الكاملة (هاتف، إيميل، عنوان، موقع) من الملفات الشخصية. اللي شارك بياناته هيظهر تلقائياً.
      </div>
      <div>
        <label className="label-field">الملفات الشخصية (سطر لكل ملف)</label>
        <textarea className="textarea-field" rows={6} value={deepProfiles} onChange={e => setDeepProfiles(e.target.value)} placeholder="https://linkedin.com/in/username&#10;username2" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={1} max={30} className="input-field w-32" value={deepDelay} onChange={e => setDeepDelay(Number(e.target.value) || 3)} />
      </div>
      {renderResultsTable('extract-deep-data', ['#', 'الاسم', 'إيميل', 'هاتف', 'الموقع', 'الوظيفة'], 'linkedin-deep')}
    </div>
  )
  const extractDeepDataFooter = (<button onClick={handleExtractDeepData} disabled={loading || !deepProfiles.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Database size={18} /> استخراج البيانات</>}</button>)

  // ---- Extract schools panel ----
  const renderExtractSchoolsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الكلمة المفتاحية</label>
        <input type="text" className="input-field" value={schoolsQuery} onChange={e => setSchoolsQuery(e.target.value)} placeholder="Cairo University, MIT, Stanford" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {schoolsLimit}</label>
        <input type="range" min={10} max={300} step={5} className="w-full accent-violet-500" value={schoolsLimit} onChange={e => setSchoolsLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-schools', ['#', 'الاسم', 'التفاصيل', 'الرابط'], 'linkedin-schools')}
    </div>
  )
  const extractSchoolsFooter = (<button onClick={handleExtractSchools} disabled={loading || !schoolsQuery.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><GraduationCap size={18} /> بحث</>}</button>)

  // ---- Extract org members panel ----
  const renderExtractOrgMembersBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط الشركة/الجامعة</label>
        <input type="url" className="input-field" value={orgUrl} onChange={e => setOrgUrl(e.target.value)} placeholder="https://linkedin.com/company/microsoft" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">النوع</label>
          <select className="select-field" value={orgKind} onChange={e => setOrgKind(e.target.value as any)}>
            <option value="company">شركة</option>
            <option value="school">جامعة/مدرسة</option>
          </select>
        </div>
        <div>
          <label className="label-field">الحد الأقصى: {orgLimit}</label>
          <input type="range" min={20} max={1000} step={10} className="w-full accent-cyan-500" value={orgLimit} onChange={e => setOrgLimit(parseInt(e.target.value))} />
        </div>
      </div>
      {renderResultsTable('extract-org-members', ['#', 'الاسم', 'المنصب', 'الرابط'], 'linkedin-org-members')}
    </div>
  )
  const extractOrgMembersFooter = (<button onClick={handleExtractOrgMembers} disabled={loading || !orgUrl.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0891b2, #155e75)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Users size={18} /> استخراج الأعضاء</>}</button>)

  // ---- Post engagement panel ----
  const renderExtractPostEngagementBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط المنشور</label>
        <input type="url" className="input-field" value={engagementPostUrl} onChange={e => setEngagementPostUrl(e.target.value)} placeholder="https://linkedin.com/posts/..." />
      </div>
      <div className="flex gap-3 flex-wrap">
        <button type="button" onClick={() => setEngagementMode('reactions')} className="px-4 py-2 rounded-lg text-sm font-medium" style={engagementMode === 'reactions' ? { background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid #f43f5e' } : { background: 'white', color: '#475569', border: '1px solid #e2e8f0' }}>المعجبين</button>
        <button type="button" onClick={() => setEngagementMode('comments')} className="px-4 py-2 rounded-lg text-sm font-medium" style={engagementMode === 'comments' ? { background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid #f43f5e' } : { background: 'white', color: '#475569', border: '1px solid #e2e8f0' }}>المعلقين</button>
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {engagementLimit}</label>
        <input type="range" min={20} max={1000} step={10} className="w-full accent-rose-500" value={engagementLimit} onChange={e => setEngagementLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-post-engagement', ['#', 'الاسم', 'الرابط'], 'linkedin-engagement')}
    </div>
  )
  const extractPostEngagementFooter = (<button onClick={handleExtractPostEngagement} disabled={loading || !engagementPostUrl.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f43f5e, #be123c)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Heart size={18} /> استخراج</>}</button>)

  // ---- List my groups panel ----
  const renderListMyGroupsBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)' }}>
        يستخرج المجموعات المنضم لها لاستخدامها مباشرة في "نشر في المجموعات".
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {myGroupsLimit}</label>
        <input type="range" min={10} max={500} step={5} className="w-full accent-teal-500" value={myGroupsLimit} onChange={e => setMyGroupsLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('list-my-groups', ['#', 'الاسم', 'الرابط'], 'linkedin-my-groups')}
    </div>
  )
  const listMyGroupsFooter = (<button onClick={handleListMyGroups} disabled={loading} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><ListChecks size={18} /> استخراج مجموعاتي</>}</button>)

  // ---- Post to groups panel ----
  const renderPostToGroupsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط المجموعات (سطر لكل رابط)</label>
        <textarea className="textarea-field" rows={6} value={groupPostUrls} onChange={e => setGroupPostUrls(e.target.value)} placeholder="https://linkedin.com/groups/12345" />
      </div>
      <div>
        <label className="label-field">نص المنشور</label>
        <textarea className="textarea-field" rows={5} value={groupPostContent} onChange={e => setGroupPostContent(e.target.value)} placeholder="اكتب منشورك..." />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={3} max={120} className="input-field w-32" value={groupPostDelay} onChange={e => setGroupPostDelay(Number(e.target.value) || 7)} />
      </div>
      {renderResultsTable('post-to-groups', ['#', 'المجموعة', 'الحالة', 'خطأ'], 'linkedin-group-post')}
    </div>
  )
  const postToGroupsFooter = (<button onClick={handlePostToGroups} disabled={loading || !groupPostUrls.trim() || !groupPostContent.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #d946ef, #a21caf)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><MessageSquare size={18} /> نشر</>}</button>)

  // ---- Emails by interest panel ----
  const renderEmailsByInterestBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(234,88,12,0.05)', border: '1px solid rgba(234,88,12,0.2)' }}>
        يبحث في Google عن إيميلات في ملفات LinkedIn متطابقة مع الاهتمام + الدولة. لن يجلب جميع الإيميلات وإنما اللي ظاهر في الفهرس.
      </div>
      <div>
        <label className="label-field">الاهتمام/المجال</label>
        <input type="text" className="input-field" value={emailsInterest} onChange={e => setEmailsInterest(e.target.value)} placeholder="marketing manager, sales director" />
      </div>
      <div>
        <label className="label-field">الدولة (اختياري)</label>
        <input type="text" className="input-field" value={emailsCountry} onChange={e => setEmailsCountry(e.target.value)} placeholder="Egypt, Saudi Arabia" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {emailsLimit}</label>
        <input type="range" min={10} max={100} step={5} className="w-full accent-orange-500" value={emailsLimit} onChange={e => setEmailsLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('emails-by-interest', ['#', 'الإيميل'], 'linkedin-emails')}
    </div>
  )
  const emailsByInterestFooter = (<button onClick={handleEmailsByInterest} disabled={loading || !emailsInterest.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Mail size={18} /> بحث</>}</button>)

  // ---- Extract company full panel ----
  const renderExtractCompanyFullBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(2,132,199,0.05)', border: '1px solid rgba(2,132,199,0.2)' }}>
        يستخرج كل حقول About للشركة: المقر، الحجم، التأسيس، التخصصات، الصناعة، الموقع، الإيميل، الهاتف.
      </div>
      <div>
        <label className="label-field">روابط الشركات (سطر لكل شركة)</label>
        <textarea className="textarea-field" rows={6} value={companyFullUrls} onChange={e => setCompanyFullUrls(e.target.value)} placeholder="https://linkedin.com/company/microsoft" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={1} max={30} className="input-field w-32" value={companyFullDelay} onChange={e => setCompanyFullDelay(Number(e.target.value) || 3)} />
      </div>
      {renderResultsTable('extract-company-full', ['#', 'الاسم', 'الصناعة', 'الحجم', 'المقر', 'التأسيس', 'الموقع', 'الإيميل'], 'linkedin-co-full')}
    </div>
  )
  const extractCompanyFullFooter = (<button onClick={handleExtractCompanyFull} disabled={loading || !companyFullUrls.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0284c7, #075985)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Building2 size={18} /> استخراج</>}</button>)

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    search: { body: renderSearchBody(), footer: searchFooter },
    'extract-people': { body: renderExtractPeopleBody(), footer: extractPeopleFooter },
    'extract-deep-data': { body: renderExtractDeepDataBody(), footer: extractDeepDataFooter },
    extract: { body: renderExtractBody(), footer: extractFooter },
    'extract-schools': { body: renderExtractSchoolsBody(), footer: extractSchoolsFooter },
    'extract-org-members': { body: renderExtractOrgMembersBody(), footer: extractOrgMembersFooter },
    'extract-post-engagement': { body: renderExtractPostEngagementBody(), footer: extractPostEngagementFooter },
    'connect-requests': { body: renderConnectRequestsBody(), footer: connectRequestsFooter },
    'follow-companies': { body: renderFollowCompaniesBody(), footer: followCompaniesFooter },
    'join-groups': { body: renderJoinGroupsBody(), footer: joinGroupsFooter },
    'list-my-groups': { body: renderListMyGroupsBody(), footer: listMyGroupsFooter },
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    'post-feed': { body: renderPostFeedBody(), footer: postFeedFooter },
    'post-to-groups': { body: renderPostToGroupsBody(), footer: postToGroupsFooter },
    'emails-by-interest': { body: renderEmailsByInterestBody(), footer: emailsByInterestFooter },
    'extract-company-full': { body: renderExtractCompanyFullBody(), footer: extractCompanyFullFooter },
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`}
          style={message
            ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }
            : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      {renderSessionCard()}

      <AccountCycleBanner
        platformId="linkedin"
        platformName="LinkedIn"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('extract')}
      />

      <ToolGrid
        title="أدوات LinkedIn"
        subtitle="اختر أداة لفتح إعدادات الحملة الخاصة بها"
        icon={Wrench}
        accent={ACCENT}
        cols={4}
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
        title="تسجيل الدخول إلى LinkedIn"
        subtitle="ابدأ جلسة جديدة لتشغيل الأدوات"
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
