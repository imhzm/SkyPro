// Twitter (X) card image — same design as Open Graph.
import OpenGraphImage from './opengraph-image'

export const runtime = 'edge'
export const alt = 'Sky Pro | إدارة الحسابات وأدوات التسويق من مكان واحد'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function TwitterImage() {
  return OpenGraphImage()
}
