import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const STATE_COOKIE = 'g_oauth_state'

function getPublicBase(req: NextRequest) {
  const env = process.env.NEXTAUTH_URL?.replace(/\/$/, '')
  if (env) return env
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host
  return `${proto}://${host}`
}

function getRedirectUri(req: NextRequest) {
  return `${getPublicBase(req)}/api/auth/google/callback`
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(
      `${getPublicBase(req)}/auth/login?error=${encodeURIComponent('تكوين Google OAuth ناقص')}`
    )
  }

  const state = crypto.randomBytes(24).toString('hex')
  const callback = req.nextUrl.searchParams.get('callbackUrl') || '/dashboard'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(req),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  })

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`)
  response.cookies.set(STATE_COOKIE, `${state}|${callback}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 min
  })
  return response
}
