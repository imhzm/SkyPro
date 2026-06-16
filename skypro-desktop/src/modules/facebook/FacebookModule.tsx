import { useState, useEffect, useRef, useCallback } from 'react'
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
  LogIn, Search, Download, Users, Send, Megaphone, Play, Eye, EyeOff,
  Trash2, AlertCircle, CheckCircle, Loader2, FileSpreadsheet, Heart,
  UserPlus, MessageSquare, Globe, AtSign, BarChart3, FileText,
  Share2, Copy, ThumbsUp, Bot, Square, LogOut, Facebook as FacebookIcon,
  Image as ImageIcon, ShieldCheck, UserCheck, X,
} from 'lucide-react'

type ActiveTool =
  | 'extract' | 'post-to-groups' | 'share-post' | 'auto-reply' | 'mention'
  | 'send-messages' | 'page-send-messages'
  | 'friend-requests' | 'delete-friends' | 'interaction-farm' | 'delete-posts'
  | 'analyze-group' | 'add-to-group-chat' | 'send-page-messages'
  | 'users-to-ids' | 'links-to-ids'
  | 'search-pages' | 'like-pages' | 'extract-sharers' | 'invite-friends'
  | 'comment-on-pages' | 'comment-on-posts' | 'post-with-images' | 'demographics-analyze'
  | 'detect-open-groups' | 'extract-active-friends'
  | null

type ResultsOwner = Exclude<ActiveTool, null> | null

const ACCENT = '#1877F2'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #1877F2, #0866FF)'

export default function FacebookModule() {
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadAccounts, loadResults, handleExport, clearResults, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('facebook')
  const { accounts: allAccounts } = useAccountsStore()

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const passwordRef = useRef<HTMLInputElement>(null)

  const [loginForm, setLoginForm] = useState({ email: '', password: '', proxy: '' })
  const [extractType, setExtractType] = useState('post-likers')
  const [extractUrl, setExtractUrl] = useState('')
  const [extractLimit, setExtractLimit] = useState(200)
  const [delayMs, setDelayMs] = useState(2000)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [streamResults, setStreamResults] = useState<any[]>([])
  const streamResultsRef = useRef<any[]>([])
  const currentJobIdRef = useRef<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState('pages')
  const [recipientsText, setRecipientsText] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [groupUrls, setGroupUrls] = useState('')
  const [postMessage, setPostMessage] = useState('')
  const [sharePostUrl, setSharePostUrl] = useState('')
  const [shareGroupUrls, setShareGroupUrls] = useState('')
  const [replyPostUrl, setReplyPostUrl] = useState('')
  const [replyText, setReplyText] = useState('')
  const [replyLimit, setReplyLimit] = useState(10)
  const [mentionUrls, setMentionUrls] = useState('')
  const [mentionUsernames, setMentionUsernames] = useState('')
  const [searchGroupQuery, setSearchGroupQuery] = useState('')
  const [joinGroupUrls, setJoinGroupUrls] = useState('')
  const [pageMessengerUrl, setPageMessengerUrl] = useState('')
  const [profileMessengerLimit, setProfileMessengerLimit] = useState(50)
  const [reviewPageUrl, setReviewPageUrl] = useState('')
  const [pageMsgUrl, setPageMsgUrl] = useState('')
  const [pageMsgRecipients, setPageMsgRecipients] = useState('')
  const [pageMsgText, setPageMsgText] = useState('')
  const [mentionText, setMentionText] = useState('')
  const [friendRequestUrls, setFriendRequestUrls] = useState('')
  const [deleteFriendsLimit, setDeleteFriendsLimit] = useState(20)
  const [deleteFriendsMode, setDeleteFriendsMode] = useState<'all' | 'selected'>('all')
  const [deleteFriendsUrls, setDeleteFriendsUrls] = useState('')
  const [groupChatUrl, setGroupChatUrl] = useState('')
  const [addUsernames, setAddUsernames] = useState('')
  const [sendPageUrls, setSendPageUrls] = useState('')
  const [sendPageMessage, setSendPageMessage] = useState('')
  const [interactionUrls, setInteractionUrls] = useState('')
  const [interactionAction, setInteractionAction] = useState('like')
  const [deletePostsLimit, setDeletePostsLimit] = useState(10)
  const [analyzeGroupUrl, setAnalyzeGroupUrl] = useState('')
  const [usersToIds, setUsersToIds] = useState('')
  const [linksToIds, setLinksToIds] = useState('')
  const [toolResults, setToolResults] = useState<any[]>([])

  // ---- New tool state (Phase: Facebook completion) ----
  const [pagesSearchQuery, setPagesSearchQuery] = useState('')
  const [pagesSearchLocation, setPagesSearchLocation] = useState('')
  const [pagesSearchLimit, setPagesSearchLimit] = useState(100)
  const [likePagesUrls, setLikePagesUrls] = useState('')
  const [likePagesDelay, setLikePagesDelay] = useState(5)
  const [sharersPostUrl, setSharersPostUrl] = useState('')
  const [sharersLimit, setSharersLimit] = useState(200)
  const [invitePageUrl, setInvitePageUrl] = useState('')
  const [inviteUsernames, setInviteUsernames] = useState('')
  const [inviteAll, setInviteAll] = useState(true)
  const [commentPagesUrls, setCommentPagesUrls] = useState('')
  const [commentPagesText, setCommentPagesText] = useState('')
  const [commentPagesDelay, setCommentPagesDelay] = useState(6)
  const [commentPostsUrls, setCommentPostsUrls] = useState('')
  const [commentPostsText, setCommentPostsText] = useState('')
  const [commentPostsDelay, setCommentPostsDelay] = useState(6)
  const [imagePostGroups, setImagePostGroups] = useState('')
  const [imagePostMessage, setImagePostMessage] = useState('')
  const [imagePostPaths, setImagePostPaths] = useState<string[]>([])
  const imagePostInputRef = useRef<HTMLInputElement | null>(null)
  const [imagePostDelay, setImagePostDelay] = useState(8)
  const [demoInputJson, setDemoInputJson] = useState('')
  const [demoResult, setDemoResult] = useState<any>(null)
  const [openGroupsUrls, setOpenGroupsUrls] = useState('')
  const [openGroupsDelay, setOpenGroupsDelay] = useState(3)
  const [activeFriendsLimit, setActiveFriendsLimit] = useState(50)
  const [activeFriendsDays, setActiveFriendsDays] = useState(30)

  useEffect(() => {
    const cleanup = window.electronAPI.onExtractionProgress((data: any) => {
      // Concurrency isolation: only append rows belonging to THIS module's
      // active job, so a simultaneous extraction on another platform never
      // bleeds its rows into the Facebook table.
      if (data.jobId && currentJobIdRef.current && data.jobId !== currentJobIdRef.current) return
      if (data.type === 'progress' && data.data) {
        streamResultsRef.current = [...streamResultsRef.current, ...data.data]
        setStreamResults([...streamResultsRef.current])
      }
    })
    return cleanup
  }, [])

  const fbAccounts = allAccounts.filter(a => a.platform === 'facebook')
  const ensureSession = () => {
    if (!sessionId) { showMsg('يرجى تسجيل الدخول أولاً', true); return false }
    return true
  }

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) { showMsg('يرجى إدخال البريد وكلمة المرور', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.facebookLogin({ username: loginForm.email, password: loginForm.password, headless: getBackgroundMode('facebook'), proxy: loginForm.proxy || undefined })
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
      setLoginForm({ ...loginForm, email: account.username, password: '' })
      setShowLoginPanel(true)
      setTimeout(() => passwordRef.current?.focus(), 200)
      showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة. يرجى إدخال كلمة المرور يدوياً ثم الضغط على "تسجيل الدخول".', true)
      setLoading(false)
      return
    }
    setLoginForm({ ...loginForm, email: account.username, password: account.password || '' })
    try {
      const res = await window.electronAPI.facebookLogin({ accountId: account.id, username: account.username, password: account.password, headless: getBackgroundMode('facebook'), proxy: account.proxy || loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg(`تم تسجيل الدخول بحساب ${account.username}!`); await loadAccounts() }
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
    const typesNeedingUrl = ['post-likers', 'post-comments', 'group-members', 'page-followers', 'phone-numbers', 'post-details']
    if (typesNeedingUrl.includes(extractType) && !extractUrl) { showMsg('يرجى إدخال الرابط', true); return }
    if (extractType === 'page-messengers' && !pageMessengerUrl) { showMsg('يرجى إدخال رابط الصفحة', true); return }
    if (extractType === 'reviews' && !reviewPageUrl) { showMsg('يرجى إدخال رابط الصفحة', true); return }
    if (extractType === 'search-groups' && !searchGroupQuery) { showMsg('يرجى إدخال كلمة البحث', true); return }
    if (extractType === 'join-groups' && !joinGroupUrls.trim()) { showMsg('يرجى إدخال روابط المجموعات', true); return }

    if (extractLimit >= 1000) {
      if (!confirm(`تحذير: استخراج ${extractLimit} نتيجة قد يستغرق وقتاً طويلاً وقد يعرض حسابك للحظر. هل تريد المتابعة؟`)) return
    }

    setExtracting(true)
    streamResultsRef.current = []
    setStreamResults([])
    setResultsOwner('extract')
    const jobId = `fb-${extractType}-${Date.now()}`
    setCurrentJobId(jobId)
    currentJobIdRef.current = jobId
    try {
      let res: any
      const baseParams = { sessionId, limit: extractLimit, jobId, delayMs }
      switch (extractType) {
        case 'post-likers': res = await window.electronAPI.facebookExtractPageLikers({ ...baseParams, postUrl: extractUrl }); break
        case 'post-comments': res = await window.electronAPI.facebookExtractComments({ ...baseParams, postUrl: extractUrl }); break
        case 'group-members': res = await window.electronAPI.facebookExtractGroupMembers({ ...baseParams, groupUrl: extractUrl }); break
        case 'friends': res = await window.electronAPI.facebookExtractFriends({ ...baseParams }); break
        case 'page-followers': res = await window.electronAPI.facebookExtractPageFollowers({ ...baseParams, pageUrl: extractUrl }); break
        case 'page-messengers': res = await window.electronAPI.facebookExtractPageMessengers({ ...baseParams, pageUrl: pageMessengerUrl }); break
        case 'profile-messengers': res = await window.electronAPI.facebookExtractProfileMessengers({ ...baseParams, limit: profileMessengerLimit }); break
        case 'reviews': res = await window.electronAPI.facebookExtractReviews({ ...baseParams, pageUrl: reviewPageUrl }); break
        case 'phone-numbers': res = await window.electronAPI.facebookExtractPhones({ ...baseParams, postUrl: extractUrl }); break
        case 'search-groups': res = await window.electronAPI.facebookSearchGroups({ sessionId, query: searchGroupQuery, limit: extractLimit }); break
        case 'my-groups': res = await window.electronAPI.facebookExtractMyGroups({ ...baseParams }); break
        case 'join-groups': {
          const groups = joinGroupUrls.split('\n').map(s => s.trim()).filter(Boolean)
          res = await window.electronAPI.facebookJoinGroups({ sessionId, groupUrls: groups }); break
        }
        default: res = await window.electronAPI.facebookExtractPageLikers({ ...baseParams, postUrl: extractUrl })
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
        } else {
          showMsg(res.error || 'فشل الاستخراج', true)
        }
      }
    } catch (err: any) { showMsg(err.message || 'خطأ في الاستخراج', true) }
    setExtracting(false)
    setCurrentJobId(null)
    currentJobIdRef.current = null
  }

  const handleClearResults = () => {
    setToolResults([])
    streamResultsRef.current = []
    setStreamResults([])
    setResultsOwner(null)
    clearResults()
  }

  const handleSearch = async () => {
    if (!ensureSession()) return
    if (!searchQuery) { showMsg('أدخل كلمة البحث', true); return }
    setToolResults([])
    setLoading(true)
    setResultsOwner('extract')
    try {
      const res = await window.electronAPI.facebookSearch({ sessionId, query: searchQuery, type: searchType, limit: extractLimit })
      if (res.success) { showMsg(`تم العثور على ${res.count || 0} نتيجة`); await loadResults() }
      else showMsg(res.error || 'فشل البحث', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handlePostToGroups = async () => {
    if (!ensureSession()) return
    const groups = groupUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (!postMessage || groups.length === 0) { showMsg('أدخل المجموعات والرسالة', true); return }
    setLoading(true)
    setResultsOwner('post-to-groups')
    try {
      const res = await window.electronAPI.facebookPostToGroups({ sessionId, groups, message: postMessage })
      if (res.success) { const ok = ((res.data as any[]) || []).filter((r: any) => r.status === 'posted').length; showMsg(`تم النشر في ${ok} من ${groups.length} مجموعة`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleSharePost = async () => {
    if (!ensureSession()) return
    const groups = shareGroupUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (!sharePostUrl || groups.length === 0) { showMsg('أدخل رابط المنشور والمجموعات', true); return }
    setLoading(true)
    setResultsOwner('share-post')
    try {
      const res = await window.electronAPI.facebookSharePost({ sessionId, postUrl: sharePostUrl, groups })
      if (res.success) { showMsg(`تمت المشاركة في ${((res.data as any[]) || []).length} مجموعة`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleAutoReply = async () => {
    if (!ensureSession()) return
    if (!replyPostUrl || !replyText) { showMsg('أدخل رابط المنشور ونص الرد', true); return }
    setLoading(true)
    setResultsOwner('auto-reply')
    try {
      const res = await window.electronAPI.facebookAutoReply({ sessionId, postUrl: replyPostUrl, replyText, limit: replyLimit })
      if (res.success) { showMsg(`تم الرد على ${res.count || 0} تعليق`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleSendMessages = async () => {
    if (!ensureSession()) return
    if (!recipientsText || !broadcastMessage) { showMsg('يرجى إدخال المستلمين والرسالة', true); return }
    setLoading(true)
    setResultsOwner('send-messages')
    const recipients = recipientsText.split('\n').filter(r => r.trim())
    try {
      const res = await window.electronAPI.facebookSendMessages({ sessionId, recipients, message: broadcastMessage })
      if (res.success) { const sent = ((res.data as any[]) || []).filter((r: any) => r.status === 'sent').length; showMsg(`تم إرسال ${sent} من ${recipients.length} رسالة`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشل الإرسال', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الإرسال', true) }
    setLoading(false)
  }

  const handleMention = async () => {
    if (!ensureSession()) return
    const urls = mentionUrls.split('\n').map(s => s.trim()).filter(Boolean)
    const names = mentionUsernames.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط المنشورات', true); return }
    if (names.length === 0) { showMsg('أدخل أسماء المستخدمين للمنشن', true); return }
    setLoading(true)
    setResultsOwner('mention')
    try {
      const res = await window.electronAPI.facebookMention({ sessionId, postUrls: urls, usernames: names, text: mentionText })
      if (res.success) { showMsg(`تم منشن ${res.count || 0} مستخدم`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleFriendRequests = async () => {
    if (!ensureSession()) return
    const urls = friendRequestUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط الحسابات', true); return }
    setLoading(true)
    setResultsOwner('friend-requests')
    try {
      const res = await window.electronAPI.facebookSendFriendRequests({ sessionId, profileUrls: urls })
      if (res.success) { const sent = ((res.data as any[]) || []).filter((r: any) => r.status === 'sent').length; showMsg(`تم إرسال ${sent} طلب صداقة من ${urls.length}`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleDeleteFriends = async () => {
    if (!ensureSession()) return
    if (deleteFriendsMode === 'all' && !confirm('هل أنت متأكد من حذف الأصدقاء؟ هذا الإجراء لا يمكن التراجع عنه.')) return
    setLoading(true)
    setResultsOwner('delete-friends')
    try {
      const friendUrls = deleteFriendsUrls.split('\n').map(s => s.trim()).filter(Boolean)
      const res = await window.electronAPI.facebookDeleteFriends({
        sessionId,
        limit: deleteFriendsLimit,
        deleteAll: deleteFriendsMode === 'all',
        friendUrls: deleteFriendsMode === 'selected' ? friendUrls : []
      })
      if (res.success) { showMsg(`تم حذف ${res.count || 0} صديق`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleAddToGroupChat = async () => {
    if (!ensureSession()) return
    if (!groupChatUrl || !addUsernames.trim()) { showMsg('أدخل رابط المجموعة وأسماء المستخدمين', true); return }
    setLoading(true)
    setResultsOwner('add-to-group-chat')
    const usernames = addUsernames.split('\n').map(s => s.trim()).filter(Boolean)
    try {
      const res = await window.electronAPI.facebookAddToGroupChat({ sessionId, groupChatUrl, usernames })
      if (res.success) { const added = ((res.data as any[]) || []).filter((r: any) => r.status === 'added').length; showMsg(`تم إضافة ${added} من ${usernames.length} عضو`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleSendPageMessages = async () => {
    if (!ensureSession()) return
    if (!sendPageUrls || !sendPageMessage) { showMsg('أدخل روابط الصفحات والرسالة', true); return }
    setLoading(true)
    setResultsOwner('send-page-messages')
    const pageUrls = sendPageUrls.split('\n').map(s => s.trim()).filter(Boolean)
    try {
      const res = await window.electronAPI.facebookSendPageMessages({ sessionId, pageUrls, message: sendPageMessage })
      if (res.success) { const sent = ((res.data as any[]) || []).filter((r: any) => r.status === 'sent').length; showMsg(`تم إرسال ${sent} من ${pageUrls.length} رسالة`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleInteractionFarm = async () => {
    if (!ensureSession()) return
    const urls = interactionUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط المنشورات', true); return }
    setLoading(true)
    setResultsOwner('interaction-farm')
    try {
      const res = await window.electronAPI.facebookInteractionFarm({ sessionId, postUrls: urls, action: interactionAction })
      if (res.success) { showMsg(`تم التفاعل مع ${res.count || 0} منشور`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleDeletePosts = async () => {
    if (!ensureSession()) return
    if (!confirm('هل أنت متأكد من حذف المنشورات؟ هذا الإجراء لا يمكن التراجع عنه.')) return
    setLoading(true)
    setResultsOwner('delete-posts')
    try {
      const res = await window.electronAPI.facebookDeletePosts({ sessionId, limit: deletePostsLimit })
      if (res.success) { showMsg(`تم حذف ${res.count || 0} منشور`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleAnalyzeGroup = async () => {
    if (!ensureSession()) return
    if (!analyzeGroupUrl) { showMsg('أدخل رابط المجموعة', true); return }
    setLoading(true)
    setResultsOwner('analyze-group')
    try {
      const res = await window.electronAPI.facebookAnalyzeGroup({ sessionId, groupUrl: analyzeGroupUrl })
      if (res.success) { setToolResults(res.data ? [res.data] : []); showMsg('تم تحليل المجموعة بنجاح') }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleUsersToIds = async () => {
    if (!ensureSession()) return
    const usernames = usersToIds.split('\n').map(s => s.trim()).filter(Boolean)
    if (usernames.length === 0) { showMsg('أدخل أسماء المستخدمين', true); return }
    setLoading(true)
    setResultsOwner('users-to-ids')
    try {
      const res = await window.electronAPI.facebookUsersToIds({ sessionId, usernames })
      if (res.success) { showMsg(`تم تحويل ${res.count || 0} مستخدم`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleLinksToIds = async () => {
    if (!ensureSession()) return
    const links = linksToIds.split('\n').map(s => s.trim()).filter(Boolean)
    if (links.length === 0) { showMsg('أدخل الروابط', true); return }
    setLoading(true)
    setResultsOwner('links-to-ids')
    try {
      const res = await window.electronAPI.facebookLinksToIds({ sessionId, links })
      if (res.success) { showMsg(`تم تحويل ${res.count || 0} رابط`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  // ---- New tool handlers (Phase: Facebook completion) ----
  const handleSearchPages = async () => {
    if (!ensureSession()) return
    if (!pagesSearchQuery.trim()) { showMsg('أدخل الكلمة المفتاحية', true); return }
    setLoading(true)
    setResultsOwner('search-pages')
    setToolResults([])
    try {
      const res = await window.electronAPI.facebookSearchPages({ sessionId, query: pagesSearchQuery.trim(), location: pagesSearchLocation.trim() || undefined, limit: pagesSearchLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم العثور على ${res.count || items.length} صفحة`)
        await loadResults()
      } else {
        showMsg(res.error || 'فشل البحث', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleLikePages = async () => {
    if (!ensureSession()) return
    const urls = likePagesUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط الصفحات', true); return }
    setLoading(true)
    setResultsOwner('like-pages')
    setToolResults([])
    try {
      const res = await window.electronAPI.facebookLikePages({ sessionId, pageUrls: urls, delayMs: Math.max(2, likePagesDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'liked').length
        showMsg(`تم الإعجاب بـ ${ok} من ${urls.length} صفحة`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleExtractSharers = async () => {
    if (!ensureSession()) return
    if (!sharersPostUrl.trim()) { showMsg('أدخل رابط المنشور', true); return }
    setLoading(true)
    setResultsOwner('extract-sharers')
    setToolResults([])
    try {
      const res = await window.electronAPI.facebookExtractSharers({ sessionId, postUrl: sharersPostUrl.trim(), limit: sharersLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم استخراج ${res.count || items.length} مشارك`)
        await loadResults()
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleInviteFriends = async () => {
    if (!ensureSession()) return
    if (!invitePageUrl.trim()) { showMsg('أدخل رابط الصفحة', true); return }
    setLoading(true)
    try {
      const usernames = inviteUsernames.split('\n').map(s => s.trim()).filter(Boolean)
      const res = await window.electronAPI.facebookInviteFriends({
        sessionId, pageUrl: invitePageUrl.trim(),
        usernames: inviteAll ? undefined : usernames,
        inviteAll: inviteAll,
      })
      if (res.success) {
        showMsg('تم إرسال الدعوات بنجاح')
      } else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleCommentOnPages = async () => {
    if (!ensureSession()) return
    const urls = commentPagesUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط الصفحات', true); return }
    if (!commentPagesText.trim()) { showMsg('أدخل نص التعليق', true); return }
    setLoading(true)
    setResultsOwner('comment-on-pages')
    setToolResults([])
    try {
      const res = await window.electronAPI.facebookCommentOnPages({ sessionId, pageUrls: urls, commentText: commentPagesText, delayMs: Math.max(2, commentPagesDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'commented').length
        showMsg(`تم التعليق على ${ok} من ${urls.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleCommentOnPosts = async () => {
    if (!ensureSession()) return
    const urls = commentPostsUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط المنشورات', true); return }
    if (!commentPostsText.trim()) { showMsg('أدخل نص التعليق', true); return }
    setLoading(true)
    setResultsOwner('comment-on-posts')
    setToolResults([])
    try {
      const res = await window.electronAPI.facebookCommentOnPosts({ sessionId, postUrls: urls, commentText: commentPostsText, delayMs: Math.max(2, commentPostsDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'commented').length
        showMsg(`تم التعليق على ${ok} من ${urls.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handlePickImages = () => imagePostInputRef.current?.click()
  const handleImagesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const paths = Array.from(files).map(f => (f as any).path).filter(Boolean).slice(0, 3)
    setImagePostPaths(paths)
    if (imagePostInputRef.current) imagePostInputRef.current.value = ''
  }
  const handlePostWithImages = async () => {
    if (!ensureSession()) return
    const groups = imagePostGroups.split('\n').map(s => s.trim()).filter(Boolean)
    if (groups.length === 0) { showMsg('أدخل روابط المجموعات', true); return }
    if (!imagePostMessage.trim() && imagePostPaths.length === 0) { showMsg('أدخل نص أو صور على الأقل', true); return }
    setLoading(true)
    setResultsOwner('post-with-images')
    setToolResults([])
    try {
      const res = await window.electronAPI.facebookPostWithImages({ sessionId, groups, message: imagePostMessage, imagePaths: imagePostPaths, delayMs: Math.max(3, imagePostDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const ok = items.filter((r: any) => r.status === 'posted').length
        showMsg(`تم النشر في ${ok} من ${groups.length} مجموعة`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleDemographicsAnalyze = async () => {
    if (!demoInputJson.trim() && toolResults.length === 0) {
      showMsg('استخدم نتائج أداة استخراج موجودة، أو الصق JSON', true); return
    }
    setLoading(true)
    setDemoResult(null)
    try {
      let items: any[] = []
      if (demoInputJson.trim()) {
        try { items = JSON.parse(demoInputJson) } catch { items = [] }
        if (!Array.isArray(items)) items = [items]
      } else {
        items = toolResults
      }
      const res = await window.electronAPI.facebookDemographicsAnalyze({ items })
      if (res.success) {
        setDemoResult(res.data)
        showMsg(`تم تحليل ${res.data?.total ?? items.length} نتيجة`)
      } else showMsg(res.error || 'فشل التحليل', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleDetectOpenGroups = async () => {
    if (!ensureSession()) return
    const urls = openGroupsUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط المجموعات', true); return }
    setLoading(true)
    setResultsOwner('detect-open-groups')
    setToolResults([])
    try {
      const res = await window.electronAPI.facebookDetectOpenGroups({ sessionId, groupUrls: urls, delayMs: Math.max(2, openGroupsDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const open = items.filter((r: any) => r.status === 'open').length
        showMsg(`${open} مفتوحة للنشر من أصل ${urls.length}`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleExtractActiveFriends = async () => {
    if (!ensureSession()) return
    setLoading(true)
    setResultsOwner('extract-active-friends')
    setToolResults([])
    try {
      const res = await window.electronAPI.facebookExtractActiveFriends({ sessionId, limit: activeFriendsLimit, activeDays: activeFriendsDays })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم العثور على ${res.count || items.length} صديق نشط`)
        await loadResults()
      } else {
        showMsg(res.error || 'فشل الاستخراج', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handlePageSendMessages = async () => {
    if (!ensureSession()) return
    if (!pageMsgUrl || !pageMsgRecipients || !pageMsgText) { showMsg('أدخل رابط الصفحة والمستلمين والرسالة', true); return }
    setLoading(true)
    setResultsOwner('page-send-messages')
    const recipients = pageMsgRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    try {
      const res = await window.electronAPI.facebookPageSendMessages({ sessionId, pageUrl: pageMsgUrl, recipients, message: pageMsgText })
      if (res.success) {
        const sent = ((res.data as any[]) || []).filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال ${sent} من ${recipients.length} رسالة`)
        setToolResults((res.data as any[]) || [])
      } else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const extractTools = [
    { id: 'post-likers', name: 'معجبين المنشور', icon: Heart, needsUrl: true, urlLabel: 'رابط المنشور' },
    { id: 'post-comments', name: 'تعليقات المنشور', icon: MessageSquare, needsUrl: true, urlLabel: 'رابط المنشور' },
    { id: 'group-members', name: 'أعضاء المجموعة', icon: Users, needsUrl: true, urlLabel: 'رابط المجموعة' },
    { id: 'friends', name: 'الأصدقاء', icon: UserPlus, needsUrl: false },
    { id: 'page-followers', name: 'متابعين الصفحة', icon: Users, needsUrl: true, urlLabel: 'رابط الصفحة' },
    { id: 'page-messengers', name: 'مراسلين الصفحة', icon: Send, needsUrl: true, urlLabel: 'رابط الصفحة' },
    { id: 'profile-messengers', name: 'مراسلين الملف الشخصي', icon: Send, needsUrl: false },
    { id: 'reviews', name: 'تقييمات الصفحة', icon: BarChart3, needsUrl: true, urlLabel: 'رابط الصفحة' },
    { id: 'phone-numbers', name: 'أرقام الهاتف', icon: Globe, needsUrl: true, urlLabel: 'رابط المنشور' },
    { id: 'search-groups', name: 'البحث عن مجموعات', icon: Search, needsUrl: false },
    { id: 'my-groups', name: 'استخراج مجموعاتي', icon: Users, needsUrl: false },
    { id: 'join-groups', name: 'الانضمام لمجموعات', icon: Users, needsUrl: true, urlLabel: 'روابط المجموعات' },
  ]

  type ToolDef = {
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: typeof Download
    accent: string
    accentGradient: string
  }

  const extractCategoryTools: ToolDef[] = [
    { id: 'extract', name: 'استخراج البيانات', description: 'متابعين، تعليقات، مجموعات، أرقام، تقييمات', icon: Download, accent: '#0A6CF1', accentGradient: 'linear-gradient(135deg, #0A6CF1, #1d4ed8)' },
    { id: 'search-pages', name: 'البحث عن الصفحات', description: 'بحث متقدم + استهداف بالموقع', icon: Search, accent: '#06b6d4', accentGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)' },
    { id: 'extract-sharers', name: 'استخراج المشاركين', description: 'العملاء الذين شاركوا المنشور', icon: Share2, accent: '#f43f5e', accentGradient: 'linear-gradient(135deg, #f43f5e, #be123c)' },
    { id: 'detect-open-groups', name: 'كشف المجموعات المفتوحة', description: 'فحص قبول النشر بدون موافقة', icon: ShieldCheck, accent: '#84cc16', accentGradient: 'linear-gradient(135deg, #84cc16, #4d7c0f)' },
  ]

  const marketingTools: ToolDef[] = [
    { id: 'post-to-groups', name: 'النشر في المجموعات', description: 'نشر منشور في عدة مجموعات', icon: Megaphone, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)' },
    { id: 'post-with-images', name: 'النشر بنص + صور', description: 'نشر بنص و3 صور وروابط للمجموعات', icon: ImageIcon, accent: '#ec4899', accentGradient: 'linear-gradient(135deg, #ec4899, #be185d)' },
    { id: 'share-post', name: 'مشاركة منشور', description: 'مشاركة منشور في مجموعات متعددة', icon: Share2, accent: '#3b82f6', accentGradient: 'linear-gradient(135deg, #3b82f6, #1e40af)' },
    { id: 'auto-reply', name: 'رد تلقائي', description: 'الرد على التعليقات تلقائياً', icon: Bot, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' },
    { id: 'mention', name: 'منشن جماعي', description: 'منشن مستخدمين في عدة منشورات', icon: AtSign, accent: '#f97316', accentGradient: 'linear-gradient(135deg, #f97316, #c2410c)' },
    { id: 'like-pages', name: 'متابعة جماعية للصفحات', description: 'متابعة قائمة صفحات', icon: ThumbsUp, accent: '#22c55e', accentGradient: 'linear-gradient(135deg, #22c55e, #15803d)' },
    { id: 'comment-on-pages', name: 'تعليقات على الصفحات', description: 'تعليق على آخر منشور لقائمة صفحات', icon: MessageSquare, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)' },
    { id: 'comment-on-posts', name: 'تعليقات على المنشورات', description: 'تعليق على قائمة روابط منشورات', icon: MessageSquare, accent: '#6366f1', accentGradient: 'linear-gradient(135deg, #6366f1, #4338ca)' },
    { id: 'invite-friends', name: 'دعوة الأصدقاء', description: 'دعوة الأصدقاء للإعجاب بصفحة', icon: UserPlus, accent: '#eab308', accentGradient: 'linear-gradient(135deg, #eab308, #a16207)' },
  ]

  const messagingTools: ToolDef[] = [
    { id: 'send-messages', name: 'رسائل من الملف الشخصي', description: 'إرسال رسائل مباشرة للأشخاص', icon: Send, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)' },
    { id: 'page-send-messages', name: 'رسائل من الصفحة', description: 'إرسال رسائل من صفحتك للمتابعين', icon: Megaphone, accent: '#0891b2', accentGradient: 'linear-gradient(135deg, #0891b2, #155e75)' },
  ]

  const advancedTools: ToolDef[] = [
    { id: 'friend-requests', name: 'إرسال طلبات صداقة', description: 'طلبات صداقة لقائمة حسابات', icon: UserPlus, accent: '#22c55e', accentGradient: 'linear-gradient(135deg, #22c55e, #15803d)' },
    { id: 'delete-friends', name: 'حذف الأصدقاء', description: 'حذف أصدقاء حسب قائمة أو حد', icon: Users, accent: '#ef4444', accentGradient: 'linear-gradient(135deg, #ef4444, #b91c1c)' },
    { id: 'interaction-farm', name: 'مزرعة التفاعل', description: 'إعجاب/تعليق على منشورات', icon: ThumbsUp, accent: '#a855f7', accentGradient: 'linear-gradient(135deg, #a855f7, #7e22ce)' },
    { id: 'delete-posts', name: 'حذف المنشورات', description: 'حذف منشوراتك القديمة', icon: Trash2, accent: '#dc2626', accentGradient: 'linear-gradient(135deg, #dc2626, #991b1b)' },
    { id: 'analyze-group', name: 'تحليل مجموعة', description: 'استخراج بيانات وإحصائيات مجموعة', icon: BarChart3, accent: '#6366f1', accentGradient: 'linear-gradient(135deg, #6366f1, #4338ca)' },
    { id: 'add-to-group-chat', name: 'إضافة لمجموعة شات', description: 'إضافة عملاء لمجموعة محادثة', icon: UserPlus, accent: '#ec4899', accentGradient: 'linear-gradient(135deg, #ec4899, #be185d)' },
    { id: 'send-page-messages', name: 'إرسال للصفحات العامة', description: 'إرسال رسائل لصفحات لست أدمناً فيها', icon: Send, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    { id: 'users-to-ids', name: 'تحويل Users إلى IDs', description: 'استخراج معرفات حسابات', icon: Copy, accent: '#14b8a6', accentGradient: 'linear-gradient(135deg, #14b8a6, #0f766e)' },
    { id: 'links-to-ids', name: 'تحويل روابط إلى IDs', description: 'استخراج معرفات من روابط', icon: FileText, accent: '#eab308', accentGradient: 'linear-gradient(135deg, #eab308, #a16207)' },
  ]

  const allTools = [...extractCategoryTools, ...marketingTools, ...messagingTools, ...advancedTools]
  const currentTool = allTools.find(t => t.id === activeTool) ?? null

  // ---- Session card ----
  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(24,119,242,0.06), rgba(8,102,255,0.04))',
        border: '1px solid rgba(24,119,242,0.18)',
        boxShadow: '0 4px 20px rgba(24,119,242,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(24,119,242,0.3)' }}
          >
            <FacebookIcon size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">Facebook</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: sessionId ? '#22c55e' : '#94a3b8', boxShadow: sessionId ? '0 0 8px rgba(34,197,94,0.6)' : 'none' }} />
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
            <button onClick={clearSession} className="btn-secondary text-xs"><LogOut size={14} /> إنهاء الجلسة</button>
          ) : (
            <button onClick={() => setShowLoginPanel(true)} className="btn-primary text-sm" style={{ background: ACCENT_GRADIENT }}><LogIn size={16} /> تسجيل الدخول</button>
          )}
        </div>
      </div>
      {fbAccounts.length > 0 && !sessionId && (
        <div className="px-5 py-3 border-t flex items-center gap-3 flex-wrap" style={{ borderColor: 'rgba(24,119,242,0.12)', background: 'var(--panel-bg)' }}>
          <span className="text-xs font-semibold text-secondary-600 shrink-0">حسابات محفوظة:</span>
          <select
            className="select-field flex-1 min-w-[200px] max-w-xs text-sm py-2"
            value={selectedAccountId}
            onChange={e => {
              const id = e.target.value; setSelectedAccountId(id)
              const acc = fbAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) {
                setLoginForm({ ...loginForm, email: acc.username, password: acc.password || '' })
                if (!acc.password?.trim()) { setShowLoginPanel(true); setTimeout(() => passwordRef.current?.focus(), 200) }
              }
            }}
          >
            <option value="">-- اختر حساب --</option>
            {fbAccounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}</option>
            ))}
          </select>
          {selectedAccountId && (
            <button onClick={() => { const acc = fbAccounts.find(a => a.id.toString() === selectedAccountId); if (acc) handleLoginWithAccount(acc) }} disabled={loading} className="btn-success text-xs">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <><LogIn size={14} /> دخول</>}
            </button>
          )}
        </div>
      )}
    </div>
  )

  // ---- Login panel content ----
  const renderLoginPanelContent = () => (
    <div className="space-y-5">
      {sessionId && (
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <div className="flex items-center gap-2"><CheckCircle size={18} className="text-success-600" /><p className="font-semibold text-success-700 text-sm">جلسة نشطة — يمكنك استخدام جميع الأدوات</p></div>
        </div>
      )}
      <div>
        <label className="label-field">البريد الإلكتروني</label>
        <input type="email" className="input-field" placeholder="example@email.com" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} />
      </div>
      <div>
        <label className="label-field">كلمة المرور</label>
        <div className="relative">
          <input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
        </div>
      </div>
      <div>
        <label className="label-field">بروكسي (اختياري)</label>
        <input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} />
      </div>
      {accounts.length > 0 && (
        <div>
          <h4 className="font-bold text-secondary-900 text-sm mb-3">الحسابات المحفوظة على الجهاز</h4>
          <div className="space-y-2 max-h-[280px] overflow-y-auto scroll-container pr-1">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300 text-sm font-bold shrink-0">{(acc.username || '?')[0].toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 text-sm truncate">{acc.username}</p>
                    <p className="text-[11px] text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}{acc.password?.trim() ? ' • باسورد محفوظ' : ' • بدون باسورد'}</p>
                  </div>
                </div>
                <span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{acc.status === 'active' ? 'نشط' : 'غير نشط'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const loginFooter = (
    <button onClick={handleLogin} disabled={loading || !loginForm.email || !loginForm.password} className="btn-primary w-full disabled:opacity-50" style={{ background: ACCENT_GRADIENT }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}
    </button>
  )

  // ---- Shared results table ----
  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string, variant: 'extract' | 'simple' | 'detailed' | 'recipient' = 'simple') => {
    if (resultsOwner !== owner) return null
    const displayResults = toolResults.length > 0 ? toolResults : results
    const list = streamResults.length > 0 ? streamResults : displayResults
    if (list.length === 0) return null
    return (
      <div className="mt-5 rounded-xl border border-secondary-200 bg-white/[0.04] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
          <h4 className="font-bold text-secondary-900 text-sm">النتائج ({list.length})</h4>
          <div className="flex gap-2">
            <button onClick={() => handleExport(columns, exportKey, toolResults)} className="btn-success text-xs"><FileSpreadsheet size={14} /> تصدير CSV</button>
            <button onClick={handleClearResults} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
          </div>
        </div>
        <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {list.map((r: any, i: number) => {
                if (variant === 'extract') {
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
                      <td className="text-xs font-mono text-primary-600">{userId}</td>
                      <td className="text-xs max-w-[150px] truncate">{profile !== '-' ? <a href={profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{profile.substring(0, 40)}...</a> : '-'}</td>
                      <td className="text-xs">{phone}</td>
                      <td className="text-xs max-w-[150px] truncate">{text}</td>
                      <td className="text-xs">{source}</td>
                    </tr>
                  )
                }
                if (variant === 'recipient') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.recipient || r.name || '-'}</td>
                      <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (variant === 'detailed') {
                  const userId = r.userId || r.id || r.username || '-'
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium text-sm">{r.name || r.recipient || r.group || '-'}</td>
                      <td className="text-xs font-mono text-primary-600">{userId}</td>
                      <td className="text-xs max-w-[150px] truncate">{r.profile || r.url || r.link || '-'}</td>
                      <td className="text-xs">{r.phone || '-'}</td>
                      <td><span className={`badge ${r.status === 'found' || r.status === 'sent' || r.status === 'liked' || r.status === 'loved' || r.status === 'shared' || r.status === 'posted' || r.status === 'replied' || r.status === 'mentioned' || r.status === 'deleted' ? 'badge-success' : r.status === 'not_found' || r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                    </tr>
                  )
                }
                // simple variant
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="text-xs max-w-[300px] truncate">{r.group || r.url || r.name || r.recipient || JSON.stringify(r).substring(0, 80)}</td>
                    <td><span className={`badge ${r.status === 'posted' || r.status === 'sent' || r.status === 'replied' || r.status === 'shared' || r.status === 'liked' || r.status === 'mentioned' || r.status === 'added' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ---- Tool bodies ----
  const renderExtractBody = () => {
    const selectedTool = extractTools.find(t => t.id === extractType)
    return (
      <div className="space-y-5">
        <AccountSelector
          platformId="facebook"
          accounts={allAccounts}
          cycleActive={cycleActive}
          cycleProgress={cycleProgress}
          onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
          onStopCycle={stopCycle}
          extractTask={{ type: 'extract', params: { extractType, postUrl: extractUrl, groupUrl: extractUrl, pageUrl: extractUrl, url: extractUrl, searchType, query: searchQuery, limit: extractLimit } }}
          sendTask={{ type: 'send', params: { recipients: recipientsText.split('\n').filter(Boolean), message: broadcastMessage } }}
        />

        <div>
          <label className="label-field">نوع الاستخراج</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
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
                    background: isSel ? 'rgba(10,108,241,0.08)' : 'var(--panel-bg)',
                    borderColor: isSel ? '#0A6CF1' : 'rgba(255,255,255,0.08)',
                    color: isSel ? '#0A6CF1' : '#475569',
                    boxShadow: isSel ? '0 0 0 2px rgba(10,108,241,0.15)' : 'none',
                  }}
                >
                  <ToolIcon size={16} />
                  <span className="text-xs">{t.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {extractType !== 'friends' && extractType !== 'profile-messengers' && extractType !== 'search-groups' && extractType !== 'page-messengers' && extractType !== 'reviews' && extractType !== 'join-groups' && (
          <div>
            <label className="label-field">{selectedTool?.urlLabel || 'الرابط'}</label>
            <input type="url" className="input-field" placeholder="https://facebook.com/..." value={extractUrl} onChange={e => setExtractUrl(e.target.value)} />
          </div>
        )}
        {extractType === 'page-messengers' && (
          <div>
            <label className="label-field">رابط الصفحة (يجب أن تكون أدمن)</label>
            <input type="url" className="input-field" placeholder="https://facebook.com/your-page" value={pageMessengerUrl} onChange={e => setPageMessengerUrl(e.target.value)} />
          </div>
        )}
        {extractType === 'profile-messengers' && (
          <div>
            <label className="label-field">عدد المراسلين: {profileMessengerLimit}</label>
            <input type="range" min="10" max="500" value={profileMessengerLimit} onChange={e => setProfileMessengerLimit(parseInt(e.target.value))} className="w-full accent-blue-600" />
          </div>
        )}
        {extractType === 'reviews' && (
          <div>
            <label className="label-field">رابط الصفحة</label>
            <input type="url" className="input-field" placeholder="https://facebook.com/your-page" value={reviewPageUrl} onChange={e => setReviewPageUrl(e.target.value)} />
          </div>
        )}
        {extractType === 'search-groups' && (
          <div>
            <label className="label-field">كلمة البحث عن المجموعات</label>
            <input type="text" className="input-field" placeholder="تسويق، أعمال..." value={searchGroupQuery} onChange={e => setSearchGroupQuery(e.target.value)} />
          </div>
        )}
        {extractType === 'join-groups' && (
          <div>
            <label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label>
            <textarea className="textarea-field" rows={4} value={joinGroupUrls} onChange={e => setJoinGroupUrls(e.target.value)} placeholder="https://facebook.com/groups/...&#10;https://facebook.com/groups/..." />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">الحد الأقصى للنتائج: {extractLimit}</label>
            <input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-blue-600" />
          </div>
          <div>
            <label className="label-field">تأخير الصفحات (ms): {delayMs}</label>
            <input type="range" min="500" max="5000" step="100" value={delayMs} onChange={e => setDelayMs(parseInt(e.target.value))} className="w-full accent-indigo-500" />
          </div>
        </div>
        <p className="text-[11px] text-secondary-400 -mt-2">تأخير أكبر = أمان أكثر ضد الحظر</p>

        {extracting && (
          <div className="flex items-center gap-2 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <Loader2 size={16} className="animate-spin text-blue-600" />
            <span className="text-blue-300 text-sm font-medium">جاري الاستخراج... {streamResults.length} نتيجة حتى الآن</span>
          </div>
        )}

        <div className="border-t border-secondary-100 pt-4 mt-2">
          <h4 className="font-bold text-secondary-900 text-sm mb-3 flex items-center gap-2"><Search size={16} /> بحث متقدم</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <input type="text" className="input-field" placeholder="ابحث عن صفحات أو أشخاص أو مجموعات..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div>
              <select className="select-field" value={searchType} onChange={e => setSearchType(e.target.value)}>
                <option value="pages">الصفحات</option>
                <option value="people">الأشخاص</option>
                <option value="groups">المجموعات</option>
              </select>
            </div>
          </div>
          <button onClick={handleSearch} disabled={loading || extracting || !searchQuery} className="btn-secondary mt-2 text-sm"><Search size={16} /> بحث</button>
        </div>

        {renderResultsTable('extract', ['#', 'الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'النص', 'المصدر'], 'facebook-extract', 'extract')}
      </div>
    )
  }
  const extractFooter = (
    <div className="flex gap-2">
      <button onClick={handleExtract} disabled={extracting} className="btn-primary flex-1" style={{ background: 'linear-gradient(135deg, #0A6CF1, #1d4ed8)' }}>
        {extracting ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}
      </button>
      {extracting && (<button onClick={stopExtraction} className="btn-danger"><Square size={18} /> إيقاف</button>)}
    </div>
  )

  const renderPostToGroupsBody = () => (
    <div className="space-y-4">
      <div><label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label><textarea className="textarea-field" rows={5} value={groupUrls} onChange={e => setGroupUrls(e.target.value)} placeholder="https://facebook.com/groups/..." /></div>
      <div><label className="label-field">نص المنشور</label><textarea className="textarea-field" rows={5} value={postMessage} onChange={e => setPostMessage(e.target.value)} placeholder="اكتب منشورك هنا..." /></div>
      {renderResultsTable('post-to-groups', ['#', 'المجموعة', 'الحالة'], 'facebook-post-to-groups', 'simple')}
    </div>
  )
  const postToGroupsFooter = (<button onClick={handlePostToGroups} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Megaphone size={18} /> نشر في المجموعات</>}</button>)

  const renderSharePostBody = () => (
    <div className="space-y-4">
      <div><label className="label-field">رابط المنشور</label><input type="url" className="input-field" placeholder="https://facebook.com/.../posts/..." value={sharePostUrl} onChange={e => setSharePostUrl(e.target.value)} /></div>
      <div><label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label><textarea className="textarea-field" rows={5} value={shareGroupUrls} onChange={e => setShareGroupUrls(e.target.value)} placeholder="https://facebook.com/groups/..." /></div>
      {renderResultsTable('share-post', ['#', 'المجموعة', 'الحالة'], 'facebook-share-post', 'simple')}
    </div>
  )
  const sharePostFooter = (<button onClick={handleSharePost} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Share2 size={18} /> مشاركة</>}</button>)

  const renderAutoReplyBody = () => (
    <div className="space-y-4">
      <p className="text-xs text-secondary-500 bg-secondary-50 p-3 rounded-lg">آلية العمل: ينتقل لرابط المنشور، يمرر على التعليقات واحداً تلو الآخر، يضغط على زر "رد" ويكتب الرد تلقائياً</p>
      <div><label className="label-field">رابط المنشور</label><input type="url" className="input-field" placeholder="https://facebook.com/.../posts/..." value={replyPostUrl} onChange={e => setReplyPostUrl(e.target.value)} /></div>
      <div><label className="label-field">نص الرد</label><textarea className="textarea-field" rows={3} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="اكتب ردك التلقائي..." /></div>
      <div><label className="label-field">عدد التعليقات: {replyLimit}</label><input type="range" min="1" max="50" value={replyLimit} onChange={e => setReplyLimit(parseInt(e.target.value))} className="w-full accent-purple-600" /></div>
      {renderResultsTable('auto-reply', ['#', 'التفاصيل', 'الحالة'], 'facebook-auto-reply', 'simple')}
    </div>
  )
  const autoReplyFooter = (<button onClick={handleAutoReply} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Bot size={18} /> بدء الرد التلقائي</>}</button>)

  const renderMentionBody = () => (
    <div className="space-y-4">
      <p className="text-xs text-secondary-500 bg-secondary-50 p-3 rounded-lg">آلية العمل: ينتقل لكل منشور، يكتب تعليق فيه @اسم_المستخدم لكل شخص في القائمة</p>
      <div><label className="label-field">روابط المنشورات (سطر لكل منشور)</label><textarea className="textarea-field" rows={3} value={mentionUrls} onChange={e => setMentionUrls(e.target.value)} placeholder="https://facebook.com/.../posts/..." /></div>
      <div><label className="label-field">أسماء المستخدمين للمنشن (سطر لكل اسم)</label><textarea className="textarea-field" rows={3} value={mentionUsernames} onChange={e => setMentionUsernames(e.target.value)} placeholder="username1&#10;user2&#10;@user3" /></div>
      <div><label className="label-field">نص التعليق (اختياري)</label><textarea className="textarea-field" rows={2} value={mentionText} onChange={e => setMentionText(e.target.value)} placeholder="...تعليقك مع المنشن" /></div>
      {renderResultsTable('mention', ['#', 'التفاصيل', 'الحالة'], 'facebook-mention', 'simple')}
    </div>
  )
  const mentionFooter = (<button onClick={handleMention} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #f97316, #c2410c)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> بدء المنشن</>}</button>)

  const renderSendMessagesBody = () => (
    <div className="space-y-4">
      <div><label className="label-field">قائمة المستلمين (اسم مستخدم أو ID - سطر لكل مستلم)</label><textarea className="textarea-field" rows={5} value={recipientsText} onChange={e => setRecipientsText(e.target.value)} placeholder="user1&#10;user2&#10;1000123456789" /></div>
      <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={5} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." /></div>
      {renderResultsTable('send-messages', ['#', 'المستلم', 'الحالة', 'خطأ'], 'facebook-messages', 'recipient')}
    </div>
  )
  const sendMessagesFooter = (<button onClick={handleSendMessages} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال الرسائل</>}</button>)

  const renderPageSendMessagesBody = () => (
    <div className="space-y-4">
      <p className="text-xs text-secondary-500 bg-secondary-50 p-3 rounded-lg">يجب أن تكون أدمن في الصفحة. سيتم التبديل للصفحة تلقائياً قبل الإرسال.</p>
      <div><label className="label-field">رابط الصفحة</label><input type="url" className="input-field" placeholder="https://facebook.com/your-page" value={pageMsgUrl} onChange={e => setPageMsgUrl(e.target.value)} /></div>
      <div><label className="label-field">قائمة المستلمين (سطر لكل مستلم)</label><textarea className="textarea-field" rows={4} value={pageMsgRecipients} onChange={e => setPageMsgRecipients(e.target.value)} placeholder="user1&#10;user2" /></div>
      <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={4} value={pageMsgText} onChange={e => setPageMsgText(e.target.value)} placeholder="اكتب رسالتك هنا..." /></div>
      {renderResultsTable('page-send-messages', ['#', 'المستلم', 'الحالة', 'خطأ'], 'facebook-page-messages', 'recipient')}
    </div>
  )
  const pageSendMessagesFooter = (<button onClick={handlePageSendMessages} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #0891b2, #155e75)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Megaphone size={18} /> إرسال من الصفحة</>}</button>)

  const renderFriendRequestsBody = () => (
    <div className="space-y-4">
      <div><label className="label-field">روابط الحسابات (سطر لكل رابط)</label><textarea className="textarea-field" rows={6} value={friendRequestUrls} onChange={e => setFriendRequestUrls(e.target.value)} placeholder="https://facebook.com/username1&#10;https://facebook.com/username2" /></div>
      {renderResultsTable('friend-requests', ['#', 'التفاصيل', 'الحالة'], 'facebook-friend-requests', 'simple')}
    </div>
  )
  const friendRequestsFooter = (<button onClick={handleFriendRequests} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> إرسال الطلبات</>}</button>)

  const renderDeleteFriendsBody = () => (
    <div className="space-y-4">
      <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle size={16} /> تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="deleteMode" checked={deleteFriendsMode === 'all'} onChange={() => setDeleteFriendsMode('all')} className="w-4 h-4 accent-red-600" /><span className="text-sm">حذف الكل</span></label>
        <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="deleteMode" checked={deleteFriendsMode === 'selected'} onChange={() => setDeleteFriendsMode('selected')} className="w-4 h-4 accent-red-600" /><span className="text-sm">تحديد أصدقاء</span></label>
      </div>
      {deleteFriendsMode === 'all' && (
        <div><label className="label-field">عدد الأصدقاء: {deleteFriendsLimit}</label><input type="range" min="5" max="200" value={deleteFriendsLimit} onChange={e => setDeleteFriendsLimit(parseInt(e.target.value))} className="w-full accent-red-600" /></div>
      )}
      {deleteFriendsMode === 'selected' && (
        <div><label className="label-field">روابط الأصدقاء (سطر لكل رابط)</label><textarea className="textarea-field" rows={5} value={deleteFriendsUrls} onChange={e => setDeleteFriendsUrls(e.target.value)} placeholder="https://facebook.com/username1" /></div>
      )}
      {renderResultsTable('delete-friends', ['#', 'التفاصيل', 'الحالة'], 'facebook-delete-friends', 'simple')}
    </div>
  )
  const deleteFriendsFooter = (<button onClick={handleDeleteFriends} disabled={loading} className="btn-danger w-full">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> حذف الأصدقاء</>}</button>)

  const renderInteractionFarmBody = () => (
    <div className="space-y-4">
      <div><label className="label-field">نوع التفاعل</label><select className="select-field" value={interactionAction} onChange={e => setInteractionAction(e.target.value)}><option value="like">إعجاب</option><option value="love">حب</option><option value="comment">تعليق عشوائي</option></select></div>
      <div><label className="label-field">روابط المنشورات (سطر لكل رابط)</label><textarea className="textarea-field" rows={6} value={interactionUrls} onChange={e => setInteractionUrls(e.target.value)} placeholder="https://facebook.com/.../posts/..." /></div>
      {renderResultsTable('interaction-farm', ['#', 'التفاصيل', 'الحالة'], 'facebook-interaction', 'simple')}
    </div>
  )
  const interactionFarmFooter = (<button onClick={handleInteractionFarm} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><ThumbsUp size={18} /> بدء التفاعل</>}</button>)

  const renderDeletePostsBody = () => (
    <div className="space-y-4">
      <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle size={16} /> تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
      <div><label className="label-field">عدد المنشورات: {deletePostsLimit}</label><input type="range" min="1" max="50" value={deletePostsLimit} onChange={e => setDeletePostsLimit(parseInt(e.target.value))} className="w-full accent-red-600" /></div>
      {renderResultsTable('delete-posts', ['#', 'التفاصيل', 'الحالة'], 'facebook-delete-posts', 'simple')}
    </div>
  )
  const deletePostsFooter = (<button onClick={handleDeletePosts} disabled={loading} className="btn-danger w-full">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> حذف المنشورات</>}</button>)

  const renderAnalyzeGroupBody = () => (
    <div className="space-y-4">
      <div><label className="label-field">رابط المجموعة</label><input type="url" className="input-field" placeholder="https://facebook.com/groups/..." value={analyzeGroupUrl} onChange={e => setAnalyzeGroupUrl(e.target.value)} /></div>
      {renderResultsTable('analyze-group', ['#', 'التفاصيل', 'الحالة'], 'facebook-analyze-group', 'simple')}
    </div>
  )
  const analyzeGroupFooter = (<button onClick={handleAnalyzeGroup} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><BarChart3 size={18} /> تحليل</>}</button>)

  const renderAddToGroupChatBody = () => (
    <div className="space-y-4">
      <p className="text-xs text-secondary-500 bg-secondary-50 p-3 rounded-lg">آلية العمل: يفتح رابط مجموعة الشات، يضغط "إضافة أعضاء"، يبحث عن كل اسم مستخدم ويضيفه واحد تلو الآخر.</p>
      <div><label className="label-field">رابط مجموعة الشات</label><input type="url" className="input-field" placeholder="https://facebook.com/messages/t/..." value={groupChatUrl} onChange={e => setGroupChatUrl(e.target.value)} /></div>
      <div><label className="label-field">أسماء المستخدمين (سطر لكل اسم)</label><textarea className="textarea-field" rows={5} value={addUsernames} onChange={e => setAddUsernames(e.target.value)} placeholder="username1&#10;user2" /></div>
      {renderResultsTable('add-to-group-chat', ['#', 'التفاصيل', 'الحالة'], 'facebook-add-to-group-chat', 'simple')}
    </div>
  )
  const addToGroupChatFooter = (<button onClick={handleAddToGroupChat} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> إضافة للمجموعة</>}</button>)

  const renderSendPageMessagesBody = () => (
    <div className="space-y-4">
      <p className="text-xs text-secondary-500 bg-secondary-50 p-3 rounded-lg">آلية العمل: ينتقل لكل صفحة، يضغط زر "رسالة"، يكتب الرسالة ويرسلها تلقائياً.</p>
      <div><label className="label-field">روابط الصفحات (سطر لكل رابط)</label><textarea className="textarea-field" rows={5} value={sendPageUrls} onChange={e => setSendPageUrls(e.target.value)} placeholder="https://facebook.com/page1&#10;https://facebook.com/page2" /></div>
      <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={4} value={sendPageMessage} onChange={e => setSendPageMessage(e.target.value)} placeholder="مرحباً، أود التعرف على خدماتكم..." /></div>
      {renderResultsTable('send-page-messages', ['#', 'الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'الحالة'], 'facebook-send-page-messages', 'detailed')}
    </div>
  )
  const sendPageMessagesFooter = (<button onClick={handleSendPageMessages} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال للصفحات</>}</button>)

  const renderUsersToIdsBody = () => (
    <div className="space-y-4">
      <div><label className="label-field">أسماء المستخدمين (سطر لكل اسم)</label><textarea className="textarea-field" rows={6} value={usersToIds} onChange={e => setUsersToIds(e.target.value)} placeholder="username1&#10;username2" /></div>
      {renderResultsTable('users-to-ids', ['#', 'الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'الحالة'], 'facebook-users-to-ids', 'detailed')}
    </div>
  )
  const usersToIdsFooter = (<button onClick={handleUsersToIds} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #14b8a6, #0f766e)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Copy size={18} /> تحويل</>}</button>)

  const renderLinksToIdsBody = () => (
    <div className="space-y-4">
      <div><label className="label-field">قائمة الروابط (سطر لكل رابط)</label><textarea className="textarea-field" rows={6} value={linksToIds} onChange={e => setLinksToIds(e.target.value)} placeholder="https://facebook.com/profile.php?id=...&#10;https://facebook.com/username" /></div>
      {renderResultsTable('links-to-ids', ['#', 'الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'الحالة'], 'facebook-links-to-ids', 'detailed')}
    </div>
  )
  const linksToIdsFooter = (<button onClick={handleLinksToIds} disabled={loading} className="btn-primary w-full" style={{ background: 'linear-gradient(135deg, #eab308, #a16207)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><FileText size={18} /> تحويل</>}</button>)

  // ---- New panel renderers (Phase: Facebook completion) ----
  const newResultsTable = (owner: Exclude<ActiveTool, null>, columns: string[], exportKey: string) => {
    if (resultsOwner !== owner || toolResults.length === 0) return null
    return (
      <div className="mt-5 rounded-xl border border-secondary-200 bg-white/[0.04] overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-secondary-100 flex-wrap gap-2">
          <h4 className="font-bold text-secondary-900 text-sm">النتائج ({toolResults.length})</h4>
          <div className="flex gap-2">
            <button onClick={() => handleExport(columns, exportKey, toolResults)} className="btn-success text-xs"><FileSpreadsheet size={14} /> تصدير CSV</button>
            <button onClick={handleClearResults} className="btn-danger text-xs"><Trash2 size={14} /> مسح</button>
          </div>
        </div>
        <div className="table-container" style={{ maxHeight: '380px', overflow: 'auto' }}>
          <table className="data-table">
            <thead><tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>
              {toolResults.map((r: any, i: number) => {
                if (owner === 'search-pages') {
                  return (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.name || '-'}</td><td className="text-xs text-secondary-600">{r.followers || '-'}</td><td className="text-xs">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td></tr>)
                }
                if (owner === 'like-pages') {
                  return (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="text-xs max-w-[300px] truncate" dir="ltr">{r.url}</td><td><span className={`badge ${r.status === 'liked' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td><td className="text-xs text-secondary-500">{r.error || '-'}</td></tr>)
                }
                if (owner === 'extract-sharers') {
                  return (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.name || '-'}</td><td className="text-xs">{r.profile ? <a href={r.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td></tr>)
                }
                if (owner === 'comment-on-pages' || owner === 'comment-on-posts') {
                  return (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="text-xs max-w-[300px] truncate" dir="ltr">{r.url}</td><td><span className={`badge ${r.status === 'commented' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td><td className="text-xs text-secondary-500">{r.error || '-'}</td></tr>)
                }
                if (owner === 'post-with-images') {
                  return (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="text-xs max-w-[300px] truncate" dir="ltr">{r.group}</td><td><span className={`badge ${r.status === 'posted' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td><td className="text-xs text-secondary-500">{r.error || '-'}</td></tr>)
                }
                if (owner === 'detect-open-groups') {
                  return (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.name || '-'}</td><td className="text-xs text-secondary-600">{r.members || '-'}</td><td><span className={`badge ${r.status === 'open' ? 'badge-success' : r.status === 'approval-needed' ? 'badge-warning' : 'badge-danger'}`}>{r.status === 'open' ? 'مفتوحة' : r.status === 'approval-needed' ? 'بحاجة موافقة' : r.status}</span></td><td className="text-xs">{r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td></tr>)
                }
                if (owner === 'extract-active-friends') {
                  return (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.name || '-'}</td><td className="text-xs text-secondary-600">{r.lastSeen || '-'}</td><td className="text-xs">{r.profile ? <a href={r.profile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">رابط</a> : '-'}</td></tr>)
                }
                return null
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderSearchPagesBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الكلمة المفتاحية</label>
        <input type="text" className="input-field" value={pagesSearchQuery} onChange={e => setPagesSearchQuery(e.target.value)} placeholder="مطعم، عيادة أسنان، استشارات تسويق" />
      </div>
      <div>
        <label className="label-field">الموقع (اختياري)</label>
        <input type="text" className="input-field" value={pagesSearchLocation} onChange={e => setPagesSearchLocation(e.target.value)} placeholder="القاهرة، الرياض، Cairo" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {pagesSearchLimit}</label>
        <input type="range" min={20} max={1000} step={10} className="w-full accent-cyan-500" value={pagesSearchLimit} onChange={e => setPagesSearchLimit(parseInt(e.target.value))} />
      </div>
      {newResultsTable('search-pages', ['#', 'الاسم', 'المتابعين', 'الرابط'], 'fb-pages-search')}
    </div>
  )
  const searchPagesFooter = (<button onClick={handleSearchPages} disabled={loading || !pagesSearchQuery.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Search size={18} /> بحث</>}</button>)

  const renderLikePagesBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-300" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        فيسبوك يحدد ~50 إعجاب صفحة يومياً للحسابات الجديدة. استخدم فاصل ≥ 4 ثوانٍ.
      </div>
      <div>
        <label className="label-field">روابط الصفحات (سطر لكل رابط)</label>
        <textarea className="textarea-field" rows={7} value={likePagesUrls} onChange={e => setLikePagesUrls(e.target.value)} placeholder="https://facebook.com/page-name" />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={120} className="input-field w-32" value={likePagesDelay} onChange={e => setLikePagesDelay(Number(e.target.value) || 5)} />
      </div>
      {newResultsTable('like-pages', ['#', 'الصفحة', 'الحالة', 'خطأ'], 'fb-like-pages')}
    </div>
  )
  const likePagesFooter = (<button onClick={handleLikePages} disabled={loading || !likePagesUrls.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><ThumbsUp size={18} /> إعجاب</>}</button>)

  const renderExtractSharersBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط المنشور</label>
        <input type="url" className="input-field" value={sharersPostUrl} onChange={e => setSharersPostUrl(e.target.value)} placeholder="https://facebook.com/posts/..." />
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {sharersLimit}</label>
        <input type="range" min={20} max={2000} step={20} className="w-full accent-rose-500" value={sharersLimit} onChange={e => setSharersLimit(parseInt(e.target.value))} />
      </div>
      {newResultsTable('extract-sharers', ['#', 'الاسم', 'الرابط'], 'fb-sharers')}
    </div>
  )
  const extractSharersFooter = (<button onClick={handleExtractSharers} disabled={loading || !sharersPostUrl.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f43f5e, #be123c)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><Share2 size={18} /> استخراج المشاركين</>}</button>)

  const renderInviteFriendsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">رابط الصفحة</label>
        <input type="url" className="input-field" value={invitePageUrl} onChange={e => setInvitePageUrl(e.target.value)} placeholder="https://facebook.com/your-page" />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={inviteAll} onChange={e => setInviteAll(e.target.checked)} className="rounded" />
        دعوة كل الأصدقاء (الحد الافتراضي 50)
      </label>
      {!inviteAll && (
        <div>
          <label className="label-field">قائمة الأصدقاء بالاسم (سطر لكل اسم)</label>
          <textarea className="textarea-field" rows={5} value={inviteUsernames} onChange={e => setInviteUsernames(e.target.value)} placeholder="Ahmed Mohamed&#10;Sara Ali" />
        </div>
      )}
    </div>
  )
  const inviteFriendsFooter = (<button onClick={handleInviteFriends} disabled={loading || !invitePageUrl.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #eab308, #a16207)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> إرسال الدعوات</>}</button>)

  const renderCommentOnPagesBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط الصفحات (سطر لكل صفحة)</label>
        <textarea className="textarea-field" rows={6} value={commentPagesUrls} onChange={e => setCommentPagesUrls(e.target.value)} placeholder="https://facebook.com/page-name" />
      </div>
      <div>
        <label className="label-field">نص التعليق ({'{{n}}'} = رقم الصفحة)</label>
        <textarea className="textarea-field" rows={3} value={commentPagesText} onChange={e => setCommentPagesText(e.target.value)} placeholder="تعليق احترافي ومحترم..." />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={120} className="input-field w-32" value={commentPagesDelay} onChange={e => setCommentPagesDelay(Number(e.target.value) || 6)} />
      </div>
      {newResultsTable('comment-on-pages', ['#', 'الصفحة', 'الحالة', 'خطأ'], 'fb-comment-pages')}
    </div>
  )
  const commentOnPagesFooter = (<button onClick={handleCommentOnPages} disabled={loading || !commentPagesUrls.trim() || !commentPagesText.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><MessageSquare size={18} /> تعليق</>}</button>)

  const renderCommentOnPostsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط المنشورات (سطر لكل منشور)</label>
        <textarea className="textarea-field" rows={6} value={commentPostsUrls} onChange={e => setCommentPostsUrls(e.target.value)} placeholder="https://facebook.com/page/posts/..." />
      </div>
      <div>
        <label className="label-field">نص التعليق ({'{{n}}'} = رقم المنشور)</label>
        <textarea className="textarea-field" rows={3} value={commentPostsText} onChange={e => setCommentPostsText(e.target.value)} placeholder="تعليق احترافي ومحترم..." />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={120} className="input-field w-32" value={commentPostsDelay} onChange={e => setCommentPostsDelay(Number(e.target.value) || 6)} />
      </div>
      {newResultsTable('comment-on-posts', ['#', 'المنشور', 'الحالة', 'خطأ'], 'fb-comment-posts')}
    </div>
  )
  const commentOnPostsFooter = (<button onClick={handleCommentOnPosts} disabled={loading || !commentPostsUrls.trim() || !commentPostsText.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><MessageSquare size={18} /> تعليق</>}</button>)

  const renderPostWithImagesBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label>
        <textarea className="textarea-field" rows={5} value={imagePostGroups} onChange={e => setImagePostGroups(e.target.value)} placeholder="https://facebook.com/groups/..." />
      </div>
      <div>
        <label className="label-field">نص المنشور</label>
        <textarea className="textarea-field" rows={4} value={imagePostMessage} onChange={e => setImagePostMessage(e.target.value)} placeholder="اكتب منشورك مع روابط 🎉 ورموز تعبيرية 💎" />
      </div>
      <div>
        <label className="label-field">الصور (حد أقصى 3)</label>
        <input ref={imagePostInputRef} type="file" multiple accept="image/*" onChange={handleImagesSelected} className="hidden" />
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={handlePickImages} type="button" className="btn-secondary text-sm"><ImageIcon size={16} /> اختر صور</button>
          {imagePostPaths.length === 0 && <span className="text-xs text-secondary-400">لم يتم اختيار صور</span>}
        </div>
        {imagePostPaths.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-xs">
            {imagePostPaths.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-secondary-100">
                <span className="truncate" dir="ltr">{p}</span>
                <button onClick={() => setImagePostPaths(prev => prev.filter((_, j) => j !== i))} className="text-danger-500 p-1 hover:bg-danger-50 rounded" type="button"><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={3} max={120} className="input-field w-32" value={imagePostDelay} onChange={e => setImagePostDelay(Number(e.target.value) || 8)} />
      </div>
      {newResultsTable('post-with-images', ['#', 'المجموعة', 'الحالة', 'خطأ'], 'fb-post-images')}
    </div>
  )
  const postWithImagesFooter = (<button onClick={handlePostWithImages} disabled={loading || !imagePostGroups.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><ImageIcon size={18} /> نشر</>}</button>)

  const renderDemographicsAnalyzeBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
        استخدم نتائج أداة استخراج موجودة (سيتم استخدام النتائج الحالية تلقائياً) أو الصق JSON يدوياً.
      </div>
      <div>
        <label className="label-field">JSON يدوي (اختياري)</label>
        <textarea className="textarea-field font-mono text-xs" rows={4} value={demoInputJson} onChange={e => setDemoInputJson(e.target.value)} placeholder='[{"name":"Ahmed", "location":"Cairo"}, ...]' dir="ltr" />
      </div>
      {demoResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.2)' }}>
              <p className="text-xs text-secondary-500">المجموع</p>
              <p className="text-2xl font-bold text-emerald-300">{demoResult.total}</p>
            </div>
            <div className="p-3 rounded-xl border" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}>
              <p className="text-xs text-secondary-500">ذكور</p>
              <p className="text-2xl font-bold text-blue-300">{demoResult.genderGuess?.male ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl border" style={{ background: 'rgba(236,72,153,0.06)', borderColor: 'rgba(236,72,153,0.2)' }}>
              <p className="text-xs text-secondary-500">إناث</p>
              <p className="text-2xl font-bold text-pink-300">{demoResult.genderGuess?.female ?? 0}</p>
            </div>
          </div>
          {(demoResult.arabicSpeakers !== undefined || demoResult.topRegions?.length) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border bg-white/[0.04]">
                <p className="text-xs font-bold text-secondary-700 mb-2">اللغة (تقديري)</p>
                <div className="flex items-center gap-3 text-xs">
                  <span>🇸🇦 العربية: <strong className="text-emerald-600">{demoResult.arabicSpeakers ?? 0}</strong></span>
                  <span>🇬🇧 الإنجليزية: <strong className="text-blue-600">{demoResult.englishSpeakers ?? 0}</strong></span>
                </div>
              </div>
              <div className="p-3 rounded-xl border bg-white/[0.04]">
                <p className="text-xs font-bold text-secondary-700 mb-2">حسب البلد</p>
                <ul className="space-y-1 text-xs max-h-32 overflow-y-auto">
                  {(demoResult.topRegions || []).slice(0, 12).map((r: any, i: number) => (
                    <li key={i} className="flex justify-between"><span>{r.value}</span><span className="text-secondary-500">{r.count}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border bg-white/[0.04]">
              <p className="text-xs font-bold text-secondary-700 mb-2">أكثر المواقع</p>
              <ul className="space-y-1 text-xs">
                {(demoResult.topLocations || []).slice(0, 8).map((r: any, i: number) => (
                  <li key={i} className="flex justify-between"><span>{r.value}</span><span className="text-secondary-500">{r.count}</span></li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-xl border bg-white/[0.04]">
              <p className="text-xs font-bold text-secondary-700 mb-2">أكثر الأسماء</p>
              <ul className="space-y-1 text-xs">
                {(demoResult.topNames || []).slice(0, 10).map((r: any, i: number) => (
                  <li key={i} className="flex justify-between"><span>{r.value}</span><span className="text-secondary-500">{r.count}</span></li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  const demographicsAnalyzeFooter = (<button onClick={handleDemographicsAnalyze} disabled={loading} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><BarChart3 size={18} /> تحليل</>}</button>)

  const renderDetectOpenGroupsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label>
        <textarea className="textarea-field" rows={7} value={openGroupsUrls} onChange={e => setOpenGroupsUrls(e.target.value)} placeholder="https://facebook.com/groups/..." />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={1} max={60} className="input-field w-32" value={openGroupsDelay} onChange={e => setOpenGroupsDelay(Number(e.target.value) || 3)} />
      </div>
      {newResultsTable('detect-open-groups', ['#', 'الاسم', 'الأعضاء', 'الحالة', 'الرابط'], 'fb-open-groups')}
    </div>
  )
  const detectOpenGroupsFooter = (<button onClick={handleDetectOpenGroups} disabled={loading || !openGroupsUrls.trim()} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #84cc16, #4d7c0f)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> فحص</>}</button>)

  const renderExtractActiveFriendsBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
        يفحص آخر نشاط لكل صديق ويعتبره نشطاً إذا نشر خلال الفترة المحددة.
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">عدد الأصدقاء للفحص: {activeFriendsLimit}</label>
          <input type="range" min={10} max={300} step={5} className="w-full accent-emerald-500" value={activeFriendsLimit} onChange={e => setActiveFriendsLimit(parseInt(e.target.value))} />
        </div>
        <div>
          <label className="label-field">أيام النشاط: {activeFriendsDays}</label>
          <input type="range" min={1} max={365} step={1} className="w-full accent-emerald-500" value={activeFriendsDays} onChange={e => setActiveFriendsDays(parseInt(e.target.value))} />
        </div>
      </div>
      {newResultsTable('extract-active-friends', ['#', 'الاسم', 'آخر نشاط', 'الرابط'], 'fb-active-friends')}
    </div>
  )
  const extractActiveFriendsFooter = (<button onClick={handleExtractActiveFriends} disabled={loading} className="btn-primary w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserCheck size={18} /> استخراج</>}</button>)

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    extract: { body: renderExtractBody(), footer: extractFooter },
    'search-pages': { body: renderSearchPagesBody(), footer: searchPagesFooter },
    'extract-sharers': { body: renderExtractSharersBody(), footer: extractSharersFooter },
    'extract-active-friends': { body: renderExtractActiveFriendsBody(), footer: extractActiveFriendsFooter },
    'detect-open-groups': { body: renderDetectOpenGroupsBody(), footer: detectOpenGroupsFooter },
    'demographics-analyze': { body: renderDemographicsAnalyzeBody(), footer: demographicsAnalyzeFooter },
    'post-to-groups': { body: renderPostToGroupsBody(), footer: postToGroupsFooter },
    'post-with-images': { body: renderPostWithImagesBody(), footer: postWithImagesFooter },
    'share-post': { body: renderSharePostBody(), footer: sharePostFooter },
    'auto-reply': { body: renderAutoReplyBody(), footer: autoReplyFooter },
    mention: { body: renderMentionBody(), footer: mentionFooter },
    'like-pages': { body: renderLikePagesBody(), footer: likePagesFooter },
    'comment-on-pages': { body: renderCommentOnPagesBody(), footer: commentOnPagesFooter },
    'comment-on-posts': { body: renderCommentOnPostsBody(), footer: commentOnPostsFooter },
    'invite-friends': { body: renderInviteFriendsBody(), footer: inviteFriendsFooter },
    'send-messages': { body: renderSendMessagesBody(), footer: sendMessagesFooter },
    'page-send-messages': { body: renderPageSendMessagesBody(), footer: pageSendMessagesFooter },
    'friend-requests': { body: renderFriendRequestsBody(), footer: friendRequestsFooter },
    'delete-friends': { body: renderDeleteFriendsBody(), footer: deleteFriendsFooter },
    'interaction-farm': { body: renderInteractionFarmBody(), footer: interactionFarmFooter },
    'delete-posts': { body: renderDeletePostsBody(), footer: deletePostsFooter },
    'analyze-group': { body: renderAnalyzeGroupBody(), footer: analyzeGroupFooter },
    'add-to-group-chat': { body: renderAddToGroupChatBody(), footer: addToGroupChatFooter },
    'send-page-messages': { body: renderSendPageMessagesBody(), footer: sendPageMessagesFooter },
    'users-to-ids': { body: renderUsersToIdsBody(), footer: usersToIdsFooter },
    'links-to-ids': { body: renderLinksToIdsBody(), footer: linksToIdsFooter },
  }

  const openTool = (toolId: Exclude<ActiveTool, null>) => {
    if (!sessionId) {
      showMsg('يرجى تسجيل الدخول أولاً', true)
      setShowLoginPanel(true)
      return
    }
    setActiveTool(toolId)
  }

  const renderToolCard = (tool: ToolDef) => (
    <ToolCard
      key={tool.id}
      icon={tool.icon}
      name={tool.name}
      description={tool.description}
      accent={tool.accent}
      accentGradient={tool.accentGradient}
      locked={!sessionId}
      onClick={() => openTool(tool.id)}
    />
  )

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-300' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}

      {renderSessionCard()}

      <AccountCycleBanner
        platformId="facebook"
        platformName="Facebook"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('extract')}
      />

      <ToolGrid title="استخراج وبحث" subtitle="استخراج بيانات شامل وبحث متقدم" icon={Download} accent="#0A6CF1" cols={4}>
        {extractCategoryTools.map(renderToolCard)}
      </ToolGrid>

      <ToolGrid title="التسويق والنشر" subtitle="أدوات النشر والمشاركة والتفاعل" icon={Megaphone} accent="#10b981" cols={4}>
        {marketingTools.map(renderToolCard)}
      </ToolGrid>

      <ToolGrid title="المراسلة" subtitle="إرسال رسائل من الملف الشخصي أو الصفحة" icon={Send} accent="#0ea5e9" cols={4}>
        {messagingTools.map(renderToolCard)}
      </ToolGrid>

      <ToolGrid title="أدوات متقدمة" subtitle="إدارة الأصدقاء والمنشورات والتحويلات" icon={Bot} accent="#8b5cf6" cols={4}>
        {advancedTools.map(renderToolCard)}
      </ToolGrid>

      <ToolPanel
        open={showLoginPanel}
        onClose={() => setShowLoginPanel(false)}
        title="تسجيل الدخول إلى Facebook"
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
