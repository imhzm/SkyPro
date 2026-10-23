"use client";
import { useRef } from "react";
import { Expand, Monitor, Layers3 } from "lucide-react";
import { Action, TrustLine } from "./shared";
import { getProductShot } from "@/data/platform-media";
import { ProductGallery, type ProductGalleryHandle } from "@/components/product/ProductGallery";
import styles from "./hero-premium.module.css";

const images = ["skypro-saved-accounts-manager", "facebook-task-setup", "whatsapp-contacts-setup", "instagram-task-setup"].map(getProductShot);
export function Hero() {
  const gallery = useRef<ProductGalleryHandle>(null);
  return <section className={styles.hero} aria-labelledby="home-title">
    <div className={styles.copy}>
      <span className={styles.eyebrow}><Monitor size={16} /> برنامج Windows <span>·</span> واجهة عربية <span>·</span> أدوات منصات متعددة</span>
      <h1 id="home-title">أدوات تسويقك، <span>بواجهة عربية واحدة.</span></h1>
      <p>شوف الشاشات الحقيقية، وافهم وظيفة كل أداة قبل ما تبدأ. اختار المنصة، راجع متطلبات حسابك، وحدد المهمة اللي عايز تجربها.</p>
      <div className={styles.actions}>
        <Action>ابدأ تجربة يومين</Action>
        <button onClick={() => gallery.current?.open()}><Expand size={18} /> استكشف صور البرنامج</button>
      </div>
      <TrustLine />
    </div>
    <div className={styles.visual} id="product-preview">
      <ProductGallery ref={gallery} images={images} layout="hero" priority label="شوف Sky Pro من الداخل" />
      <aside className={styles.rightNote}><Layers3 size={20} /><b>اختار حسابك</b><span>قبل تشغيل الأداة</span></aside>
      <aside className={styles.leftNote}><Expand size={20} /><b>افتح الصورة</b><span>وشوف التفاصيل</span></aside>
    </div>
  </section>;
}
