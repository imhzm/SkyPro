export const platforms = [
  { id: 'facebook', name: 'فيسبوك', icon: 'facebook', color: '#1877F2', colorLight: '#1877F2', features: ['استخراج الأعضاء', 'إرسال رسائل', 'النشر في الجروبات', 'استخراج المعجبين'] },
  { id: 'whatsapp', name: 'واتساب', icon: 'whatsapp', color: '#25D366', colorLight: '#25D366', features: ['إرسال رسائل', 'استخراج المجموعات', 'تصفية الأرقام'] },
  { id: 'instagram', name: 'انستغرام', icon: 'instagram', color: '#E4405F', colorLight: '#E4405F', features: ['استخراج المتابعين', 'إرسال رسائل', 'متابعة تلقائية', 'الإشارة'] },
  { id: 'twitter', name: 'تويتر / X', icon: 'twitter', color: '#1DA1F2', colorLight: '#1DA1F2', features: ['تغريدات', 'استخراج المتابعين', 'إعادة تغريد', 'الجدولة'] },
  { id: 'linkedin', name: 'لينكد إن', icon: 'linkedin', color: '#0A66C2', colorLight: '#0A66C2', features: ['البحث عن شركات', 'إرسال رسائل', 'استخراج البيانات'] },
  { id: 'telegram', name: 'تيليجرام', icon: 'telegram', color: '#26A5E4', colorLight: '#26A5E4', features: ['إرسال رسائل', 'استخراج الأعضاء', 'إضافة مستخدمين'] },
  { id: 'tiktok', name: 'تيك توك', icon: 'tiktok', color: '#000000', colorLight: '#69C9D0', features: ['استخراج المتابعين', 'الإعجاب التلقائي'] },
  { id: 'pinterest', name: 'بنترست', icon: 'pinterest', color: '#E60023', colorLight: '#E60023', features: ['تثبيت تلقائي', 'استخراج البيانات'] },
  { id: 'snapchat', name: 'سناب شات', icon: 'snapchat', color: '#FFFC00', colorLight: '#FFFC00', features: ['إرسال رسائل', 'إضافة أصدقاء'] },
  { id: 'threads', name: 'ثريدز', icon: 'threads', color: '#000000', colorLight: '#8C8C8C', features: ['النشر التلقائي', 'استخراج المتابعين'] },
  { id: 'reddit', name: 'ريديت', icon: 'reddit', color: '#FF4500', colorLight: '#FF4500', features: ['النشر التلقائي', 'استخراج البيانات'] },
  { id: 'google-maps', name: 'خرائط جوجل', icon: 'google-maps', color: '#4285F4', colorLight: '#4285F4', features: ['استخراج الأعمال', 'بيانات الاتصال'] },
  { id: 'send-emails', name: 'إرسال إيميلات', icon: 'send-emails', color: '#EA4335', colorLight: '#EA4335', features: ['إرسال جماعي', 'قوالب', 'SMTP مخصص'] },
  { id: 'olx', name: 'OLX', icon: 'olx', color: '#4CAF50', colorLight: '#4CAF50', features: ['استخراج الإعلانات', 'بيانات البائعين'] },
  { id: 'auto-point', name: 'أوتو بوينت', icon: 'auto-point', color: '#FF6B6B', colorLight: '#FF6B6B', features: ['نقاط تلقائية', 'إدارة الحسابات'] },
  { id: 'security', name: 'الحماية', icon: 'security', color: '#10B981', colorLight: '#10B981', features: ['مضاد الحظر', 'بروكسي', 'تغيير البصمة'] },
  { id: 'accounts', name: 'إدارة الحسابات', icon: 'accounts', color: '#8B5CF6', colorLight: '#8B5CF6', features: ['حسابات متعددة', 'تبديل تلقائي'] },
  { id: 'campaigns', name: 'الحملات', icon: 'campaigns', color: '#F59E0B', colorLight: '#F59E0B', features: ['جدولة', 'تقارير', 'تتبع'] },
] as const

export const faqs = [
  {
    question: 'ما هو سيندر برو؟',
    answer: 'سيندر برو هو تطبيق تسويق احترافي يعمل على 18+ منصة تواصل اجتماعي. يساعدك على أتمتة حملاتك التسويقية من استخراج البيانات والإرسال الجماعي وإدارة العملاء.'
  },
  {
    question: 'كيف يعمل نظام التفعيل؟',
    answer: 'بعد الشراء، تحصل على مفتاح تفعيل فريد مرتبط بجهازك. كل مفتاح يسمح بجهاز واحد كحد أقصى مع إمكانية إعادة التعيين مرتين سنوياً.'
  },
  {
    question: 'هل يمكنني استخدام أكثر من جهاز؟',
    answer: 'الاشتراك الأساسي يسمح بجهاز واحد. يمكنك طلب زيادة عدد الأجهزة من لوحة التحكم أو التواصل مع الدعم الفني.'
  },
  {
    question: 'ما المنصات المدعومة؟',
    answer: 'فيسبوك، واتساب، انستغرام، تويتر، لينكد إن، تيليجرام، تيك توك، بنترست، سناب شات، ثريدز، ريديت، خرائط جوجل، البريد الإلكتروني، OLX والمزيد.'
  },
  {
    question: 'هل هناك فترة تجريبية؟',
    answer: 'نعم! عند التسجيل تحصل على فترة تجريبية يومين مجاناً لتجربة جميع المميزات قبل الشراء.'
  },
  {
    question: 'كيف يتم الدفع؟',
    answer: 'الاشتراك السنوي بتكلفة 2,000 ج.م فقط. يمكنك الدفع عبر فودافون كاش أو التحويل البنكي. تواصل معنا للحصول على التفاصيل.'
  },
  {
    question: 'هل بياناتي آمنة؟',
    answer: 'بالتأكيد! نستخدم تشفير AES-256 لجميع البيانات. بياناتك محفوظة محلياً على جهازك ولا نرسل أي بيانات لجهات خارجية.'
  },
  {
    question: 'كيف يعمل نظام الحماية من الحظر؟',
    answer: 'سيندر برو يستخدم تقنيات متقدمة: تأخير عشوائي بين العمليات، تصفح عشوائي، تبديل بصمة المتصفح، بروكسي مخصص لكل جلسة، وحدود آمنة لكل منصة.'
  },
]