'use client'

import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { FileText, ShieldCheck, Scale, FileSignature, ChevronLeft, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const sections = [
  { id: 'introduction', title: 'مقدمة الاستخدام' },
  { id: 'accounts', title: 'الحسابات والاشتراكات' },
  { id: 'anti-spam', title: 'سياسة الاستخدام العادل' },
  { id: 'refunds', title: 'الاسترداد والإلغاء' },
  { id: 'disclaimer', title: 'إخلاء المسؤولية' },
]

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState('introduction')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        })
      },
      { rootMargin: '-20% 0px -60% 0px' }
    )

    sections.forEach((section) => {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 120,
        behavior: 'smooth',
      })
    }
  }

  return (
    <main className="min-h-screen bg-[#060d1b] selection:bg-sky-500/30">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1938] to-[#060d1b]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] animate-pulse" />
        
        <div className="relative z-10 section-shell text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/20 px-4 py-1.5 text-[12px] font-semibold text-sky-400 mb-6"
          >
            <FileText className="h-4 w-4" />
            التحديث الأخير: ماي 2026
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            الشروط و<span className="gradient-text-brand">الأحكام</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            يرجى قراءة هذه الشروط بعناية قبل استخدام منصة سيندر برو، فهي تحكم العلاقة بيننا لضمان تجربة استخدام احترافية، آمنة، وموثوقة لجميع الأطراف.
          </motion.p>
        </div>
      </section>

      {/* Content Section */}
      <section className="relative pb-28">
        <div className="relative z-10 section-shell max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-10">
            
            {/* Sidebar Navigation */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:w-1/3 shrink-0 hidden lg:block"
            >
              <div className="sticky top-32 glass-card p-6">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                  <FileSignature className="w-4 h-4 text-sky-400" /> فهرس الشروط
                </h4>
                <div className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-right flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
                        activeSection === section.id
                          ? 'bg-sky-500/10 text-sky-300 font-semibold border border-sky-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className="text-sm">{section.title}</span>
                      {activeSection === section.id && (
                        <ChevronLeft className="w-4 h-4 text-sky-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Main Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="lg:w-2/3 glass-card p-8 sm:p-12 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-a:text-sky-400 hover:prose-a:text-sky-300 prose-strong:text-white">
                
                <section id="introduction" className="scroll-mt-32">
                  <h2 className="text-2xl font-bold text-white mt-0 border-b border-white/10 pb-4 mb-6">1. مقدمة الاستخدام</h2>
                  <p className="text-slate-300 leading-relaxed">
                    أهلاً بك في منصة <strong>سيندر برو</strong> (المشار إليها بـ "المنصة"، "نحن"، "لنا"). باستخدامك للمنصة أو التسجيل فيها، فإنك توافق صراحة على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى التوقف عن استخدام المنصة على الفور.
                  </p>
                </section>

                <section id="accounts" className="scroll-mt-32 mt-16">
                  <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-6">2. الحسابات والاشتراكات</h2>
                  <p className="text-slate-300 leading-relaxed">
                    تتطلب بعض الخدمات إنشاء حساب وتقديم بيانات دقيقة. أنت مسؤول بشكل كامل عن الحفاظ على سرية معلومات حسابك.
                  </p>
                  <ul className="text-slate-400 space-y-2">
                    <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 text-sky-400 mt-1 shrink-0" /> يجب تقديم معلومات دقيقة وصحيحة عند التسجيل وتحديثها عند الحاجة.</li>
                    <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 text-sky-400 mt-1 shrink-0" /> الاشتراكات المدفوعة صالحة للمدة المحددة وتتجدد حسب سياسة الباقة المختارة.</li>
                    <li className="flex items-start gap-2"><ArrowRight className="w-4 h-4 text-sky-400 mt-1 shrink-0" /> يحق للإدارة إيقاف أو تقييد أي حساب يخالف سياسات الاستخدام بدون إشعار مسبق.</li>
                  </ul>
                </section>

                <section id="anti-spam" className="scroll-mt-32 mt-16">
                  <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-6">3. سياسة الاستخدام العادل (Anti-Spam)</h2>
                  <p className="text-slate-300 leading-relaxed">
                    توفر المنصة أدوات متقدمة للأتمتة والتسويق، ولكن يُمنع منعاً باتاً استغلال هذه الأدوات بطرق تضر بالمستخدمين أو تخالف سياسات الشبكات الاجتماعية:
                  </p>
                  <ul className="text-slate-400 space-y-2 mb-6">
                    <li>إرسال رسائل احتيالية أو ضارة (Phishing, Malware).</li>
                    <li>الترويج لمنتجات ممنوعة أو غير قانونية.</li>
                    <li>إزعاج المستخدمين بإرسال آلاف الرسائل غير المرغوب فيها (Spam) دون موافقتهم المسبقة.</li>
                  </ul>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-xl flex items-start gap-4">
                    <ShieldCheck className="w-8 h-8 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-amber-300 font-bold mb-1 mt-0">تحذير الحظر</h4>
                      <p className="m-0 text-amber-200/80 text-sm leading-relaxed">
                        المنصة مزودة بنظام حماية مضاد للحظر، ولكن الإفراط في الاستخدام بطريقة تخالف سياسات المنصات (مثل واتساب أو فيسبوك) يقع على مسؤوليتك الخاصة ولا نتحمل أي تعويض عن حظر حساباتك.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="refunds" className="scroll-mt-32 mt-16">
                  <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-6 flex items-center gap-2">
                    4. سياسة الاسترداد والإلغاء
                  </h2>
                  <p className="text-slate-300 leading-relaxed">
                    نحن نقدم <strong>تجربة مجانية لمدة يومين</strong> لجميع المستخدمين لتقييم المنصة قبل الشراء. وبناءً على ذلك:
                  </p>
                  <ul className="text-slate-400 space-y-2">
                    <li>يمكن المطالبة باسترداد قيمة الاشتراك خلال أول 7 أيام في حال وجود خلل تقني جسيم يمنعك من استخدام الميزات الأساسية للمنصة.</li>
                    <li>لا يتم استرداد الأموال في حال إيقاف الحساب بسبب إساءة الاستخدام أو مخالفة البند الثالث (Anti-Spam).</li>
                  </ul>
                </section>

                <section id="disclaimer" className="scroll-mt-32 mt-16">
                  <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-6 flex items-center gap-2">
                    <Scale className="w-6 h-6 text-slate-400" /> 5. إخلاء المسؤولية والتعديلات
                  </h2>
                  <p className="text-slate-300 leading-relaxed">
                    نحن نقدم الخدمات "كما هي" دون ضمانات مطلقة بخلوها من الأخطاء التقنية، ونسعى دائماً لتحسينها وتحديثها. نحتفظ بالحق الكامل في تعديل أو تغيير هذه الشروط في أي وقت. استمرارك في استخدام المنصة بعد نشر التعديلات يُعد موافقة صريحة عليها.
                  </p>
                </section>
                
                <div className="mt-16 bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center">
                  <p className="text-slate-400 text-sm m-0">
                    لأي استفسارات قانونية أو أسئلة بخصوص الشروط والأحكام، يرجى التواصل معنا عبر <br/>
                    <a href="mailto:legal@skywaveads.com" className="text-sky-400 hover:text-sky-300 font-semibold inline-block mt-2">legal@skywaveads.com</a>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
