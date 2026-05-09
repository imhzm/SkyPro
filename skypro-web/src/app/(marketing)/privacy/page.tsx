'use client'

import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import {
  ShieldCheck, Database, Eye, Cookie, UserCheck, Globe2, Clock,
  AlertTriangle, FileText, Mail, ChevronLeft, Baby, KeyRound, Server
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const SITE_URL = 'https://skypro.skywaveads.com'
const LAST_UPDATED = '2026-05-09'
const LAST_UPDATED_AR = '٩ مايو ٢٠٢٦'

const sections = [
  { id: 'intro',           title: 'مقدمة',                        icon: FileText },
  { id: 'data-collection', title: 'البيانات التي نجمعها',         icon: Database },
  { id: 'lawful-basis',    title: 'الأساس القانوني للمعالجة',     icon: ShieldCheck },
  { id: 'data-usage',      title: 'كيف نستخدم بياناتك',           icon: Eye },
  { id: 'sub-processors',  title: 'الجهات الفرعية المعالجة',       icon: Server },
  { id: 'retention',       title: 'مدد الاحتفاظ بالبيانات',         icon: Clock },
  { id: 'transfers',       title: 'النقل الدولي للبيانات',          icon: Globe2 },
  { id: 'cookies',         title: 'ملفات تعريف الارتباط',          icon: Cookie },
  { id: 'security',        title: 'إجراءات الأمان',                icon: KeyRound },
  { id: 'rights',          title: 'حقوقك (GDPR)',                  icon: UserCheck },
  { id: 'children',        title: 'خصوصية الأطفال',                icon: Baby },
  { id: 'breach',          title: 'إشعار اختراق البيانات',          icon: AlertTriangle },
  { id: 'changes',         title: 'تغييرات هذه السياسة',           icon: FileText },
  { id: 'contact',         title: 'تواصل معنا',                    icon: Mail },
] as const

const privacyJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'PrivacyPolicy',
  name: 'سياسة الخصوصية — SkyPro',
  url: `${SITE_URL}/privacy`,
  inLanguage: 'ar',
  datePublished: '2026-01-01',
  dateModified: LAST_UPDATED,
  publisher: {
    '@type': 'Organization',
    name: 'Sky Wave',
    url: 'https://www.skywaveads.com',
    email: 'admin@skywaveads.com',
  },
}

const breadcrumbsLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'سياسة الخصوصية', item: `${SITE_URL}/privacy` },
  ],
}

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('intro')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id)
        })
      },
      { rootMargin: '-20% 0px -60% 0px' }
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' })
  }

  return (
    <main className="min-h-screen bg-[#060d1b] selection:bg-violet-500/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-12 lg:pt-40 lg:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1938] to-[#060d1b]" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px]" />
        <div className="relative z-10 section-shell text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/30 px-4 py-1.5 mb-6"
          >
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">سياسة الخصوصية — متوافقة مع GDPR</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
          >
            سياسة الخصوصية
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto"
          >
            خصوصيتك من أولوياتنا. هذا المستند يشرح كيف نجمع، نستخدم، نحمي، ونشارك بياناتك في
            <strong className="text-white"> SkyPro</strong> من <strong className="text-white">Sky Wave</strong>.
          </motion.p>
          <p className="text-xs text-slate-500 mt-4">
            آخر تحديث: <time dateTime={LAST_UPDATED}>{LAST_UPDATED_AR}</time>
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="relative pb-24">
        <div className="section-shell">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sticky sidebar */}
            <aside className="lg:col-span-3 lg:sticky lg:top-24 lg:self-start order-2 lg:order-1">
              <nav className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  الفهرس
                </p>
                <ul className="space-y-1">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => scrollTo(s.id)}
                        className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                          activeSection === s.id
                            ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <s.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-right flex-1">{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Content */}
            <article className="lg:col-span-9 order-1 lg:order-2 space-y-12 prose-legal">
              <Section id="intro" icon={FileText} title="مقدمة">
                <p>
                  تلتزم <strong>Sky Wave</strong> (المشار إليها فيما بعد بـ &quot;نحن&quot;) بحماية خصوصية مستخدمي
                  منصة <strong>SkyPro</strong>. هذه السياسة موضوعة وفقاً لأفضل المعايير الدولية بما في ذلك
                  <strong> GDPR</strong> (لائحة حماية البيانات الأوروبية)،
                  <strong> CCPA</strong> (قانون كاليفورنيا)،
                  ولوائح حماية البيانات في مصر ودول الخليج.
                </p>
                <p>
                  باستخدامك منصة SkyPro، فإنك توافق على معالجة بياناتك وفقاً لهذه السياسة. إذا لم توافق على
                  أي بند منها، يرجى التوقف عن استخدام المنصة فوراً.
                </p>
              </Section>

              <Section id="data-collection" icon={Database} title="البيانات التي نجمعها">
                <h3>1. بيانات الحساب</h3>
                <ul>
                  <li>الاسم الكامل، البريد الإلكتروني، رقم الهاتف.</li>
                  <li>كلمة المرور (مُشفّرة بـ Argon2 — لا نراها).</li>
                  <li>صورة الملف الشخصي (اختياري).</li>
                </ul>

                <h3>2. بيانات الاشتراك والدفع</h3>
                <ul>
                  <li>تاريخ الاشتراك، الباقة، تاريخ التجديد.</li>
                  <li>سجل المدفوعات والفواتير (نعتمد على Stripe / PayPal — لا نخزن أرقام البطاقات).</li>
                </ul>

                <h3>3. بيانات الاستخدام التقنية</h3>
                <ul>
                  <li>عنوان IP، نوع المتصفح، نظام التشغيل.</li>
                  <li>صفحات تم زيارتها، مدة الزيارة، نقاط النقر.</li>
                  <li>بصمة الجهاز (لمنع الاستخدام غير المصرح به).</li>
                </ul>

                <h3>4. بيانات تشغيل المنصة</h3>
                <ul>
                  <li>قوائم الحملات، النصوص المستخدمة، إحصائيات الإرسال.</li>
                  <li>ملاحظة: <strong>محتوى رسائلك خاص — لا نقرأه ولا نخزنه على خوادمنا</strong>،
                    إلا إذا اخترت تفعيل ميزة النسخ الاحتياطي السحابي.</li>
                </ul>
              </Section>

              <Section id="lawful-basis" icon={ShieldCheck} title="الأساس القانوني للمعالجة (GDPR Art. 6)">
                <p>نعتمد على واحد من الأسس القانونية التالية لمعالجة بياناتك:</p>
                <ul>
                  <li><strong>التنفيذ التعاقدي:</strong> لتقديم الخدمة المتفق عليها.</li>
                  <li><strong>الموافقة الصريحة:</strong> للنشرة البريدية، الإشعارات التسويقية، ملفات تعريف الارتباط الاختيارية.</li>
                  <li><strong>المصلحة المشروعة:</strong> لتحسين المنصة، منع الاحتيال، وضمان أمان النظام.</li>
                  <li><strong>الالتزام القانوني:</strong> الاحتفاظ بسجلات الفواتير لأغراض ضريبية.</li>
                </ul>
              </Section>

              <Section id="data-usage" icon={Eye} title="كيف نستخدم بياناتك">
                <ul>
                  <li>تقديم خدمات SkyPro وتشغيل المنصة.</li>
                  <li>إرسال إشعارات الخدمة (الفواتير، تنبيهات الأمان، انتهاء الاشتراك).</li>
                  <li>إرسال نشرة بريدية تسويقية (فقط مع موافقتك الصريحة، يمكن إلغاؤها بأي وقت).</li>
                  <li>الدعم الفني وحل المشكلات.</li>
                  <li>تحليل استخدام المنصة لتحسين المنتج (بشكل مجمّع وغير شخصي).</li>
                  <li>الكشف ومنع الاحتيال والاستخدام المخالف.</li>
                </ul>
                <p className="callout-warn">
                  <strong>لن نبيع بياناتك أبداً</strong> لأي طرف ثالث لأغراض تسويقية.
                </p>
              </Section>

              <Section id="sub-processors" icon={Server} title="الجهات الفرعية المعالجة (Sub-processors)">
                <p>نستعين بمزودين معتمدين ومتوافقين مع GDPR للمساعدة في تشغيل المنصة:</p>
                <div className="overflow-x-auto">
                  <table className="legal-table">
                    <thead>
                      <tr>
                        <th>المزود</th>
                        <th>الغرض</th>
                        <th>المنطقة</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Hostinger / VPS</td><td>استضافة الخوادم</td><td>EU / US</td></tr>
                      <tr><td>Cloudflare</td><td>CDN، حماية DDoS</td><td>عالمي</td></tr>
                      <tr><td>SMTP Provider</td><td>إرسال البريد الإلكتروني</td><td>EU</td></tr>
                      <tr><td>Stripe / PayPal</td><td>معالجة المدفوعات</td><td>US / EU</td></tr>
                      <tr><td>Google Analytics 4</td><td>تحليلات الزيارات (مع تشفير IP)</td><td>EU</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-sm">
                  لكل مزود اتفاقية معالجة بيانات (DPA) موقعة معنا تضمن مستوى الحماية المناسب.
                </p>
              </Section>

              <Section id="retention" icon={Clock} title="مدد الاحتفاظ بالبيانات">
                <ul>
                  <li><strong>بيانات الحساب:</strong> طوال فترة الاشتراك + 30 يوم بعد الإلغاء، ثم تُحذف نهائياً.</li>
                  <li><strong>سجلات الدفع والفواتير:</strong> 7 سنوات (التزام ضريبي قانوني).</li>
                  <li><strong>سجلات الأمان (Audit Logs):</strong> 12 شهر.</li>
                  <li><strong>بيانات الاستخدام التقنية:</strong> 90 يوم.</li>
                  <li><strong>اشتراك النشرة البريدية:</strong> حتى إلغاء الاشتراك أو 24 شهر بدون نشاط.</li>
                </ul>
              </Section>

              <Section id="transfers" icon={Globe2} title="النقل الدولي للبيانات">
                <p>
                  قد تتم معالجة بياناتك خارج بلدك (مثلاً في خوادم أوروبية أو أمريكية). في هذه الحالات،
                  نضمن مستوى الحماية المناسب من خلال:
                </p>
                <ul>
                  <li>الاعتماد على دول معتمدة من المفوضية الأوروبية (Adequacy Decision).</li>
                  <li>استخدام البنود التعاقدية القياسية (Standard Contractual Clauses).</li>
                  <li>تشفير البيانات أثناء النقل (TLS 1.3) وفي الاستراحة (AES-256).</li>
                </ul>
              </Section>

              <Section id="cookies" icon={Cookie} title="ملفات تعريف الارتباط (Cookies)">
                <p>نستخدم ثلاثة أنواع من الكوكيز:</p>
                <ul>
                  <li><strong>ضرورية:</strong> لتسجيل الدخول وتشغيل الموقع (لا يمكن تعطيلها).</li>
                  <li><strong>تحليلية:</strong> لفهم كيفية استخدام الموقع (Google Analytics — مع موافقتك).</li>
                  <li><strong>تسويقية:</strong> لإعلانات أكثر دقة (Meta Pixel — مع موافقتك).</li>
                </ul>
                <p>يمكنك التحكم في تفضيلات الكوكيز من خلال شريط الموافقة عند زيارتك للموقع.</p>
              </Section>

              <Section id="security" icon={KeyRound} title="إجراءات الأمان">
                <ul>
                  <li>تشفير TLS 1.3 لكل اتصالات الموقع.</li>
                  <li>تشفير AES-256 لقاعدة البيانات.</li>
                  <li>كلمات المرور مُشفّرة بـ Argon2 (أحد أقوى خوارزميات التشفير).</li>
                  <li>مصادقة ثنائية (2FA) متاحة لكل الحسابات.</li>
                  <li>اختبارات اختراق دورية ومراجعات أمنية مستقلة.</li>
                  <li>نظام كشف التهديدات في الوقت الفعلي.</li>
                  <li>نسخ احتياطية يومية مشفّرة.</li>
                </ul>
              </Section>

              <Section id="rights" icon={UserCheck} title="حقوقك بموجب GDPR (المواد 15–22)">
                <ul>
                  <li><strong>حق الوصول:</strong> يمكنك طلب نسخة من بياناتك في أي وقت.</li>
                  <li><strong>حق التصحيح:</strong> تعديل أي بيانات غير دقيقة.</li>
                  <li><strong>حق الحذف (&quot;الحق في النسيان&quot;):</strong> طلب حذف بياناتك بالكامل.</li>
                  <li><strong>حق تقييد المعالجة:</strong> إيقاف معالجة بعض البيانات مؤقتاً.</li>
                  <li><strong>حق نقل البيانات:</strong> الحصول على بياناتك بصيغة قابلة للقراءة آلياً.</li>
                  <li><strong>حق الاعتراض:</strong> رفض المعالجة لأغراض تسويقية أو مصلحة مشروعة.</li>
                  <li><strong>حق عدم الخضوع لقرارات آلية:</strong> طلب مراجعة بشرية لأي قرار آلي مهم.</li>
                </ul>
                <p>
                  لتفعيل أي حق من هذه الحقوق، أرسل بريد إلى{' '}
                  <a href="mailto:privacy@skywaveads.com" className="text-sky-400 hover:text-sky-300">
                    privacy@skywaveads.com
                  </a>
                  {' '}— نلتزم بالرد خلال <strong>30 يوماً</strong> كحد أقصى.
                </p>
              </Section>

              <Section id="children" icon={Baby} title="خصوصية الأطفال">
                <p>
                  منصة SkyPro غير مخصصة للأطفال دون <strong>16 عاماً</strong>. لا نجمع عمداً بيانات من أي
                  شخص دون هذه السن. إذا اكتشفت أن طفلاً قدّم بياناته لنا، يرجى التواصل فوراً وسنقوم بحذف
                  بياناته خلال 48 ساعة.
                </p>
              </Section>

              <Section id="breach" icon={AlertTriangle} title="إشعار اختراق البيانات">
                <p>
                  في حال وقوع أي اختراق أمني يؤثر على بياناتك الشخصية، نلتزم بـ:
                </p>
                <ul>
                  <li>إخطار <strong>هيئة حماية البيانات المختصة</strong> خلال <strong>72 ساعة</strong> (وفق GDPR Art. 33).</li>
                  <li>إخطارك مباشرة عبر البريد الإلكتروني خلال <strong>72 ساعة</strong> إذا كان الاختراق يحمل خطراً عالياً.</li>
                  <li>توفير تقرير شفاف بطبيعة الاختراق والإجراءات المتخذة.</li>
                </ul>
              </Section>

              <Section id="changes" icon={FileText} title="تغييرات هذه السياسة">
                <p>
                  قد نُحدّث هذه السياسة من وقت لآخر. التغييرات الجوهرية ستُعلَن عبر إشعار داخل المنصة
                  وعبر البريد الإلكتروني قبل <strong>30 يوماً</strong> من سريانها. تاريخ آخر تحديث يظهر
                  دائماً في أعلى هذه الصفحة.
                </p>
              </Section>

              <Section id="contact" icon={Mail} title="تواصل معنا — مسؤول حماية البيانات (DPO)">
                <p>لأي استفسار يخص الخصوصية أو لممارسة حقوقك:</p>
                <ul>
                  <li>البريد الإلكتروني: <a href="mailto:privacy@skywaveads.com" className="text-sky-400 hover:text-sky-300">privacy@skywaveads.com</a></li>
                  <li>الدعم العام: <a href="mailto:admin@skywaveads.com" className="text-sky-400 hover:text-sky-300">admin@skywaveads.com</a></li>
                  <li>واتساب: <a href="https://wa.me/201067894321" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">+20 10 6789 4321</a></li>
                  <li>العنوان: Sky Wave for Digital Marketing — القاهرة، مصر</li>
                </ul>
                <p className="callout-info">
                  لديك الحق أيضاً في تقديم شكوى إلى الهيئة الوطنية لحماية البيانات في بلدك أو إلى
                  هيئة حماية البيانات الأوروبية (EDPB) إذا كنت في الاتحاد الأوروبي.
                </p>
              </Section>

              <a href="/" className="inline-flex items-center gap-2 text-sky-400 hover:text-sky-300 font-semibold">
                <ChevronLeft className="w-4 h-4" />
                العودة للرئيسية
              </a>
            </article>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}

function Section({
  id, icon: Icon, title, children,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      className="scroll-mt-28"
    >
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/8">
        <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-violet-300" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="text-slate-300 leading-relaxed text-[15px] space-y-3">
        {children}
      </div>
    </motion.section>
  )
}
