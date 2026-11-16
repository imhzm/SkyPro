import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import {
  GOOGLE_CONVERSION_COOKIE, GOOGLE_CONVERSION_TTL, googleConversionCookieOptions, readGoogleConversionReceipt,
} from '@/lib/google-conversion-receipt'
import { ANALYTICS_CONSENT_COOKIE, hasAnalyticsConsentCookie } from '@/lib/product-analytics'
import { checkRateLimit, sameOrigin } from '@/lib/request-security'

export async function POST(req: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' }
  if (!req.headers.has('origin') || req.headers.get('sec-fetch-site') !== 'same-origin' || !sameOrigin(req)) {
    return new Response(null, { status: 403, headers })
  }

  const token = req.cookies.get(GOOGLE_CONVERSION_COOKIE)?.value
  const secret = process.env.NEXTAUTH_SECRET
  if (!token || !secret) return new Response(null, { status: 204, headers })

  const user = (await auth())?.user
  const receipt = user?.id && user.role === 'user' && user.status === 'active' && !user.impersonatedBy
    ? await readGoogleConversionReceipt(token, user.id, secret) : null
  const deliver = receipt && checkRateLimit(`google-conversion:${receipt.id}`, 1, GOOGLE_CONVERSION_TTL * 1000).allowed
    && hasAnalyticsConsentCookie(req.cookies.get(ANALYTICS_CONSENT_COOKIE)?.value)
  const response = receipt ? NextResponse.json({
    target: receipt.target,
    registrationCompleted: Boolean(deliver && receipt.registrationCompleted),
    trialActivated: Boolean(deliver && receipt.trialActivated),
  }, { headers }) : new NextResponse(null, { status: 204, headers })
  response.cookies.set(GOOGLE_CONVERSION_COOKIE, '', { ...googleConversionCookieOptions, maxAge: 0 })
  return response
}
