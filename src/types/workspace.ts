export type LeadStatus = 'جديد' | 'مؤهل' | 'قيد المتابعة' | 'تم الإغلاق'
export type LeadPriority = 'عالية' | 'متوسطة' | 'عادية'
export type CampaignStatus = 'مسودة' | 'جاهزة' | 'نشطة' | 'متوقفة'
export type TemplateCategory = 'ترحيب' | 'متابعة' | 'إعادة تنشيط' | 'عرض خاص'
export type AccountStatus = 'نشط' | 'احتياطي' | 'موقوف'

export type LeadRecord = {
  id: string
  platformId: string
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

export type CampaignRecord = {
  id: string
  platformId: string
  name: string
  objective: string
  message: string
  status: CampaignStatus
  updatedAt: string
}

export type TemplateRecord = {
  id: string
  platformId: string
  title: string
  category: TemplateCategory
  content: string
  updatedAt: string
}

export type AccountRecord = {
  id: string
  platformId: string
  label: string
  username: string
  password?: string
  status: AccountStatus
  notes: string
  lastCheck: string
}
