import Link from "next/link";
import type { Metadata } from "next";
import { Compass, Home, ArrowRight, Layers, MessageCircle } from "lucide-react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة (404)",
  description:
    "الصفحة التي تبحث عنها غير موجودة. عُد إلى صفحة SkyPro الرئيسية.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main
        className="min-h-[70vh] bg-page flex items-center justify-center px-4 py-20 relative overflow-hidden"
        dir="rtl"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-2xl w-full text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/30 px-4 py-1.5 mb-8">
            <Compass className="w-4 h-4 text-brand" />
            <span className="text-xs font-semibold text-brand">
              خطأ 404 — الصفحة غير موجودة
            </span>
          </div>

          <h1 className="text-7xl sm:text-9xl font-extrabold bg-gradient-to-br from-sky-400 via-blue-500 to-violet-500 bg-clip-text text-transparent mb-4">
            404
          </h1>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            ضعت في السحاب؟
          </h2>
          <p className="text-base sm:text-lg text-muted max-w-md mx-auto mb-10 leading-relaxed">
            الصفحة التي تبحث عنها غير موجودة أو تم نقلها. جرّب أحد الروابط
            بالأسفل أو عُد للرئيسية.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-105"
            >
              <Home className="w-4 h-4" />
              العودة للرئيسية
            </Link>
            <Link
              href="/platforms"
              className="inline-flex items-center gap-2 rounded-xl bg-soft border border-line hover:bg-soft hover:border-line px-6 py-3 text-sm font-semibold text-muted transition-all"
            >
              <Layers className="w-4 h-4" />
              استكشف المنصات
            </Link>
            <a
              href="https://wa.me/201029934356"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15 px-6 py-3 text-sm font-semibold text-positive transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              تواصل عبر واتساب
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
            {[
              { label: "الأسعار", href: "/#pricing" },
              { label: "الأسئلة الشائعة", href: "/#faq" },
              { label: "تسجيل الدخول", href: "/auth/login" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-panel border border-line rounded-xl px-4 py-3 text-sm text-muted hover:text-foreground hover:bg-soft hover:border-line transition-all flex items-center justify-center gap-2 group"
              >
                {link.label}
                <ArrowRight className="w-3.5 h-3.5 -scale-x-100 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
