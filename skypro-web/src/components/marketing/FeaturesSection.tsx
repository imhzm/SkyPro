'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { PlatformIcon } from '@/components/marketing/PlatformIcon'
import {
  ArrowLeft, Bot, Target, Users, Shield, BarChart3, Globe, Layers, Cpu,
  Sparkles, Zap, Database, CheckCircle2, Star, TrendingUp,
} from 'lucide-react'

// ============================================================================
// CORE CAPABILITIES — what SkyPro does for you
// ============================================================================
const coreCapabilities = [
  { icon: Bot, title: 'أتمتة كاملة 24/7', desc: 'أتمت كل عملياتك التسويقية من الاستخراج للإرسال بدون أي تدخل يدوي. حملاتك تعمل وأنت نايم.', color: 'from-sky-400 to-blue-600' },
  { icon: Target, title: 'استهداف دقيق بالـ AI', desc: 'استخرج بيانات العملاء المستهدفين من 18+ منصة بفلترة ذكية متقدمة بالذكاء الاصطناعي.', color: 'from-violet-400 to-purple-600' },
  { icon: Users, title: 'حسابات لا محدودة', desc: 'أدر حسابات متعددة لنفس المنصة مع تبديل تلقائي وبروكسي مخصص لكل حساب.', color: 'from-emerald-400 to-green-600' },
  { icon: Shield, title: 'مضاد للحظر متطور', desc: 'تأخير عشوائي، تغيير بصمة المتصفح، بروكسي مخصص، وفواصل زمنية متغيرة تلقائياً.', color: 'from-amber-400 to-orange-600' },
  { icon: BarChart3, title: 'تقارير لحظية مفصلة', desc: 'تتبع كل رسالة، كل تفاعل، كل نتيجة لحظة بلحظة مع تصدير CSV و Excel.', color: 'from-rose-400 to-pink-600' },
  { icon: Globe, title: '18+ منصة كاملة', desc: 'فيسبوك، واتساب، انستغرام، تليجرام، تويتر، لينكدإن، تيك توك، بنترست وأكثر.', color: 'from-cyan-400 to-teal-600' },
  { icon: Layers, title: 'جدولة متقدمة', desc: 'جدول حملاتك بأيام محددة، أوقات محددة، تكرار يومي/أسبوعي، وإيقاف مؤقت.', color: 'from-indigo-400 to-indigo-600' },
  { icon: Cpu, title: 'استخراج بصيغة عملية', desc: 'صدّر بياناتك Excel/CSV/JSON مع كل التفاصيل: الاسم، اليوزر، الرابط، الهاتف، البريد.', color: 'from-fuchsia-400 to-fuchsia-600' },
]

// ============================================================================
// FEATURED PLATFORM SHOWCASES — each with real app screenshot + key benefits
// ============================================================================
const featuredShowcases = [
  {
    id: 'facebook',
    title: 'Facebook — التسويق الذي يحوّل',
    subtitle: 'أكبر شبكة في العالم — استخرج، اشتغل، اربح',
    image: '/images/app/facebook-extract-data-panel.png',
    benefits: [
      'استخراج كل أعضاء أي جروب أو صفحة (مهما كان عدد الأعضاء)',
      'منشن جماعي + رسائل Messenger تلقائية + طلبات صداقة',
      'نشر تلقائي على مئات الجروبات بمحتوى ثابت أو متغير',
      'استخراج رقم الهاتف والإيميل من التعليقات والمنشورات',
    ],
    stats: [
      { value: '50K+', label: 'عضو/ساعة استخراج' },
      { value: '200+', label: 'جروب نشر' },
      { value: '99.5%', label: 'نجاح الإرسال' },
    ],
    accent: 'from-blue-500 to-blue-700',
    accentLight: '#1877F2',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp — أعلى معدل وصول',
    subtitle: '95%+ نسبة فتح — لا منصة أخرى تقارب هذا الرقم',
    image: '/images/app/whatsapp-marketing-tools-grid.png',
    benefits: [
      'إرسال 35 رسالة في الدقيقة بفواصل ذكية ضد الحظر',
      'إضافة 250 رقم لجروب في 3 دقائق فقط',
      'استخراج كل أعضاء أي جروب من الرابط أو الاسم',
      'تصفية الأرقام لمعرفة الفعّال على واتساب قبل الإرسال',
    ],
    stats: [
      { value: '35/min', label: 'إرسال آمن' },
      { value: '250/3min', label: 'إضافة جماعية' },
      { value: '95%+', label: 'معدل الفتح' },
    ],
    accent: 'from-emerald-500 to-green-700',
    accentLight: '#25D366',
  },
  {
    id: 'instagram',
    title: 'Instagram — انمو بسرعة بدون حظر',
    subtitle: 'الجمهور الذي يشتري — استهدف بدقة، أوصل سريع',
    image: '/images/app/instagram-extract-data-panel.png',
    benefits: [
      'استخراج المتابعين والمتفاعلين على أي حساب منافس',
      'متابعة تلقائية ذكية + رسائل DM مخصصة بالاسم',
      'منشن جماعي في التعليقات بحسابات متعددة',
      'تحليل ديموغرافي شامل: الجنس، الموقع، الاهتمامات',
    ],
    stats: [
      { value: '∞', label: 'حسابات متعددة' },
      { value: '300/day', label: 'متابعة آمنة' },
      { value: '40%+', label: 'معدل الرد على DM' },
    ],
    accent: 'from-pink-500 to-rose-700',
    accentLight: '#E4405F',
  },
  {
    id: 'twitter',
    title: 'X (Twitter) — التريندات + التغريدات',
    subtitle: 'استخدم تريندات الساعة، انشر تلقائياً، تابع المنافسين',
    image: '/images/app/twitter-x-marketing-tools.png',
    benefits: [
      'استخراج المتابعين، التغريدات، التريندات من أي دولة',
      'تغريدات تلقائية + DM جماعي + ريتويت',
      'فحص حسابات + رفع ترتيب التغريدات في البحث',
      'متابعة المتفاعلين على تغريدات المنافسين',
    ],
    stats: [
      { value: '24/7', label: 'تريندات لحظية' },
      { value: '∞', label: 'حسابات متعددة' },
      { value: 'AI', label: 'كشف الحسابات النشطة' },
    ],
    accent: 'from-sky-500 to-blue-700',
    accentLight: '#1DA1F2',
  },
  {
    id: 'linkedin',
    title: 'LinkedIn — العملاء B2B الجاهزين',
    subtitle: 'البحث، الاستخراج، التواصل — تلقائياً',
    image: '/images/app/linkedin-b2b-tools-grid.png',
    benefits: [
      'بحث عن العملاء والشركات والجامعات بفلترة متقدمة',
      'استخراج البريد، الهاتف، الموقع، المنصب من البروفايلات',
      'إرسال طلبات تواصل + رسائل DM بحسابات متعددة',
      'انضمام للمجموعات + نشر تلقائي على Feed',
    ],
    stats: [
      { value: '500+', label: 'طلب تواصل/يوم' },
      { value: 'B2B', label: 'استهداف' },
      { value: 'CSV', label: 'تصدير البيانات' },
    ],
    accent: 'from-sky-500 to-blue-800',
    accentLight: '#0A66C2',
  },
  {
    id: 'telegram',
    title: 'Telegram — قاعدة 20K مجموعة',
    subtitle: 'استخراج بـ Public + Secret، إضافة بـ ID/Username/Phone',
    image: '/images/app/telegram-marketing-suite.png',
    benefits: [
      'تسجيل دخول تيليجرام بدون أي مشاكل أو حظر',
      'استخراج كل أعضاء أي مجموعة (Public + Secret)',
      'إضافة العملاء بـ ID، Username، أو Phone — من أرقام متعددة',
      'قاعدة بيانات جاهزة بـ 20,000+ مجموعة وقناة للاستهداف',
    ],
    stats: [
      { value: '20K+', label: 'مجموعة جاهزة' },
      { value: '100/h', label: 'إرسال آمن' },
      { value: '∞', label: 'أرقام متعددة' },
    ],
    accent: 'from-sky-500 to-cyan-700',
    accentLight: '#0088CC',
  },
  {
    id: 'telegram-premium',
    title: 'Telegram Premium — أدوات حصرية',
    subtitle: 'تجاوز إخفاء الأعضاء + نقل آلي + تفاعل بإيموجي مخصص',
    image: '/images/app/telegram-premium-exclusive-tools.png',
    benefits: [
      'استخراج الأعضاء من المجموعات المخفية (Hidden Members)',
      'نقل وإضافة الأعضاء باستخدام Username أو رقم الهاتف',
      'البحث المتقدم في المجموعات والقنوات بكلمات مفتاحية',
      'تفاعل آلي (إيموجي) على رسائل المجموعات والقنوات',
    ],
    stats: [
      { value: 'Hidden', label: 'استخراج المخفيين' },
      { value: '50/d', label: 'نقل آمن/حساب' },
      { value: 'Premium', label: 'حصري' },
    ],
    accent: 'from-cyan-500 to-blue-800',
    accentLight: '#0088CC',
  },
  {
    id: 'pinterest',
    title: 'Pinterest — التسويق البصري',
    subtitle: 'انشر منتجاتك في أكبر منصة بصرية في العالم',
    image: '/images/app/pinterest-marketing-tools.png',
    benefits: [
      'تسجيل دخول بدون حظر + إنشاء حسابات بالجملة',
      'استخراج Boards + Pins + بيانات العملاء حسب النيتش',
      'إرسال رسائل + متابعة تلقائية بحسابات متعددة',
      'تحليل ديموغرافي للعملاء وأنشط الـ Boards',
    ],
    stats: [
      { value: '∞', label: 'حسابات' },
      { value: 'Pins', label: 'تلقائي' },
      { value: 'DM', label: 'جماعي' },
    ],
    accent: 'from-rose-500 to-red-700',
    accentLight: '#E60023',
  },
  {
    id: 'reddit',
    title: 'Reddit — مجتمعات النيتش',
    subtitle: 'انضم لأكبر المجتمعات في مجالك واستهدف بدقة',
    image: '/images/app/reddit-community-marketing.png',
    benefits: [
      'استخراج المجتمعات الرائدة يومياً والانضمام لها',
      'بحث متقدم بكلمات مفتاحية معينة',
      'النشر على المجتمعات بنص + صور بعد الانضمام',
      'تصويت إيجابي + حفظ تلقائي من حسابات متعددة',
    ],
    stats: [
      { value: 'Daily', label: 'تريندات' },
      { value: '∞', label: 'مجتمعات' },
      { value: 'Multi', label: 'تصويت' },
    ],
    accent: 'from-orange-500 to-red-700',
    accentLight: '#FF4500',
  },
  {
    id: 'tiktok',
    title: 'TikTok — منصة الانتشار السريع',
    subtitle: 'استخرج التعليقات + المتابعين + رفع الفيديوهات',
    image: '/images/app/tiktok-marketing-automation.png',
    benefits: [
      'استخراج التعليقات والمتفاعلين على أي فيديو',
      'منشن المتابعين في التعليقات بحسابات متعددة',
      'رفع الفيديوهات تلقائياً + جدولة',
      'بحث الفيديوهات بكلمات مفتاحية',
    ],
    stats: [
      { value: 'Live', label: 'تعليقات' },
      { value: 'Auto', label: 'رفع فيديوهات' },
      { value: '∞', label: 'حسابات' },
    ],
    accent: 'from-pink-500 to-cyan-700',
    accentLight: '#FE2C55',
  },
  {
    id: 'threads',
    title: 'Threads — المنصة الجديدة',
    subtitle: 'استهدف الجمهور قبل المنافسين في منصة Meta الصاعدة',
    image: '/images/app/threads-marketing-tools.png',
    benefits: [
      'استخراج المتفاعلين والمتابعين',
      'إرسال رسائل + منشن في التعليقات',
      'النشر التلقائي من حسابات متعددة',
      'تحليل أداء البوستات',
    ],
    stats: [
      { value: 'Meta', label: 'متكامل' },
      { value: 'AI', label: 'تحليل' },
      { value: 'Multi', label: 'حسابات' },
    ],
    accent: 'from-slate-700 to-slate-900',
    accentLight: '#000000',
  },
  {
    id: 'snapchat',
    title: 'Snapchat — جيل Z',
    subtitle: 'استخرج أصدقاءك + أرسل رسائل ترويجية بدون إعلانات',
    image: '/images/app/snapchat-marketing-tools.png',
    benefits: [
      'استخراج جميع الأصدقاء والعملاء المهتمين',
      'إرسال رسائل ترويجية بدون إعلانات ممولة',
      'رسائل مع صور أو جهات اتصال واتساب',
      'استهداف دقيق للجمهور المحدد',
    ],
    stats: [
      { value: 'Free', label: 'بدون إعلانات' },
      { value: 'Gen-Z', label: 'الجمهور' },
      { value: 'DM', label: 'رسائل ترويج' },
    ],
    accent: 'from-yellow-400 to-amber-600',
    accentLight: '#FFFC00',
  },
  {
    id: 'google',
    title: 'Google Maps + OLX',
    subtitle: 'استخرج بيانات الأنشطة التجارية والإعلانات بالملايين',
    image: '/images/app/google-maps-data-extraction.png',
    benefits: [
      'استخراج جميع الأنشطة التجارية من خرائط Google',
      'بيانات OLX: عنوان، هاتف، صور، تاريخ النشر',
      'فلترة جغرافية دقيقة بالمدينة والحي',
      'تصدير CSV/Excel بكل التفاصيل',
    ],
    stats: [
      { value: '∞', label: 'أنشطة تجارية' },
      { value: 'Geo', label: 'فلترة' },
      { value: 'CSV', label: 'تصدير' },
    ],
    accent: 'from-blue-500 to-green-700',
    accentLight: '#4285F4',
  },
]

// ============================================================================
// TRUST BADGES — what makes SkyPro different
// ============================================================================
const differentiators = [
  { icon: Zap, title: 'أسرع 10×', desc: 'مما يستغرقه الإرسال اليدوي' },
  { icon: Database, title: '99.5% دقة', desc: 'في استخراج البيانات' },
  { icon: Shield, title: 'حماية معتمدة', desc: 'تأخير عشوائي + بروكسي + بصمة' },
  { icon: TrendingUp, title: 'ROI 145%+', desc: 'متوسط نمو حملات عملائنا' },
  { icon: Users, title: '10,000+ عميل', desc: 'في الوطن العربي' },
  { icon: Star, title: '4.9/5 تقييم', desc: 'من 1,247 مراجعة' },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

export function FeaturesSection() {
  return (
    <section id="features" className="py-28 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1020] to-[#060d1b]" />
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[120px]" />

      <div className="relative z-10 section-shell">
        {/* ============= MAIN HEADER ============= */}
        <div className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 text-[12px] font-semibold text-sky-400 mb-4"
          >
            <Sparkles className="h-3.5 w-3.5" />
            لماذا SkyPro؟
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="section-title"
          >
            كل ما تحتاجه <span className="gradient-text">في مكان واحد</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="section-desc mt-3 max-w-2xl mx-auto"
          >
            منظومة تسويق آلي متكاملة تجمع 18+ منصة تواصل اجتماعي في تطبيق واحد ذكي.
            وفّر 90% من وقتك، ضاعف نتائجك، وتجاوز الحظر باحترافية.
          </motion.p>
        </div>

        {/* ============= CORE CAPABILITIES GRID ============= */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-24"
        >
          {coreCapabilities.map((cap, i) => (
            <motion.div key={i} variants={cardVariants} className="glass-card-3d p-6 group cursor-default">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${cap.color} shadow-lg mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-6deg]`}>
                <cap.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{cap.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{cap.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ============= MAIN DASHBOARD SHOWCASE ============= */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-24"
        >
          <div className="text-center mb-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-[12px] font-semibold text-emerald-400 mb-4"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              لوحة التحكم
            </motion.div>
            <h2 className="section-title">
              لوحة تحكم <span className="gradient-text">كاملة وذكية</span>
            </h2>
            <p className="section-desc mt-3 max-w-2xl mx-auto">
              كل منصاتك، كل حساباتك، كل تقاريرك — في شاشة واحدة. تابع نتائج حملاتك لحظة بلحظة وقرر بناءً على بيانات حقيقية.
            </p>
          </div>

          <div className="relative gradient-border p-1 max-w-6xl mx-auto">
            <div className="relative rounded-[20px] overflow-hidden">
              <Image
                src="/images/app/skypro-multi-platform-dashboard.png"
                alt="لوحة تحكم SkyPro الرئيسية — إدارة 18+ منصة تسويق من شاشة واحدة"
                width={1920}
                height={1080}
                className="w-full h-auto"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060d1b]/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Differentiators row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-10 max-w-5xl mx-auto">
            {differentiators.map((d, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-3 text-center"
              >
                <d.icon className="h-5 w-5 mx-auto mb-1.5 text-sky-400" />
                <div className="text-sm font-bold text-white">{d.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{d.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ============= FEATURED PLATFORM SHOWCASES ============= */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-[12px] font-semibold text-violet-400 mb-4"
          >
            <Globe className="h-3.5 w-3.5" />
            المنصات الرئيسية
          </motion.div>
          <h2 className="section-title">
            شوف <span className="gradient-text">كل منصة</span> من الداخل
          </h2>
          <p className="section-desc mt-3 max-w-2xl mx-auto">
            صور حقيقية من داخل البرنامج — هذه هي الواجهة اللي هتشتغل عليها يومياً.
          </p>
        </div>

        <div className="space-y-16 mb-24">
          {featuredShowcases.map((showcase, idx) => (
            <motion.div
              key={showcase.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-8 items-center ${idx % 2 === 1 ? 'lg:[direction:ltr]' : ''}`}
            >
              {/* Text side */}
              <div className="lg:[direction:rtl]">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-4"
                  style={{ background: `${showcase.accentLight}15`, color: showcase.accentLight, border: `1px solid ${showcase.accentLight}30` }}
                >
                  <PlatformIcon id={showcase.id} size={14} style={{ color: showcase.accentLight }} />
                  {showcase.subtitle}
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-4 leading-tight">
                  {showcase.title}
                </h3>
                <ul className="space-y-3 mb-6">
                  {showcase.benefits.map((b, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-slate-300 text-[15px]">
                      <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" style={{ color: showcase.accentLight }} />
                      <span className="leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {showcase.stats.map((s, j) => (
                    <div key={j} className="glass-card p-3 text-center">
                      <div className="text-lg font-extrabold" style={{ color: showcase.accentLight }}>{s.value}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <Link
                  href={`/platforms/${showcase.id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors group"
                  style={{ color: showcase.accentLight }}
                >
                  اكتشف كل أدوات {showcase.title.split('—')[0].trim()}
                  <ArrowLeft className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Image side */}
              <div className="lg:[direction:rtl] relative">
                <div className="absolute -inset-4 rounded-3xl blur-[80px] opacity-20" style={{ background: showcase.accentLight }} />
                <div className="relative gradient-border p-1">
                  <div className="rounded-[18px] overflow-hidden">
                    <Image
                      src={showcase.image}
                      alt={`${showcase.title} — صورة حية من داخل تطبيق SkyPro`}
                      width={1200}
                      height={800}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ============= EXPORT + EXTRACTION SHOWCASE ============= */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="glass-card p-6 group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-40 h-40 rounded-full blur-[60px] opacity-20 bg-amber-500 -translate-x-1/3 -translate-y-1/3" />
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg mb-4">
                <Database className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">تصدير ذكي بكل التفاصيل</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                صدّر بياناتك Excel أو CSV مع الاسم، اليوزر، الرابط، الهاتف، البريد، التاريخ، والمصدر —
                كل عمود مفصول بدقة، بدون فلترة يدوية.
              </p>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <Image
                  src="/images/app/facebook-leads-data-export.png"
                  alt="تصدير CSV ذكي في SkyPro — بيانات منظمة بكل التفاصيل"
                  width={900}
                  height={500}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-6 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-[60px] opacity-20 bg-violet-500 translate-x-1/3 -translate-y-1/3" />
            <div className="relative z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg mb-4">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">تسجيل دخول آمن بـ Serial</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                نظام تفعيل بـ Serial Key مرتبط بجهازك — لا حاجة لرفع كلمات مرور، لا تخوّف من السرقة،
                وكل بيانات حساباتك المحفوظة مشفّرة محلياً.
              </p>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <Image
                  src="/images/app/skypro-secure-login-screen.png"
                  alt="تسجيل دخول آمن في SkyPro — Serial Key + تشفير محلي"
                  width={900}
                  height={500}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
