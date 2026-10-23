import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { Logo } from "../Logo";
import { homePlatforms } from "@/data/home-theme";
import { getProductShot } from "@/data/platform-media";
import { platformMarks } from "@/data/platform-marks";
import styles from "./home.module.css";
export function SectionHeading({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.sectionHeading}>
      <span className={styles.eyebrow}>
        <Sparkles size={12} aria-hidden="true" />
        {label}
      </span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Brand({ footer = false }: { footer?: boolean }) {
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

export function PlatformMark({
  platform,
}: {
  platform: (typeof homePlatforms)[number];
}) {
  return (
    <span
      className={`${styles.platformMark} ${platform.id === "instagram" ? styles.instagram : ""}`}
      style={{ "--platform": platform.color } as CSSProperties}
      aria-hidden="true"
    >
      {platform.mark === "maps" ? (
        <svg viewBox="0 0 32 40" width="25" height="30">
          <path
            fill="#34a853"
            d="M16 0C7 0 0 7 0 16c0 11 16 24 16 24s16-13 16-24C32 7 25 0 16 0Z"
          />
          <path fill="#4285f4" d="M16 0C7 0 0 7 0 16l12-4 10-11Z" />
          <path fill="#fbbc04" d="m0 16 12-4 8 9L9 32C4 26 0 20 0 16Z" />
          <path fill="#ea4335" d="m22 1-10 11 8 9 11-9C30 7 27 3 22 1Z" />
          <circle cx="16" cy="16" r="6" fill="white" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="25" height="25" fill="currentColor">
          <path d={platformMarks[platform.id]} />
        </svg>
      )}
    </span>
  );
}

export function Action({
  children = "ابدأ الآن مجانًا",
  secondary = false,
  href = "/auth/register",
}: {
  children?: ReactNode;
  secondary?: boolean;
  href?: string;
}) {
  return (
    <Link
      className={secondary ? styles.secondaryButton : styles.primaryButton}
      href={href}
    >
      {children}
      <ArrowLeft size={16} aria-hidden="true" />
    </Link>
  );
}

export function TrustLine() {
  return (
    <ul className={styles.trustLine}>
      <li>
        <Check />
        تجربة يومين مجانًا
      </li>
      <li>
        <Check />
        بدون بطاقة ائتمانية
      </li>
      <li>
        <Check />
        دعم باللغة العربية
      </li>
    </ul>
  );
}

export function ProductScreen({ compact = false }: { compact?: boolean }) {
  const shot = getProductShot(compact ? "facebook-task-setup" : "skypro-saved-accounts-manager");
  return (
    <div className={compact ? styles.compactScreen : styles.productScreen}>
      <div className={styles.screenChrome}>
        <span />
        <span />
        <span />
        <b dir="ltr">Sky Pro</b>
      </div>
      <Image
        src={shot.src}
        alt={shot.alt}
        width={shot.width}
        height={shot.height}
        quality={90}
        priority={!compact}
        loading={compact ? "lazy" : "eager"}
        sizes={
          compact
            ? "(max-width: 768px) 85vw, 500px"
            : "(max-width: 768px) 92vw, 750px"
        }
      />
    </div>
  );
}
