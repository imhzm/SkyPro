import Link from "next/link";
import { homeOffer } from "@/data/home-theme";
import { SiteBrand } from "./SiteBrand";
import styles from "./site.module.css";
export function SiteSignature() {
  return (
    <p>
      تم التصميم بكل❤️بواسطة <a href="https://www.skywaveads.com/">Sky Wave</a>
    </p>
  );
}
export function SiteFooter() {
  return (
    <footer className={`${styles.shell} ${styles.footer}`}>
      <div className={styles.footerTop}>
        <div className={styles.footerBrand}>
          <SiteBrand footer />
          <p>
            برنامج للتسويق وإدارة حسابات المنصات،
            <br />
            من تطوير Sky Wave.
          </p>
        </div>
        <div>
          <h3>المنتج</h3>
          <Link href="/platforms">جميع المنصات</Link>
          <Link href="/#features">المميزات</Link>
          <Link href="/#pricing">الأسعار</Link>
          <Link href="/#how-it-works">كيف يعمل</Link>
        </div>
        <div>
          <h3>المساعدة</h3>
          <Link href="/#faq">الأسئلة الشائعة</Link>
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
        <SiteSignature />
      </div>
    </footer>
  );
}
