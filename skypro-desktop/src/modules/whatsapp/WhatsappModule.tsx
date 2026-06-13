import { useState, useRef } from 'react'
import { usePlatform } from '../../hooks/usePlatform'
import { makeJobId } from '../../lib/jobId'
import { useAccountsStore } from '../../stores/accountsStore'
import AccountSelector from '../../components/common/AccountSelector'
import AccountCycleBanner from '../../components/common/AccountCycleBanner'
import MessageSafetyToolbar from '../../components/common/MessageSafetyToolbar'
import ToolGrid from '../../components/tools/ToolGrid'
import ToolCard from '../../components/tools/ToolCard'
import ToolPanel from '../../components/tools/ToolPanel'
import type { LucideIcon } from 'lucide-react'
import {
  Filter, Download, Users, Send, Play, AlertCircle, CheckCircle, Loader2,
  Trash2, BarChart3, MessageSquare, FileSpreadsheet, LogIn, LogOut, Wrench,
  MessageCircle, Image as ImageIcon, Zap, UserPlus, Contact, FileText, X,
  Megaphone, Archive, Network, Search,
} from 'lucide-react'

type ActiveTool =
  | 'broadcast' | 'filter' | 'extract' | 'groups'
  | 'fast-send' | 'send-media' | 'extract-chats' | 'extract-contacts'
  | 'extract-group-members' | 'add-to-group' | 'numbers-to-vcf'
  | 'temp-group-broadcast' | 'extract-archived' | 'multi-number-rotation'
  | 'extract-cross-platform'
  | null
type ResultsOwner =
  | 'broadcast' | 'filter' | 'extract' | 'groups'
  | 'fast-send' | 'send-media' | 'extract-chats' | 'extract-contacts'
  | 'extract-group-members' | 'add-to-group'
  | 'temp-group-broadcast' | 'extract-archived' | 'multi-number-rotation'
  | 'extract-cross-platform'
  | null

const ACCENT = '#25D366'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #25D366, #128C7E)'

export default function WhatsappModule() {
  const {
    loading, setLoading, message, error, showMsg, sessionId, setSessionId,
    accounts, results, loadAccounts, loadResults, handleExport, clearResults,
    deleteResult, clearSession, cycleActive, cycleProgress, startCycle, stopCycle,
    liveRows, beginLiveJob, endLiveJob,
  } = usePlatform('whatsapp')
  const { accounts: allAccounts } = useAccountsStore()

  const [activeTool, setActiveTool] = useState<ActiveTool>(null)
  const [showLoginPanel, setShowLoginPanel] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [filterNumbers, setFilterNumbers] = useState('')
  const [extractType, setExtractType] = useState('groups')
  const [recipientsText, setRecipientsText] = useState('')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [groupUrls, setGroupUrls] = useState('')
  const [groupMessage, setGroupMessage] = useState('')
  const [toolResults, setToolResults] = useState<any[]>([])
  const [resultsOwner, setResultsOwner] = useState<ResultsOwner>(null)
  const [proxy, setProxy] = useState('')

  // --- Fast send (uses wa.me deep links) ---
  const [fastRecipients, setFastRecipients] = useState('')
  const [fastMessage, setFastMessage] = useState('')
  const [fastDelay, setFastDelay] = useState(4)
  // --- Send media (images/videos) ---
  const [mediaRecipients, setMediaRecipients] = useState('')
  const [mediaCaption, setMediaCaption] = useState('')
  const [mediaPaths, setMediaPaths] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // --- Extract chats / contacts / members ---
  const [chatsLimit, setChatsLimit] = useState(200)
  const [chatsIncludeGroups, setChatsIncludeGroups] = useState(true)
  const [chatsIncludeContacts, setChatsIncludeContacts] = useState(true)
  const [contactsLimit, setContactsLimit] = useState(500)
  const [groupMembersName, setGroupMembersName] = useState('')
  const [groupMembersLimit, setGroupMembersLimit] = useState(500)
  // --- Add to group ---
  const [addGroupName, setAddGroupName] = useState('')
  const [addGroupPhones, setAddGroupPhones] = useState('')
  const [addGroupDelay, setAddGroupDelay] = useState(3)
  // --- Numbers to vCard ---
  const [vcfNumbers, setVcfNumbers] = useState('')
  const [vcfPrefix, setVcfPrefix] = useState('SkyPro Lead')

  // --- Temp-group broadcast ---
  const [tempGroupName, setTempGroupName] = useState('SkyPro Broadcast')
  const [tempGroupMembers, setTempGroupMembers] = useState('')
  const [tempGroupMessage, setTempGroupMessage] = useState('')
  const [tempGroupLeave, setTempGroupLeave] = useState(true)
  // --- Archived ---
  const [archivedLimit, setArchivedLimit] = useState(200)
  // --- Multi-number rotation ---
  const [rotationSessions, setRotationSessions] = useState('')
  const [rotationRecipients, setRotationRecipients] = useState('')
  const [rotationMessage, setRotationMessage] = useState('')
  const [rotationDelay, setRotationDelay] = useState(6)
  // --- Cross-platform extract ---
  const [crossKeyword, setCrossKeyword] = useState('')
  const [crossSources, setCrossSources] = useState<('google' | 'facebook' | 'telegram' | 'twitter')[]>(['google', 'telegram'])
  const [crossLimit, setCrossLimit] = useState(100)

  const handleLaunch = async () => {
    setLoading(true)
    try {
      const res = await window.electronAPI.whatsappLaunch({ proxy: proxy || undefined })
      if (res.success) {
        setSessionId(res.sessionId || '')
        if (res.needsQR) { setShowQR(true); showMsg('افتح كاميرا الهاتف وامسح QR code الظاهر في المتصفح') }
        else { setShowQR(false); showMsg('WhatsApp متصل بنجاح!'); setShowLoginPanel(false) }
        await loadAccounts()
      } else showMsg(res.error || 'فشل الاتصال', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const handleSend = async () => {
    if (!sessionId) { showMsg('يرجى فتح WhatsApp أولاً', true); return }
    if (!recipientsText || !broadcastMessage) { showMsg('يرجى إدخال الأرقام والرسالة', true); return }
    setLoading(true)
    setResultsOwner('broadcast')
    setToolResults([])
    const recipients = recipientsText.split('\n').map(r => r.trim()).filter(Boolean)
    const jobId = makeJobId('wa-send')
    beginLiveJob(jobId)
    try {
      const res = await window.electronAPI.whatsappSendMessages({ sessionId, recipients, message: broadcastMessage, jobId })
      if (res.success) {
        const sent = ((res.data as any[]) || []).filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال ${sent} من ${recipients.length} رسالة`)
        setToolResults((res.data as any[]) || [])
      } else showMsg(res.error || 'فشل الإرسال', true)
    } catch (err: any) { showMsg(err.message || 'خطأ في الإرسال', true) }
    finally { endLiveJob(); setLoading(false) }
  }

  const handleFilter = async () => {
    const numbers = filterNumbers.split('\n').map(s => s.trim()).filter(Boolean)
    if (numbers.length === 0) { showMsg('أدخل الأرقام', true); return }
    setLoading(true)
    setResultsOwner('filter')
    try {
      const res = await window.electronAPI.whatsappFilterNumbers({ numbers })
      if (res.success) {
        const filteredData = (res as any).data || []
        setToolResults(filteredData)
        showMsg(`تم فلترة ${filteredData.length} رقم - ${filteredData.filter((r: any) => r.status === 'valid' || r.status === 'نشط').length} رقم فعال`)
        await loadResults()
      } else showMsg((res as any).error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleExtract = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    setLoading(true)
    setResultsOwner('extract')
    setToolResults([])
    try {
      let res
      if (extractType === 'chats') {
        res = await window.electronAPI.whatsappExtractChats({ sessionId, limit: 200, includeGroups: true, includeContacts: true })
      } else if (extractType === 'analyze-groups') {
        // Same data source as chats, but only groups — useful for content analysis.
        res = await window.electronAPI.whatsappExtractChats({ sessionId, limit: 200, includeGroups: true, includeContacts: false })
      } else {
        res = await window.electronAPI.whatsappExtractGroups({ sessionId })
      }
      if (res.success) {
        setToolResults((res.data as any[]) || [])
        showMsg(`تم استخراج ${res.count || ((res.data as any[]) || []).length} نتيجة`)
        await loadResults()
      } else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleGroupPost = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    if (!groupMessage) { showMsg('أدخل نص الرسالة', true); return }
    const groups = groupUrls.split('\n').map(s => s.trim()).filter(Boolean)
    if (groups.length === 0) { showMsg('أدخل روابط المجموعات', true); return }
    setLoading(true)
    setResultsOwner('groups')
    try {
      const res = await window.electronAPI.whatsappGroupPost({ sessionId, groups, message: groupMessage })
      if (res.success) { showMsg('تم النشر في المجموعات'); setToolResults((res.data as any[]) || []) }
      else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'فشلت العملية', true) }
    setLoading(false)
  }

  const handleClearResults = () => {
    setToolResults([])
    setResultsOwner(null)
    clearResults()
  }

  // ---- Fast send (wa.me deep links) ----
  const handleFastSend = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    if (!fastMessage.trim()) { showMsg('أدخل نص الرسالة', true); return }
    const list = fastRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (list.length === 0) { showMsg('أدخل الأرقام', true); return }
    setLoading(true)
    setResultsOwner('fast-send')
    setToolResults([])
    try {
      const res = await window.electronAPI.whatsappFastSend({ sessionId, recipients: list, message: fastMessage, delayMs: Math.max(1, fastDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const sent = items.filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال ${sent} من ${list.length} رسالة`)
      } else {
        showMsg(res.error || 'فشل الإرسال', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Send media (images / videos) ----
  const handlePickMedia = () => fileInputRef.current?.click()
  const handleMediaSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    // electronAPI exposes a `path` on File via Electron — use that for native send.
    const paths = Array.from(files).map(f => (f as any).path).filter(Boolean)
    setMediaPaths(paths)
    // Reset the input so the same file can be picked again later.
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
  const handleRemoveMedia = (idx: number) => setMediaPaths(prev => prev.filter((_, i) => i !== idx))
  const handleSendMedia = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    if (mediaPaths.length === 0) { showMsg('اختر ملف صورة أو فيديو واحدًا على الأقل', true); return }
    const list = mediaRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (list.length === 0) { showMsg('أدخل الأرقام', true); return }
    setLoading(true)
    setResultsOwner('send-media')
    setToolResults([])
    try {
      const res = await window.electronAPI.whatsappSendMedia({ sessionId, recipients: list, mediaPaths, caption: mediaCaption })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const sent = items.filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال الوسائط إلى ${sent} من ${list.length}`)
      } else {
        showMsg(res.error || 'فشل الإرسال', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Extract chats ----
  const handleExtractChats = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    setLoading(true)
    setResultsOwner('extract-chats')
    setToolResults([])
    try {
      const res = await window.electronAPI.whatsappExtractChats({ sessionId, limit: chatsLimit, includeGroups: chatsIncludeGroups, includeContacts: chatsIncludeContacts })
      if (res.success) {
        setToolResults((res.data as any[]) || [])
        showMsg(`تم استخراج ${res.count || 0} محادثة`)
        await loadResults()
      } else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Extract contacts ----
  const handleExtractContacts = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    setLoading(true)
    setResultsOwner('extract-contacts')
    setToolResults([])
    try {
      const res = await window.electronAPI.whatsappExtractContacts({ sessionId, limit: contactsLimit })
      if (res.success) {
        setToolResults((res.data as any[]) || [])
        showMsg(`تم استخراج ${res.count || 0} جهة اتصال`)
        await loadResults()
      } else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Extract group members ----
  const handleExtractGroupMembers = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    if (!groupMembersName.trim()) { showMsg('أدخل اسم المجموعة المراد استخراج أعضائها', true); return }
    setLoading(true)
    setResultsOwner('extract-group-members')
    setToolResults([])
    try {
      const res = await window.electronAPI.whatsappExtractGroupMembers({ sessionId, groupName: groupMembersName.trim(), limit: groupMembersLimit })
      if (res.success) {
        setToolResults((res.data as any[]) || [])
        showMsg(`تم استخراج ${res.count || 0} عضو`)
        await loadResults()
      } else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Add numbers to group ----
  const handleAddToGroup = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    if (!addGroupName.trim()) { showMsg('أدخل اسم المجموعة', true); return }
    const phones = addGroupPhones.split('\n').map(s => s.trim()).filter(Boolean)
    if (phones.length === 0) { showMsg('أدخل الأرقام', true); return }
    setLoading(true)
    setResultsOwner('add-to-group')
    setToolResults([])
    try {
      const res = await window.electronAPI.whatsappAddToGroup({ sessionId, groupName: addGroupName.trim(), phones, delayMs: Math.max(1, addGroupDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const added = items.filter((r: any) => r.status === 'added').length
        showMsg(`تم إضافة ${added} من ${phones.length} رقم`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Temp-group broadcast ----
  const handleTempGroupBroadcast = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    const members = tempGroupMembers.split('\n').map(s => s.trim()).filter(Boolean)
    if (members.length === 0) { showMsg('أدخل الأرقام', true); return }
    if (!tempGroupMessage.trim()) { showMsg('أدخل نص الرسالة', true); return }
    setLoading(true)
    setResultsOwner('temp-group-broadcast')
    setToolResults([])
    try {
      const res = await window.electronAPI.whatsappTempGroupBroadcast({ sessionId, groupName: tempGroupName.trim() || 'SkyPro Broadcast', members, message: tempGroupMessage, leaveAfter: tempGroupLeave })
      if (res.success) {
        const d: any = res.data || {}
        setToolResults(Array.isArray(d.members) ? d.members : [])
        showMsg(`تم البث للمجموعة المؤقتة وخرجت منها: ${d.leftStatus === 'left' ? 'نعم' : 'لا'}`)
      } else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Extract archived ----
  const handleExtractArchived = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً', true); return }
    setLoading(true)
    setResultsOwner('extract-archived')
    setToolResults([])
    try {
      const res = await window.electronAPI.whatsappExtractArchived({ sessionId, limit: archivedLimit })
      if (res.success) {
        setToolResults((res.data as any[]) || [])
        showMsg(`تم استخراج ${res.count || 0} محادثة مؤرشفة`)
        await loadResults()
      } else showMsg(res.error || 'فشل الاستخراج', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Multi-number rotation ----
  const handleMultiNumberRotation = async () => {
    const sessionList = rotationSessions.split('\n').map(s => s.trim()).filter(Boolean)
    if (sessionList.length === 0) { showMsg('أدخل sessionIds من الجلسات النشطة', true); return }
    const recipients = rotationRecipients.split('\n').map(s => s.trim()).filter(Boolean)
    if (recipients.length === 0) { showMsg('أدخل المستلمين', true); return }
    if (!rotationMessage.trim()) { showMsg('أدخل الرسالة', true); return }
    setLoading(true)
    setResultsOwner('multi-number-rotation')
    setToolResults([])
    try {
      const res = await window.electronAPI.whatsappMultiNumberRotation({ sessionIds: sessionList, recipients, message: rotationMessage, delayMs: Math.max(2, rotationDelay) * 1000 })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        const sent = items.filter((r: any) => r.status === 'sent').length
        showMsg(`تم إرسال ${sent} من ${recipients.length} عبر ${sessionList.length} رقم`)
      } else {
        showMsg(res.error || 'فشلت العملية', true)
        if (res.partialData) setToolResults(res.partialData as any[])
      }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Cross-platform extract ----
  const handleExtractCrossPlatform = async () => {
    if (!sessionId) { showMsg('افتح WhatsApp أولاً (الجلسة تُستخدم لتشغيل المتصفح)', true); return }
    if (!crossKeyword.trim()) { showMsg('أدخل الكلمة المفتاحية', true); return }
    if (crossSources.length === 0) { showMsg('اختر مصدر واحد على الأقل', true); return }
    setLoading(true)
    setResultsOwner('extract-cross-platform')
    setToolResults([])
    try {
      const res = await window.electronAPI.whatsappExtractGroupsFromPlatforms({ sessionId, keyword: crossKeyword.trim(), sources: crossSources, limit: crossLimit })
      if (res.success) {
        const items = (res.data as any[]) || []
        setToolResults(items)
        showMsg(`تم العثور على ${res.count || items.length} جروب WhatsApp`)
        await loadResults()
      } else { showMsg(res.error || 'فشل الاستخراج', true); if (res.partialData) setToolResults(res.partialData as any[]) }
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  // ---- Numbers -> vCard ----
  const handleNumbersToVcf = async () => {
    const numbers = vcfNumbers.split('\n').map(s => s.trim()).filter(Boolean)
    if (numbers.length === 0) { showMsg('أدخل الأرقام', true); return }
    setLoading(true)
    try {
      const res = await window.electronAPI.whatsappNumbersToVcf({ numbers, namePrefix: vcfPrefix || 'Lead' })
      if (res.success) {
        showMsg(`تم حفظ ${res.data?.count ?? numbers.length} جهة اتصال في: ${res.data?.path ?? ''}`)
      } else showMsg(res.error || 'فشلت العملية', true)
    } catch (err: any) { showMsg(err.message || 'خطأ', true) }
    setLoading(false)
  }

  const extractTools: Array<{ id: string; name: string; desc: string; icon: LucideIcon }> = [
    { id: 'groups', name: 'استخراج المجموعات', desc: 'قائمة المجموعات الظاهرة', icon: Users },
    { id: 'chats', name: 'محادثاتي الحالية', desc: 'المحادثات في القائمة الجانبية', icon: MessageSquare },
    { id: 'analyze-groups', name: 'تحليل آخر الرسائل', desc: 'عدد + آخر رسالة لكل دردشة', icon: BarChart3 },
  ]

  const tools: Array<{
    id: Exclude<ActiveTool, null>
    name: string
    description: string
    icon: LucideIcon
    accent: string
    accentGradient: string
    requiresSession: boolean
  }> = [
    { id: 'broadcast', name: 'إرسال رسائل', description: 'بث رسائل لقائمة أرقام', icon: Send, accent: '#25D366', accentGradient: 'linear-gradient(135deg, #25D366, #128C7E)', requiresSession: true },
    { id: 'fast-send', name: 'إرسال سريع', description: 'بث أسرع عبر روابط wa.me (35/ساعة)', icon: Zap, accent: '#eab308', accentGradient: 'linear-gradient(135deg, #eab308, #ca8a04)', requiresSession: true },
    { id: 'send-media', name: 'إرسال صور / فيديو', description: 'بث وسائط متعددة مع تعليق', icon: ImageIcon, accent: '#ec4899', accentGradient: 'linear-gradient(135deg, #ec4899, #be185d)', requiresSession: true },
    { id: 'filter', name: 'فلترة الأرقام', description: 'فحص الأرقام الفعالة على واتساب', icon: Filter, accent: '#0ea5e9', accentGradient: 'linear-gradient(135deg, #0ea5e9, #0369a1)', requiresSession: false },
    { id: 'extract', name: 'استخراج البيانات', description: 'استخراج المجموعات والمراسلين', icon: Download, accent: '#8b5cf6', accentGradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', requiresSession: true },
    { id: 'extract-chats', name: 'استخراج محادثاتي', description: 'استخراج قائمة المحادثات الحالية', icon: MessageSquare, accent: '#06b6d4', accentGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', requiresSession: true },
    { id: 'extract-contacts', name: 'استخراج جهات الاتصال', description: 'استخراج كل جهات اتصالك', icon: Contact, accent: '#14b8a6', accentGradient: 'linear-gradient(135deg, #14b8a6, #0d9488)', requiresSession: true },
    { id: 'extract-group-members', name: 'استخراج أعضاء مجموعة', description: 'استخراج أعضاء مجموعة معينة', icon: Users, accent: '#10b981', accentGradient: 'linear-gradient(135deg, #10b981, #047857)', requiresSession: true },
    { id: 'groups', name: 'النشر في المجموعات', description: 'بث رسالة لقائمة مجموعات', icon: Users, accent: '#f59e0b', accentGradient: 'linear-gradient(135deg, #f59e0b, #d97706)', requiresSession: true },
    { id: 'add-to-group', name: 'إضافة أرقام لمجموعة', description: 'إضافة قائمة أرقام لمجموعة قائمة', icon: UserPlus, accent: '#84cc16', accentGradient: 'linear-gradient(135deg, #84cc16, #4d7c0f)', requiresSession: true },
    { id: 'numbers-to-vcf', name: 'تحويل لأرقام لـ vCard', description: 'إنشاء ملف جهات اتصال للهاتف', icon: FileText, accent: '#a855f7', accentGradient: 'linear-gradient(135deg, #a855f7, #7e22ce)', requiresSession: false },
    { id: 'temp-group-broadcast', name: 'بث عبر مجموعة مؤقتة', description: 'إنشاء مجموعة + بث + خروج تلقائي', icon: Megaphone, accent: '#06b6d4', accentGradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', requiresSession: true },
    { id: 'extract-archived', name: 'استخراج المؤرشفات', description: 'استخراج المحادثات المؤرشفة', icon: Archive, accent: '#64748b', accentGradient: 'linear-gradient(135deg, #64748b, #334155)', requiresSession: true },
    { id: 'multi-number-rotation', name: 'بث بأرقام متعددة', description: 'تدوير الأرقام لتقليل الحظر', icon: Network, accent: '#22c55e', accentGradient: 'linear-gradient(135deg, #22c55e, #15803d)', requiresSession: false },
    { id: 'extract-cross-platform', name: 'استخراج من منصات أخرى', description: 'جروبات WA من Google/FB/TG', icon: Search, accent: '#6366f1', accentGradient: 'linear-gradient(135deg, #6366f1, #4338ca)', requiresSession: true },
  ]

  const currentTool = tools.find(t => t.id === activeTool) ?? null

  const renderSessionCard = () => (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(37,211,102,0.06), rgba(18,140,126,0.04))',
        border: '1px solid rgba(37,211,102,0.18)',
        boxShadow: '0 4px 20px rgba(37,211,102,0.06)',
      }}
    >
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: ACCENT_GRADIENT, boxShadow: '0 4px 12px rgba(37,211,102,0.3)' }}
          >
            <MessageCircle size={22} />
          </div>
          <div>
            <h3 className="font-bold text-secondary-900 text-base leading-tight">WhatsApp</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{
                  background: sessionId ? '#22c55e' : '#94a3b8',
                  boxShadow: sessionId ? '0 0 8px rgba(34,197,94,0.6)' : 'none',
                }}
              />
              <span className="text-xs font-medium" style={{ color: sessionId ? '#16a34a' : '#64748b' }}>
                {sessionId ? 'متصل — جاهز للعمل' : 'غير متصل — افتح WhatsApp أولاً'}
              </span>
              {accounts.length > 0 && (
                <span className="text-[11px] text-secondary-500">• {accounts.length} جلسة محفوظة</span>
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
              <Play size={16} /> فتح WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  )

  const renderLoginPanelContent = () => (
    <div className="space-y-5">
      {sessionId && (
        <div className="p-4 rounded-xl border" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.25)' }}>
          <div className="flex items-center gap-2">
            <CheckCircle size={18} className="text-success-600" />
            <p className="font-semibold text-success-700 text-sm">WhatsApp متصل — يمكنك استخدام جميع الأدوات</p>
          </div>
        </div>
      )}
      {showQR && (
        <div className="p-3 bg-warning-50 text-warning-700 rounded-lg text-sm">
          <AlertCircle size={16} className="inline ml-1" /> افتح كاميرا الهاتف وامسح QR code من نافذة المتصفح
        </div>
      )}
      <div>
        <label className="label-field">بروكسي (اختياري)</label>
        <input type="text" value={proxy} onChange={e => setProxy(e.target.value)} placeholder="host:port أو user:pass@host:port" className="input-field text-sm" dir="ltr" />
      </div>
      <p className="text-xs text-secondary-400 text-center">سيتم فتح نافذة المتصفح — امسح رمز QR بهاتفك للاتصال</p>

      {accounts.length > 0 && (
        <div>
          <h4 className="font-bold text-secondary-900 text-sm mb-3">الجلسات المحفوظة على الجهاز</h4>
          <div className="space-y-2 max-h-[280px] overflow-y-auto scroll-container pr-1">
            {accounts.map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-secondary-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'rgba(37,211,102,0.1)', color: '#128C7E' }}>
                    {(acc.username || acc.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-secondary-900 text-sm truncate">{acc.username || acc.email || 'حساب واتساب'}</p>
                    <p className="text-[11px] text-secondary-500">{new Date(acc.created_at || Date.now()).toLocaleDateString('ar-EG')}</p>
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
      onClick={handleLaunch}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : <><Play size={20} /> فتح WhatsApp Web</>}
    </button>
  )

  const renderResultsTable = (owner: ResultsOwner, columns: string[], exportKey: string, showActions = false) => {
    if (resultsOwner !== owner) return null
    const isFilter = owner === 'filter'
    const displayResults = toolResults.length > 0 ? toolResults : (liveRows.length > 0 ? liveRows : (isFilter ? results : []))
    const list = displayResults as any[]
    if (list.length === 0) return null
    return (
      <div className="mt-5 rounded-xl border border-secondary-200 bg-white/[0.04] overflow-hidden">
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
                if (owner === 'broadcast' || owner === 'fast-send') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.recipient || r.name || '-'}</td>
                      <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'send-media') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.recipient || '-'}</td>
                      <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.mediaCount || r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'filter') {
                  return (
                    <tr key={r.id || i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || r.phone || r.number || '-'}</td>
                      <td><span className={`badge ${(r.status || r.extra || '') === 'valid' || (r.status || r.extra || '').includes('نشط') ? 'badge-success' : 'badge-danger'}`}>{r.status || r.extra || 'غير معروف'}</span></td>
                      {showActions && (
                        <td><button onClick={() => r.id && deleteResult(r.id)} className="p-1 text-danger-500 hover:bg-danger-50 rounded"><Trash2 size={14} /></button></td>
                      )}
                    </tr>
                  )
                }
                if (owner === 'extract') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || r.group || '-'}</td>
                      <td className="text-xs max-w-[200px] truncate">{r.url || r.link || '-'}</td>
                      <td><span className={`badge ${r.status === 'joined' || r.status === 'active' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status || '-'}</span></td>
                    </tr>
                  )
                }
                if (owner === 'extract-chats') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs max-w-[260px] truncate text-secondary-600">{r.lastMessage || '-'}</td>
                      <td><span className={`badge ${r.type === 'group' ? 'badge-warning' : 'badge-success'}`}>{r.type === 'group' ? 'مجموعة' : 'محادثة'}</span></td>
                      <td className="text-xs text-secondary-500">{r.time || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-contacts') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs max-w-[300px] truncate text-secondary-600">{r.status || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-group-members') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td dir="ltr" className="text-xs font-mono">{r.phone || '-'}</td>
                      <td className="text-xs text-secondary-500">{r.status || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'add-to-group' || owner === 'temp-group-broadcast') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td dir="ltr" className="font-mono text-sm">{r.phone || '-'}</td>
                      <td><span className={`badge ${r.status === 'added' ? 'badge-success' : 'badge-danger'}`}>{r.status || '-'}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-archived') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="font-medium">{r.name || '-'}</td>
                      <td className="text-xs max-w-[260px] truncate text-secondary-600">{r.lastMessage || '-'}</td>
                      <td className="text-xs text-secondary-500">{r.time || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'multi-number-rotation') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td dir="ltr" className="font-mono text-sm">{r.recipient || '-'}</td>
                      <td dir="ltr" className="text-xs text-secondary-500 max-w-[140px] truncate">{r.sessionId || '-'}</td>
                      <td><span className={`badge ${r.status === 'sent' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
                      <td className="text-xs text-secondary-500">{r.error || '-'}</td>
                    </tr>
                  )
                }
                if (owner === 'extract-cross-platform') {
                  return (
                    <tr key={i}>
                      <td className="text-secondary-500">{i + 1}</td>
                      <td className="text-xs"><a href={r.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" dir="ltr">{(r.url || '').replace('https://chat.whatsapp.com/', '')}</a></td>
                      <td className="text-xs"><span className="badge badge-warning">{r.source}</span></td>
                      <td className="text-xs text-secondary-500">{r.keyword || '-'}</td>
                    </tr>
                  )
                }
                // groups (default)
                return (
                  <tr key={i}>
                    <td className="text-secondary-500">{i + 1}</td>
                    <td className="font-medium">{r.name || r.group || '-'}</td>
                    <td><span className={`badge ${r.status === 'posted' || r.status === 'sent' ? 'badge-success' : r.status === 'failed' ? 'badge-danger' : 'badge-warning'}`}>{r.status || '-'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderBroadcastBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الأرقام (سطر لكل رقم)</label>
        <textarea className="textarea-field" rows={5} value={recipientsText} onChange={e => setRecipientsText(e.target.value)} placeholder="+2010xxxxxxxxx&#10;+9665xxxxxxxxx" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={4} value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="اكتب رسالتك هنا..." />
      </div>
      <MessageSafetyToolbar template={broadcastMessage} onApply={(v) => setBroadcastMessage(v)} accent="#25D366" />
      {renderResultsTable('broadcast', ['#', 'المستلم', 'الحالة', 'خطأ'], 'whatsapp-messages')}
    </div>
  )

  const broadcastFooter = (
    <button
      onClick={handleSend}
      disabled={loading}
      className="btn-success w-full disabled:opacity-50"
      style={{ background: ACCENT_GRADIENT }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال</>}
    </button>
  )

  const renderFilterBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الأرقام (سطر لكل رقم)</label>
        <textarea className="textarea-field" rows={8} value={filterNumbers} onChange={e => setFilterNumbers(e.target.value)} placeholder="+2010xxxxxxxxx&#10;+9665xxxxxxxxx" />
      </div>
      {renderResultsTable('filter', ['#', 'الرقم', 'الحالة', ''], 'whatsapp-filter', true)}
    </div>
  )

  const filterFooter = (
    <button
      onClick={handleFilter}
      disabled={loading || !filterNumbers.trim()}
      className="btn-primary w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Filter size={18} /> فلترة</>}
    </button>
  )

  const renderExtractBody = () => (
    <div className="space-y-5">
      <AccountSelector
        platformId="whatsapp"
        accounts={allAccounts}
        cycleActive={cycleActive}
        cycleProgress={cycleProgress}
        onStartCycle={(selectedAccounts, task, settings) => startCycle(selectedAccounts, task, settings)}
        onStopCycle={stopCycle}
        extractTask={{ type: 'extract', params: { extractType } }}
        sendTask={{ type: 'send', params: { recipients: recipientsText.split('\n').filter(Boolean), message: broadcastMessage } }}
      />
      <div>
        <label className="label-field">نوع الاستخراج</label>
        <select className="select-field" value={extractType} onChange={e => setExtractType(e.target.value)}>
          {extractTools.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {extractTools.map(tool => {
          const isSel = extractType === tool.id
          return (
            <button key={tool.id} onClick={() => setExtractType(tool.id)}
              className="rounded-xl border bg-white/[0.04] p-3 text-center relative cursor-pointer"
              style={isSel ? { borderColor: '#22c55e', boxShadow: '0 0 0 2px rgba(34,197,94,0.2)' } : { borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="w-9 h-9 rounded-xl mx-auto flex items-center justify-center"
                style={isSel ? { background: ACCENT_GRADIENT, color: 'white' } : { background: 'rgba(255,255,255,0.03)', color: '#64748b' }}>
                <tool.icon size={18} />
              </div>
              <p className="text-[10px] font-bold mt-2" style={{ color: isSel ? '#22c55e' : '#334155' }}>{tool.name}</p>
            </button>
          )
        })}
      </div>
      {renderResultsTable('extract', ['#', 'الاسم', 'الرابط', 'الحالة'], 'whatsapp-extract')}
    </div>
  )

  const extractFooter = (
    <button
      onClick={handleExtract}
      disabled={loading}
      className="btn-success w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Play size={18} /> بدء الاستخراج</>}
    </button>
  )

  const renderGroupsBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">روابط المجموعات (سطر لكل مجموعة)</label>
        <textarea className="textarea-field" rows={5} value={groupUrls} onChange={e => setGroupUrls(e.target.value)} placeholder="https://chat.whatsapp.com/..." />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={4} value={groupMessage} onChange={e => setGroupMessage(e.target.value)} placeholder="اكتب رسالتك..." />
      </div>
      {renderResultsTable('groups', ['#', 'المجموعة', 'الحالة'], 'whatsapp-groups')}
    </div>
  )

  const groupsFooter = (
    <button
      onClick={handleGroupPost}
      disabled={loading || !groupMessage.trim()}
      className="btn-success w-full disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
    >
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> نشر في المجموعات</>}
    </button>
  )

  // -------- Fast send panel --------
  const renderFastSendBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-700" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        أسرع 2-3 مرات من الإرسال العادي. استخدم دفعات صغيرة (أقل من 50 رقم) لتجنب التقييد.
      </div>
      <div>
        <label className="label-field">الأرقام (سطر لكل رقم)</label>
        <textarea className="textarea-field" rows={6} value={fastRecipients} onChange={e => setFastRecipients(e.target.value)} placeholder="+2010xxxxxxxx&#10;+9665xxxxxxxx" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={3} value={fastMessage} onChange={e => setFastMessage(e.target.value)} placeholder="اكتب رسالتك..." />
      </div>
      <MessageSafetyToolbar template={fastMessage} onApply={(v) => setFastMessage(v)} accent="#eab308" />
      <div>
        <label className="label-field">الفاصل الزمني بين الرسائل (ثانية)</label>
        <input type="number" min={1} max={60} className="input-field w-32" value={fastDelay} onChange={e => setFastDelay(Number(e.target.value) || 4)} />
      </div>
      {renderResultsTable('fast-send', ['#', 'المستلم', 'الحالة', 'خطأ'], 'whatsapp-fast')}
    </div>
  )
  const fastSendFooter = (
    <button onClick={handleFastSend} disabled={loading || !fastMessage.trim()} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Zap size={18} /> إرسال سريع</>}
    </button>
  )

  // -------- Send media panel --------
  const renderSendMediaBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الأرقام (سطر لكل رقم)</label>
        <textarea className="textarea-field" rows={5} value={mediaRecipients} onChange={e => setMediaRecipients(e.target.value)} placeholder="+2010xxxxxxxx" />
      </div>
      <div>
        <label className="label-field">الوسائط (صور / فيديو)</label>
        <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" onChange={handleMediaSelected} className="hidden" />
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={handlePickMedia} type="button" className="btn-secondary text-sm">
            <ImageIcon size={16} /> اختر ملفات
          </button>
          {mediaPaths.length === 0 && <span className="text-xs text-secondary-400">لم يتم اختيار أي ملف</span>}
        </div>
        {mediaPaths.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-xs">
            {mediaPaths.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-secondary-100">
                <span className="truncate" dir="ltr">{p}</span>
                <button onClick={() => handleRemoveMedia(i)} className="text-danger-500 p-1 hover:bg-danger-50 rounded" type="button"><X size={14} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label className="label-field">تعليق (اختياري)</label>
        <textarea className="textarea-field" rows={2} value={mediaCaption} onChange={e => setMediaCaption(e.target.value)} placeholder="تعليق يظهر تحت الوسائط..." />
      </div>
      {renderResultsTable('send-media', ['#', 'المستلم', 'الحالة', 'تفاصيل'], 'whatsapp-media')}
    </div>
  )
  const sendMediaFooter = (
    <button onClick={handleSendMedia} disabled={loading || mediaPaths.length === 0} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> إرسال الوسائط</>}
    </button>
  )

  // -------- Extract chats panel --------
  const renderExtractChatsBody = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label-field">الحد الأقصى للنتائج</label>
          <input type="number" min={20} max={2000} className="input-field" value={chatsLimit} onChange={e => setChatsLimit(Number(e.target.value) || 200)} />
        </div>
        <label className="flex items-center gap-2 mt-7 text-sm cursor-pointer">
          <input type="checkbox" checked={chatsIncludeGroups} onChange={e => setChatsIncludeGroups(e.target.checked)} className="rounded" />
          تضمين المجموعات
        </label>
        <label className="flex items-center gap-2 mt-7 text-sm cursor-pointer">
          <input type="checkbox" checked={chatsIncludeContacts} onChange={e => setChatsIncludeContacts(e.target.checked)} className="rounded" />
          تضمين المحادثات الفردية
        </label>
      </div>
      {renderResultsTable('extract-chats', ['#', 'الاسم', 'آخر رسالة', 'النوع', 'الوقت'], 'whatsapp-chats')}
    </div>
  )
  const extractChatsFooter = (
    <button onClick={handleExtractChats} disabled={loading} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><MessageSquare size={18} /> استخراج المحادثات</>}
    </button>
  )

  // -------- Extract contacts panel --------
  const renderExtractContactsBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)' }}>
        سيتم فتح قائمة "محادثة جديدة" داخل WhatsApp Web واستخراج كل جهات الاتصال المعروضة.
      </div>
      <div>
        <label className="label-field">الحد الأقصى للنتائج</label>
        <input type="number" min={50} max={5000} className="input-field" value={contactsLimit} onChange={e => setContactsLimit(Number(e.target.value) || 500)} />
      </div>
      {renderResultsTable('extract-contacts', ['#', 'الاسم', 'الحالة / آخر ظهور'], 'whatsapp-contacts')}
    </div>
  )
  const extractContactsFooter = (
    <button onClick={handleExtractContacts} disabled={loading} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Contact size={18} /> استخراج جهات الاتصال</>}
    </button>
  )

  // -------- Extract group members panel --------
  const renderExtractGroupMembersBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">اسم المجموعة</label>
        <input type="text" className="input-field" value={groupMembersName} onChange={e => setGroupMembersName(e.target.value)} placeholder="اكتب اسم المجموعة كما يظهر في WhatsApp" />
      </div>
      <div>
        <label className="label-field">الحد الأقصى للأعضاء</label>
        <input type="number" min={50} max={1500} className="input-field" value={groupMembersLimit} onChange={e => setGroupMembersLimit(Number(e.target.value) || 500)} />
      </div>
      {renderResultsTable('extract-group-members', ['#', 'الاسم', 'الهاتف', 'الحالة'], 'whatsapp-members')}
    </div>
  )
  const extractGroupMembersFooter = (
    <button onClick={handleExtractGroupMembers} disabled={loading || !groupMembersName.trim()} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #10b981, #047857)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Users size={18} /> استخراج الأعضاء</>}
    </button>
  )

  // -------- Add to group panel --------
  const renderAddToGroupBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-700" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        يتطلب أن تكون مشرف في المجموعة. ستتم إضافة 1 رقم في كل مرة لتجنب التقييد.
      </div>
      <div>
        <label className="label-field">اسم المجموعة</label>
        <input type="text" className="input-field" value={addGroupName} onChange={e => setAddGroupName(e.target.value)} placeholder="اسم المجموعة في WhatsApp" />
      </div>
      <div>
        <label className="label-field">الأرقام (سطر لكل رقم)</label>
        <textarea className="textarea-field" rows={6} value={addGroupPhones} onChange={e => setAddGroupPhones(e.target.value)} placeholder="+2010xxxxxxxx" />
      </div>
      <div>
        <label className="label-field">الفاصل الزمني (ثانية)</label>
        <input type="number" min={1} max={60} className="input-field w-32" value={addGroupDelay} onChange={e => setAddGroupDelay(Number(e.target.value) || 3)} />
      </div>
      {renderResultsTable('add-to-group', ['#', 'الرقم', 'الحالة', 'خطأ'], 'whatsapp-add-group')}
    </div>
  )
  const addToGroupFooter = (
    <button onClick={handleAddToGroup} disabled={loading || !addGroupName.trim()} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #84cc16, #4d7c0f)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><UserPlus size={18} /> إضافة للمجموعة</>}
    </button>
  )

  // -------- Numbers to vCard panel --------
  const renderNumbersToVcfBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
        أنشئ ملف <code>.vcf</code> من أرقامك، استورده على الهاتف وستظهر الأرقام مباشرة كجهات اتصال في WhatsApp.
      </div>
      <div>
        <label className="label-field">الأرقام (سطر لكل رقم)</label>
        <textarea className="textarea-field" rows={8} value={vcfNumbers} onChange={e => setVcfNumbers(e.target.value)} placeholder="+2010xxxxxxxx" />
      </div>
      <div>
        <label className="label-field">بادئة الاسم</label>
        <input type="text" className="input-field" value={vcfPrefix} onChange={e => setVcfPrefix(e.target.value)} placeholder="SkyPro Lead" />
      </div>
    </div>
  )
  const numbersToVcfFooter = (
    <button onClick={handleNumbersToVcf} disabled={loading || !vcfNumbers.trim()} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #a855f7, #7e22ce)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><FileText size={18} /> إنشاء ملف vCard</>}
    </button>
  )

  // -------- Temp-group broadcast panel --------
  const renderTempGroupBroadcastBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-amber-700" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.3)' }}>
        <AlertCircle size={14} className="inline ml-1" />
        ينشئ مجموعة جديدة بالأرقام، يبث رسالة، ثم يخرج تلقائياً (إن فعّلت الخيار). هذه الطريقة أسرع من الإرسال الفردي.
      </div>
      <div>
        <label className="label-field">اسم المجموعة المؤقتة</label>
        <input type="text" className="input-field" value={tempGroupName} onChange={e => setTempGroupName(e.target.value)} placeholder="SkyPro Broadcast" />
      </div>
      <div>
        <label className="label-field">الأرقام (سطر لكل رقم)</label>
        <textarea className="textarea-field" rows={5} value={tempGroupMembers} onChange={e => setTempGroupMembers(e.target.value)} placeholder="+2010xxxxxxxx" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={4} value={tempGroupMessage} onChange={e => setTempGroupMessage(e.target.value)} placeholder="اكتب رسالتك..." />
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={tempGroupLeave} onChange={e => setTempGroupLeave(e.target.checked)} className="rounded" />
        الخروج من المجموعة بعد البث
      </label>
      {renderResultsTable('temp-group-broadcast', ['#', 'الرقم', 'الحالة', 'خطأ'], 'whatsapp-temp-group')}
    </div>
  )
  const tempGroupBroadcastFooter = (
    <button onClick={handleTempGroupBroadcast} disabled={loading || !tempGroupMembers.trim() || !tempGroupMessage.trim()} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Megaphone size={18} /> بدء البث</>}
    </button>
  )

  // -------- Extract archived panel --------
  const renderExtractArchivedBody = () => (
    <div className="space-y-5">
      <div>
        <label className="label-field">الحد الأقصى للنتائج</label>
        <input type="number" min={20} max={2000} className="input-field" value={archivedLimit} onChange={e => setArchivedLimit(Number(e.target.value) || 200)} />
      </div>
      {renderResultsTable('extract-archived', ['#', 'الاسم', 'آخر رسالة', 'الوقت'], 'whatsapp-archived')}
    </div>
  )
  const extractArchivedFooter = (
    <button onClick={handleExtractArchived} disabled={loading} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #64748b, #334155)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Archive size={18} /> استخراج</>}
    </button>
  )

  // -------- Multi-number rotation panel --------
  const renderMultiNumberRotationBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}>
        تحتاج أن تكون قد فتحت ≥ 2 جلسة WhatsApp Web (بأرقام مختلفة). انسخ sessionId كل جلسة هنا. الحمولة توزع على الأرقام round-robin.
      </div>
      <div>
        <label className="label-field">Session IDs (سطر لكل جلسة)</label>
        <textarea className="textarea-field font-mono text-xs" rows={3} value={rotationSessions} onChange={e => setRotationSessions(e.target.value)} dir="ltr" placeholder="wa-session-1&#10;wa-session-2" />
      </div>
      <div>
        <label className="label-field">المستلمين (سطر لكل رقم)</label>
        <textarea className="textarea-field" rows={5} value={rotationRecipients} onChange={e => setRotationRecipients(e.target.value)} placeholder="+2010xxxxxxxx" />
      </div>
      <div>
        <label className="label-field">نص الرسالة</label>
        <textarea className="textarea-field" rows={3} value={rotationMessage} onChange={e => setRotationMessage(e.target.value)} placeholder="رسالة موحدة لجميع الأرقام..." />
      </div>
      <div>
        <label className="label-field">الفاصل (ثانية)</label>
        <input type="number" min={2} max={120} className="input-field w-32" value={rotationDelay} onChange={e => setRotationDelay(Number(e.target.value) || 6)} />
      </div>
      {renderResultsTable('multi-number-rotation', ['#', 'المستلم', 'الجلسة', 'الحالة', 'خطأ'], 'whatsapp-rotation')}
    </div>
  )
  const multiNumberRotationFooter = (
    <button onClick={handleMultiNumberRotation} disabled={loading || !rotationSessions.trim() || !rotationRecipients.trim() || !rotationMessage.trim()} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #22c55e, #15803d)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Network size={18} /> بدء البث</>}
    </button>
  )

  // -------- Cross-platform extract panel --------
  const renderExtractCrossPlatformBody = () => (
    <div className="space-y-5">
      <div className="p-3 rounded-lg text-xs text-secondary-600" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}>
        يبحث عن روابط <code>chat.whatsapp.com</code> في Google + Facebook + Telegram لإيجاد جروبات نشطة في نيتش معين.
      </div>
      <div>
        <label className="label-field">الكلمة المفتاحية / المجال</label>
        <input type="text" className="input-field" value={crossKeyword} onChange={e => setCrossKeyword(e.target.value)} placeholder="تسويق إلكتروني، ecommerce، crypto" />
      </div>
      <div>
        <label className="label-field">المصادر</label>
        <div className="flex gap-2 flex-wrap">
          {(['google', 'facebook', 'telegram', 'twitter'] as const).map(s => {
            const active = crossSources.includes(s)
            return (
              <button key={s} type="button" onClick={() => setCrossSources(prev => active ? prev.filter(x => x !== s) : [...prev, s])} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={active ? { background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid #6366f1' } : { background: 'var(--panel-bg)', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }}>
                {s.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>
      <div>
        <label className="label-field">الحد الأقصى: {crossLimit}</label>
        <input type="range" min={20} max={500} step={10} className="w-full accent-indigo-500" value={crossLimit} onChange={e => setCrossLimit(parseInt(e.target.value))} />
      </div>
      {renderResultsTable('extract-cross-platform', ['#', 'الرابط', 'المصدر', 'الكلمة'], 'whatsapp-cross-platform')}
    </div>
  )
  const extractCrossPlatformFooter = (
    <button onClick={handleExtractCrossPlatform} disabled={loading || !crossKeyword.trim() || crossSources.length === 0} className="btn-success w-full disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #6366f1, #4338ca)' }}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : <><Search size={18} /> استخراج</>}
    </button>
  )

  const panelMap: Record<Exclude<ActiveTool, null>, { body: React.ReactNode; footer: React.ReactNode }> = {
    broadcast: { body: renderBroadcastBody(), footer: broadcastFooter },
    'fast-send': { body: renderFastSendBody(), footer: fastSendFooter },
    'send-media': { body: renderSendMediaBody(), footer: sendMediaFooter },
    filter: { body: renderFilterBody(), footer: filterFooter },
    extract: { body: renderExtractBody(), footer: extractFooter },
    'extract-chats': { body: renderExtractChatsBody(), footer: extractChatsFooter },
    'extract-archived': { body: renderExtractArchivedBody(), footer: extractArchivedFooter },
    'extract-contacts': { body: renderExtractContactsBody(), footer: extractContactsFooter },
    'extract-group-members': { body: renderExtractGroupMembersBody(), footer: extractGroupMembersFooter },
    'extract-cross-platform': { body: renderExtractCrossPlatformBody(), footer: extractCrossPlatformFooter },
    groups: { body: renderGroupsBody(), footer: groupsFooter },
    'add-to-group': { body: renderAddToGroupBody(), footer: addToGroupFooter },
    'temp-group-broadcast': { body: renderTempGroupBroadcastBody(), footer: tempGroupBroadcastFooter },
    'multi-number-rotation': { body: renderMultiNumberRotationBody(), footer: multiNumberRotationFooter },
    'numbers-to-vcf': { body: renderNumbersToVcfBody(), footer: numbersToVcfFooter },
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
        platformId="whatsapp"
        platformName="WhatsApp"
        platformGradient={ACCENT_GRADIENT}
        accounts={allAccounts}
        cycleActive={cycleActive}
        onOpenCycle={() => setActiveTool('extract')}
      />

      <ToolGrid
        title="أدوات WhatsApp"
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
                showMsg('يرجى فتح WhatsApp أولاً', true)
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
        title="فتح WhatsApp Web"
        subtitle="افتح نافذة المتصفح وامسح رمز QR"
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
