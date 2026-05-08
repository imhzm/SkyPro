'use client'

import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { ShieldAlert, Lock, Database, Eye, ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

const sections = [
  { id: 'data-collection', title: 'البيانات التي نجمعها' },
  { id: 'data-usage', title: 'كيف نستخدم بياناتك؟' },
  { id: 'customer-protection', title: 'حماية بيانات العملاء' },
  { id: 'cookies', title: 'ملفات تعريف الارتباط (Cookies)' },
  { id: 'deletion', title: 'طلب حذف البيانات' },
]

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState('data-collection')

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
    <main className="min-h-screen bg-[#060d1b] selection:bg-violet-500/30">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060d1b] via-[#0a1938] to-[#060d1b]" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] animate-pulse" />
        
        <div className="relative z-10 section-shell text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 border border-violet-500/20 px-4 py-1.5 text-[12px] font-semibold text-violet-400 mb-6"
          >
            <ShieldAlert className="h-4 w-4" />
            التحديث الأخير: ماي 2026
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6"
          >
            سياسة <span className="gradient-text">الخصوصية</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            خصوصيتك وأمان بياناتك هما أولويتنا القصوى. توضح هذه الصفحة كيف نقوم بجمع بياناتك، استخدامها، وحمايتها بأعلى معايير الأمان العالمية.
          </motion.p>
        </div>
      </section>

      {/* Content Section */}
      <section className="relative pb-28">
        <div className="relative z-10 section-shell max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-10">
            
            {/* Sidebar Navigation */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:w-1/3 shrink-0 hidden lg:block"
            >
              <div className="sticky top-32 glass-card p-6">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-violet-400" /> محتويات السياسة
                </h4>
                <div className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-right flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${
                        activeSection === section.id
                          ? 'bg-violet-500/10 text-violet-300 font-semibold border border-violet-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className="text-sm">{section.title}</span>
                      {activeSection === section.id && (
                        <ChevronLeft className="w-4 h-4 text-violet-400" />
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
              <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-violet-500/30 transition-all duration-300">
                  <Lock className="w-8 h-8 text-sky-400 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">تشفير متقدم</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">جميع بيانات الدخول ومعلومات عملائك مشفرة ولا يمكن لأي طرف ثالث الوصول إليها.</p>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover:bg-white/[0.05] hover:border-violet-500/30 transition-all duration-300">
                  <Database className="w-8 h-8 text-violet-400 mb-4" />
                  <h3 className="text-lg font-bold text-white mb-2">بياناتك ملكك</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">نحن لا نبيع أو نشارك بياناتك وقوائم عملائك مع أي جهات خارجية تحت أي ظرف.</p>
                </div>
              </div>

              <div className="prose prose-invert prose-slate max-w-none prose-headings:text-white prose-a:text-violet-400 hover:prose-a:text-violet-300 prose-strong:text-white">
                
                <section id="data-collection" className="scroll-mt-32">
                  <h2 className="text-2xl font-bold text-white mt-0 border-b border-white/10 pb-4 mb-6">1. البيانات التي نجمعها</h2>
                  <p className="text-slate-300 leading-relaxed">عند استخدامك لمنصة سيندر برو، نقوم بجمع بعض المعلومات الأساسية لضمان عمل الخدمة بفعالية:</p>
                  <ul className="text-slate-400 space-y-2">
                    <li><strong className="text-white">معلومات الحساب:</strong> مثل الاسم، البريد الإلكتروني، ورقم الهاتف عند التسجيل.</li>
                    <li><strong className="text-white">بيانات الاستخدام:</strong> مثل سجلات الدخول (Logs)، وعناوين الـ IP الخاصة بك لأغراض الحماية.</li>
                    <li><strong className="text-white">بيانات الحملات:</strong> نقوم بتخزين تقارير الإرسال وقوائم الأرقام محلياً أو على خوادم مشفرة لتتمكن من متابعة أداء حملاتك.</li>
                  </ul>
                </section>

                <section id="data-usage" className="scroll-mt-32 mt-16">
                  <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-6">2. كيف نستخدم بياناتك؟</h2>
                  <p className="text-slate-300 leading-relaxed">يقتصر استخدامنا للبيانات على الأغراض التالية لتقديم أفضل تجربة تسويقية:</p>
                  <ul className="text-slate-400 space-y-2">
                    <li>تقديم الخدمة المطلوبة وتفعيل حسابك بسلاسة.</li>
                    <li>تحسين تجربة المستخدم وإصلاح الأخطاء التقنية.</li>
                    <li>التواصل معك بخصوص التحديثات الهامة، العروض، أو الرد على استفساراتك الفنية.</li>
                  </ul>
                </section>

                <section id="customer-protection" className="scroll-mt-32 mt-16">
                  <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-6">3. حماية بيانات العملاء الخاصة بك</h2>
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-5 mb-6 text-violet-200 text-sm leading-relaxed">
                    بصفتك مسوّقاً، أنت تقوم برفع قوائم بيانات (أرقام، إيميلات) لعملائك لغرض الإرسال. نحن نتفهم حساسية هذه المعلومات ونضمن لك سريتها التامة.
                  </div>
                  <ul className="text-slate-400 space-y-2">
                    <li>بيانات عملائك هي ملكك وحدك.</li>
                    <li>نحن لا نستخدم هذه البيانات في أي حملات تسويقية خاصة بنا.</li>
                    <li>لا يتم مشاركة هذه القوائم مع مستخدمين آخرين بأي شكل من الأشكال.</li>
                  </ul>
                </section>

                <section id="cookies" className="scroll-mt-32 mt-16">
                  <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-6">4. ملفات تعريف الارتباط (Cookies)</h2>
                  <p className="text-slate-300 leading-relaxed">
                    تستخدم المنصة ملفات تعريف الارتباط الأساسية فقط لغرضين: الأول إبقاؤك مسجلاً للدخول بشكل آمن (Session Management)، والثاني لتتبع تفضيلات الواجهة (مثل الوضع الليلي وإعدادات الإشعارات). نحن لا نستخدم ملفات التتبع الإعلاني لطرف ثالث في لوحة التحكم.
                  </p>
                </section>

                <section id="deletion" className="scroll-mt-32 mt-16">
                  <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-4 mb-6">5. طلب حذف البيانات</h2>
                  <p className="text-slate-300 leading-relaxed">
                    يحق لك في أي وقت المطالبة بحذف حسابك وكافة البيانات وقوائم العملاء المرتبطة به من سيرفراتنا نهائياً. سيتم تنفيذ طلب الحذف خلال مدة أقصاها 48 ساعة من تقديم الطلب وتأكيد هويتك.
                  </p>
                </section>
                
                <div className="mt-16 bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center">
                  <p className="text-slate-400 text-sm m-0">
                    إذا كان لديك أي أسئلة حول سياسة الخصوصية، تواصل مع فريق الحماية والخصوصية عبر <br/>
                    <a href="mailto:privacy@skywaveads.com" className="text-violet-400 hover:text-violet-300 font-semibold inline-block mt-2">privacy@skywaveads.com</a>
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
