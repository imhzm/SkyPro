// Product facts come from the existing pricing, activation and platform data.
export const homeOffer = {
  annualPrice: 2000,
  currency: "EGP",
  trialDays: 2,
  phone: "+201029934356",
  whatsapp: "https://wa.me/201029934356",
} as const;

export const homePlatforms = [
  {
    id: "facebook",
    href: "/platforms/facebook",
    name: "فيسبوك",
    color: "#1877f2",
    mark: "f",
    image: "facebook-marketing-tools",
    description: "أدوات النشر في الجروبات وإدارة الرسائل واستخراج البيانات.",
  },
  {
    id: "instagram",
    href: "/platforms/instagram",
    name: "إنستجرام",
    color: "#df287c",
    mark: "◎",
    image: "instagram-marketing-tools",
    description: "تنظيم الرسائل والوصول لبيانات المتابعين من واجهة واحدة.",
  },
  {
    id: "whatsapp",
    href: "/platforms/whatsapp",
    name: "واتساب",
    color: "#14b866",
    mark: "◉",
    image: "whatsapp-marketing-tools-dashboard",
    description: "إدارة جلسات واتساب وتجهيز الرسائل وتصفية الأرقام.",
  },
  {
    id: "google-maps",
    href: "/platforms/google-maps",
    name: "خرائط جوجل",
    color: "#4285f4",
    mark: "maps",
    image: "google-maps-data-extraction",
    description: "البحث عن الأنشطة التجارية وتنظيم بيانات الاتصال المتاحة.",
  },
  {
    id: "telegram",
    href: "/platforms/telegram",
    name: "تيليجرام",
    color: "#229ed9",
    mark: "➤",
    image: "telegram-marketing-suite",
    description: "أدوات المجموعات والرسائل وإدارة حسابات تيليجرام.",
  },
  {
    id: "linkedin",
    href: "/platforms/linkedin",
    name: "لينكد إن",
    color: "#0a66c2",
    mark: "in",
    image: "linkedin-b2b-marketing-tools",
    description: "البحث عن الشركات وتنظيم التواصل المهني والبيانات.",
  },
  {
    id: "tiktok",
    href: "/platforms/tiktok",
    name: "تيك توك",
    color: "#16151e",
    mark: "♪",
    image: "tiktok-marketing-automation",
    description: "أدوات متابعة الحسابات واستخراج بيانات المتابعين.",
  },
  {
    id: "twitter",
    href: "/platforms/twitter",
    name: "تويتر / X",
    color: "#15181e",
    mark: "𝕏",
    image: "twitter-x-marketing-tools",
    description: "تنظيم التغريدات والجدولة وبيانات الحسابات.",
  },
  {
    id: "pinterest",
    href: "/platforms/pinterest",
    name: "بنترست",
    color: "#e60023",
    mark: "P",
    image: "pinterest-marketing-tools",
    description: "أدوات تثبيت المحتوى وتنظيم بيانات بنترست.",
  },
  {
    id: "threads",
    href: "/platforms/threads",
    name: "ثريدز",
    color: "#16151e",
    mark: "@",
    image: "threads-marketing-tools",
    description: "تجهيز المنشورات وإدارة بيانات المتابعين.",
  },
] as const;

export const homeFaqs = [
  {
    question: "هل أقدر أجرب Sky Pro مجانًا؟",
    answer:
      "نعم، عند إنشاء حساب تحصل على تجربة مجانية لمدة يومين. جرّب الأدوات المناسبة لشغلك قبل الاشتراك السنوي.",
  },
  {
    question: "ما المنصات الموجودة في البرنامج؟",
    answer:
      "يشمل البرنامج أدوات لفيسبوك وواتساب وإنستجرام وخرائط جوجل وتيليجرام ولينكد إن وتيك توك وX وبنترست وثريدز، إلى جانب أدوات أخرى. صفحة كل منصة توضح أدواتها.",
  },
  {
    question: "البرنامج بيشتغل على أي جهاز؟",
    answer:
      "Sky Pro تطبيق للكمبيوتر يعمل على Windows 10 وWindows 11. بعد التسجيل، حمّل التطبيق واستخدم مفتاح التفعيل الموجود في حسابك.",
  },
  {
    question: "سعر الاشتراك كام؟ وهل فيه اشتراك شهري؟",
    answer:
      "الاشتراك المتاح حاليًا سنوي بسعر ٢٬٠٠٠ جنيه مصري. التجربة المجانية يومين. لتفاصيل الدفع أو طلب أكثر من جهاز، تواصل مع فريق الدعم.",
  },
  {
    question: "هل الاشتراك يسمح بأكثر من جهاز؟",
    answer:
      "الاشتراك الأساسي مخصص لجهاز واحد. لو تحتاج أجهزة إضافية، تواصل معنا لمراجعة احتياجك والتكلفة قبل الدفع.",
  },
  {
    question: "هل استخدام الأدوات يضمن عدم تقييد حسابي؟",
    answer:
      "لا يوجد ضمان ضد تقييد الحسابات. استخدم الأدوات وفق شروط كل منصة، واحصل على موافقة المستلمين قبل إرسال الرسائل التسويقية، والتزم بحدود الاستخدام المناسبة.",
  },
] as const;
