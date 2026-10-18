import Link from "next/link";
import { Logo } from "../marketing/Logo";
import styles from "./site.module.css";
export function SiteBrand({ footer = false }: { footer?: boolean }) {
  return (
    <Link href="/" aria-label="Sky Pro الرئيسية" className={styles.brand}>
      <Logo size={footer ? 45 : 38} priority={!footer} />
      <span dir="ltr">
        Sky <b>Pro</b>
        <small>BY SKY WAVE</small>
      </span>
    </Link>
  );
}
