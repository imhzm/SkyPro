"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get("error");

    if (error) {
      router.push(`/auth/login?error=${encodeURIComponent(error)}`);
    } else {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data?.role === "admin") {
            router.replace("/admin");
          } else if (!data.success) {
            router.replace("/auth/login");
          } else {
            router.replace("/dashboard");
          }
        })
        .catch(() => router.push("/dashboard"));
    }
  }, [router]);

  return (
    <div
      className="auth-screen flex items-center justify-center bg-page"
      dir="rtl"
    >
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-3">استكمال تسجيل الدخول</h1>
        <p role="status" className="text-muted">جارٍ التحقق من الجلسة...</p>
      </div>
    </div>
  );
}
