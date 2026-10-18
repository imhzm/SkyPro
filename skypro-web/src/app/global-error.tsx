"use client";

import { useEffect } from "react";
import "@/styles/theme.css";
import { ThemeSync, ThemeControl } from "@/components/theme/ThemeControl";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('skypro-theme');document.documentElement.dataset.skyproTheme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch{}`,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "var(--sp-bg)",
          color: "var(--sp-text)",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          boxSizing: "border-box",
        }}
      >
        <ThemeSync />
        <div style={{ textAlign: "center", maxWidth: "32rem" }}>
          <ThemeControl />
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
            }}
          >
            عذراً، حدث خطأ في النظام
          </h1>
          <p
            style={{
              color: "var(--sp-muted)",
              marginBottom: "1.5rem",
              lineHeight: 1.7,
            }}
          >
            تعذّر تحميل المنصة. يرجى إعادة تحميل الصفحة أو المحاولة بعد قليل.
          </p>
          <button
            onClick={retry}
            style={{
              padding: "0.75rem 1.5rem",
              borderRadius: "0.75rem",
              background: "linear-gradient(to right, #0A6CF1, #8B2CF5)",
              color: "#fff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            إعادة تحميل الصفحة
          </button>
          <p style={{ marginTop: "2rem" }}>
            تم التصميم بكل❤️بواسطة{" "}
            <a
              style={{ color: "var(--sp-text)" }}
              href="https://www.skywaveads.com/"
            >
              Sky Wave
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
