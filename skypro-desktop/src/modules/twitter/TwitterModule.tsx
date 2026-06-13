import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { getBackgroundMode } from '../../lib/backgroundMode'
import { makeJobId } from '../../lib/jobId'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import type { LucideIcon } from 'lucide-react'
import {
  LogIn, Download, Calendar, AtSign, Send, UserPlus, Megaphone, Repeat,
  Play, AlertCircle, CheckCircle, Loader2, Trash2, FileSpreadsheet,
  Eye, EyeOff, LogOut, Wrench, Twitter as TwitterIcon,
  Search, Heart, TrendingUp, MessageCircle, ShieldCheck, Sparkles, Quote, Rocket,
} from 'lucide-react'

type ActiveTool =
  | 'extract' | 'follow' | 'retweet' | 'mention' | 'broadcast' | 'schedule'
  | 'search-tweets' | 'extract-likers' | 'trends' | 'like-tweets' | 'reply-tweets'
  | 'validate-accounts' | 'boost-tweets' | 'quote-retweet' | 'follow-interactors' | 'mass-publish'
  | null
type ResultsOwner =
  | 'extract' | 'follow' | 'retweet' | 'mention' | 'broadcast'
  | 'search-tweets' | 'extract-likers' | 'trends' | 'like-tweets' | 'reply-tweets'
  | 'validate-accounts' | 'boost-tweets' | 'quote-retweet' | 'follow-interactors' | 'mass-publish'
  | null

const ACCENT = '#1DA1F2'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #1DA1F2, #1A91DA)'

export default function TwitterModule() {
  const {
    loading, setLoading, message, error, showMsg, sessionId, setSessionId,
    accounts, results, loadAccounts, loadResults, handleExport, clearResults,
    checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle,
    liveRows, beginLiveJob, endLiveJob,
  } = usePlatform('twitter')
  const { accounts: allAccounts, loadAccounts: loadAllAccounts } = useAccountsStore()

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [loginForm, setLoginForm] = useState({ username: '', password: '', proxy: '' })
  const [extractUser, setExtractUser] = useState('')
  const [extractLimit, setExtractLimit] = useState(200)
  const [toolResults, setToolResults] = useState<any[]>([])
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)
  const [tweetText, setTweetText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [mentionTweetUrl, setMentionTweetUrl] = useState('')
  const [mentionUsers, setMentionUsers] = useState('')
  const [mentionMessage, setMentionMessage] = useState('')
  const [broadcastText, setBroadcastText] = useState('')
  const [followList, setFollowList] = useState('')
  const [retweetUrls, setRetweetUrls] = useState('')

  // --- Search tweets ---
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTab, setSearchTab] = useState<'top' | 'latest'>('latest')
  const [searchLimit, setSearchLimit] = useState(100)
  // --- Extract tweet likers ---
  const [likersTweetUrl, setLikersTweetUrl] = useState('')
  const [likersLimit, setLikersLimit] = useState(200)
  // --- Trends ---
  const [trendsWoeid, setTrendsWoeid] = useState('') // empty = home trends
  const [trendsLimit, setTrendsLimit] = useState(50)
  // --- Like tweets ---
  const [likeUrls, setLikeUrls] = useState('')
  const [likeDelay, setLikeDelay] = useState(3)
  // --- Reply to tweets ---
  const [replyUrls, setReplyUrls] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [replyDelay, setReplyDelay] = useState(4)
  // --- Validate accounts ---
  const [validateAccountsList, setValidateAccountsList] = useState('')
  const [validateAccountsDelay, setValidateAccountsDelay] = useState(2)
  // --- Boost tweets ---
  const [boostUrls, setBoostUrls] = useState('')
  const [boostDoLike, setBoostDoLike] = useState(true)
  const [boostDoSave, setBoostDoSave] = useState(true)
  const [boostDoRetweet, setBoostDoRetweet] = useState(true)
  const [boostDelay, setBoostDelay] = useState(4)
  // --- Quote retweet ---
  const [quoteUrls, setQuoteUrls] = useState('')
  const [quoteComment, setQuoteComment] = useState('')
  const [quoteDelay, setQuoteDelay] = useState(5)
  // --- Follow interactors ---
  const [interactorsTweetUrl, setInteractorsTweetUrl] = useState('')
  const [interactorsMode, setInteractorsMode] = useState<'likers' | 'retweeters'>('likers')
  const [interactorsLimit, setInteractorsLimit] = useState(100)
  // --- Mass publish ---
  const [massTweets, setMassTweets] = useState('')
  const [massDelay, setMassDelay] = useState(8)

  const twitterAccounts = allAccounts.filter(a => a.platform === 'twitter')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { showMsg('يرجى إدخال البيانات', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.twitterLogin({ username: loginForm.username, password: loginForm.password, headless: getBackgroundMode('twitter'), proxy: loginForm.proxy || undefined })
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
      const res = await window.electronAPI.twitterLogin({ accountId: account.id, username: account.username, password: account.password, headless: getBackgroundMode('twitter'), proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAllAccounts() }
      else showMsg(res.error || 'فشل تسجيل الدخول', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الاتصال', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!ensureSession()) return
    if (!extractUser) { showMsg('أدخل اسم المستخدم', true); return }
    setLoading(true)
    setResultsOwner('extract')
    setToolResults([])
    const jobId = makeJobId('tw-extract')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.twitterExtractFollowers({ sessionId, username: extractUser, limit: extractLimit, jobId })
      if (res.success) { setToolResults((res.data as any[]) || []); showMsg(`تم استخراج ${res.count || 0} متابع`); await loadResults() }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleSchedule = async () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return }
    if (!tweetText || !scheduledAt) { showMsg('أدخل النص والموعد', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.twitterScheduleTweet({ text: tweetText, scheduledAt })
      if (res.success) showMsg('تم حفظ التغريدة المجدولة')
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleTweet = async () => {
    if (!ensureSession()) return
    if (!broadcastText) { showMsg('أدخل نص التغريدة', true); return }
    setLoading(true)
    setResultsOwner('broadcast')
    try {
      const res = await window.electronAPI.twitterTweet({ sessionId, text: broadcastText })
      if (res.success) showMsg('تم نشر التغريدة بنجاح!')
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleFollow = async () => {
    if (!ensureSession()) return
    const usernames = followList.split('\n').map(s => s.trim()).filter(Boolean)
    if (usernames.length === 0) { showMsg('أدخل قائمة الحسابات', true); return }
    setLoading(true)
    setResultsOwner('follow')
    setToolResults([])
    const jobId = makeJobId('tw-follow')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.twitterFollow({ sessionId, usernames, jobId })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'followed').length; showMsg(`تمت متابعة ${ok} من ${usernames.length} حساب`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleRetweet = async () => {
    if (!ensureSession()) return
    const urls = retweetUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط التغريدات', true); return }
    setLoading(true)
    setResultsOwner('retweet')
    try {
      const res = await window.electronAPI.twitterRetweet({ sessionId, tweetUrls: urls })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((x: any) => x.status === 'retweeted').length; showMsg(`تم الريتويت ${ok} من ${urls.length}`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleMention = async () => {
    if (!ensureSession()) return
    const mentions = mentionUsers.split('\n').map(s => s.trim()).filter(Boolean)
    if (!mentionTweetUrl || mentions.length === 0) { showMsg('أدخل رابط التغريدة والمستخدمين', true); return }
    setLoading(true)
    setResultsOwner('mention')
    try {
      const res = await window.electronAPI.twitterMention({ sessionId, tweetUrl: mentionTweetUrl, mentions, message: mentionMessage })
      if (res.success) { showMsg('تم المنشن بنجاح'); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => {
    setToolResults([])
    setResultsOwner(null)
    clearResults()
  }

  // ---- Search tweets ----
  const handleSearchTweets = async () => {
    if (!ensureSession()) return
    if (!searchQuery.trim()) { showMsg('أدخل الكلمة المفتاحية أو الهاشتاج', true); return }
    setLoading(true)
    setResultsOwner('search-tweets')
    setToolResults([])
    const jobId = makeJobId('tw-search')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.twitterSearchTweets({ sessionId, query: searchQuery.trim(), tab: searchTab, limit: searchLimit, jobId })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم العثور على ${res.count || items.length} تغريدة`)
        await loadResults()
      } else {
        showMsg(res.error || 'فشل البحث', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  // ---- Extract tweet likers ----
  const handleExtractLikers = async () => {
    if (!ensureSession()) return
    if (!likersTweetUrl.trim()) { showMsg('أدخل رابط التغريدة', true); return }
    setLoading(true)
    setResultsOwner('extract-likers')
    setToolResults([])
    const jobId = makeJobId('tw-likers')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.twitterExtractTweetLikers({ sessionId, tweetUrl: likersTweetUrl.trim(), limit: likersLimit, jobId })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} معجب`)
        await loadResults()
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  // ---- Extract trends ----
  const handleExtractTrends = async () => {
    if (!ensureSession()) return
    setLoading(true)
    setResultsOwner('trends')
    setToolResults([])
    try {
      const res = await window.electronAPI.twitterExtractTrends({ sessionId, woeid: trendsWoeid || undefined, limit: trendsLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} ترند`)
      } else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Like tweets ----
  const handleLikeTweets = async () => {
    if (!ensureSession()) return
    const urls = likeUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط التغريدات', true); return }
    setLoading(true)
    setResultsOwner('like-tweets')
    setToolResults([])
    try {
      const res = await window.electronAPI.twitterLikeTweets({ sessionId, tweetUrls: urls, delayMs: Math.max(1, likeDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'liked').length
        showMsg(`تم الإعجاب بـ ${ok} من ${urls.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Validate accounts ----
  const handleValidateAccounts = async () => {
    if (!ensureSession()) return
    const list = validateAccountsList.split('\n').map(s => s.trim()).filter(Boolean)
    if (list.length === 0) { showMsg('أدخل قائمة الحسابات', true); return }
    setLoading(true)
    setResultsOwner('validate-accounts')
    setToolResults([])
    try {
      const res = await window.electronAPI.twitterValidateAccounts({ sessionId, usernames: list, delayMs: Math.max(1, validateAccountsDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const valid = items.filter((r: any) => r.status === 'valid').length
        showMsg(`${valid} حساب صالح من أصل ${list.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Boost tweets ----
  const handleBoostTweets = async () => {
    if (!ensureSession()) return
    const urls = boostUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط التغريدات', true); return }
    if (!boostDoLike && !boostDoSave && !boostDoRetweet) { showMsg('اختر إجراء واحد على الأقل', true); return }
    setLoading(true)
    setResultsOwner('boost-tweets')
    setToolResults([])
    try {
      const res = await window.electronAPI.twitterBoostTweets({ sessionId, tweetUrls: urls, doLike: boostDoLike, doSave: boostDoSave, doRetweet: boostDoRetweet, delayMs: Math.max(1, boostDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'done').length
        showMsg(`تم التعزيز لـ ${ok} من ${urls.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Quote retweet ----
  const handleQuoteRetweet = async () => {
    if (!ensureSession()) return
    const urls = quoteUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط التغريدات', true); return }
    if (!quoteComment.trim()) { showMsg('أدخل نص الاقتباس', true); return }
    setLoading(true)
    setResultsOwner('quote-retweet')
    setToolResults([])
    try {
      const res = await window.electronAPI.twitterQuoteRetweet({ sessionId, tweetUrls: urls, comment: quoteComment, delayMs: Math.max(1, quoteDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'quoted').length
        showMsg(`تم الاقتباس لـ ${ok} من ${urls.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Follow interactors ----
  const handleFollowInteractors = async () => {
    if (!ensureSession()) return
    if (!interactorsTweetUrl.trim()) { showMsg('أدخل رابط التغريدة', true); return }
    setLoading(true)
    setResultsOwner('follow-interactors')
    setToolResults([])
    try {
      const res = await window.electronAPI.twitterFollowInteractors({ sessionId, tweetUrl: interactorsTweetUrl.trim(), mode: interactorsMode, limit: interactorsLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'followed').length
        showMsg(`تمت متابعة ${ok} متفاعل`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Mass publish ----
  const handleMassPublish = async () => {
    if (!ensureSession()) return
    const tweets = massTweets.split('\n').map(s => s.trim()).filter(Boolean)
    if (tweets.length === 0) { showMsg('أدخل التغريدات', true); return }
    setLoading(true)
    setResultsOwner('mass-publish')
    setToolResults([])
    try {
      const res = await window.electronAPI.twitterMassPublish({ sessionId, tweets, delayMs: Math.max(3, massDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'posted').length
        showMsg(`تم نشر ${ok} من ${tweets.length} تغريدة`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Reply to tweets ----
  const handleReplyTweets = async () => {
    if (!ensureSession()) return
    const urls = replyUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط التغريدات', true); return }
    if (!replyMessage.trim()) { showMsg('أدخل نص الرد', true); return }
    setLoading(true)
    setResultsOwner('reply-tweets')
    setToolResults([])
    try {
      const res = await window.electronAPI.twitterReplyTweets({ sessionId, tweetUrls: urls, message: replyMessage, delayMs: Math.max(1, replyDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'replied').length
        showMsg(`تم الرد على ${ok} من ${urls.length}`)
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
    { id: 'extract', name: 'استخراج المتابعين', description: 'استخراج قائمة المتابعين', icon: Download, accent: '#1DA1F2', accentGradient: 'linear-gradient(135deg, #1DA1F2, #1A91DA)', requiresSession: true },
    { id: 'search-tweets', name: 'البحث عن تغريدات', description: 'بحث بالكلمات أو الهاشتاجات', icon: Search, accent: '#06b6d4', accentGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', requiresSession: true },
    { id: 'extract-likers', name: 'استخراج المعجبين', description: 'استخراج معجبين تغريدة معينة', icon: Heart, accent: '#f43f5e', accentGradient: 'linear-gradient(135deg, #f43f5e, #be123c)', requiresSession: true },
    { id: 'trends', name: 'الترندات', description: 'الترندات الحالية حسب الموقع', icon: TrendingUp, accent: '#a855f7', accentGradient: 'linear-gradient(135deg, #a855f7, #7e22ce)', requiresSession: true },
    { id: 'follow', name: 'متابعة تلقائية', description: 'متابعة قائمة حسابات', icon: UserPlus, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', requiresSession: true },
    { id: 'like-tweets', name: 'إعجاب بالتغريدات', description: 'إعجاب بقائمة تغريدات', icon: Heart, accent: '#22c55e', accentGradient: 'linear-gradient(135deg, #22c55e, #15803d)', requiresSession: true },
    { id: 'retweet', name: 'إعادة تغريد', description: 'ريتويت قائمة تغريدات', icon: Repeat, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: true },
    { id: 'reply-tweets', name: 'الرد على تغريدات', description: 'الرد بتعليق موحد على عدة تغريدات', icon: MessageCircle, accent: '#84cc16', accentGradient: 'linear-gradient(135deg, #84cc16, #4d7c0f)', requiresSession: true },
    { id: 'quote-retweet', name: 'اقتباس تغريدة', description: 'ريتويت مع تعليق (Quote)', icon: Quote, accent: '#0d9488', accentGradient: 'linear-gradient(135deg, #0d9488, #115e59)', requiresSession: true },
    { id: 'boost-tweets', name: 'تعزيز التغريدات', description: 'إعجاب + حفظ + ريتويت', icon: Rocket, accent: '#7c3aed', accentGradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)', requiresSession: true },
    { id: 'mention', name: 'منشن جماعي', description: 'منشن مستخدمين في تغريدة', icon: AtSign, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: true },
    { id: 'broadcast', name: 'نشر تغريدة', description: 'نشر تغريدة جديدة الآن', icon: Megaphone, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: true },
    { id: 'mass-publish', name: 'نشر مئات التغريدات', description: 'نشر دفعة كبيرة بفواصل آمنة', icon: Sparkles, accent: '#d946ef', accentGradient: 'linear-gradient(135deg, #d946ef, #a21caf)', requiresSession: true },
    { id: 'schedule', name: 'جدولة تغريدة', description: 'جدولة تغريدة لموعد لاحق', icon: Calendar, accent: '#ef4444', accentGradient: 'linear-gradient(135deg, #ef4444, #b91c1c)', requiresSession: true },
    { id: 'follow-interactors', name: 'متابعة المتفاعلين', description: 'متابعة معجبي / مُعيدي تغريدة', icon: UserPlus, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: true },
    { id: 'validate-accounts', name: 'فحص الحسابات', description: 'فحص الحسابات الصالحة وإمكانية DM', icon: ShieldCheck, accent: '#dc2626', accentGradient: 'linear-gradient(135deg, #dc2626, #991b1b)', requiresSession: true },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(29,161,242,0.06), rgba(26,145,218,0.04))',
        border: '1px solid rgba(29,161,242,0.18)',
        boxShadow: '0 4px 20px rgba(29,161,242,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(29,161,242,0.3)' }}
          >
            <TwitterIcon size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Twitter</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: sessionId ? '#22c55e' : '#94a3b8',
                  boxShadow: sessionId ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                }}
              />
              <span className="text-xs font-medium" style={{ color: sessionId ? '#16a34a' : 'var(--color-secondary-500)' }}>
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

      {twitterAccounts.length > 0 && !sessionId && (
        <div
          className="px-5 py-3 border-t flex items-center gap-3 flex-wrap"
          style={{ borderColor: 'rgba(29,161,242,0.12)', background: 'var(--panel-bg)' }}
        >
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value
              setSelectedAccountId(id)
              const acc = twitterAccounts.find(a => a.id.toString() === id)
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
            {twitterAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}
              </option>
            ))}
          </select>
          {selectedAccountId && (
            <button
              onClick={() => {
                const acc = twitterAccounts.find(a => a.id.toString() === selectedAccountId)
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
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'rgba(29,161,242,0.1)', color: '#1DA1F2' }}>
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
      <div className="mt-5 rounded-xl border border-secondary-200 bg-white/[0.04] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
          <h4 className="font-bold text-secondary-900 text-sm">النتائج ({list.length}){loading && <span className="text-emerald-600 animate-pulse"> • مباشر ⚡</span>}</h4>
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
                  const text = r.text || r.bio || extra.text || extra.bio || '-'
                  const source = r.source || extra.source || '-'
                  return (
                    <tr key={r.id || i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium text-sm">{name}</td>
                      <td className="text-xs font-mono text-blue-600">{userId}</td>
                      <td className="text-xs max-w-[150px] truncate">{profile !== '-' ? <a href={profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.substring(0, 40)}...</a> : '-'}</td>
                      <td className="text-xs">{phone}</td>
                      <td className="text-xs max-w-[200px] truncate">{text}</td>
                      <td className="text-xs">{source}</td>
                    </tr>
                  )
                }
                if (owner === 'follow') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || r.user || r.name || r.recipient || '-'}</td>
                      <td><span className={`badge ${r.status === 'followed' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                if (owner === 'retweet') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[300px] truncate">{r.url || r.tweetUrl || r.name || '-'}</td>
                      <td><span className={`badge ${r.status === 'retweeted' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
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
                if (owner === 'search-tweets') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || '-'}</td>
                      <td className="text-xs max-w-[300px] truncate text-secondary-700">{r.text || '-'}</td>
                      <td className="text-xs">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td>
                      <td className="text-xs text-secondary-500">{r.time || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-likers') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || '-'}</td>
                      <td className="text-xs">{r.name || '-'}</td>
                      <td className="text-xs">{r.profile ? <a href={r.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" dir="ltr">{r.profile.replace('https://x.com/', '@')}</a> : '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'trends') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.title || '-'}</td>
                      <td className="text-xs text-secondary-600">{r.category || '-'}</td>
                      <td className="text-xs">{r.count || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'like-tweets') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[300px] truncate"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.url}</a></td>
                      <td><span className={`badge ${r.status === 'liked' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                if (owner === 'reply-tweets') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[260px] truncate"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.url}</a></td>
                      <td><span className={`badge ${r.status === 'replied' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'validate-accounts') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">@{r.username}</td>
                      <td><span className={`badge ${r.status === 'valid' ? 'badge-success' : r.status === 'protected' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                      <td>{r.dmOpen ? <CheckCircle size={14} className="text-emerald-500" /> : <span className="text-secondary-300">-</span>}</td>
                      <td className="text-xs">{r.followers || '-'}</td>
                      <td className="text-xs text-secondary-500">{r.reason || r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'boost-tweets') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[260px] truncate"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.url}</a></td>
                      <td>{r.liked ? <CheckCircle size={14} className="text-emerald-500" /> : <span className="text-secondary-300">-</span>}</td>
                      <td>{r.retweeted ? <CheckCircle size={14} className="text-emerald-500" /> : <span className="text-secondary-300">-</span>}</td>
                      <td>{r.saved ? <CheckCircle size={14} className="text-emerald-500" /> : <span className="text-secondary-300">-</span>}</td>
                      <td><span className={`badge ${r.status === 'done' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                if (owner === 'quote-retweet') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[300px] truncate"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{r.url}</a></td>
                      <td><span className={`badge ${r.status === 'quoted' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'follow-interactors') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.username || '-'}</td>
                      <td><span className={`badge ${r.status === 'followed' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'mass-publish') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs max-w-[300px] truncate">{r.text || '-'}</td>
                      <td><span className={`badge ${r.status === 'posted' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                // broadcast
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{r.recipient || r.name || '-'}</td>
                    <td><span className={`badge ${r.status === 'sent' || r.status === 'posted' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
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

  const renderExtractBody = () => (
    <div className="space-y-5">
      <AccountSelector
        platformId="twitter"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType: 'followers', targetUser: extractUser, username: extractUser, limit: extractLimit } }}
        sendTask={{ type: 'send', params: { text: broadcastText } }}
      />
      <div>
        <label className="label-field">اسم المستخدم</label>
        <input type="text" className="input-field" placeholder="@username أو اتركه فارغاً لحسابك" value={extractUser} onChange={e => setExtractUser(e.target.value)} />
      </div>
      <div>
        <label className="label-field">الحد الأقصى للنتائج: {extractLimit}</label>
        <input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-blue-600" />
      </div>
      {renderResultsTable('extract', ['#', 'الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'النص', 'المصدر'], 'twitter-extract')}
    </div>
  )

  const extractFooter = (
    <button
      onClick={handleExtract}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}
    </button>
  )

  const renderFollowBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">قائمة الحسابات (سطر لكل حساب)</label>
        <textarea className="textarea-field" rows={8} value={followList} onChange={e => setFollowList(e.target.value)} placeholder="user1&#10;user2&#10;user3" />
      </div>
      {renderResultsTable('follow', ['#', 'الحساب', 'الحالة'], 'twitter-follow')}
    </div>
  )

  const followFooter = (
    <button
      onClick={handleFollow}
      disabled={loading || !followList.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> بدء المتابعة</>}
    </button>
  )

  const renderRetweetBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط التغريدات (سطر لكل رابط)</label>
        <textarea className="textarea-field" rows={8} value={retweetUrls} onChange={e => setRetweetUrls(e.target.value)} placeholder="https://x.com/user/status/...&#10;https://x.com/user/status/..." />
      </div>
      {renderResultsTable('retweet', ['#', 'الرابط', 'الحالة'], 'twitter-retweet')}
    </div>
  )

  const retweetFooter = (
    <button
      onClick={handleRetweet}
      disabled={loading || !retweetUrls.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Repeat size={18} /> بدء الريتويت</>}
    </button>
  )

  const renderMentionBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط التغريدة</label>
        <input type="url" className="input-field" placeholder="https://x.com/user/status/..." value={mentionTweetUrl} onChange={e => setMentionTweetUrl(e.target.value)} />
      </div>
      <div>
        <label className="label-field">المستخدمين للمنشن (سطر لكل اسم)</label>
        <textarea className="textarea-field" rows={5} value={mentionUsers} onChange={e => setMentionUsers(e.target.value)} placeholder="user1&#10;user2" />
      </div>
      <div>
        <label className="label-field">نص التعليق (اختياري)</label>
        <textarea className="textarea-field" rows={3} value={mentionMessage} onChange={e => setMentionMessage(e.target.value)} placeholder="...تعليقك مع المنشن" />
      </div>
      {renderResultsTable('mention', ['#', 'التفاصيل', 'الحالة'], 'twitter-mention')}
    </div>
  )

  const mentionFooter = (
    <button
      onClick={handleMention}
      disabled={loading || !mentionTweetUrl || !mentionUsers.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> بدء المنشن</>}
    </button>
  )

  const renderBroadcastBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">نص التغريدة</label>
        <textarea className="textarea-field" rows={6} value={broadcastText} onChange={e => setBroadcastText(e.target.value)} placeholder="اكتب تغريدتك هنا..." />
      </div>
      {renderResultsTable('broadcast', ['#', 'المستلم', 'الحالة', 'خطأ'], 'twitter-broadcast')}
    </div>
  )

  const broadcastFooter = (
    <button
      onClick={handleTweet}
      disabled={loading || !broadcastText.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> نشر التغريدة</>}
    </button>
  )

  const renderScheduleBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">نص التغريدة</label>
        <textarea className="textarea-field" rows={5} value={tweetText} onChange={e => setTweetText(e.target.value)} placeholder="اكتب التغريدة المجدولة..." />
      </div>
      <div>
        <label className="label-field">الموعد</label>
        <input type="datetime-local" className="input-field" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
      </div>
    </div>
  )

  const scheduleFooter = (
    <button
      onClick={handleSchedule}
      disabled={loading || !tweetText.trim() || !scheduledAt}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Calendar size={18} /> جدولة</>}
    </button>
  )

  // ---- Search tweets panel ----
  const renderSearchTweetsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الكلمة المفتاحية أو الهاشتاج</label>
        <input type="text" className="input-field" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder='مثال: "تسويق إلكتروني" أو #ecommerce' />
      </div>
      <div className="flex gap-3 flex-wrap">
        <button type="button" onClick={() => setSearchTab('latest')} className="px-4 py-2 rounded-lg text-sm font-medium" style={searchTab === 'latest' ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid #06b6d4' } : { background: 'var(--panel-bg)', color: 'var(--color-secondary-600)', border: '1px solid rgba(255,255,255,0.08)' }}>الأحدث</button>
        <button type="button" onClick={() => setSearchTab('top')} className="px-4 py-2 rounded-lg text-sm font-medium" style={searchTab === 'top' ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid #06b6d4' } : { background: 'var(--panel-bg)', color: 'var(--color-secondary-600)', border: '1px solid rgba(255,255,255,0.08)' }}>الأشهر</button>
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {searchLimit}</label>
        <input type="range" min={20} max={1000} step={10} className="w-full accent-cyan-500" value={searchLimit} onChange={e => setSearchLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('search-tweets', ['#', 'المستخدم', 'النص', 'الرابط', 'الوقت'], 'twitter-search')}
    </div>
  )
  const searchTweetsFooter = (
    <button onClick={handleSearchTweets} disabled={loading || !searchQuery.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Search size={18} /> بدء البحث</>}
    </button>
  )

  // ---- Extract tweet likers panel ----
  const renderExtractLikersBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط التغريدة</label>
        <input type="url" className="input-field" value={likersTweetUrl} onChange={e => setLikersTweetUrl(e.target.value)} placeholder="https://x.com/user/status/..." />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {likersLimit}</label>
        <input type="range" min={20} max={2000} step={20} className="w-full accent-rose-500" value={likersLimit} onChange={e => setLikersLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-likers', ['#', 'الحساب', 'الاسم', 'الرابط'], 'twitter-likers')}
    </div>
  )
  const extractLikersFooter = (
    <button onClick={handleExtractLikers} disabled={loading || !likersTweetUrl.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f43f5e, #be123c)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Heart size={18} /> استخراج المعجبين</>}
    </button>
  )

  // ---- Trends panel ----
  const renderTrendsBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
        اترك الحقل فارغاً للحصول على ترندات حسابك أو أدخل WOEID لدولة معينة (مثال: 23424938 للسعودية، 23424802 لمصر، 1 العالم).
      </div>
      <div>
        <label className="label-field">WOEID (اختياري)</label>
        <input type="text" dir="ltr" className="input-field font-mono" value={trendsWoeid} onChange={e => setTrendsWoeid(e.target.value)} placeholder="23424938" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {trendsLimit}</label>
        <input type="range" min={10} max={100} step={5} className="w-full accent-purple-500" value={trendsLimit} onChange={e => setTrendsLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('trends', ['#', 'الترند', 'الفئة', 'العدد'], 'twitter-trends')}
    </div>
  )
  const trendsFooter = (
    <button onClick={handleExtractTrends} disabled={loading} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><TrendingUp size={18} /> استخراج الترندات</>}
    </button>
  )

  // ---- Like tweets panel ----
  const renderLikeTweetsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط التغريدات (سطر لكل رابط)</label>
        <textarea className="textarea-field" rows={7} value={likeUrls} onChange={e => setLikeUrls(e.target.value)} placeholder="https://x.com/user/status/..." />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={1} max={60} className="input-field w-32" value={likeDelay} onChange={e => setLikeDelay(Number(e.target.value) || 3)} />
      </div>
      {renderResultsTable('like-tweets', ['#', 'الرابط', 'الحالة'], 'twitter-like')}
    </div>
  )
  const likeTweetsFooter = (
    <button onClick={handleLikeTweets} disabled={loading || !likeUrls.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Heart size={18} /> إعجاب</>}
    </button>
  )

  // ---- Reply tweets panel ----
  const renderReplyTweetsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط التغريدات (سطر لكل رابط)</label>
        <textarea className="textarea-field" rows={5} value={replyUrls} onChange={e => setReplyUrls(e.target.value)} placeholder="https://x.com/user/status/..." />
      </div>
      <div>
        <label className="label-field">نص الرد ({'{{n}}'} = رقم التغريدة)</label>
        <textarea className="textarea-field" rows={4} value={replyMessage} onChange={e => setReplyMessage(e.target.value)} placeholder="رد رائع! 👏" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={1} max={60} className="input-field w-32" value={replyDelay} onChange={e => setReplyDelay(Number(e.target.value) || 4)} />
      </div>
      {renderResultsTable('reply-tweets', ['#', 'الرابط', 'الحالة', 'خطأ'], 'twitter-reply')}
    </div>
  )
  const replyTweetsFooter = (
    <button onClick={handleReplyTweets} disabled={loading || !replyUrls.trim() || !replyMessage.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #84cc16, #4d7c0f)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><MessageCircle size={18} /> إرسال الردود</>}
    </button>
  )

  // ---- Validate accounts panel ----
  const renderValidateAccountsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">قائمة الحسابات (سطر لكل اسم)</label>
        <textarea className="textarea-field" rows={6} value={validateAccountsList} onChange={e => setValidateAccountsList(e.target.value)} placeholder="@user1&#10;@user2" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={1} max={30} className="input-field w-32" value={validateAccountsDelay} onChange={e => setValidateAccountsDelay(Number(e.target.value) || 2)} />
      </div>
      {renderResultsTable('validate-accounts', ['#', 'الحساب', 'الحالة', 'DM متاح', 'المتابعين', 'ملاحظات'], 'twitter-validate')}
    </div>
  )
  const validateAccountsFooter = (<button onClick={handleValidateAccounts} disabled={loading || !validateAccountsList.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> فحص</>}</button>)

  // ---- Boost tweets panel ----
  const renderBoostTweetsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط التغريدات (سطر لكل رابط)</label>
        <textarea className="textarea-field" rows={6} value={boostUrls} onChange={e => setBoostUrls(e.target.value)} placeholder="https://x.com/user/status/..." />
      </div>
      <div className="flex items-center gap-6 flex-wrap">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={boostDoLike} onChange={e => setBoostDoLike(e.target.checked)} className="rounded" /> إعجاب
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={boostDoRetweet} onChange={e => setBoostDoRetweet(e.target.checked)} className="rounded" /> ريتويت
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={boostDoSave} onChange={e => setBoostDoSave(e.target.checked)} className="rounded" /> حفظ
        </label>
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={1} max={60} className="input-field w-32" value={boostDelay} onChange={e => setBoostDelay(Number(e.target.value) || 4)} />
      </div>
      {renderResultsTable('boost-tweets', ['#', 'الرابط', 'إعجاب', 'ريتويت', 'حفظ', 'الحالة'], 'twitter-boost')}
    </div>
  )
  const boostTweetsFooter = (<button onClick={handleBoostTweets} disabled={loading || !boostUrls.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Rocket size={18} /> تعزيز</>}</button>)

  // ---- Quote retweet panel ----
  const renderQuoteRetweetBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط التغريدات (سطر لكل رابط)</label>
        <textarea className="textarea-field" rows={5} value={quoteUrls} onChange={e => setQuoteUrls(e.target.value)} placeholder="https://x.com/user/status/..." />
      </div>
      <div>
        <label className="label-field">نص الاقتباس ({'{{n}}'} = رقم التغريدة)</label>
        <textarea className="textarea-field" rows={4} value={quoteComment} onChange={e => setQuoteComment(e.target.value)} placeholder="رأيي 👇" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={1} max={60} className="input-field w-32" value={quoteDelay} onChange={e => setQuoteDelay(Number(e.target.value) || 5)} />
      </div>
      {renderResultsTable('quote-retweet', ['#', 'الرابط', 'الحالة', 'خطأ'], 'twitter-quote')}
    </div>
  )
  const quoteRetweetFooter = (<button onClick={handleQuoteRetweet} disabled={loading || !quoteUrls.trim() || !quoteComment.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0d9488, #115e59)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Quote size={18} /> اقتباس</>}</button>)

  // ---- Follow interactors panel ----
  const renderFollowInteractorsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط التغريدة</label>
        <input type="url" className="input-field" value={interactorsTweetUrl} onChange={e => setInteractorsTweetUrl(e.target.value)} placeholder="https://x.com/user/status/..." />
      </div>
      <div className="flex gap-3 flex-wrap">
        <button type="button" onClick={() => setInteractorsMode('likers')} className="px-4 py-2 rounded-lg text-sm font-medium" style={interactorsMode === 'likers' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid #10b981' } : { background: 'var(--panel-bg)', color: 'var(--color-secondary-600)', border: '1px solid rgba(255,255,255,0.08)' }}>المعجبين</button>
        <button type="button" onClick={() => setInteractorsMode('retweeters')} className="px-4 py-2 rounded-lg text-sm font-medium" style={interactorsMode === 'retweeters' ? { background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid #10b981' } : { background: 'var(--panel-bg)', color: 'var(--color-secondary-600)', border: '1px solid rgba(255,255,255,0.08)' }}>المُعيدين</button>
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {interactorsLimit}</label>
        <input type="range" min={10} max={500} step={10} className="w-full accent-emerald-500" value={interactorsLimit} onChange={e => setInteractorsLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('follow-interactors', ['#', 'الحساب', 'الحالة', 'خطأ'], 'twitter-follow-int')}
    </div>
  )
  const followInteractorsFooter = (<button onClick={handleFollowInteractors} disabled={loading || !interactorsTweetUrl.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> متابعة المتفاعلين</>}</button>)

  // ---- Mass publish panel ----
  const renderMassPublishBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-700" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        تويتر يحدد ~50 تغريدة/ساعة. ابق الفاصل ≥ 8 ثوانٍ للأمان.
      </div>
      <div>
        <label className="label-field">التغريدات (تغريدة لكل سطر)</label>
        <textarea className="textarea-field" rows={10} value={massTweets} onChange={e => setMassTweets(e.target.value)} placeholder="تغريدة 1&#10;تغريدة 2&#10;تغريدة 3" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={5} max={300} className="input-field w-32" value={massDelay} onChange={e => setMassDelay(Number(e.target.value) || 8)} />
      </div>
      {renderResultsTable('mass-publish', ['#', 'النص', 'الحالة', 'خطأ'], 'twitter-mass')}
    </div>
  )
  const massPublishFooter = (<button onClick={handleMassPublish} disabled={loading || !massTweets.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #d946ef, #a21caf)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={18} /> نشر دفعة</>}</button>)

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    extract: { body: renderExtractBody(), footer: extractFooter },
    'search-tweets': { body: renderSearchTweetsBody(), footer: searchTweetsFooter },
    'extract-likers': { body: renderExtractLikersBody(), footer: extractLikersFooter },
    trends: { body: renderTrendsBody(), footer: trendsFooter },
    follow: { body: renderFollowBody(), footer: followFooter },
    'follow-interactors': { body: renderFollowInteractorsBody(), footer: followInteractorsFooter },
    'like-tweets': { body: renderLikeTweetsBody(), footer: likeTweetsFooter },
    retweet: { body: renderRetweetBody(), footer: retweetFooter },
    'quote-retweet': { body: renderQuoteRetweetBody(), footer: quoteRetweetFooter },
    'boost-tweets': { body: renderBoostTweetsBody(), footer: boostTweetsFooter },
    'reply-tweets': { body: renderReplyTweetsBody(), footer: replyTweetsFooter },
    mention: { body: renderMentionBody(), footer: mentionFooter },
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    'mass-publish': { body: renderMassPublishBody(), footer: massPublishFooter },
    schedule: { body: renderScheduleBody(), footer: scheduleFooter },
    'validate-accounts': { body: renderValidateAccountsBody(), footer: validateAccountsFooter },
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
        platformId="twitter"
        platformName="Twitter / X"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('extract')}
      />

      <ToolGrid
        title="أدوات Twitter"
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
        title="تسجيل الدخول إلى Twitter"
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
