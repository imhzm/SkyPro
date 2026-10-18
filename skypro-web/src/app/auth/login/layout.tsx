import type { Metadata } from "next";
export const metadata: Metadata = {
  title: { absolute: "تسجيل الدخول | Sky Pro" },
  description: "تسجيل الدخول وإدارة وصولك إلى حساب Sky Pro.",
  alternates: { canonical: "/auth/login" },
  robots: { index: false, follow: true, nocache: true },
};
export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
