// Twitter (X) card image — same design as Open Graph.
import OpenGraphImage from './opengraph-image'

export const runtime = 'edge'
export const alt = 'SkyPro — منصة التسويق الآلي #1 عربياً | 18+ منصة بضغطة واحدة'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function TwitterImage() {
  return OpenGraphImage()
}
