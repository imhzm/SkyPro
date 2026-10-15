"use client";
import { useRef } from "react";
import {
  CalendarClock,
  Headphones,
  Layers3,
  Monitor,
  Play,
  X,
  Zap,
} from "lucide-react";
import { Action, ProductScreen, TrustLine } from "./shared";
import styles from "./home.module.css";
export function Hero() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.heroWave} aria-hidden="true" />
      <div className={`${styles.shell} ${styles.heroLayout}`}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <Zap size={13} />
            كل أدواتك في مكان واحد
          </span>
          <h1 id="home-title">
            إدارة وتسويق حساباتك
            <br />
            <span>
              في كل المنصات
              <br />
              من مكان واحد
            </span>
          </h1>
          <p>
            Sky Pro يجمع أدوات التسويق وإدارة الحسابات في برنامج واحد. نظّم
            بياناتك، جهّز رسائلك، وتابع شغلك من واجهة عربية واضحة.
          </p>
          <div className={styles.heroActions}>
            <Action />
            <button
              ref={trigger}
              className={styles.secondaryButton}
              onClick={() => dialog.current?.showModal()}
            >
              <Play size={17} aria-hidden="true" />
              شاهد البرنامج
            </button>
          </div>
          <TrustLine />
        </div>
        <div className={styles.heroVisual}>
          <span className={styles.handNote}>
            حساباتك وأدواتك
            <br />
            في مكان واحد <span>⤵</span>
          </span>
          <div className={styles.laptop}>
            <ProductScreen />
            <div className={styles.laptopBase} />
          </div>
          <div className={`${styles.floatingCard} ${styles.scheduleCard}`}>
            <span className={styles.featureIcon}>
              <CalendarClock />
            </span>
            <div>
              <b>خطّط لشغلك</b>
              <small>أدوات لتنظيم حملاتك</small>
            </div>
          </div>
          <div className={`${styles.floatingCard} ${styles.platformsCard}`}>
            <span className={styles.featureIcon}>
              <Layers3 />
            </span>
            <div>
              <b>منصات متعددة</b>
              <small>واجهة واحدة تجمع أدواتك</small>
            </div>
          </div>
        </div>
      </div>
      <div className={`${styles.shell} ${styles.stats}`}>
        <div>
          <Layers3 />
          <span>
            <strong>10+</strong>
            <small>منصات تسويق</small>
          </span>
        </div>
        <div>
          <CalendarClock />
          <span>
            <strong>يومين</strong>
            <small>تجربة مجانية</small>
          </span>
        </div>
        <div>
          <Monitor />
          <span>
            <strong>Windows</strong>
            <small>تطبيق للكمبيوتر</small>
          </span>
        </div>
        <div>
          <Headphones />
          <span>
            <strong>بالعربي</strong>
            <small>واجهة ودعم فني</small>
          </span>
        </div>
      </div>
      <dialog
        ref={dialog}
        className={styles.previewDialog}
        aria-labelledby="preview-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
        onClose={() => trigger.current?.focus()}
      >
        <div className={styles.dialogHeader}>
          <h2 id="preview-title">شوف Sky Pro من الداخل</h2>
          <button
            className={styles.iconButton}
            aria-label="إغلاق معاينة البرنامج"
            onClick={() => dialog.current?.close()}
          >
            <X />
          </button>
        </div>
        <ProductScreen compact />
        <p>لقطة فعلية من التطبيق. جرّب الأدوات بنفسك خلال التجربة المجانية.</p>
        <Action />
      </dialog>
    </section>
  );
}
