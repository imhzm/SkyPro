import type { Metadata } from "next";
export const metadata: Metadata = {
  title: { absolute: "استعادة كلمة المرور | Sky Pro" },
  description: "استعادة كلمة المرور وإدارة وصولك إلى حساب Sky Pro.",
  alternates: { canonical: "/auth/forgot-password" },
  robots: { index: false, follow: true, nocache: true },
};
export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
