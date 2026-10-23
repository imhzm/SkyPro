import manifest from "./product-media-manifest.json";

export interface ProductShot {
  id: string;
  platform: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  caption: string;
  kind: string;
  source: string;
  sourceSha256: string;
  sha256: string;
  crop?: { left: number; top: number; width: number; height: number };
}
export interface PlatformMedia {
  hero: string | null;
  gallery: string[];
  caption: string;
  status: string;
}
export const productShots = manifest.shots as Record<string, ProductShot>;
export const platformMedia = manifest.platforms as Record<string, PlatformMedia>;
export function getProductShot(id: string): ProductShot {
  const shot = productShots[id];
  if (!shot) throw new Error(`Unregistered product image: ${id}`);
  return shot;
}
export function platformImage(id: string): string | null {
  const hero = platformMedia[id]?.hero;
  return hero ? getProductShot(hero).src : null;
}
export function platformCategory(id: string) {
  if (["google-maps", "olx"].includes(id)) return "data";
  if (["accounts", "security", "auto-point"].includes(id)) return "tools";
  if (id === "send-emails") return "email";
  return "social";
}
