import Link from 'next/link'
import { ArrowLeft, Layers } from 'lucide-react'
import { platforms } from '@/data/platforms'
import { PlatformIcon } from '@/components/marketing/PlatformIcon'

/**
 * Internal-linking component: shows 4-6 related platforms in a strip.
 *
 * Used at the bottom of each /platforms/[id] page to:
 *  - Reduce bounce rate (give users next options)
 *  - Boost crawl depth (Google follows these links)
 *  - Build a topic cluster (one main /platforms hub + spokes)
 *
 * Excludes the current platform; picks 6 related ones (or all if total < 6).
 */
export function RelatedPlatforms({ currentId, max = 6 }: { currentId?: string; max?: number }) {
  const others = platforms
    .filter((p) => p.id !== currentId)
    .slice(0, max)

  if (others.length === 0) return null

  return (
    <section className="py-20 relative" aria-labelledby="related-platforms-heading">
      <div className="section-shell">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="text-sky-400 text-xs font-bold uppercase tracking-widest mb-2">
              منصات أخرى مدعومة
            </p>
            <h2
              id="related-platforms-heading"
              className="text-2xl sm:text-3xl font-extrabold text-white"
            >
              استكشف أتمتة <span className="gradient-text-brand">{platforms.length}+ منصة</span>
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl leading-relaxed">
              SkyPro يدعم كل منصات التواصل الرئيسية في مساحة عمل واحدة. اختر المنصة التي تهمك
              لمعرفة المزيد عن مميزاتها داخل SkyPro.
            </p>
          </div>
          <Link
            href="/platforms"
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-all shrink-0"
          >
            <Layers className="w-4 h-4" />
            عرض كل المنصات
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {others.map((p) => (
            <Link
              key={p.id}
              href={`/platforms/${p.id}`}
              className="group bg-white/[0.03] border border-white/8 rounded-2xl p-4 flex flex-col items-center gap-2 hover:bg-white/[0.06] hover:border-sky-500/30 transition-all"
              title={`SkyPro لـ ${p.name}`}
            >
              <PlatformIcon id={p.id} size={32} />
              <span className="text-white text-xs font-semibold text-center leading-tight">
                {p.name}
              </span>
              <span className="text-[10px] text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                اقرأ المزيد →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
