import Image from "next/image";
import { getProductShot } from "@/data/platform-media";
import styles from "./guides.module.css";

export function GuideCover({ shotId, tone = "ink", priority = false }: {
  shotId: string; tone?: "ink" | "aqua" | "violet"; priority?: boolean;
}) {
  const shot = getProductShot(shotId);
  return (
    <div className={`${styles.cover} ${styles[tone]}`}>
      <span className={styles.coverLabel}>لقطة فعلية من البرنامج</span>
      <div className={styles.productFrame}>
        <div className={styles.frameTop} aria-hidden="true"><span>● ● ●</span><span>Sky Pro</span></div>
        <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height}
          quality={90} preload={priority} sizes="(max-width: 650px) 86vw, (max-width: 1000px) 43vw, 560px" />
      </div>
    </div>
  );
}
