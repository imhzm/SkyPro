'use client'

import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import {
  Scale, FileSignature, CreditCard, RefreshCw, ShieldX, Copyright,
  Ban, Gavel, AlertTriangle, FileText, Mail, ChevronLeft, UserPlus, Power
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const SITE_URL = 'https://skypro.skywaveads.com'
const LAST_UPDATED = '2026-05-09'
const LAST_UPDATED_AR = '٩ مايو ٢٠٢٦'

const sections = [
  { id: 'intro',          title: 'مقدمة وقبول الشروط',          icon: FileSignature },
  { id: 'eligibility',    title: 'الأهلية والتسجيل',             icon: UserPlus },
  { id: 'subscription',   title: 'الاشتراك والباقات',            icon: CreditCard },
  { id: 'payment',        title: 'الدفع والفوترة',               icon: CreditCard },
  { id: 'refunds',        title: 'الاسترداد والإلغاء',           icon: RefreshCw },
  { id: 'acceptable-use', title: 'الاستخدام المسموح',            icon: ShieldX },
  { id: 'prohibited',     title: 'الاستخدامات المحظورة',          icon: Ban },
  { id: 'ip',             title: 'الملكية الفكرية',                icon: Copyright },
  { id: 'user-content',   title: 'محتوى المستخدم',                icon: FileText },
  { id: 'termination',    title: 'إنهاء الحساب',                  icon: Power },
  { id: 'disclaimer',     title: 'إخلاء المسؤولية',                icon: AlertTriangle },
  { id: 'liability',      title: 'حدود المسؤولية',                icon: Scale },
  { id: 'indemnity',      title: 'التعويض',                       icon: ShieldX },
  { id: 'governing-law',  title: 'القانون والاختصاص',             icon: Gavel },
  { id: 'changes',        title: 'تعديلات هذه الشروط',            icon: FileText },
  { id: 'contact',        title: 'تواصل معنا',                    icon: Mail },
] as const

const termsJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TermsOfService',
  name: 'الشروط والأحكام — SkyPro',
  url: `${SITE_URL}/terms`,
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
    { '@type': 'ListItem', position: 2, name: 'الشروط والأحكام', item: `${SITE_URL}/terms` },
  ],
}

export default function TermsPage() {
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
    <main className="min-h-screen bg-[#060d1b] selection:bg-sky-500/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(termsJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }} />
      <Navbar />

      <section className="relative pt-32 pb-12 lg:pt-40 lg:pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1d3b] to-[#060d1b]" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px]" />
        <div className="relative z-10 section-shell text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/30 px-4 py-1.5 mb-6"
          >
            <Scale className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold text-sky-300">الشروط والأحكام — اتفاقية ملزمة</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
          >
            الشروط والأحكام
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto"
          >
            باستخدامك منصة <strong className="text-white">SkyPro</strong> فإنك توافق على هذه الشروط.
            يرجى قراءتها بعناية — هذه اتفاقية قانونية ملزمة بينك وبين <strong className="text-white">Sky Wave</strong>.
          </motion.p>
          <p className="text-xs text-slate-500 mt-4">
            آخر تحديث: <time dateTime={LAST_UPDATED}>{LAST_UPDATED_AR}</time>
          </p>
        </div>
      </section>

      <section className="relative pb-24">
        <div className="section-shell">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <aside className="lg:col-span-3 lg:sticky lg:top-24 lg:self-start order-2 lg:order-1">
              <nav className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 max-h-[calc(100vh-7rem)] overflow-y-auto">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">الفهرس</p>
                <ul className="space-y-1">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button
                        onClick={() => scrollTo(s.id)}
                        className={`w-full text-right px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                          activeSection === s.id
                            ? 'bg-sky-500/15 text-sky-300 border border-sky-500/25'
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

            <article className="lg:col-span-9 order-1 lg:order-2 space-y-12 prose-legal">
              <Section id="intro" icon={FileSignature} title="مقدمة وقبول الشروط">
                <p>
                  بإنشائك حساباً أو استخدامك أي خدمة من خدمات منصة <strong>SkyPro</strong> المملوكة لـ
                  <strong> Sky Wave for Digital Marketing</strong> (المشار إليها فيما بعد بـ &quot;الشركة&quot;)،
                  فإنك تقرّ بأنك قرأت وفهمت ووافقت على الالتزام بهذه الشروط والأحكام كاملة، إضافة إلى
                  <a href="/privacy" className="text-sky-400 hover:text-sky-300"> سياسة الخصوصية</a>.
                </p>
                <p>إذا لم توافق على أي جزء من هذه الشروط، يجب عليك التوقف فوراً عن استخدام المنصة.</p>
              </Section>

              <Section id="eligibility" icon={UserPlus} title="الأهلية والتسجيل">
                <ul>
                  <li>يجب أن تكون قد أتممت <strong>18 عاماً</strong> أو سن الرشد القانوني في بلدك.</li>
                  <li>المعلومات المقدّمة عند التسجيل يجب أن تكون <strong>دقيقة وكاملة وحديثة</strong>.</li>
                  <li>أنت المسؤول الوحيد عن سرية بيانات الدخول وأي نشاط يتم على حسابك.</li>
                  <li>يحق للشركة رفض أو إنهاء أي حساب يتم إنشاؤه بمعلومات مزيّفة أو غير دقيقة.</li>
                  <li>يُمنع منعاً باتاً مشاركة الحساب مع أكثر من شخص ما لم تُحدد الباقة ذلك صراحة.</li>
                </ul>
              </Section>

              <Section id="subscription" icon={CreditCard} title="الاشتراك والباقات">
                <p>تتوفر منصة SkyPro بعدّة باقات اشتراك تختلف في المدة والمزايا:</p>
                <ul>
                  <li><strong>التجربة المجانية:</strong> يومان كاملان بدون بطاقة ائتمان.</li>
                  <li><strong>الاشتراك السنوي:</strong> يبدأ من 2,000 جنيه مصري — يمكن إلغاؤه في أي وقت.</li>
                  <li><strong>باقات الأعمال:</strong> أسعار مخصصة حسب عدد المستخدمين والمنصات.</li>
                </ul>
                <p>
                  جميع الأسعار تشمل ضريبة القيمة المضافة حيثما تنطبق. الشركة تحتفظ بالحق في تعديل الأسعار
                  مستقبلاً مع إشعار <strong>30 يوماً</strong> على الأقل قبل التطبيق.
                </p>
              </Section>

              <Section id="payment" icon={CreditCard} title="الدفع والفوترة">
                <ul>
                  <li>المدفوعات تتم عبر <strong>Stripe</strong>، <strong>PayPal</strong>، أو التحويل البنكي.</li>
                  <li>الاشتراكات تُجدّد تلقائياً ما لم تُلغها قبل تاريخ التجديد.</li>
                  <li>الفواتير تُرسل إلى بريدك الإلكتروني المسجّل وتُحفظ في حسابك.</li>
                  <li>في حال فشل الدفع، يحق للشركة تعليق الخدمة بعد <strong>7 أيام</strong> من المحاولة الأخيرة.</li>
                  <li>الضرائب والرسوم البنكية يتحملها العميل (إن وُجدت).</li>
                </ul>
              </Section>

              <Section id="refunds" icon={RefreshCw} title="سياسة الاسترداد والإلغاء">
                <p className="callout-info">
                  نضمن استرداد المبلغ خلال <strong>7 أيام</strong> من الاشتراك إذا تعذّر علينا حل مشكلة فنية
                  جوهرية تمنعك من استخدام المنصة.
                </p>
                <ul>
                  <li>الإلغاء يمكن أن يتم في أي وقت من لوحة التحكم — وستحتفظ بالخدمة حتى نهاية الفترة المدفوعة.</li>
                  <li>لا يتم استرداد المبلغ بعد مرور <strong>7 أيام</strong> من بدء الاشتراك إلا في الحالات الاستثنائية.</li>
                  <li>التجربة المجانية لا تتطلب أي مبلغ، وبالتالي لا يوجد استرداد عليها.</li>
                  <li>الإلغاء بسبب مخالفة شروط الاستخدام لا يؤهلك لأي استرداد.</li>
                </ul>
              </Section>

              <Section id="acceptable-use" icon={ShieldX} title="الاستخدام المسموح">
                <p>يُسمح لك باستخدام SkyPro لأغراض تسويقية مشروعة فقط، بما في ذلك:</p>
                <ul>
                  <li>إدارة حملات تسويقية لمنتجاتك أو خدماتك.</li>
                  <li>التواصل مع جهات اتصال حصلت على موافقتها الصريحة.</li>
                  <li>استخراج بيانات متاحة بشكل عام عبر الويب وفقاً لشروط المنصات الأصلية.</li>
                  <li>إدارة حسابات تعود ملكيتها لك أو لعملائك بإذنهم الكتابي.</li>
                </ul>
              </Section>

              <Section id="prohibited" icon={Ban} title="الاستخدامات المحظورة">
                <p>يُمنع منعاً باتاً استخدام المنصة لأي من الأغراض التالية:</p>
                <ul>
                  <li>إرسال رسائل غير مرغوب فيها (Spam) أو رسائل احتيالية.</li>
                  <li>انتحال شخصية أي فرد أو كيان.</li>
                  <li>نشر محتوى مخالف للقانون، عنصري، أو محرّض على العنف.</li>
                  <li>محاولة اختراق المنصة أو خوادمها أو الوصول لبيانات لا تخصك.</li>
                  <li>استخراج بيانات شخصية بدون موافقة أصحابها.</li>
                  <li>إعادة بيع الخدمة أو ميزاتها بدون اتفاقية شراكة رسمية.</li>
                  <li>هندسة عكسية للمنصة أو محاولة فك تشفير الكود.</li>
                  <li>استخدام المنصة بأي شكل ينتهك حقوق الملكية الفكرية للغير.</li>
                </ul>
                <p className="callout-warn">
                  مخالفة هذه الشروط تؤدي إلى <strong>إنهاء الحساب فوراً وبدون استرداد</strong>،
                  وقد تترتب عليها مسؤولية قانونية.
                </p>
              </Section>

              <Section id="ip" icon={Copyright} title="الملكية الفكرية">
                <ul>
                  <li>جميع حقوق المنصة (الكود، الواجهة، الشعارات، المحتوى، التصميم) ملك حصري لـ <strong>Sky Wave</strong>.</li>
                  <li>الترخيص الممنوح لك هو ترخيص <strong>محدود، شخصي، غير حصري، غير قابل للنقل</strong> للاستخدام طوال فترة اشتراكك النشط.</li>
                  <li>لا يُسمح بنسخ أو توزيع أو تعديل أي جزء من المنصة بدون إذن كتابي مسبق.</li>
                  <li>العلامات التجارية &quot;SkyPro&quot; و &quot;Sky Wave&quot; مسجّلة ومحمية قانونياً.</li>
                </ul>
              </Section>

              <Section id="user-content" icon={FileText} title="محتوى المستخدم">
                <p>
                  يبقى المحتوى الذي ترفعه (نصوص رسائل، قوائم، صور...) ملكاً لك. ومع ذلك، تمنحنا ترخيصاً
                  محدوداً لمعالجته وعرضه داخل المنصة فقط لتقديم الخدمة. <strong>لا نملك حق استخدام محتواك
                  لأي أغراض تسويقية أو غيرها</strong>.
                </p>
                <p>
                  أنت وحدك المسؤول عن قانونية وصحة المحتوى الذي ترفعه. تخلي الشركة مسؤوليتها عن أي
                  محتوى يخالف القانون أو حقوق الغير.
                </p>
              </Section>

              <Section id="termination" icon={Power} title="إنهاء الحساب">
                <p>يحق للشركة إنهاء أو تعليق حسابك فوراً وبدون إشعار مسبق في الحالات التالية:</p>
                <ul>
                  <li>مخالفة أي بند من هذه الشروط.</li>
                  <li>استخدام المنصة لأغراض احتيالية أو غير قانونية.</li>
                  <li>عدم سداد رسوم الاشتراك بعد فترة سماح <strong>14 يوماً</strong>.</li>
                  <li>طلب جهات إنفاذ القانون.</li>
                </ul>
                <p>عند إنهاء الحساب، تُحذف بياناتك خلال 30 يوماً وفقاً لسياسة الخصوصية.</p>
              </Section>

              <Section id="disclaimer" icon={AlertTriangle} title="إخلاء المسؤولية">
                <p>
                  منصة SkyPro تُقدّم &quot;كما هي&quot; (AS IS) و &quot;حسب توفرها&quot; (AS AVAILABLE)،
                  بدون أي ضمانات صريحة أو ضمنية.
                </p>
                <ul>
                  <li>لا نضمن أن الخدمة ستكون متاحة 100% بدون انقطاع.</li>
                  <li>لا نضمن نتائج تسويقية محددة من استخدام المنصة.</li>
                  <li>لا نتحمل مسؤولية حظر حساباتك على المنصات الخارجية الناتج عن مخالفتك لشروط تلك المنصات.</li>
                  <li>التغييرات في APIs المنصات الخارجية قد تؤثر على بعض الميزات بدون إشعار.</li>
                </ul>
              </Section>

              <Section id="liability" icon={Scale} title="حدود المسؤولية">
                <p>
                  إلى الحد الأقصى الذي يسمح به القانون، لن تتحمل <strong>Sky Wave</strong> أو موظفوها أو شركاؤها
                  أي مسؤولية عن:
                </p>
                <ul>
                  <li>أي أضرار غير مباشرة، عرضية، تبعية، أو عقابية.</li>
                  <li>خسارة أرباح، بيانات، أو فرص عمل.</li>
                  <li>أي ضرر ناتج عن استخدامك أو عدم قدرتك على استخدام المنصة.</li>
                </ul>
                <p>
                  في كل الأحوال، لن تتجاوز مسؤوليتنا الإجمالية تجاهك المبلغ الذي دفعته للشركة خلال
                  الـ <strong>12 شهراً السابقة</strong> للحدث الذي تسبب في المسؤولية.
                </p>
              </Section>

              <Section id="indemnity" icon={ShieldX} title="التعويض">
                <p>
                  أنت توافق على تعويض وحماية <strong>Sky Wave</strong> ومنسوبيها من أي مطالبات أو خسائر أو
                  أضرار أو مصاريف (بما فيها أتعاب المحاماة) ناشئة عن:
                </p>
                <ul>
                  <li>استخدامك للمنصة بشكل مخالف لهذه الشروط.</li>
                  <li>انتهاكك لحقوق الغير (الملكية الفكرية، الخصوصية، إلخ).</li>
                  <li>أي محتوى ترفعه إلى المنصة.</li>
                </ul>
              </Section>

              <Section id="governing-law" icon={Gavel} title="القانون المعتمد والاختصاص القضائي">
                <p>
                  تخضع هذه الاتفاقية وتُفسّر وفقاً <strong>لقوانين جمهورية مصر العربية</strong>،
                  بصرف النظر عن مبادئ تنازع القوانين.
                </p>
                <p>
                  أي نزاع ينشأ من أو يتعلق بهذه الاتفاقية يخضع للاختصاص الحصري <strong>لمحاكم القاهرة الاقتصادية</strong>.
                </p>
                <p className="callout-info">
                  قبل اللجوء للمحاكم، يلتزم الطرفان بمحاولة تسوية النزاع ودياً عبر الوساطة لفترة لا تقل عن
                  <strong> 30 يوماً</strong>.
                </p>
              </Section>

              <Section id="changes" icon={FileText} title="تعديلات هذه الشروط">
                <p>نحتفظ بحقّ تعديل هذه الشروط في أي وقت. التغييرات الجوهرية ستُعلَن:</p>
                <ul>
                  <li>عبر إشعار داخل المنصة عند تسجيل الدخول.</li>
                  <li>عبر البريد الإلكتروني قبل <strong>30 يوماً</strong> على الأقل من سريان التعديلات.</li>
                  <li>تحديث تاريخ &quot;آخر تعديل&quot; في أعلى هذه الصفحة.</li>
                </ul>
                <p>استمرارك في استخدام المنصة بعد سريان التعديلات يُعتبر موافقة منك عليها.</p>
              </Section>

              <Section id="contact" icon={Mail} title="تواصل معنا">
                <p>إذا كان لديك أي استفسار عن هذه الشروط، يرجى التواصل معنا:</p>
                <ul>
                  <li>الشؤون القانونية: <a href="mailto:legal@skywaveads.com" className="text-sky-400 hover:text-sky-300">legal@skywaveads.com</a></li>
                  <li>الدعم العام: <a href="mailto:admin@skywaveads.com" className="text-sky-400 hover:text-sky-300">admin@skywaveads.com</a></li>
                  <li>واتساب: <a href="https://wa.me/201067894321" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300">+20 10 6789 4321</a></li>
                  <li>العنوان: Sky Wave for Digital Marketing — القاهرة، مصر</li>
                </ul>
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
        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-sky-300" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="text-slate-300 leading-relaxed text-[15px] space-y-3">
        {children}
      </div>
    </motion.section>
  )
}
