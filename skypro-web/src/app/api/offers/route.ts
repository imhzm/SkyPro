import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { successResponse } from '@/lib/api'

// Public endpoint — desktop app polls this to display the offers carousel.
// Cached short to keep load light; admin updates propagate within ~60s.
export const dynamic = 'force-dynamic'
export const revalidate = 60

export async function GET() {
  try {
    const now = new Date()
    // Filter:
    //  1. isActive must be true
    //  2. startsAt is null OR startsAt <= now (scheduled to start)
    //  3. endsAt   is null OR endsAt   >= now (not yet expired)
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    })

    // Increment impression counters in the background (don't block response).
    if (offers.length > 0) {
      const ids = offers.map((o) => o.id)
      prisma.offer
        .updateMany({ where: { id: { in: ids } }, data: { impressionCount: { increment: 1 } } })
        .catch((e) => console.error('impression count update failed:', e))
    }

    // Strip internal fields and map to the shape the desktop expects.
    const payload = offers.map((o) => ({
      id: o.id,
      title: o.title || '',
      description: o.description || '',
      imageUrl: o.imageUrl || '',
      externalUrl: o.externalUrl,
      badge: o.badge || '',
    }))

    const response = NextResponse.json(successResponse(payload))
    // CORS so the Electron renderer (which fetches via fetch()) can read it.
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=60')
    return response
  } catch (err) {
    console.error('Get public offers error:', err)
    // On error, still return a 200 with empty array so the desktop falls back gracefully.
    const response = NextResponse.json(successResponse([]))
    response.headers.set('Access-Control-Allow-Origin', '*')
    return response
  }
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}
