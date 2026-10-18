import Link from "next/link";
import { ThemeControl } from "../theme/ThemeControl";
import { SiteSignature } from "./SiteFooter";
export function WorkspaceToolbar() {
  return (
    <div className="workspace-toolbar">
      <Link href="/">عرض الموقع</Link>
      <ThemeControl />
    </div>
  );
}
export function WorkspaceFooter() {
  return (
    <footer className="workspace-signature">
      <SiteSignature />
    </footer>
  );
}
