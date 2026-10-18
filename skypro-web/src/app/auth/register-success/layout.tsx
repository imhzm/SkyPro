import type { Metadata } from "next";
export const metadata: Metadata = {
  title: { absolute: "الخطوة التالية لتفعيل حسابك | Sky Pro" },
  description: "الخطوة التالية لتفعيل حسابك وإدارة وصولك إلى حساب Sky Pro.",
  alternates: { canonical: "/auth/register-success" },
  robots: { index: false, follow: true, nocache: true },
};
export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
