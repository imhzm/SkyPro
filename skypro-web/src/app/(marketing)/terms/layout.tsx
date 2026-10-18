import { publicMetadata } from "@/data/site-metadata";
export const metadata = publicMetadata(
  "/terms",
  "الشروط والأحكام | Sky Pro",
  "راجع شروط استخدام Sky Pro والاشتراك والدفع والاسترداد والاستخدام المسموح وحدود المسؤولية.",
);
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
