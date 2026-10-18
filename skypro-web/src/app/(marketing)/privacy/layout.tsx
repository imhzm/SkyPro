import { publicMetadata } from "@/data/site-metadata";
export const metadata = publicMetadata(
  "/privacy",
  "سياسة الخصوصية | Sky Pro",
  "اعرف البيانات التي يجمعها Sky Pro وكيف تُستخدم وتُحفظ، وخيارات الخصوصية وحقوقك وطرق التواصل.",
);
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
