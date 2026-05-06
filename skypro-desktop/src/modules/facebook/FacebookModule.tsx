import { useState, useEffect, useRef, useCallback } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { useAccountsStore } from '../../stores/accountsStore'
import type { Account } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import {
  LogIn, Search, Download, Users, Send, Megaphone, Play, Eye, EyeOff,
  Trash2, AlertCircle, CheckCircle, Loader2, FileSpreadsheet, Heart,
  UserPlus, MessageSquare, Globe, AtSign, BarChart3, FileText,
  Share2, Copy, ThumbsUp, Bot, Square
} from 'lucide-react'

type TabId = 'login' | 'extract' | 'marketing' | 'messaging' | 'tools'

export default function FacebookModule() {
  const [activeTab, setActiveTab] = useState<TabId>('login')
  const { loading, setLoading, message, error, showMsg, sessionId, setSessionId, accounts, results, loadAccounts, loadResults, handleExport, clearResults, checkSession, clearSession, cycleActive, cycleProgress, startCycle, stopCycle } = usePlatform('facebook')
  const { accounts: allAccounts } = useAccountsStore()
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

  useEffect(() => {
    const cleanup = window.electronAPI.onExtractionProgress((data: any) => {
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
      const res = await window.electronAPI.facebookLogin({ username: loginForm.email, password: loginForm.password, headless: false, proxy: loginForm.proxy || undefined })
      if (res.success) { setSessionId(res.sessionId || ''); showMsg('تم تسجيل الدخول بنجاح!'); await loadAccounts() }
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
      setTimeout(() => passwordRef.current?.focus(), 100)
      showMsg('هذا الحساب ليس لديه كلمة مرور محفوظة. يرجى إدخال كلمة المرور يدوياً ثم الضغط على "تسجيل الدخول".', true)
      setLoading(false)
      return
    }
    setLoginForm({ ...loginForm, email: account.username, password: account.password || '' })
    try {
      const res = await window.electronAPI.facebookLogin({ accountId: account.id, username: account.username, password: account.password, headless: false, proxy: account.proxy || loginForm.proxy || undefined })
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
    
    // P1-27: Add UI caps for extraction
    if (extractLimit >= 1000) {
      if (!confirm(`تحذير: استخراج ${extractLimit} نتيجة قد يستغرق وقتاً طويلاً وقد يعرض حسابك للحظر. هل تريد المتابعة؟`)) return
    }
    
    setExtracting(true)
    streamResultsRef.current = []
    setStreamResults([])
    const jobId = `fb-${extractType}-${Date.now()}`
    setCurrentJobId(jobId)
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
        case 'post-details': res = await window.electronAPI.facebookExtractPostDetails({ sessionId, postUrl: extractUrl }); break
        case 'search-groups': res = await window.electronAPI.facebookSearchGroups({ sessionId, query: searchGroupQuery, limit: extractLimit }); break
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
  }

  const handleClearResults = () => {
    setToolResults([])
    streamResultsRef.current = []
    setStreamResults([])
    clearResults()
  }

  const handleSearch = async () => {
    if (!ensureSession()) return
    if (!searchQuery) { showMsg('أدخل كلمة البحث', true); return }
    setToolResults([])
    setLoading(true)
    try {
      const res = await window.electronAPI.facebookSearch({ sessionId, query: searchQuery, type: searchType, limit: extractLimit })
      if (res.success) { showMsg(`تم العثور على \${res.count || 0} نتيجة`); await loadResults() }
      else showMsg(res.error || 'فشل البحث', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handlePostToGroups = async () => {
    if (!ensureSession()) return
    const groups = groupUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (!postMessage || groups.length === 0) { showMsg('أدخل المجموعات والرسالة', true); return }
    setLoading(true)
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
    try {
      const res = await window.electronAPI.facebookAutoReply({ sessionId, postUrl: replyPostUrl, replyText, limit: replyLimit })
      if (res.success) { showMsg(`تم الرد على \${res.count || 0} تعليق`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleSendMessages = async () => {
    if (!ensureSession()) return
    if (!recipientsText || !broadcastMessage) { showMsg('يرجى إدخال المستلمين والرسالة', true); return }
    setLoading(true)
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
    try {
      const res = await window.electronAPI.facebookMention({ sessionId, postUrls: urls, usernames: names, text: mentionText })
      if (res.success) { showMsg(`تم منشن \${res.count || 0} مستخدم`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleFriendRequests = async () => {
    if (!ensureSession()) return
    const urls = friendRequestUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (urls.length === 0) { showMsg('أدخل روابط الحسابات', true); return }
    setLoading(true)
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
    try {
      const friendUrls = deleteFriendsUrls.split('\n').map(s => s.trim()).filter(Boolean)
      const res = await window.electronAPI.facebookDeleteFriends({
        sessionId,
        limit: deleteFriendsLimit,
        deleteAll: deleteFriendsMode === 'all',
        friendUrls: deleteFriendsMode === 'selected' ? friendUrls : []
      })
      if (res.success) { showMsg(`تم حذف \${res.count || 0} صديق`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleAddToGroupChat = async () => {
    if (!ensureSession()) return
    if (!groupChatUrl || !addUsernames.trim()) { showMsg('أدخل رابط المجموعة وأسماء المستخدمين', true); return }
    setLoading(true)
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
    try {
      const res = await window.electronAPI.facebookInteractionFarm({ sessionId, postUrls: urls, action: interactionAction })
      if (res.success) { showMsg(`تم التفاعل مع \${res.count || 0} منشور`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleDeletePosts = async () => {
    if (!ensureSession()) return
    if (!confirm('هل أنت متأكد من حذف المنشورات؟ هذا الإجراء لا يمكن التراجع عنه.')) return
    setLoading(true)
    try {
      const res = await window.electronAPI.facebookDeletePosts({ sessionId, limit: deletePostsLimit })
      if (res.success) { showMsg(`تم حذف \${res.count || 0} منشور`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleAnalyzeGroup = async () => {
    if (!ensureSession()) return
    if (!analyzeGroupUrl) { showMsg('أدخل رابط المجموعة', true); return }
    setLoading(true)
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
    try {
      const res = await window.electronAPI.facebookUsersToIds({ sessionId, usernames })
      if (res.success) { showMsg(`تم تحويل \${res.count || 0} مستخدم`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleLinksToIds = async () => {
    if (!ensureSession()) return
    const links = linksToIds.split('\n').map(s => s.trim()).filter(Boolean)
    if (links.length === 0) { showMsg('أدخل الروابط', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.facebookLinksToIds({ sessionId, links })
      if (res.success) { showMsg(`تم تحويل \${res.count || 0} رابط`); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handlePageSendMessages = async () => {
    if (!ensureSession()) return
    if (!pageMsgUrl || !pageMsgRecipients || !pageMsgText) { showMsg('أدخل رابط الصفحة والمستلمين والرسالة', true); return }
    setLoading(true)
    const recipients = pageMsgRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    try {
      const res = await window.electronAPI.facebookPageSendMessages({ sessionId, pageUrl: pageMsgUrl, recipients, message: pageMsgText })
      if (res.success) {
        const sent = ((res.data as any[]) || []).filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال ${sent} من ${recipients.length} رسالة`);
        setToolResults((res.data as any[]) || [])
      } else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'login', label: 'تسجيل الدخول', icon: LogIn },
    { id: 'extract', label: 'استخراج البيانات', icon: Download },
    { id: 'marketing', label: 'التسويق والنشر', icon: Megaphone },
    { id: 'messaging', label: 'المراسلة', icon: Send },
    { id: 'tools', label: 'أدوات متقدمة', icon: Bot },
  ]

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
    { id: 'post-details', name: 'تفاصيل المنشور', icon: FileText, needsUrl: true, urlLabel: 'رابط المنشور' },
    { id: 'search-groups', name: 'البحث عن مجموعات', icon: Search, needsUrl: false },
    { id: 'join-groups', name: 'الانضمام لمجموعات', icon: Users, needsUrl: true, urlLabel: 'روابط المجموعات' },
  ]

  const renderLogin = () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><LogIn size={20} className="text-primary-600"/> تسجيل الدخول</h3>
        {sessionId && (
          <div className="mb-4 p-4 bg-success-50 rounded-xl border border-success-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-success-600" />
                <div><p className="font-bold text-success-700">جلسة نشطة</p><p className="text-xs text-success-600">يمكنك استخدام جميع الأدوات الآن</p></div>
              </div>
              <button onClick={clearSession} className="btn-danger text-xs px-3 py-1.5"><LogIn size={14} /> إنهاء الجلسة</button>
            </div>
          </div>
        )}
        {fbAccounts.length > 0 && (
          <div className="mb-4 p-4 bg-primary-50 rounded-xl border border-primary-100">
            <label className="label-field">الحسابات المحفوظة</label>
            <select className="select-field mb-2" value={selectedAccountId} onChange={e => {
              const id = e.target.value; setSelectedAccountId(id)
              const acc = fbAccounts.find(a => a.id.toString() === id)
              if (acc && !sessionId) { setLoginForm({ ...loginForm, email: acc.username, password: acc.password || '' }); if (!acc.password?.trim()) setTimeout(() => passwordRef.current?.focus(), 100) }
            }}>
              <option value="">-- اختر حساب --</option>
              {fbAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.username} {acc.password?.trim() ? '(باسورد محفوظ)' : '(بدون باسورد)'}</option>))}
            </select>
            {selectedAccountId && (<button onClick={() => { const acc = fbAccounts.find(a => a.id.toString() === selectedAccountId); if (acc) handleLoginWithAccount(acc) }} disabled={loading} className="btn-success w-full text-sm">{loading ? <Loader2 size={16} className="animate-spin" /> : <><LogIn size={16} /> دخول / فحص الجلسة</>}</button>)}
            <div className="my-3 border-t border-primary-100" />
          </div>
        )}
        <div className="space-y-4">
          <div><label className="label-field">البريد الإلكتروني</label><input type="email" className="input-field" placeholder="example@email.com" value={loginForm.email} onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} /></div>
          <div><label className="label-field">كلمة المرور</label><div className="relative"><input ref={passwordRef} type={showPassword ? 'text' : 'password'} className="input-field pl-10" placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /><button onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <div><label className="label-field">بروكسي (اختياري)</label><input type="text" className="input-field" placeholder="IP:Port أو http://user:pass@ip:port" value={loginForm.proxy} onChange={e => setLoginForm({ ...loginForm, proxy: e.target.value })} /></div>
          <button onClick={handleLogin} disabled={loading || !loginForm.email || !loginForm.password} className="btn-primary w-full disabled:opacity-50">{loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> تسجيل الدخول</>}</button>
        </div>
      </div>
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg">الحسابات المحفوظة</h3>
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-secondary-400"><Users size={48} className="mx-auto mb-3 opacity-30" /><p>لا توجد حسابات مسجلة</p><p className="text-xs mt-1">سجل الدخول لحفظ حسابك</p></div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary-50 border border-secondary-100 hover:bg-secondary-100 transition-colors">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">{(acc.username || '?')[0].toUpperCase()}</div><div><p className="font-medium text-secondary-900 text-sm">{acc.username}</p><p className="text-xs text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>{acc.password?.trim() ? <span className="text-[10px] text-success-600">باسورد محفوظ</span> : <span className="text-[10px] text-warning-600">بدون باسورد</span>}</div></div>
                <span className={`badge ${acc.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{acc.status === 'active' ? 'نشط' : 'غير نشط'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderExtract = () => {
    const selectedTool = extractTools.find(t => t.id === extractType)
    const displayResults = toolResults.length > 0 ? toolResults : results
    return (
      <div className="space-y-6">
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
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg">استخراج البيانات</h3>
          <div className="space-y-4">
            <div><label className="label-field">نوع الاستخراج</label>
              <select className="select-field" value={extractType} onChange={e => setExtractType(e.target.value)}>
                {extractTools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {extractType !== 'friends' && extractType !== 'profile-messengers' && extractType !== 'search-groups' && extractType !== 'page-messengers' && extractType !== 'reviews' && extractType !== 'join-groups' && (
              <div><label className="label-field">{selectedTool?.urlLabel || 'الرابط'}</label>
                <input type="url" className="input-field" placeholder="https://facebook.com/..." value={extractUrl} onChange={e => setExtractUrl(e.target.value)} />
              </div>
            )}
            {extractType === 'page-messengers' && (
              <div><label className="label-field">رابط الصفحة (يجب أن تكون أدمن)</label>
                <input type="url" className="input-field" placeholder="https://facebook.com/your-page" value={pageMessengerUrl} onChange={e => setPageMessengerUrl(e.target.value)} />
              </div>
            )}
            {extractType === 'profile-messengers' && (
              <div><label className="label-field">عدد المراسلين: {profileMessengerLimit}</label>
                <input type="range" min="10" max="500" value={profileMessengerLimit} onChange={e => setProfileMessengerLimit(parseInt(e.target.value))} className="w-full accent-blue-600" />
              </div>
            )}
            {extractType === 'reviews' && (
              <div><label className="label-field">رابط الصفحة</label>
                <input type="url" className="input-field" placeholder="https://facebook.com/your-page" value={reviewPageUrl} onChange={e => setReviewPageUrl(e.target.value)} />
              </div>
            )}
            {extractType === 'search-groups' && (
              <div><label className="label-field">كلمة البحث عن المجموعات</label>
                <input type="text" className="input-field" placeholder="تسويق، أعمال..." value={searchGroupQuery} onChange={e => setSearchGroupQuery(e.target.value)} />
              </div>
            )}
            {extractType === 'join-groups' && (
              <div><label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label>
                <textarea className="textarea-field" rows={4} value={joinGroupUrls} onChange={e => setJoinGroupUrls(e.target.value)} placeholder="https://facebook.com/groups/...&#10;https://facebook.com/groups/..." />
              </div>
            )}
            <div><label className="label-field">الحد الأقصى للنتائج: {extractLimit}</label><input type="range" min="10" max="5000" step="10" value={extractLimit} onChange={e => setExtractLimit(parseInt(e.target.value))} className="w-full accent-blue-600" /></div>
            <div><label className="label-field">تأخير بين الصفحات (مللي ثانية): {delayMs}</label><input type="range" min="500" max="5000" step="100" value={delayMs} onChange={e => setDelayMs(parseInt(e.target.value))} className="w-full accent-indigo-500" /><p className="text-xs text-secondary-400 mt-1">تأخير أكبر = أمان أكثر ضد الحظر</p></div>
            <div className="flex gap-2">
              <button onClick={handleExtract} disabled={extracting} className="btn-primary flex-1">{extracting ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}</button>
              {extracting && <button onClick={stopExtraction} className="btn-danger"><Square size={18} /> إيقاف</button>}
              <button onClick={handleSearch} disabled={loading || extracting} className="btn-secondary"><><Search size={18} /> بحث</></button>
            </div>
            {extracting && <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200"><Loader2 size={16} className="animate-spin text-blue-600" /><span className="text-blue-700 text-sm font-medium">جاري الاستخراج... {streamResults.length} نتيجة حتى الآن</span></div>}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {extractTools.map(tool => {
            const isSel = extractType === tool.id
            return (
              <button key={tool.id} onClick={() => setExtractType(tool.id)} className={`tool-card cursor-pointer text-center ${isSel ? 'ring-2' : ''}`}
                style={isSel ? { borderColor: '#0A6CF1', boxShadow: '0 0 0 2px rgba(10,108,241,0.2), 0 4px 16px rgba(10,108,241,0.1)' } : {}}>
                <div className="w-10 h-10 rounded-xl mx-auto flex items-center justify-center"
                  style={isSel
                    ? { background: 'linear-gradient(135deg, #0A6CF1, #8B2CF5)', color: 'white', boxShadow: '0 2px 8px rgba(10,108,241,0.25)' }
                    : { background: 'rgba(248,250,252,0.8)', color: '#64748b' }}>
                  <tool.icon size={20} />
                </div>
                <h4 className="font-bold text-xs mt-2" style={{ color: isSel ? '#0A6CF1' : '#334155' }}>{tool.name}</h4>
              </button>
            )
          })}
        </div>
        {(displayResults.length > 0 || streamResults.length > 0) && (
          <div className="card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-secondary-900">النتائج ({streamResults.length || displayResults.length})</h3>
              <div className="flex gap-2">
                <button onClick={() => handleExport(['الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'النص', 'المصدر', 'التاريخ'], 'facebook-extract', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير CSV</button>
                <button onClick={handleClearResults} className="btn-danger text-sm"><Trash2 size={16} /> مسح الكل</button>
              </div>
            </div>
            <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>#</th><th>الاسم</th><th>معرف المستخدم</th><th>الرابط</th><th>الهاتف</th><th>النص/ملاحظات</th><th>المصدر</th></tr></thead>
                <tbody>
                  {(streamResults.length > 0 ? streamResults : displayResults).map((r: any, i: number) => {
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
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 text-lg">بحث متقدم</h3>
          <div className="flex gap-4">
            <div className="flex-1"><label className="label-field">كلمة البحث</label><input type="text" className="input-field" placeholder="ابحث عن صفحات أو أشخاص أو مجموعات..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} /></div>
            <div className="w-40"><label className="label-field">النوع</label><select className="select-field" value={searchType} onChange={e => setSearchType(e.target.value)}><option value="pages">الصفحات</option><option value="people">الأشخاص</option><option value="groups">المجموعات</option></select></div>
          </div>
        </div>
      </div>
    )
  }

  const renderMarketing = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><Megaphone size={20} className="text-green-600" /> النشر في المجموعات</h3>
          <div className="space-y-4">
            <div><label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label><textarea className="textarea-field" rows={4} value={groupUrls} onChange={e => setGroupUrls(e.target.value)} placeholder="https://facebook.com/groups/..." /></div>
            <div><label className="label-field">نص المنشور</label><textarea className="textarea-field" rows={4} value={postMessage} onChange={e => setPostMessage(e.target.value)} placeholder="اكتب منشورك هنا..." /></div>
            <button onClick={handlePostToGroups} disabled={loading} className="btn-primary w-full">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Megaphone size={18} /> نشر في المجموعات</>}</button>
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><Share2 size={20} className="text-blue-600" /> مشاركة منشور في مجموعات</h3>
          <div className="space-y-4">
            <div><label className="label-field">رابط المنشور</label><input type="url" className="input-field" placeholder="https://facebook.com/.../posts/..." value={sharePostUrl} onChange={e => setSharePostUrl(e.target.value)} /></div>
            <div><label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label><textarea className="textarea-field" rows={4} value={shareGroupUrls} onChange={e => setShareGroupUrls(e.target.value)} placeholder="https://facebook.com/groups/..." /></div>
            <button onClick={handleSharePost} disabled={loading} className="btn-primary w-full bg-blue-600 hover:bg-blue-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Share2 size={18} /> مشاركة</>}</button>
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><MessageSquare size={20} className="text-purple-600" /> الرد التلقائي على التعليقات</h3>
          <div className="space-y-4">
            <p className="text-xs text-secondary-500 bg-secondary-50 p-2 rounded-lg">آلية العمل: ينتقل لرابط المنشور، يمرر على التعليقات واحداً تلو الآخر، يضغط على زر "رد" ويكتب الرد تلقائياً</p>
            <div><label className="label-field">رابط المنشور</label><input type="url" className="input-field" placeholder="https://facebook.com/.../posts/..." value={replyPostUrl} onChange={e => setReplyPostUrl(e.target.value)} /></div>
            <div><label className="label-field">نص الرد</label><textarea className="textarea-field" rows={3} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="اكتب ردك التلقائي..." /></div>
            <div><label className="label-field">عدد التعليقات: {replyLimit}</label><input type="range" min="1" max="50" value={replyLimit} onChange={e => setReplyLimit(parseInt(e.target.value))} className="w-full accent-purple-600" /></div>
            <button onClick={handleAutoReply} disabled={loading} className="btn-primary w-full bg-purple-600 hover:bg-purple-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Bot size={18} /> بدء الرد التلقائي</>}</button>
          </div>
        </div>
        <div className="card">
          <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><AtSign size={20} className="text-orange-600" /> منشن للعملاء</h3>
          <div className="space-y-4">
            <p className="text-xs text-secondary-500 bg-secondary-50 p-2 rounded-lg">آلية العمل: ينتقل لكل منشور، يكتب تعليق فيه @اسم_المستخدم لكل شخص في القائمة واحدة تلو الأخرى</p>
            <div><label className="label-field">روابط المنشورات (سطر لكل منشور)</label><textarea className="textarea-field" rows={3} value={mentionUrls} onChange={e => setMentionUrls(e.target.value)} placeholder="https://facebook.com/.../posts/...&#10;https://facebook.com/.../posts/..." /></div>
            <div><label className="label-field">أسماء المستخدمين للمنشن (سطر لكل اسم - يمكنك نسخها من النتائج المستخرجة)</label><textarea className="textarea-field" rows={3} value={mentionUsernames} onChange={e => setMentionUsernames(e.target.value)} placeholder="username1&#10;user2&#10;@user3" /></div>
            <div><label className="label-field">نص التعليق (اختياري)</label><textarea className="textarea-field" rows={2} value={mentionText} onChange={e => setMentionText(e.target.value)} placeholder="...تعليقك مع المنشن" /></div>
            <button onClick={handleMention} disabled={loading} className="btn-primary w-full bg-orange-600 hover:bg-orange-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><AtSign size={18} /> بدء المنشن</>}</button>
          </div>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-secondary-900">النتائج ({toolResults.length})</h3><span className="badge badge-success">مكتمل</span></div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>التفاصيل</th><th>الحالة</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="text-xs max-w-[300px] truncate">{r.group || r.url || r.name || r.recipient || JSON.stringify(r).substring(0, 80)}</td><td><span className={`badge ${r.status === 'posted' || r.status === 'sent' || r.status === 'replied' || r.status === 'shared' || r.status === 'liked' || r.status === 'mentioned' ? 'badge-success' : r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderMessaging = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Send size={20} className="text-primary-600" /> إرسال رسائل (الملف الشخصي)</h3>
        <div className="space-y-4">
          <div><label className="label-field">قائمة المستلمين (اسم مستخدم أو ID - سطر لكل مستلم)</label><textarea className="textarea-field" rows={5} value={recipientsText} onChange={e => setRecipientsText(e.target.value)} placeholder="user1&#10;user2&#10;1000123456789" /></div>
          <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." /></div>
          <button onClick={handleSendMessages} disabled={loading} className="btn-primary w-full">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال الرسائل</>}</button>
        </div>
      </div>

      <div className="card">
        <h3 className="font-bold text-secondary-900 mb-4 text-lg flex items-center gap-2"><Megaphone size={20} className="text-blue-600" /> إرسال رسائل من الصفحة</h3>
        <p className="text-xs text-secondary-500 bg-secondary-50 p-2 rounded-lg mb-4">يجب أن تكون أدمن في الصفحة. سيتم التبديل للصفحة تلقائياً قبل الإرسال.</p>
        <div className="space-y-4">
          <div><label className="label-field">رابط الصفحة</label><input type="url" className="input-field" placeholder="https://facebook.com/your-page" value={pageMsgUrl} onChange={e => setPageMsgUrl(e.target.value)} /></div>
          <div><label className="label-field">قائمة المستلمين (سطر لكل مستلم)</label><textarea className="textarea-field" rows={4} value={pageMsgRecipients} onChange={e => setPageMsgRecipients(e.target.value)} placeholder="user1&#10;user2" /></div>
          <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={3} value={pageMsgText} onChange={e => setPageMsgText(e.target.value)} placeholder="اكتب رسالتك هنا..." /></div>
          <button onClick={handlePageSendMessages} disabled={loading} className="btn-primary w-full bg-blue-600 hover:bg-blue-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Megaphone size={18} /> إرسال من الصفحة</>}</button>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-secondary-900">نتائج الإرسال ({toolResults.length})</h3><button onClick={() => handleExport(['Recipient', 'Status', 'Error'], 'facebook-messages', toolResults)} className="btn-secondary text-sm"><FileSpreadsheet size={16} /> تصدير</button></div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>المستلم</th><th>الحالة</th><th>خطأ</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium">{r.recipient || r.name || '-'}</td><td><span className={`badge ${r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td><td className="text-xs text-secondary-500">{r.error || '-'}</td></tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderTools = () => (
    <div className="space-y-6">
      {/* إدارة الأصدقاء */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}><UserPlus size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">إدارة الأصدقاء</h2>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-green-600" /> إرسال طلبات صداقة</h3>
            <div className="space-y-4">
              <div><label className="label-field">روابط الحسابات (سطر لكل رابط)</label><textarea className="textarea-field" rows={4} value={friendRequestUrls} onChange={e => setFriendRequestUrls(e.target.value)} placeholder="https://facebook.com/username1&#10;https://facebook.com/username2" /></div>
              <button onClick={handleFriendRequests} disabled={loading} className="btn-primary w-full bg-green-600 hover:bg-green-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> إرسال الطلبات</>}</button>
            </div>
          </div>
          <div className="card">
            <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><Users size={20} className="text-blue-600" /> حذف الأصدقاء</h3>
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
                <div><label className="label-field">روابط الأصدقاء (سطر لكل رابط)</label><textarea className="textarea-field" rows={4} value={deleteFriendsUrls} onChange={e => setDeleteFriendsUrls(e.target.value)} placeholder="https://facebook.com/username1&#10;https://facebook.com/username2" /></div>
              )}
              <button onClick={handleDeleteFriends} disabled={loading} className="btn-danger w-full">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> حذف الأصدقاء</>}</button>
            </div>
          </div>
        </div>
      </div>

      {/* التفاعل وإدارة المنشورات */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B2CF5, #6d28d9)' }}><ThumbsUp size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">التفاعل وإدارة المنشورات</h2>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><ThumbsUp size={20} className="text-purple-600" /> مزرعة التفاعل</h3>
            <div className="space-y-4">
              <div><label className="label-field">نوع التفاعل</label>
                <select className="select-field" value={interactionAction} onChange={e => setInteractionAction(e.target.value)}>
                  <option value="like">إعجاب</option><option value="love">حب</option><option value="comment">تعليق عشوائي</option>
                </select>
              </div>
              <div><label className="label-field">روابط المنشورات (سطر لكل رابط)</label><textarea className="textarea-field" rows={4} value={interactionUrls} onChange={e => setInteractionUrls(e.target.value)} placeholder="https://facebook.com/.../posts/..." /></div>
              <button onClick={handleInteractionFarm} disabled={loading} className="btn-primary w-full bg-purple-600 hover:bg-purple-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><ThumbsUp size={18} /> بدء التفاعل</>}</button>
            </div>
          </div>
          <div className="card">
            <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><Trash2 size={20} className="text-red-600" /> حذف المنشورات</h3>
            <div className="space-y-4">
              <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle size={16} /> تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
              <div><label className="label-field">عدد المنشورات: {deletePostsLimit}</label><input type="range" min="1" max="50" value={deletePostsLimit} onChange={e => setDeletePostsLimit(parseInt(e.target.value))} className="w-full accent-red-600" /></div>
              <button onClick={handleDeletePosts} disabled={loading} className="btn-danger w-full">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Trash2 size={18} /> حذف المنشورات</>}</button>
            </div>
          </div>
          <div className="card">
            <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-indigo-600" /> تحليل مجموعة</h3>
            <div className="space-y-4">
              <div><label className="label-field">رابط المجموعة</label><input type="url" className="input-field" placeholder="https://facebook.com/groups/..." value={analyzeGroupUrl} onChange={e => setAnalyzeGroupUrl(e.target.value)} /></div>
              <button onClick={handleAnalyzeGroup} disabled={loading} className="btn-primary w-full bg-indigo-600 hover:bg-indigo-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><BarChart3 size={18} /> تحليل</>}</button>
            </div>
          </div>
          <div className="card">
            <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><UserPlus size={20} className="text-pink-600" /> إضافة عملاء لمجموعة شات</h3>
            <div className="space-y-4">
              <p className="text-xs text-secondary-500 bg-secondary-50 p-2 rounded-lg">آلية العمل: يفتح رابط مجموعة الشات، يضغط "إضافة أعضاء"، يبحث عن كل اسم مستخدم ويضيفه واحد تلو الآخر.</p>
              <div><label className="label-field">رابط مجموعة الشات</label><input type="url" className="input-field" placeholder="https://facebook.com/messages/t/..." value={groupChatUrl} onChange={e => setGroupChatUrl(e.target.value)} /></div>
              <div><label className="label-field">أسماء المستخدمين (سطر لكل اسم)</label><textarea className="textarea-field" rows={4} value={addUsernames} onChange={e => setAddUsernames(e.target.value)} placeholder="username1&#10;user2&#10;أو أسماء من النتائج المستخرجة" /></div>
              <button onClick={handleAddToGroupChat} disabled={loading} className="btn-primary w-full bg-pink-600 hover:bg-pink-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> إضافة للمجموعة</>}</button>
            </div>
          </div>
        </div>
      </div>

      {/* تحويل ومعالجة البيانات */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0A6CF1, #3b82f6)' }}><Copy size={16} className="text-white" /></div>
          <h2 className="font-bold text-secondary-900 text-base">تحويل ومعالجة البيانات</h2>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><Send size={20} className="text-orange-600" /> إرسال رسائل للصفحات العامة</h3>
            <div className="space-y-4">
              <p className="text-xs text-secondary-500 bg-secondary-50 p-2 rounded-lg">آلية العمل: ينتقل لكل صفحة، يضغط زر "رسالة"، يكتب الرسالة ويرسلها تلقائياً.</p>
              <div><label className="label-field">روابط الصفحات (سطر لكل رابط)</label><textarea className="textarea-field" rows={4} value={sendPageUrls} onChange={e => setSendPageUrls(e.target.value)} placeholder="https://facebook.com/page1&#10;https://facebook.com/page2" /></div>
              <div><label className="label-field">نص الرسالة</label><textarea className="textarea-field" rows={3} value={sendPageMessage} onChange={e => setSendPageMessage(e.target.value)} placeholder="مرحباً، أود التعرف على خدماتكم..." /></div>
              <button onClick={handleSendPageMessages} disabled={loading} className="btn-primary w-full bg-orange-600 hover:bg-orange-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال للصفحات</>}</button>
            </div>
          </div>
          <div className="card">
            <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><Copy size={20} className="text-teal-600" /> تحويل Users إلى IDs</h3>
            <div className="space-y-4">
              <div><label className="label-field">أسماء المستخدمين (سطر لكل اسم)</label><textarea className="textarea-field" rows={4} value={usersToIds} onChange={e => setUsersToIds(e.target.value)} placeholder="username1&#10;username2" /></div>
              <button onClick={handleUsersToIds} disabled={loading} className="btn-primary w-full bg-teal-600 hover:bg-teal-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><Copy size={18} /> تحويل</>}</button>
            </div>
          </div>
          <div className="card col-span-2">
            <h3 className="font-bold text-secondary-900 mb-4 flex items-center gap-2"><FileText size={20} className="text-amber-600" /> تحويل الروابط إلى IDs</h3>
            <div className="space-y-4">
              <div><label className="label-field">قائمة الروابط (سطر لكل رابط)</label><textarea className="textarea-field" rows={4} value={linksToIds} onChange={e => setLinksToIds(e.target.value)} placeholder="https://facebook.com/profile.php?id=...&#10;https://facebook.com/username" /></div>
              <button onClick={handleLinksToIds} disabled={loading} className="btn-primary w-full bg-amber-600 hover:bg-amber-700">{loading ? <Loader2 size={18} className="animate-spin" /> : <><FileText size={18} /> تحويل</>}</button>
            </div>
          </div>
        </div>
      </div>
      {toolResults.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-secondary-900">النتائج ({toolResults.length})</h3><div className="flex gap-2"><button onClick={() => handleExport(['الاسم', 'معرف المستخدم', 'الرابط', 'الهاتف', 'الحالة'], 'facebook-tools', toolResults)} className="btn-success text-sm"><FileSpreadsheet size={16} /> تصدير</button><button onClick={() => { setToolResults([]); setStreamResults([]); streamResultsRef.current = [] }} className="btn-danger text-sm"><Trash2 size={16} /> مسح</button></div></div>
          <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
            <table className="data-table"><thead><tr><th>#</th><th>الاسم</th><th>معرف المستخدم</th><th>الرابط</th><th>الهاتف</th><th>الحالة</th></tr></thead>
              <tbody>{toolResults.map((r: any, i: number) => {
                const userId = r.userId || r.id || r.username || '-'
                return (<tr key={i}><td className="text-secondary-500">{i + 1}</td><td className="font-medium text-sm">{r.name || r.recipient || r.group || '-'}</td><td className="text-xs font-mono text-primary-600">{userId}</td><td className="text-xs max-w-[150px] truncate">{r.profile || r.url || r.link || '-'}</td><td className="text-xs">{r.phone || '-'}</td><td><span className={`badge ${r.status === 'found' || r.status === 'sent' || r.status === 'liked' || r.status === 'loved' || r.status === 'shared' || r.status === 'posted' || r.status === 'replied' || r.status === 'mentioned' || r.status === 'deleted' ? 'badge-success' : r.status === 'not_found' || r.status === 'skipped' ? 'badge-warning' : 'badge-danger'}`}>{r.status}</span></td></tr>)
              })}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'login': return renderLogin()
      case 'extract': return renderExtract()
      case 'marketing': return renderMarketing()
      case 'messaging': return renderMessaging()
      case 'tools': return renderTools()
      default: return renderLogin()
    }
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message ? 'text-emerald-700' : 'text-red-600'}`} style={message ? { background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' } : { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {message ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {message || error}
        </div>
      )}
      <div className="flex gap-1 p-1.5 rounded-xl overflow-x-auto" style={{ background: 'rgba(241,245,249,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(226,232,240,0.5)' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="tab-button"
              style={isActive ? {
                color: '#0A6CF1',
                background: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 4px rgba(10, 108, 241, 0.15), 0 4px 12px rgba(10, 108, 241, 0.08)',
                fontWeight: 600,
              } : {}}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
      {renderContent()}
    </div>
  )
}
