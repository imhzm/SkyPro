import type { Platform, PlatformId } from '../types'

export const platforms: Platform[] = [
  { id: 'dashboard', name: 'لوحة التحكم', icon: 'LayoutDashboard', color: '#3b82f6', segment: 'نظرة عامة', description: 'نظرة عامة على كل المنصات والإحصائيات', features: [
    { id: 'overview', title: 'نظرة عامة', description: 'ملخص النشاطات', icon: 'BarChart3' },
    { id: 'analytics', title: 'التحليلات', description: 'إحصائيات مفصلة', icon: 'PieChart' },
  ]},
  { id: 'accounts', name: 'الحسابات', icon: 'Users', color: '#10b981', segment: 'إدارة الحسابات', description: 'إدارة جميع حسابات السوشيال ميديا في مكان واحد', features: [
    { id: 'all', title: 'كل الحسابات', description: 'عرض وإدارة الحسابات', icon: 'Users' },
  ]},
  { id: 'facebook', name: 'Facebook', icon: 'Facebook', color: '#1877f2', segment: 'تسويق فيسبوك', description: 'استخراج البيانات والتسويق على فيسبوك', features: [
    { id: 'login', title: 'تسجيل الدخول', description: 'تسجيل دخول الحسابات', icon: 'LogIn' },
    { id: 'search', title: 'البحث', description: 'بحث متقدم', icon: 'Search' },
    { id: 'extract', title: 'استخراج', description: 'استخراج البيانات', icon: 'Download' },
    { id: 'analysis', title: 'تحليل', description: 'تحليل البيانات', icon: 'BarChart3' },
    { id: 'marketing', title: 'تسويق', description: 'أدوات التسويق', icon: 'Megaphone' },
    { id: 'broadcast', title: 'إرسال', description: 'إرسال الرسائل', icon: 'Send' },
    { id: 'pages', title: 'الصفحات', description: 'إدارة الصفحات', icon: 'FileText' },
    { id: 'mention', title: 'منشن', description: 'المنشن والتعليقات', icon: 'AtSign' },
    { id: 'other-tools', title: 'أدوات إضافية', description: 'أدوات مساعدة', icon: 'Wrench' },
  ]},
  { id: 'whatsapp', name: 'WhatsApp', icon: 'MessageCircle', color: '#25d366', segment: 'تسويق واتساب', description: 'إرسال رسائل وإدارة مجموعات واتساب', features: [
    { id: 'filter', title: 'فلترة', description: 'فلترة الأرقام', icon: 'Filter' },
    { id: 'extract', title: 'استخراج', description: 'استخراج الأعضاء', icon: 'Download' },
    { id: 'groups', title: 'المجموعات', description: 'النشر في المجموعات', icon: 'Users' },
    { id: 'broadcast', title: 'إرسال', description: 'إرسال الرسائل', icon: 'Send' },
    { id: 'other-tools', title: 'أدوات إضافية', description: 'أدوات مساعدة', icon: 'Wrench' },
  ]},
  { id: 'instagram', name: 'Instagram', icon: 'Instagram', color: '#e4405f', segment: 'تسويق إنستجرام', description: 'إدارة الحسابات والتسويق على إنستجرام', features: [
    { id: 'login', title: 'تسجيل الدخول', description: 'تسجيل دخول الحسابات', icon: 'LogIn' },
    { id: 'extract', title: 'استخراج', description: 'استخراج المتابعين', icon: 'Download' },
    { id: 'analysis', title: 'تحليل', description: 'تحليل الحسابات', icon: 'BarChart3' },
    { id: 'follow', title: 'متابعة', description: 'متابعة تلقائية', icon: 'UserPlus' },
    { id: 'mention', title: 'منشن', description: 'منشن المتابعين', icon: 'AtSign' },
    { id: 'broadcast', title: 'إرسال', description: 'إرسال الرسائل', icon: 'Send' },
  ]},
  { id: 'twitter', name: 'Twitter / X', icon: 'Twitter', color: '#1da1f2', segment: 'تسويق تويتر', description: 'جدولة تغريدات والتسويق على تويتر', features: [
    { id: 'login', title: 'تسجيل الدخول', description: 'تسجيل دخول الحسابات', icon: 'LogIn' },
    { id: 'extract', title: 'استخراج', description: 'استخراج المتابعين', icon: 'Download' },
    { id: 'scheduled', title: 'جدولة', description: 'جدولة التغريدات', icon: 'Calendar' },
    { id: 'mention', title: 'منشن', description: 'منشن المتابعين', icon: 'AtSign' },
    { id: 'broadcast', title: 'إرسال', description: 'إرسال الرسائل', icon: 'Send' },
    { id: 'follow', title: 'متابعة', description: 'متابعة تلقائية', icon: 'UserPlus' },
    { id: 'marketing', title: 'تسويق', description: 'أدوات التسويق', icon: 'Megaphone' },
    { id: 'retweet', title: 'ريتويت', description: 'ريتويت تلقائي', icon: 'Repeat' },
  ]},
  { id: 'linkedin', name: 'LinkedIn', icon: 'Linkedin', color: '#0a66c2', segment: 'تسويق لينكدإن', description: 'التسويق B2B على لينكدإن', features: [
    { id: 'login', title: 'تسجيل الدخول', description: 'تسجيل دخول الحسابات', icon: 'LogIn' },
    { id: 'search', title: 'البحث', description: 'بحث متقدم', icon: 'Search' },
    { id: 'extract', title: 'استخراج', description: 'استخراج الشركات', icon: 'Download' },
    { id: 'marketing', title: 'تسويق', description: 'أدوات التسويق', icon: 'Megaphone' },
    { id: 'broadcast', title: 'إرسال', description: 'إرسال الرسائل', icon: 'Send' },
  ]},
  { id: 'telegram', name: 'Telegram', icon: 'Send', color: '#0088cc', segment: 'تسويق تيليجرام', description: 'استخراج أعضاء والتسويق على تيليجرام', features: [
    { id: 'extract', title: 'استخراج', description: 'استخراج الأعضاء', icon: 'Download' },
    { id: 'add-user', title: 'إضافة', description: 'إضافة أعضاء', icon: 'UserPlus' },
    { id: 'broadcast', title: 'إرسال', description: 'إرسال الرسائل', icon: 'Send' },
    { id: 'other-tools', title: 'أدوات إضافية', description: 'أدوات مساعدة', icon: 'Wrench' },
  ]},
  { id: 'snapchat', name: 'SnapChat', icon: 'Ghost', color: '#fffc00', segment: 'تسويق سناب شات', description: 'استخراج أصدقاء والتسويق على سناب شات', features: [
    { id: 'broadcast', title: 'إرسال', description: 'إرسال الرسائل', icon: 'Send' },
  ]},
  { id: 'pinterest', name: 'Pinterest', icon: 'Pin', color: '#e60023', segment: 'تسويق بنترست', description: 'إدارة اللوحات والتسويق على بنترست', features: [
    { id: 'login', title: 'تسجيل الدخول', description: 'تسجيل دخول الحسابات', icon: 'LogIn' },
    { id: 'search', title: 'البحث', description: 'بحث متقدم', icon: 'Search' },
    { id: 'extract', title: 'استخراج', description: 'استخراج البيانات', icon: 'Download' },
    { id: 'broadcast', title: 'إرسال', description: 'إرسال الرسائل', icon: 'Send' },
    { id: 'other-tools', title: 'أدوات إضافية', description: 'أدوات مساعدة', icon: 'Wrench' },
  ]},
  { id: 'reddit', name: 'Reddit', icon: 'MessageCircle', color: '#ff4500', segment: 'تسويق ريديت', description: 'التسويق على مجتمعات Reddit', features: [
    { id: 'login', title: 'تسجيل الدخول', description: 'تسجيل دخول الحسابات', icon: 'LogIn' },
    { id: 'search', title: 'البحث', description: 'بحث المجتمعات', icon: 'Search' },
    { id: 'publish', title: 'نشر', description: 'النشر في المجتمعات', icon: 'Upload' },
    { id: 'other-tools', title: 'أدوات إضافية', description: 'أدوات مساعدة', icon: 'Wrench' },
  ]},
  { id: 'tiktok', name: 'TikTok', icon: 'Music', color: '#000000', segment: 'تسويق تيك توك', description: 'استخراج بيانات والتسويق على تيك توك', features: [
    { id: 'login', title: 'تسجيل الدخول', description: 'فتح المتصفح', icon: 'LogIn' },
    { id: 'extract', title: 'استخراج', description: 'استخراج التعليقات', icon: 'Download' },
    { id: 'mention', title: 'منشن', description: 'منشن المتابعين', icon: 'AtSign' },
    { id: 'upload', title: 'رفع', description: 'رفع الفيديوهات', icon: 'Upload' },
    { id: 'other-tools', title: 'أدوات إضافية', description: 'أدوات مساعدة', icon: 'Wrench' },
  ]},
  { id: 'threads', name: 'Threads', icon: 'MessageSquare', color: '#000000', segment: 'تسويق ثريدز', description: 'التسويق على منصة Threads', features: [
    { id: 'login', title: 'تسجيل الدخول', description: 'تسجيل دخول الحسابات', icon: 'LogIn' },
    { id: 'extract', title: 'استخراج', description: 'استخراج البيانات', icon: 'Download' },
    { id: 'mention', title: 'منشن', description: 'منشن المتابعين', icon: 'AtSign' },
    { id: 'broadcast', title: 'إرسال', description: 'إرسال الرسائل', icon: 'Send' },
    { id: 'other-tools', title: 'أدوات إضافية', description: 'أدوات مساعدة', icon: 'Wrench' },
  ]},
  { id: 'google', name: 'Google', icon: 'MapPin', color: '#4285f4', segment: 'أدوات جوجل', description: 'خرائط جوجل و OLX واستخراج بيانات', features: [
    { id: 'maps', title: 'خرائط جوجل', description: 'استخراج بيانات الخرائط', icon: 'MapPin' },
    { id: 'olx', title: 'OLX', description: 'استخراج بيانات OLX', icon: 'Globe' },
    { id: 'rate', title: 'تقييم', description: 'تقييمات جوجل', icon: 'Star' },
    { id: 'other-tools', title: 'أدوات إضافية', description: 'SMS وجهات اتصال', icon: 'Wrench' },
  ]},
  { id: 'send-emails', name: 'البريد الإلكتروني', icon: 'Mail', color: '#ea4335', segment: 'إرسال بريد', description: 'إرسال بريد إلكتروني عبر SMTP', features: [
    { id: 'smtp', title: 'SMTP', description: 'إعدادات SMTP', icon: 'Settings' },
    { id: 'compose', title: 'كتابة', description: 'كتابة الرسائل', icon: 'PenTool' },
    { id: 'send', title: 'إرسال', description: 'إرسال جماعي', icon: 'Send' },
  ]},
  { id: 'auto-point', name: 'Auto Point', icon: 'Zap', color: '#f97316', segment: 'نقاط تلقائية', description: 'تفاعل تلقائي عبر مواقع التبادل', features: [
    { id: 'get', title: 'الحصول', description: 'الحصول على النقاط', icon: 'Twitter' },
    { id: 'auto', title: 'تلقائي', description: 'تفاعل تلقائي', icon: 'Instagram' },
  ]},
  { id: 'other-tools', name: 'أدوات إضافية', icon: 'Wrench', color: '#8b5cf6', segment: 'أدوات مساعدة', description: 'أدوات مساعدة متنوعة', features: [
    { id: 'proxy', title: 'بروكسي', description: 'إدارة البروكسي', icon: 'Settings' },
    { id: 'scheduler', title: 'جدولة', description: 'جدولة الحملات', icon: 'Calendar' },
    { id: 'antiban', title: 'حماية', description: 'حماية من الحظر', icon: 'Shield' },
    { id: 'download', title: 'تحميل', description: 'تحميل الفيديوهات', icon: 'Download' },
    { id: 'hashtags', title: 'هاشتاج', description: 'توليد هاشتاجات', icon: 'Hash' },
    { id: 'text-editor', title: 'محرر نصوص', description: 'تحرير النصوص', icon: 'FileText' },
    { id: 'text-as-vcf', title: 'تحويل VCF', description: 'تحويل لجهات اتصال', icon: 'Contact' },
    { id: 'generate', title: 'توليد', description: 'توليد البيانات', icon: 'Sparkles' },
  ]},
  { id: 'security', name: 'الحماية', icon: 'Shield', color: '#10b981', segment: 'الحماية', description: 'إدارة الأمان والحماية من الحظر', features: [
    { id: 'settings', title: 'الإعدادات', description: 'إعدادات الأمان', icon: 'Settings' },
  ]},
  { id: 'account', name: 'الحساب', icon: 'User', color: '#6366f1', segment: 'الحساب', description: 'إدارة الحساب والاشتراك', features: [
    { id: 'profile', title: 'الملف الشخصي', description: 'إدارة الملف', icon: 'User' },
    { id: 'subscription', title: 'الاشتراك', description: 'إدارة الاشتراك', icon: 'CreditCard' },
  ]},
  { id: 'settings', name: 'الإعدادات', icon: 'Settings', color: '#64748b', segment: 'الإعدادات', description: 'إعدادات التطبيق والتحديثات', features: [
    { id: 'general', title: 'عام', description: 'إعدادات عامة', icon: 'Settings' },
    { id: 'about', title: 'عن التطبيق', description: 'معلومات النسخة', icon: 'Info' },
  ]},
]

export const getPlatformById = (id: PlatformId): Platform | undefined =>
  platforms.find((p) => p.id === id)

export const getPlatformColor = (id: PlatformId): string =>
  getPlatformById(id)?.color ?? '#3b82f6'