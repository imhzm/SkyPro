import type { Metadata } from "next";
export const metadata: Metadata = {
  title: { absolute: "إنشاء حساب | Sky Pro" },
  description: "إنشاء حساب وإدارة وصولك إلى حساب Sky Pro.",
  alternates: { canonical: "/auth/register" },
  robots: { index: false, follow: true, nocache: true },
};
export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
