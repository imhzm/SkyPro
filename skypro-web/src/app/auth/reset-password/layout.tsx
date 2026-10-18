import type { Metadata } from "next";
export const metadata: Metadata = {
  title: { absolute: "تعيين كلمة مرور جديدة | Sky Pro" },
  description: "تعيين كلمة مرور جديدة وإدارة وصولك إلى حساب Sky Pro.",
  alternates: { canonical: "/auth/reset-password" },
  robots: { index: false, follow: true, nocache: true },
};
export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
