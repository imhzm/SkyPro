"use client";

import Image from "next/image";
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, Minus, Plus, X } from "lucide-react";
import type { ProductShot } from "@/data/platform-media";
import { trackProductEvent } from "@/lib/product-analytics";
import styles from "./product-gallery.module.css";

export interface ProductGalleryHandle { open: (index?: number) => void }
interface Props {
  images: ProductShot[];
  layout?: "hero" | "grid";
  priority?: boolean;
  label?: string;
}
export const ProductGallery = forwardRef<ProductGalleryHandle, Props>(function ProductGallery(
  { images, layout = "grid", priority = false, label = "صور البرنامج" }, ref,
) {
  const [active, setActive] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const isOpen = active !== null;
  const current = images[active ?? 0];
  function open(index = 0) {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setFit(true); setZoom(1); setActive(index);
    trackProductEvent("view_product_gallery", images[index]?.platform);
  }
  useImperativeHandle(ref, () => ({ open }));
  useEffect(() => {
    const modal = dialog.current;
    if (!isOpen || !modal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal.showModal();
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (modal.open) modal.close();
      opener.current?.focus();
    };
  }, [isOpen]);
  if (!current) return null;
  function step(delta: number) {
    setActive(index => ((index ?? 0) + delta + images.length) % images.length);
    setZoom(1); setFit(true);
    viewport.current?.scrollTo(0, 0);
  }
  function changeZoom(delta: number) {
    setFit(false);
    setZoom(value => Math.min(2.5, Math.max(1, value + delta)));
  }
  const visible = layout === "hero" ? images.slice(0, 1) : images;
  return (
    <div className={`${styles.gallery} ${layout === "hero" ? styles.hero : styles.grid}`} role="group" aria-label={label}>
      {visible.map((shot, index) => (
        <figure className={styles.figure} key={shot.id}>
          <div className={styles.chrome} aria-hidden="true"><span>● ● ●</span><b>Sky Pro</b></div>
          <button className={styles.open} onClick={() => open(index)} aria-label={`فتح وتكبير: ${shot.title}`}>
            <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height}
              preload={priority && index === 0} fetchPriority={priority && index === 0 ? "high" : undefined} quality={90}
              sizes={layout === "hero" ? "(max-width: 768px) 94vw, (max-width: 1100px) 88vw, 1080px" : "(max-width: 768px) 92vw, 600px"} />
            <span className={styles.expand}><Expand size={17} /> {layout === "hero" ? (images.length === 1 ? "افتح الصورة" : "افتح المعرض") : "شوف التفاصيل"}</span>
          </button>
          <figcaption><strong>{shot.title}</strong><span>{shot.caption}</span></figcaption>
        </figure>
      ))}
      <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
        onClose={() => { setActive(null); setFit(true); setZoom(1); }}
        onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
        onKeyDown={event => {
          if (event.key === "Tab") {
            const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not([disabled]), a[href], [tabindex="0"]',
            )).filter(element => element.getClientRects().length > 0);
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first && last) {
              event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last && first) {
              event.preventDefault(); first.focus();
            }
          }
          if (event.key === "ArrowLeft") { event.preventDefault(); step(1); }
          if (event.key === "ArrowRight") { event.preventDefault(); step(-1); }
          if (event.key === "+" || event.key === "=") { event.preventDefault(); changeZoom(.25); }
          if (event.key === "-") { event.preventDefault(); changeZoom(-.25); }
        }}>
        <div className={styles.dialogTop}>
          <div><p>{label}</p><h2 id={titleId}>{current.title}</h2></div>
          <button ref={closeButton} aria-label="إغلاق معرض الصور" onClick={() => dialog.current?.close()}><X /></button>
        </div>
        <div className={styles.toolbar}>
          <span role="status" aria-live="polite" dir="ltr">{(active ?? 0) + 1} / {images.length}</span>
          <button onClick={() => { setFit(true); setZoom(1); }} aria-pressed={fit}>ملاءمة الشاشة</button>
          <button onClick={() => { setFit(false); setZoom(1); }} aria-pressed={!fit && zoom === 1}>الحجم الأصلي</button>
          <button onClick={() => changeZoom(.25)} disabled={!fit && zoom >= 2.5} aria-label="تكبير الصورة"><Plus /></button>
          <span>{fit ? "ملاءمة" : `${Math.round(zoom * 100)}%`}</span>
          <button onClick={() => changeZoom(-.25)} disabled={!fit && zoom <= 1} aria-label="تصغير الصورة"><Minus /></button>
        </div>
        <div className={styles.viewport} ref={viewport} tabIndex={0} role="region" aria-label="الصورة المكبرة؛ يمكن تمريرها بعد التكبير">
          {/* The modal requests the original curated asset, without optimizer downsampling. */}
          <Image src={current.src} alt={current.alt} width={current.width} height={current.height} unoptimized
            className={fit ? styles.fit : styles.zoomed}
            style={fit ? undefined : { width: current.width * zoom, maxWidth: "none", maxHeight: "none" }} />
        </div>
        <p className={styles.caption}>{current.caption}</p>
        {images.length > 1 && <div className={styles.navigation}>
          <button onClick={() => step(-1)} aria-label="الصورة السابقة"><ChevronRight /><span>السابقة</span></button>
          <div className={styles.thumbnails} role="group" aria-label="اختيار صورة">
            {images.map((shot, index) => <button key={shot.id} onClick={() => { setActive(index); setFit(true); setZoom(1); }}
              aria-label={shot.title} aria-current={index === active ? "true" : undefined}>
              <Image src={shot.src} alt="" width={96} height={60} sizes="96px" />
            </button>)}
          </div>
          <button onClick={() => step(1)} aria-label="الصورة التالية"><span>التالية</span><ChevronLeft /></button>
        </div>}
        <p className={styles.keyboard}>الأسهم للتنقل · + و− للتكبير · Escape للإغلاق</p>
      </dialog>
    </div>
  );
});
