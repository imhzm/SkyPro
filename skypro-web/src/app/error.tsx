"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCcw, Home, MessageCircle } from "lucide-react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary:", error);
  }, [error]);

  return (
    <>
      <SiteHeader />
      <main
        className="min-h-[70vh] bg-page flex items-center justify-center px-4 py-20 relative overflow-hidden"
        dir="rtl"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-xl w-full text-center">
          <div className="w-20 h-20 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
            عذراً، حدث خطأ غير متوقع
          </h1>
          <p className="text-base text-muted max-w-md mx-auto mb-3 leading-relaxed">
            تعذّر تحميل الصفحة. جرّب مرة تانية، أو تواصل مع الدعم لو المشكلة
            مستمرة.
          </p>
          {error.digest && (
            <p className="text-xs text-muted font-mono mb-8">
              معرّف الخطأ: <span className="text-muted">{error.digest}</span>
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={retry}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 hover:from-sky-400 hover:to-violet-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-105"
            >
              <RefreshCcw className="w-4 h-4" />
              إعادة المحاولة
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-soft border border-line hover:bg-soft px-6 py-3 text-sm font-semibold text-muted transition-all"
            >
              <Home className="w-4 h-4" />
              الرئيسية
            </Link>
            <a
              href="https://wa.me/201029934356"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15 px-6 py-3 text-sm font-semibold text-positive transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              الدعم
            </a>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
