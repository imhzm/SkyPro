import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

/**
 * Public click-tracking endpoint. The desktop fires this when the user
 * clicks an offer card — we increment clickCount and return the target
 * URL. Returns redirect-friendly JSON so the renderer can optionally
 * navigate via window.open() while still recording the click.
 *
 * Permissive on errors — never block the user from following an offer.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await ctx.params
    const id = Number.parseInt(rawId, 10)
    if (!Number.isFinite(id) || id <= 0) {
      return jsonResponse(errorResponse('معرّف غير صالح'), 400)
    }

    const offer = await prisma.offer.findUnique({
      where: { id },
      select: { id: true, externalUrl: true, isActive: true },
    })
    if (!offer) return jsonResponse(errorResponse('العرض غير موجود'), 404)

    // Increment in the background — don't block.
    prisma.offer
      .update({ where: { id }, data: { clickCount: { increment: 1 } } })
      .catch((e) => console.error('click count update failed:', e))

    return jsonResponse(successResponse({ url: offer.externalUrl }))
  } catch (err) {
    console.error('Click track error:', err)
    return jsonResponse(errorResponse('فشل تسجيل النقرة'), 500)
  }
}

function jsonResponse(body: unknown, status = 200) {
  const response = NextResponse.json(body, { status })
  response.headers.set('Access-Control-Allow-Origin', '*')
  return response
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 })
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
  return response
}
