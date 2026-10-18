import { SiteFooter } from "@/components/site/SiteFooter";
import { Layers3, MessageCircle } from "lucide-react";
import { Logo } from "../Logo";
import { homeOffer } from "@/data/home-theme";
import { Action, TrustLine } from "./shared";
import styles from "./home.module.css";
export function HomeFooter() {
  return (
    <>
      <section className={`${styles.shell} ${styles.finalCta}`}>
        <div className={styles.ctaArt} aria-hidden="true">
          <Logo size={88} />
          <span>
            <Layers3 size={23} />
          </span>
          <span>
            <MessageCircle size={23} />
          </span>
        </div>
        <div>
          <h2>جاهز ترتّب شغلك في مكان واحد؟</h2>
          <p>ابدأ تجربتك المجانية واكتشف أدوات Sky Pro المناسبة لشغلك.</p>
          <div className={styles.ctaActions}>
            <Action />
            <Action href={homeOffer.whatsapp} secondary>
              كلّم فريق الدعم
            </Action>
          </div>
          <TrustLine />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
