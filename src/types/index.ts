export type PlatformId =
  | 'dashboard'
  | 'accounts'
  | 'facebook'
  | 'whatsapp'
  | 'instagram'
  | 'threads'
  | 'twitter'
  | 'linkedin'
  | 'telegram'
  | 'snapchat'
  | 'pinterest'
  | 'reddit'
  | 'send-emails'
  | 'auto-point'
  | 'tiktok'
  | 'google'
  | 'security'
  | 'account'
  | 'other-tools'
  | 'settings'

export interface Platform {
  id: PlatformId
  name: string
  icon: string
  color: string
  segment: string
  description: string
  features: PlatformFeature[]
}

export interface PlatformFeature {
  id: string
  title: string
  description: string
  icon: string
}

export type LeadStatus = 'جديد' | 'مؤهل' | 'قيد المتابعة' | 'تم الإغلاق'
export type LeadPriority = 'عالية' | 'متوسطة' | 'عادية'
export type CampaignStatus = 'مسودة' | 'جاهزة' | 'نشطة' | 'متوقفة'
export type TemplateCategory = 'ترحيب' | 'متابعة' | 'إعادة تنشيط' | 'عرض خاص'
export type AccountStatus = 'نشط' | 'احتياطي' | 'موقوف'

export interface LeadRecord {
  id: string
  platformId: PlatformId
  fullName: string
  company: string
  phone: string
  email: string
  source: string
  status: LeadStatus
  priority: LeadPriority
  notes: string
  createdAt: string
}

export interface CampaignRecord {
  id: string
  platformId: PlatformId
  name: string
  objective: string
  message: string
  status: CampaignStatus
  updatedAt: string
}

export interface TemplateRecord {
  id: string
  platformId: PlatformId
  title: string
  category: TemplateCategory
  content: string
  updatedAt: string
}

export interface AccountRecord {
  id: string
  platformId: PlatformId
  label: string
  username: string
  password?: string
  proxy?: string
  status: AccountStatus
  notes: string
  lastCheck: string
}

export interface ProxyRecord {
  id: string
  label: string
  host: string
  port: string
  protocol: 'http' | 'https' | 'socks5'
  username?: string
  password?: string
  status: 'متاح' | 'قيد الاستخدام' | 'متوقف'
}

export interface BrowserSession {
  id: string
  platformId: PlatformId
  accountId?: string
  headless: boolean
  proxy?: string
  userAgent?: string
  status: 'idle' | 'running' | 'paused' | 'error' | 'completed'
  progress: number
  logs: string[]
  createdAt: string
}

export interface ActivationData {
  key: string
  status: 'active' | 'expired' | 'pending' | 'invalid' | 'available' | 'revoked' | 'assigned'
  expiryDate: string
  deviceId?: string
}

export interface AppSettings {
  theme: 'light' | 'dark'
  language: 'ar' | 'en'
  defaultHeadless: boolean
  autoSave: boolean
  notifications: boolean
}
