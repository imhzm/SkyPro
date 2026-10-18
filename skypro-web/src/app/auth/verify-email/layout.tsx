import type { Metadata } from "next";
export const metadata: Metadata = {
  title: { absolute: "تأكيد البريد الإلكتروني | Sky Pro" },
  description: "تأكيد البريد الإلكتروني وإدارة وصولك إلى حساب Sky Pro.",
  alternates: { canonical: "/auth/verify-email" },
  robots: { index: false, follow: true, nocache: true },
};
export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
