import Link from "next/link";
import { Layers3, MessageCircle } from "lucide-react";
import { Logo } from "../Logo";
import { homeOffer } from "@/data/home-theme";
import { Action, Brand, TrustLine } from "./shared";
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
      <footer className={`${styles.shell} ${styles.footer}`}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Brand footer />
            <p>
              برنامج للتسويق وإدارة حسابات المنصات،
              <br />
              من تطوير Sky Wave.
            </p>
          </div>
          <div>
            <h3>المنتج</h3>
            <Link href="/platforms">المنصات</Link>
            <a href="#features">المميزات</a>
            <a href="#pricing">الأسعار</a>
            <a href="#how-it-works">كيف يعمل</a>
          </div>
          <div>
            <h3>المساعدة</h3>
            <a href="#faq">الأسئلة الشائعة</a>
            <Link href="/privacy">سياسة الخصوصية</Link>
            <Link href="/terms">الشروط والأحكام</Link>
            <Link href="/security/policy">سياسة الأمان</Link>
          </div>
          <div>
            <h3>تواصل معنا</h3>
            <a href={homeOffer.whatsapp}>الدعم عبر واتساب</a>
            <a href={`tel:${homeOffer.phone}`} dir="ltr">
              {homeOffer.phone}
            </a>
            <a href="https://www.skywaveads.com/">موقع Sky Wave</a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} Sky Pro. جميع الحقوق محفوظة.</p>
          <p>
            تم التصميم بكل❤️بواسطة{" "}
            <a href="https://www.skywaveads.com/">Sky Wave</a>
          </p>
        </div>
      </footer>
    </>
  );
}
