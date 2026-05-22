import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import {
  LogIn, Download, UserPlus, AtSign, Send, Play, Eye, EyeOff,
  Users, MessageSquare, Hash, Copy, AlertCircle, CheckCircle, Loader2,
  Trash2, FileSpreadsheet, Square, LogOut, Wrench, Instagram as InstagramIcon,
  UserMinus, Heart, Share2, MessageCircle, UsersRound, BarChart3, Sparkles, Crown,
} from 'lucide-react'

type ActiveTool =
  | 'extract' | 'follow' | 'mention' | 'broadcast'
  | 'unfollow' | 'post-interact' | 'share-dm' | 'extract-likers' | 'extract-following' | 'follow-message'
  | 'extract-suggested' | 'top-influencers' | 'analyze-profile'
  | null
type ResultsOwner =
  | 'extract' | 'follow' | 'mention' | 'broadcast'
  | 'unfollow' | 'post-interact' | 'share-dm' | 'extract-likers' | 'extract-following' | 'follow-message'
  | 'extract-suggested' | 'top-influencers' | 'analyze-profile'
  | null

const ACCENT = '#ec4899'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #ec4899, #be185d)'

export default function InstagramModule() {
  const {
    loading, setLoading, message, error, showMsg, sessionId, setSessionId,
    accounts, results, loadAccounts, loadResults, handleExport, clearResults,
    checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle,
  } = usePlatform('instagram')
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [extractType, setExtractType] = useState('followers')
  const [extractInput, setExtractInput] = useState('')
  const [extractLimit, setExtractLimit] = useState(200)
  const [delayMs, setDelayMs] = useState(2000)
  const [extracting, setExtracting] = useState(false)
  const [streamResults, setStreamResults] = useState<any[]>([])
  const streamResultsRef = useRef<any[]>([])
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [toolResults, setToolResults] = useState<any[]>([])
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)
  const [followList, setFollowList] = useState('')
  const [mentionPostUrl, setMentionPostUrl] = useState('')
  const [mentionUsers, setMentionUsers] = useState('')
  const [mentionMessage, setMentionMessage] = useState('')
  const [broadcastRecipients, setBroadcastRecipients] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')

  // --- Unfollow ---
  const [unfollowList, setUnfollowList] = useState('')
  const [unfollowDelay, setUnfollowDelay] = useState(5)
  // --- Post interact (like + comment) ---
  const [interactUrls, setInteractUrls] = useState('')
  const [interactLike, setInteractLike] = useState(true)
  const [interactComment, setInteractComment] = useState('')
  const [interactDelay, setInteractDelay] = useState(4)
  // --- Share post in DM ---
  const [sharePostUrl, setSharePostUrl] = useState('')
  const [shareRecipients, setShareRecipients] = useState('')
  const [shareMessage, setShareMessage] = useState('')
  // --- Extract likers ---
  const [likersPostUrl, setLikersPostUrl] = useState('')
  const [likersLimit, setLikersLimit] = useState(300)
  // --- Extract following ---
  const [followingTarget, setFollowingTarget] = useState('')
  const [followingLimit, setFollowingLimit] = useState(300)
  // --- Follow + message combo ---
  const [combinedList, setCombinedList] = useState('')
  const [combinedMessage, setCombinedMessage] = useState('')
  const [combinedFollowFirst, setCombinedFollowFirst] = useState(true)
  const [combinedDelay, setCombinedDelay] = useState(5)
  // --- Suggested ---
  const [suggestedBaseUser, setSuggestedBaseUser] = useState('')
  const [suggestedLimit, setSuggestedLimit] = useState(50)
  // --- Top influencers ---
  const [influencerHashtag, setInfluencerHashtag] = useState('')
  const [influencerCountry, setInfluencerCountry] = useState('')
  const [influencerLimit, setInfluencerLimit] = useState(50)
  // --- Analyze profile ---
  const [analyzeUsername, setAnalyzeUsername] = useState('')
  const [analyzeResult, setAnalyzeResult] = useState<any>(null)

  useEffect(() => {
    const cleanup = window.electronAPI.onExtractionProgress((data: any) => {
      if (data.type === 'progress' && data.data) {
        streamResultsRef.current = [...streamResultsRef.current, ...data.data]
        setStreamResults([...streamResultsRef.current])
      }
    })
    return cleanup
  }, [])

  const instaAccounts = allAccounts.filter(a => a.platform === 'instagram')

  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.instagramLogin({ username: loginForm.username, password: loginForm.password, headless: false, proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم تسجيل الدخول بنجاح!'); await loadAccounts(); setShowLoginPanel(false) }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
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
      const res = await window.electronAPI.instagramLogin({ accountId: account.id, username: account.username, password: account.password, headless: false, proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const stopExtraction = useCallback(() => {
    if (currentJobId) {
      window.electronAPI.cancelExtraction({ jobId: currentJobId })
      showMsg('تم إيقاف الاستخراج - البيانات المحفوظة متاحة')
    }
    setExtracting(false)
  }, [currentJobId, showMsg])

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!extractInput && extractType !== 'followers') { showMsg('يرجى إدخال البيانات المطلوبة', true); return }
    setExtracting(true)
    streamResultsRef.current = []
    setStreamResults([])
    setResultsOwner('extract')
    const jobId = `ig-${extractType}-${Date.now()}`
    setCurrentJobId(jobId)
    try {
      let res: any
      const baseParams = { sessionId, limit: extractLimit, jobId, delayMs }
      switch (extractType) {
        case 'followers': res = await window.electronAPI.instagramExtractFollowers({ ...baseParams, targetUser: extractInput || loginForm.username }); break
        case 'comments': res = await window.electronAPI.instagramExtractComments({ ...baseParams, postUrl: extractInput }); break
        case 'hashtag': res = await window.electronAPI.instagramExtractHashtag({ ...baseParams, hashtag: extractInput.replace('#', '') }); break
        case 'messengers': res = await window.electronAPI.instagramExtractComments({ ...baseParams, postUrl: extractInput }); break
        case 'posts': res = await window.electronAPI.instagramExtractHashtag({ ...baseParams, hashtag: extractInput.replace('#', '') }); break
        default: res = await window.electronAPI.instagramExtractFollowers({ ...baseParams, targetUser: extractInput || loginForm.username })
      }
      if (res.success) {
        const data = res.data || res
        const finalData = streamResultsRef.current.length > 0 ? streamResultsRef.current : (Array.isArray(data) ? data : [data])
        setToolResults(finalData)
        showMsg(res.cancelled ? `تم إيقاف الاستخراج - ${finalData.length} نتيجة محفوظة` : `تم استخراج ${res.count || finalData.length || 0} نتيجة`)
        await loadResults()
      } else {
        const partial = res.partialData || streamResultsRef.current
        if (partial && partial.length > 0) {
          setToolResults(partial)
          showMsg(`تم استخراج ${partial.length} نتيجة قبل الخطأ: ${res.error || 'خطأ غير معروف'}`, true)
        } else { showMsg(res.error || 'فشل الاستخراج', true) }
      }
    } catch (err: any) { showMsg(err.message || 'خطأ في الاستخراج', true) }
    setExtracting(false)
    setCurrentJobId(null)
  }

  const handleAutoFollow = async () => {
    if (!ensureSession()) return
    const usernames = followList.split('\n').map(s => s.trim()).filter(Boolean)
    if (usernames.length === 0) { showMsg('يرجى إدخال قائمة الحسابات', true); return }
    setLoading(true)
    setResultsOwner('follow')
    try {
      const res = await window.electronAPI.instagramAutoFollow({ sessionId, usernames })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'followed').length; showMsg(`تمت متابعة ${ok} من ${usernames.length}`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleMention = async () => {
    if (!ensureSession()) return
    const mentions = mentionUsers.split('\n').map(s => s.trim()).filter(Boolean)
    if (!mentionPostUrl || mentions.length === 0) { showMsg('يرجى إدخال الرابط والمستخدمين', true); return }
    setLoading(true)
    setResultsOwner('mention')
    try {
      const res = await window.electronAPI.runTool({ platform: 'instagram', toolId: 'mention', toolName: 'منشن إنستجرام', params: { sessionId, postUrl: mentionPostUrl, mentions, message: mentionMessage } })
      if (res.success) { showMsg('تم المنشن بنجاح'); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleBroadcast = async () => {
    if (!ensureSession()) return
    const recipients = broadcastRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (!broadcastMessage || recipients.length === 0) { showMsg('يرجى إدخال المستلمين والرسالة', true); return }
    setLoading(true)
    setResultsOwner('broadcast')
    try {
      const res = await window.electronAPI.instagramSendMessages({ sessionId, recipients, message: broadcastMessage })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'sent').length; showMsg(`تم إرسال ${ok} من ${recipients.length}`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => {
    setToolResults([])
    setResultsOwner(null)
    streamResultsRef.current = []
    setStreamResults([])
    clearResults()
  }

  // ---- Unfollow ----
  const handleUnfollow = async () => {
    if (!ensureSession()) return
    const usernames = unfollowList.split('\n').map(s => s.trim()).filter(Boolean)
    if (usernames.length === 0) { showMsg('أدخل قائمة الحسابات', true); return }
    setLoading(true)
    setResultsOwner('unfollow')
    setToolResults([])
    try {
      const res = await window.electronAPI.instagramUnfollow({ sessionId, usernames, delayMs: Math.max(1, unfollowDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'unfollowed').length
        showMsg(`تم إلغاء متابعة ${ok} من ${usernames.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Post interact (like + comment) ----
  const handlePostInteract = async () => {
    if (!ensureSession()) return
    const urls = interactUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط المنشورات', true); return }
    if (!interactLike && !interactComment.trim()) { showMsg('اختر إعجاب أو اكتب تعليق', true); return }
    setLoading(true)
    setResultsOwner('post-interact')
    setToolResults([])
    try {
      const res = await window.electronAPI.instagramPostInteract({
        sessionId,
        postUrls: urls,
        actions: { like: interactLike, comment: interactComment.trim() || undefined },
        delayMs: Math.max(1, interactDelay) * 1000,
      })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'done').length
        showMsg(`تم التفاعل مع ${ok} من ${urls.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Share post in DM ----
  const handleShareDM = async () => {
    if (!ensureSession()) return
    if (!sharePostUrl.trim()) { showMsg('أدخل رابط المنشور', true); return }
    const recipients = shareRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (recipients.length === 0) { showMsg('أدخل قائمة المستلمين', true); return }
    setLoading(true)
    setResultsOwner('share-dm')
    setToolResults([])
    try {
      const res = await window.electronAPI.instagramSharePostDM({ sessionId, postUrl: sharePostUrl.trim(), recipients, message: shareMessage.trim() || undefined })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'queued').length
        showMsg(`تمت مشاركة المنشور مع ${ok} مستلم`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Extract likers ----
  const handleExtractLikers = async () => {
    if (!ensureSession()) return
    if (!likersPostUrl.trim()) { showMsg('أدخل رابط المنشور', true); return }
    streamResultsRef.current = []
    setStreamResults([])
    setExtracting(true)
    setResultsOwner('extract-likers')
    setToolResults([])
    const jobId = `ig-likers-${Date.now()}`
    setCurrentJobId(jobId)
    try {
      const res = await window.electronAPI.instagramExtractLikers({ sessionId, postUrl: likersPostUrl.trim(), limit: likersLimit, jobId })
      if (res.success) {
        const data = (res.data as any[]) || []
        const finalData = streamResultsRef.current.length > 0 ? streamResultsRef.current : data
        setToolResults(finalData)
        showMsg(res.cancelled ? `تم الإيقاف — ${finalData.length} نتيجة محفوظة` : `تم استخراج ${res.count || finalData.length} معجب`)
        await loadResults()
      } else {
        const partial = (res.partialData as any[]) || streamResultsRef.current
        if (partial.length > 0) { setToolResults(partial); showMsg(`${partial.length} نتيجة قبل الخطأ: ${res.error || ''}`, true) }
        else showMsg(res.error || 'فشل الاستخراج', true)
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setExtracting(false)
    setCurrentJobId(null)
  }

  // ---- Extract following list of a target ----
  const handleExtractFollowing = async () => {
    if (!ensureSession()) return
    if (!followingTarget.trim()) { showMsg('أدخل اسم المستخدم المستهدف', true); return }
    streamResultsRef.current = []
    setStreamResults([])
    setExtracting(true)
    setResultsOwner('extract-following')
    setToolResults([])
    const jobId = `ig-following-${Date.now()}`
    setCurrentJobId(jobId)
    try {
      const res = await window.electronAPI.instagramExtractFollowing({ sessionId, targetUser: followingTarget.trim(), limit: followingLimit, jobId })
      if (res.success) {
        const data = (res.data as any[]) || []
        const finalData = streamResultsRef.current.length > 0 ? streamResultsRef.current : data
        setToolResults(finalData)
        showMsg(res.cancelled ? `تم الإيقاف — ${finalData.length} نتيجة محفوظة` : `تم استخراج ${res.count || finalData.length} حساب`)
        await loadResults()
      } else {
        const partial = (res.partialData as any[]) || streamResultsRef.current
        if (partial.length > 0) { setToolResults(partial); showMsg(`${partial.length} نتيجة قبل الخطأ: ${res.error || ''}`, true) }
        else showMsg(res.error || 'فشل الاستخراج', true)
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setExtracting(false)
    setCurrentJobId(null)
  }

  // ---- Extract suggested users ----
  const handleExtractSuggested = async () => {
    if (!ensureSession()) return
    if (!suggestedBaseUser.trim()) { showMsg('أدخل اسم المستخدم المرجعي', true); return }
    setLoading(true)
    setResultsOwner('extract-suggested')
    setToolResults([])
    try {
      const res = await window.electronAPI.instagramExtractSuggested({ sessionId, baseUser: suggestedBaseUser.trim(), limit: suggestedLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} حساب مقترح`)
        await loadResults()
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Top influencers ----
  const handleTopInfluencers = async () => {
    if (!ensureSession()) return
    if (!influencerHashtag.trim()) { showMsg('أدخل الهاشتاج', true); return }
    setLoading(true)
    setResultsOwner('top-influencers')
    setToolResults([])
    try {
      const res = await window.electronAPI.instagramTopInfluencers({ sessionId, hashtag: influencerHashtag.trim(), country: influencerCountry.trim() || undefined, limit: influencerLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم العثور على ${res.count || items.length} مؤثر`)
        await loadResults()
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Analyze profile ----
  const handleAnalyzeProfile = async () => {
    if (!ensureSession()) return
    if (!analyzeUsername.trim()) { showMsg('أدخل اسم المستخدم', true); return }
    setLoading(true)
    setResultsOwner('analyze-profile')
    setToolResults([])
    setAnalyzeResult(null)
    try {
      const res = await window.electronAPI.instagramAnalyzeProfile({ sessionId, username: analyzeUsername.trim() })
      if (res.success && res.data) {
        setAnalyzeResult(res.data)
        showMsg(`تم تحليل @${(res.data as any).username || analyzeUsername}`)
      } else showMsg(String((res as any).error || 'فشل التحليل'), true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Follow + message combo ----
  const handleFollowMessage = async () => {
    if (!ensureSession()) return
    const usernames = combinedList.split('\n').map(s => s.trim()).filter(Boolean)
    if (usernames.length === 0) { showMsg('أدخل قائمة الحسابات', true); return }
    if (!combinedMessage.trim()) { showMsg('أدخل نص الرسالة', true); return }
    setLoading(true)
    setResultsOwner('follow-message')
    setToolResults([])
    try {
      const res = await window.electronAPI.instagramFollowMessage({
        sessionId, usernames, message: combinedMessage, followFirst: combinedFollowFirst,
        delayMs: Math.max(1, combinedDelay) * 1000,
      })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال ${ok} رسالة من ${usernames.length} حساب`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const extractTools = [
    { id: 'followers', name: 'المتابعين الجدد', desc: 'استخراج قائمة المتابعين', icon: Users },
    { id: 'comments', name: 'الإعجابات والتعليقات', desc: 'استخراج الإعجابات والتعليقات من المنشور', icon: MessageSquare },
    { id: 'messengers', name: 'مراسلين الحساب', desc: 'استخراج مراسلين الحساب الشخصي', icon: Send },
    { id: 'hashtag', name: 'الهاشتاجات والأماكن', desc: 'استخراج المنشورات من الهاشتاجات', icon: Hash },
    { id: 'posts', name: 'المنشورات', desc: 'استخراج المنشورات المحفوظة والعامة', icon: Copy },
  ]

  const tools: Array<{
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: typeof Download
    accent: string
    accentGradient: string
    requiresSession: boolean
  }> = [
    { id: 'extract', name: 'استخراج البيانات', description: 'متابعين، تعليقات، هاشتاجات', icon: Download, accent: '#ec4899', accentGradient: 'linear-gradient(135deg, #ec4899, #be185d)', requiresSession: true },
    { id: 'extract-likers', name: 'استخراج المعجبين', description: 'استخراج معجبين منشور معيّن', icon: Heart, accent: '#f43f5e', accentGradient: 'linear-gradient(135deg, #f43f5e, #be123c)', requiresSession: true },
    { id: 'extract-following', name: 'استخراج المتابَعين', description: 'استخراج من يتابعهم حساب معين', icon: UsersRound, accent: '#a855f7', accentGradient: 'linear-gradient(135deg, #a855f7, #7e22ce)', requiresSession: true },
    { id: 'follow', name: 'متابعة تلقائية', description: 'متابعة قائمة حسابات بشكل آمن', icon: UserPlus, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', requiresSession: true },
    { id: 'unfollow', name: 'إلغاء متابعة', description: 'إلغاء متابعة قائمة حسابات', icon: UserMinus, accent: '#ef4444', accentGradient: 'linear-gradient(135deg, #ef4444, #b91c1c)', requiresSession: true },
    { id: 'post-interact', name: 'تفاعل (إعجاب + تعليق)', description: 'إعجاب وتعليق على عدة منشورات', icon: Heart, accent: '#22c55e', accentGradient: 'linear-gradient(135deg, #22c55e, #15803d)', requiresSession: true },
    { id: 'mention', name: 'منشن جماعي', description: 'منشن مستخدمين في منشور', icon: AtSign, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: true },
    { id: 'broadcast', name: 'إرسال رسائل', description: 'بث رسائل مباشرة لقائمة', icon: Send, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: true },
    { id: 'share-dm', name: 'مشاركة منشور بالخاص', description: 'إرسال منشور لقائمة مستلمين', icon: Share2, accent: '#06b6d4', accentGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', requiresSession: true },
    { id: 'follow-message', name: 'متابعة + رسالة', description: 'متابعة الحساب ثم إرسال رسالة', icon: MessageCircle, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: true },
    { id: 'extract-suggested', name: 'المقترحين لحساب', description: 'الحسابات المقترحة لمشابهة حساب', icon: Sparkles, accent: '#d946ef', accentGradient: 'linear-gradient(135deg, #d946ef, #a21caf)', requiresSession: true },
    { id: 'top-influencers', name: 'أهم المؤثرين', description: 'مؤثرون من هاشتاج/دولة', icon: Crown, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #b45309)', requiresSession: true },
    { id: 'analyze-profile', name: 'تحليل الحساب', description: 'متابعين/متابعون/منشورات/سيرة', icon: BarChart3, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: true },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  // ----- Session / Login Header Card -----
  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(236,72,153,0.06), rgba(168,85,247,0.04))',
        border: '1px solid rgba(236,72,153,0.18)',
        boxShadow: '0 4px 20px rgba(236,72,153,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(236,72,153,0.3)' }}
          >
            <InstagramIcon size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Instagram</h3>
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

      {instaAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(236,72,153,0.12)', background: 'rgba(255,255,255,0.5)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value
              setSelectedAccountId(id)
              const acc = instaAccounts.find(a => a.id.toString() === id)
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
            {instaAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}
              </option>
            ))}
          </select>
          {selectedAccountId && (
            <button
              onClick={() => {
                const acc = instaAccounts.find(a => a.id.toString() === selectedAccountId)
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
        <label className="label-field">اسم المستخدم أو البريد</label>
        <input
          type="text"
          className="input-field"
          placeholder="@username"
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
                  <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-sm font-bold shrink-0">
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

  // ----- Results table (shared) -----
  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string) => {
    if (resultsOwner !== owner) return null
    const displayResults = toolResults.length > 0 ? toolResults : results
    const list = streamResults.length > 0 ? streamResults : displayResults
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
                if (owner === 'extract') {
                  const extra = (() => { try { return JSON.parse(r.extra_data || '{}') } catch { return {} as any } })()
                  const userId = r.userId || extra.userId || extra.id || r.user_id || '-'
                  const name = r.name || extra.name || r.username || '-'
                  const profile = r.url || r.profile || extra.profile || extra.url || '-'
                  const phone = r.phone || extra.phone || '-'
                  const text = extra.text || r.text || extra.extra || '-'
                  const source = r.source || extra.source || '-'
                  return (
                    <tr key={r.id || i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium text-sm">{name}</td>
                      <td className="text-xs font-mono text-pink-600">{userId}</td>
                      <td className="text-xs max-w-[150px] truncate">{profile !== '-' ? <a href={profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.substring(0, 40)}...</a> : '-'}</td>
                      <td className="text-xs">{phone}</td>
                      <td className="text-xs max-w-[150px] truncate">{text}</td>
                      <td className="text-xs">{source}</td>
                    </tr>
                  )
                }
                if (owner === 'follow') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || r.user || r.name || r.recipient || '-'}</td>
                      <td><span className={`badge ${r.status === 'followed' || r.status === 'sent' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                if (owner === 'mention') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[300px] truncate">{r.username || r.name || r.recipient || JSON.stringify(r).substring(0, 80)}</td>
                      <td><span className={`badge ${r.status === 'mentioned' || r.status === 'sent' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                if (owner === 'unfollow') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || '-'}</td>
                      <td><span className={`badge ${r.status === 'unfollowed' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'post-interact') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[260px] truncate"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.url}</a></td>
                      <td>{r.liked ? <CheckCircle size={14} className="text-emerald-500" /> : <span className="text-secondary-300">-</span>}</td>
                      <td>{r.commented ? <CheckCircle size={14} className="text-emerald-500" /> : <span className="text-secondary-300">-</span>}</td>
                      <td><span className={`badge ${r.status === 'done' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                if (owner === 'share-dm') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.recipient || '-'}</td>
                      <td><span className={`badge ${r.status === 'queued' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-likers' || owner === 'extract-following') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || '-'}</td>
                      <td className="text-xs">{r.name || '-'}</td>
                      <td className="text-xs">{r.profile ? <a href={r.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" dir="ltr">{r.profile.replace('https://instagram.com/', '@')}</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'follow-message') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || '-'}</td>
                      <td>{r.followed ? <CheckCircle size={14} className="text-emerald-500" /> : <span className="text-secondary-300">-</span>}</td>
                      <td>{r.messaged ? <CheckCircle size={14} className="text-emerald-500" /> : <span className="text-secondary-300">-</span>}</td>
                      <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : r.status === 'followed-only' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                if (owner === 'extract-suggested') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || '-'}</td>
                      <td className="text-xs">{r.name || '-'}</td>
                      <td className="text-xs">{r.profile ? <a href={r.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" dir="ltr">@{r.username}</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'top-influencers') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || '-'}</td>
                      <td className="text-xs">{r.name || '-'}</td>
                      <td className="text-xs font-mono text-amber-700">{r.followers || '-'}</td>
                      <td className="text-xs">{r.profile ? <a href={r.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" dir="ltr">@{r.username}</a> : '-'}</td>
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

  // ----- Tool panel bodies -----
  const renderExtractBody = () => {
    const inputPlaceholder = extractType === 'followers' ? '@username أو اتركه فارغاً للحساب الحالي' : extractType === 'comments' || extractType === 'messengers' ? 'https://instagram.com/p/...' : '#hashtag'
    const inputLabel = extractType === 'followers' ? 'اسم المستخدم' : extractType === 'comments' || extractType === 'messengers' ? 'رابط المنشور' : 'الهاشتاج'
    return (
      <div className="space-y-5">
        <AccountSelector
          platformId="instagram"
          accounts={allAccounts}
          cycleActive={cycleActive}
          cycleProgress={cycleProgress}
          onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
          onStopCycle={stopCycle}
          extractTask={{ type: 'extract', params: { extractType, targetUser: extractInput, postUrl: extractInput, hashtag: extractInput, url: extractInput, limit: extractLimit } }}
          sendTask={{ type: 'send', params: { recipients: broadcastRecipients.split('\n').filter(Boolean), message: broadcastMessage } }}
        />

        <div>
          <label className="label-field">نوع الاستخراج</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {extractTools.map(t => {
              const isSel = extractType === t.id
              const ToolIcon = t.icon
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setExtractType(t.id)}
                  className="flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all text-right"
                  style={{
                    background: isSel ? 'rgba(236,72,153,0.08)' : 'white',
                    borderColor: isSel ? '#ec4899' : 'rgba(226,232,240,0.8)',
                    color: isSel ? '#be185d' : '#475569',
                    boxShadow: isSel ? '0 0 0 2px rgba(236,72,153,0.15)' : 'none',
                  }}
                >
                  <ToolIcon size={16} />
                  <span className="text-xs">{t.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="label-field">{inputLabel}</label>
          <input type="text" className="input-field" placeholder={inputPlaceholder} value={extractInput} onChange={e => setExtractInput(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">الحد الأقصى للنتائج: {extractLimit}</label>
            <input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-pink-600" />
          </div>
          <div>
            <label className="label-field">تأخير الصفحات (ms): {delayMs}</label>
            <input type="range" min="500" max="5000" step="100" value={delayMs} onChange={e => setDelayMs(parseInt(e.target.value))} className="w-full accent-purple-600" />
          </div>
        </div>
        <p className="text-[11px] text-secondary-400 -mt-2">تأخير أكبر = أمان أكثر ضد الحظر</p>

        {extracting && (
          <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-lg border border-pink-200">
            <Loader2 size={16} className="animate-spin text-pink-600" />
            <span className="text-pink-700 text-sm font-medium">جاري الاستخراج... {streamResults.length} نتيجة حتى الآن</span>
          </div>
        )}

        {renderResultsTable('extract', ['#', 'الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'النص', 'المصدر'], 'instagram-extract')}
      </div>
    )
  }

  const extractFooter = (
    <div className="flex gap-2">
      <button
        onClick={handleExtract}
        disabled={extracting}
        className="btn-primary flex-1"
        style={{ background: ACCENT_GRADIENT }}
      >
        {extracting ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}
      </button>
      {extracting && (
        <button onClick={stopExtraction} className="btn-danger">
          <Square size={18} /> إيقاف
        </button>
      )}
    </div>
  )

  const renderFollowBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">قائمة الحسابات (سطر لكل حساب)</label>
        <textarea className="textarea-field" rows={8} value={followList} onChange={e => setFollowList(e.target.value)} placeholder="user1&#10;user2&#10;user3" />
      </div>
      {renderResultsTable('follow', ['#', 'الحساب', 'الحالة'], 'instagram-follow')}
    </div>
  )

  const followFooter = (
    <button
      onClick={handleAutoFollow}
      disabled={loading || !followList.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> بدء المتابعة</>}
    </button>
  )

  const renderMentionBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط المنشور</label>
        <input type="url" className="input-field" placeholder="https://instagram.com/p/..." value={mentionPostUrl} onChange={e => setMentionPostUrl(e.target.value)} />
      </div>
      <div>
        <label className="label-field">قائمة المستخدمين للمنشن</label>
        <textarea className="textarea-field" rows={5} value={mentionUsers} onChange={e => setMentionUsers(e.target.value)} placeholder="username1&#10;username2" />
      </div>
      <div>
        <label className="label-field">نص الرسالة (اختياري)</label>
        <textarea className="textarea-field" rows={3} value={mentionMessage} onChange={e => setMentionMessage(e.target.value)} placeholder="...تعليقك مع المنشن" />
      </div>
      {renderResultsTable('mention', ['#', 'التفاصيل', 'الحالة'], 'instagram-mention')}
    </div>
  )

  const mentionFooter = (
    <button
      onClick={handleMention}
      disabled={loading || !mentionPostUrl || !mentionUsers.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> بدء المنشن</>}
    </button>
  )

  const renderBroadcastBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">المستلمين (اسم مستخدم - سطر لكل مستلم)</label>
        <textarea className="textarea-field" rows={6} value={broadcastRecipients} onChange={e => setBroadcastRecipients(e.target.value)} placeholder="user1&#10;user2&#10;user3" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={5} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." />
      </div>
      {renderResultsTable('broadcast', ['#', 'المستلم', 'الحالة', 'خطأ'], 'instagram-messages')}
    </div>
  )

  const broadcastFooter = (
    <button
      onClick={handleBroadcast}
      disabled={loading || !broadcastRecipients.trim() || !broadcastMessage.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> بدء الإرسال</>}
    </button>
  )

  // ----- Unfollow panel -----
  const renderUnfollowBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-700" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        إنستجرام يقيّد عمليات إلغاء المتابعة السريعة. ابق الفاصل أكبر من 4 ثوانٍ.
      </div>
      <div>
        <label className="label-field">قائمة الحسابات (سطر لكل حساب)</label>
        <textarea className="textarea-field" rows={7} value={unfollowList} onChange={e => setUnfollowList(e.target.value)} placeholder="user1&#10;user2" />
      </div>
      <div>
        <label className="label-field">الفاصل الزمني (ثانية)</label>
        <input type="number" min={1} max={120} className="input-field w-32" value={unfollowDelay} onChange={e => setUnfollowDelay(Number(e.target.value) || 5)} />
      </div>
      {renderResultsTable('unfollow', ['#', 'الحساب', 'الحالة', 'خطأ'], 'instagram-unfollow')}
    </div>
  )
  const unfollowFooter = (
    <button onClick={handleUnfollow} disabled={loading || !unfollowList.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserMinus size={18} /> إلغاء المتابعة</>}
    </button>
  )

  // ----- Post-interact panel -----
  const renderPostInteractBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط المنشورات (سطر لكل منشور)</label>
        <textarea className="textarea-field" rows={6} value={interactUrls} onChange={e => setInteractUrls(e.target.value)} placeholder="https://instagram.com/p/..." />
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={interactLike} onChange={e => setInteractLike(e.target.checked)} className="rounded" />
          إعجاب
        </label>
        <div className="flex-1">
          <label className="label-field">تعليق (اختياري - {'{{n}}'} = رقم المنشور)</label>
          <input type="text" className="input-field" value={interactComment} onChange={e => setInteractComment(e.target.value)} placeholder="رائع! 🎉" />
        </div>
      </div>
      <div>
        <label className="label-field">الفاصل الزمني (ثانية)</label>
        <input type="number" min={1} max={60} className="input-field w-32" value={interactDelay} onChange={e => setInteractDelay(Number(e.target.value) || 4)} />
      </div>
      {renderResultsTable('post-interact', ['#', 'المنشور', 'إعجاب', 'تعليق', 'الحالة'], 'instagram-interact')}
    </div>
  )
  const postInteractFooter = (
    <button onClick={handlePostInteract} disabled={loading || !interactUrls.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Heart size={18} /> تنفيذ التفاعل</>}
    </button>
  )

  // ----- Share post in DM panel -----
  const renderShareDMBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط المنشور</label>
        <input type="url" className="input-field" value={sharePostUrl} onChange={e => setSharePostUrl(e.target.value)} placeholder="https://instagram.com/p/..." />
      </div>
      <div>
        <label className="label-field">قائمة المستلمين (اسم مستخدم لكل سطر)</label>
        <textarea className="textarea-field" rows={6} value={shareRecipients} onChange={e => setShareRecipients(e.target.value)} placeholder="user1&#10;user2" />
      </div>
      <div>
        <label className="label-field">نص مرفق (اختياري)</label>
        <textarea className="textarea-field" rows={3} value={shareMessage} onChange={e => setShareMessage(e.target.value)} placeholder="رسالة قصيرة مع المنشور..." />
      </div>
      {renderResultsTable('share-dm', ['#', 'المستلم', 'الحالة', 'خطأ'], 'instagram-share-dm')}
    </div>
  )
  const shareDMFooter = (
    <button onClick={handleShareDM} disabled={loading || !sharePostUrl.trim() || !shareRecipients.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Share2 size={18} /> مشاركة المنشور</>}
    </button>
  )

  // ----- Extract likers panel -----
  const renderExtractLikersBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط المنشور</label>
        <input type="url" className="input-field" value={likersPostUrl} onChange={e => setLikersPostUrl(e.target.value)} placeholder="https://instagram.com/p/..." />
      </div>
      <div>
        <label className="label-field">الحد الأقصى للنتائج: {likersLimit}</label>
        <input type="range" min={20} max={2000} step={20} className="w-full accent-rose-500" value={likersLimit} onChange={e => setLikersLimit(parseInt(e.target.value))} />
      </div>
      {extracting && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-lg border border-rose-200">
          <Loader2 size={16} className="animate-spin text-rose-600" />
          <span className="text-rose-700 text-sm font-medium">جاري الاستخراج... {streamResults.length} نتيجة حتى الآن</span>
        </div>
      )}
      {renderResultsTable('extract-likers', ['#', 'الحساب', 'الاسم', 'الرابط'], 'instagram-likers')}
    </div>
  )
  const extractLikersFooter = (
    <div className="flex gap-2">
      <button onClick={handleExtractLikers} disabled={extracting || !likersPostUrl.trim()} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg, #f43f5e, #be123c)' }}>
        {extracting ? <Loader2 size={18} className="animate-spin" /> : <><Heart size={18} /> بدء الاستخراج</>}
      </button>
      {extracting && <button onClick={stopExtraction} className="btn-danger"><Square size={18} /> إيقاف</button>}
    </div>
  )

  // ----- Extract following panel -----
  const renderExtractFollowingBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">اسم المستخدم المستهدف</label>
        <input type="text" className="input-field" value={followingTarget} onChange={e => setFollowingTarget(e.target.value)} placeholder="@username" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {followingLimit}</label>
        <input type="range" min={20} max={2000} step={20} className="w-full accent-purple-500" value={followingLimit} onChange={e => setFollowingLimit(parseInt(e.target.value))} />
      </div>
      {extracting && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <Loader2 size={16} className="animate-spin text-purple-600" />
          <span className="text-purple-700 text-sm font-medium">جاري الاستخراج... {streamResults.length} نتيجة حتى الآن</span>
        </div>
      )}
      {renderResultsTable('extract-following', ['#', 'الحساب', 'الاسم', 'الرابط'], 'instagram-following')}
    </div>
  )
  const extractFollowingFooter = (
    <div className="flex gap-2">
      <button onClick={handleExtractFollowing} disabled={extracting || !followingTarget.trim()} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}>
        {extracting ? <Loader2 size={18} className="animate-spin" /> : <><UsersRound size={18} /> بدء الاستخراج</>}
      </button>
      {extracting && <button onClick={stopExtraction} className="btn-danger"><Square size={18} /> إيقاف</button>}
    </div>
  )

  // ----- Follow + message combo panel -----
  const renderFollowMessageBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-700" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        ابق الفاصل أكبر من 4 ثوانٍ لتقليل احتمال الحظر التلقائي.
      </div>
      <div>
        <label className="label-field">قائمة الحسابات (سطر لكل حساب)</label>
        <textarea className="textarea-field" rows={6} value={combinedList} onChange={e => setCombinedList(e.target.value)} placeholder="user1&#10;user2" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={4} value={combinedMessage} onChange={e => setCombinedMessage(e.target.value)} placeholder="مرحبًا! ..." />
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={combinedFollowFirst} onChange={e => setCombinedFollowFirst(e.target.checked)} className="rounded" />
          متابعة الحساب أولاً
        </label>
        <div>
          <label className="label-field">الفاصل (ثانية)</label>
          <input type="number" min={1} max={120} className="input-field w-32" value={combinedDelay} onChange={e => setCombinedDelay(Number(e.target.value) || 5)} />
        </div>
      </div>
      {renderResultsTable('follow-message', ['#', 'الحساب', 'متابعة', 'رسالة', 'الحالة'], 'instagram-follow-msg')}
    </div>
  )
  const followMessageFooter = (
    <button onClick={handleFollowMessage} disabled={loading || !combinedList.trim() || !combinedMessage.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><MessageCircle size={18} /> متابعة + إرسال</>}
    </button>
  )

  // ---- Suggested users panel ----
  const renderExtractSuggestedBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">المستخدم المرجعي (سيتم استخراج المقترحين له)</label>
        <input type="text" className="input-field" value={suggestedBaseUser} onChange={e => setSuggestedBaseUser(e.target.value)} placeholder="@username" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {suggestedLimit}</label>
        <input type="range" min={10} max={300} step={5} className="w-full accent-fuchsia-500" value={suggestedLimit} onChange={e => setSuggestedLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-suggested', ['#', 'الحساب', 'الاسم', 'الرابط'], 'instagram-suggested')}
    </div>
  )
  const extractSuggestedFooter = (<button onClick={handleExtractSuggested} disabled={loading || !suggestedBaseUser.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #d946ef, #a21caf)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> استخراج المقترحين</>}</button>)

  // ---- Top influencers panel ----
  const renderTopInfluencersBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الهاشتاج</label>
        <input type="text" className="input-field" value={influencerHashtag} onChange={e => setInfluencerHashtag(e.target.value)} placeholder="travel, fashion, food" />
      </div>
      <div>
        <label className="label-field">الدولة (اختياري - يفلتر حسب البايو)</label>
        <input type="text" className="input-field" value={influencerCountry} onChange={e => setInfluencerCountry(e.target.value)} placeholder="Egypt، السعودية، KSA" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {influencerLimit}</label>
        <input type="range" min={10} max={200} step={5} className="w-full accent-amber-500" value={influencerLimit} onChange={e => setInfluencerLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('top-influencers', ['#', 'الحساب', 'الاسم', 'المتابعين', 'الرابط'], 'instagram-influencers')}
    </div>
  )
  const topInfluencersFooter = (<button onClick={handleTopInfluencers} disabled={loading || !influencerHashtag.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #b45309)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Crown size={18} /> استخراج المؤثرين</>}</button>)

  // ---- Analyze profile panel ----
  const renderAnalyzeProfileBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">اسم المستخدم</label>
        <input type="text" className="input-field" value={analyzeUsername} onChange={e => setAnalyzeUsername(e.target.value)} placeholder="@username" />
      </div>
      {analyzeResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border bg-white/60">
              <p className="text-xs text-secondary-500">منشورات</p>
              <p className="text-2xl font-bold text-secondary-800">{analyzeResult.posts || '-'}</p>
            </div>
            <div className="p-3 rounded-xl border bg-white/60">
              <p className="text-xs text-secondary-500">متابعين</p>
              <p className="text-2xl font-bold text-pink-700">{analyzeResult.followers || '-'}</p>
            </div>
            <div className="p-3 rounded-xl border bg-white/60">
              <p className="text-xs text-secondary-500">متابعون</p>
              <p className="text-2xl font-bold text-purple-700">{analyzeResult.following || '-'}</p>
            </div>
          </div>
          {analyzeResult.bio && (
            <div className="p-3 rounded-xl border bg-white/60">
              <p className="text-xs text-secondary-500 mb-1">السيرة الذاتية</p>
              <p className="text-sm text-secondary-700 whitespace-pre-wrap">{analyzeResult.bio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
  const analyzeProfileFooter = (<button onClick={handleAnalyzeProfile} disabled={loading || !analyzeUsername.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><BarChart3 size={18} /> تحليل</>}</button>)

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    extract: { body: renderExtractBody(), footer: extractFooter },
    'extract-likers': { body: renderExtractLikersBody(), footer: extractLikersFooter },
    'extract-following': { body: renderExtractFollowingBody(), footer: extractFollowingFooter },
    'extract-suggested': { body: renderExtractSuggestedBody(), footer: extractSuggestedFooter },
    'top-influencers': { body: renderTopInfluencersBody(), footer: topInfluencersFooter },
    'analyze-profile': { body: renderAnalyzeProfileBody(), footer: analyzeProfileFooter },
    follow: { body: renderFollowBody(), footer: followFooter },
    unfollow: { body: renderUnfollowBody(), footer: unfollowFooter },
    'post-interact': { body: renderPostInteractBody(), footer: postInteractFooter },
    mention: { body: renderMentionBody(), footer: mentionFooter },
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    'share-dm': { body: renderShareDMBody(), footer: shareDMFooter },
    'follow-message': { body: renderFollowMessageBody(), footer: followMessageFooter },
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
        platformId="instagram"
        platformName="Instagram"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('extract')}
      />

      <ToolGrid
        title="أدوات Instagram"
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
        title="تسجيل الدخول إلى Instagram"
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
