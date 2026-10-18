import type { Metadata } from "next";
export const metadata: Metadata = {
  title: { absolute: "استكمال تسجيل الدخول | Sky Pro" },
  description: "استكمال تسجيل الدخول وإدارة وصولك إلى حساب Sky Pro.",
  alternates: { canonical: "/auth/callback" },
  robots: { index: false, follow: true, nocache: true },
};
export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
