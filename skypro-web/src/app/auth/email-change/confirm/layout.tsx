import type { Metadata } from "next";
export const metadata: Metadata = {
  title: { absolute: "تأكيد تغيير البريد | Sky Pro" },
  description: "تأكيد تغيير البريد وإدارة وصولك إلى حساب Sky Pro.",
  alternates: { canonical: "/auth/email-change/confirm" },
  robots: { index: false, follow: true, nocache: true },
};
export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
