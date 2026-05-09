import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/db'
import { generateApiKey, getTrialEndDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'g_oauth_state'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production'
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token'

function loginRedirect(req: NextRequest, error: string) {
  return NextResponse.redirect(
    new URL(`/auth/login?error=${encodeURIComponent(error)}`, req.url)
  )
}

function getRedirectUri(req: NextRequest) {
  const base = process.env.NEXTAUTH_URL?.replace(/\/$/, '')
    ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`
  return `${base}/api/auth/google/callback`
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const state = req.nextUrl.searchParams.get('state')
  const oauthError = req.nextUrl.searchParams.get('error')

  if (oauthError) {
    return loginRedirect(req, `Google: ${oauthError}`)
  }
  if (!code || !state) {
    return loginRedirect(req, 'استجابة Google غير مكتملة')
  }

  // Validate state
  const stateCookie = req.cookies.get(STATE_COOKIE)?.value
  if (!stateCookie) return loginRedirect(req, 'انتهت صلاحية الجلسة، حاول مرة أخرى')
  const [savedState, callbackUrl = '/dashboard'] = stateCookie.split('|')
  if (savedState !== state) {
    return loginRedirect(req, 'state غير صالح — احمي حسابك')
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const secret = process.env.NEXTAUTH_SECRET
  if (!clientId || !clientSecret || !secret) {
    return loginRedirect(req, 'تكوين Google OAuth ناقص')
  }

  // 1. Exchange code → tokens
  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(req),
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) {
    return loginRedirect(req, 'تعذّر استبدال رمز Google')
  }
  const tokens = await tokenRes.json() as { access_token?: string; id_token?: string }
  if (!tokens.access_token) {
    return loginRedirect(req, 'استجابة Google غير صالحة')
  }

  // 2. Fetch user info
  const userRes = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!userRes.ok) {
    return loginRedirect(req, 'تعذّر جلب بيانات المستخدم من Google')
  }
  const profile = await userRes.json() as {
    id?: string
    email?: string
    verified_email?: boolean
    name?: string
    picture?: string
  }
  if (!profile.email) {
    return loginRedirect(req, 'بريد Google غير متاح')
  }

  // 3. Find or create user (mirrors auth.ts logic)
  let user = await prisma.user.findUnique({
    where: { email: profile.email },
    select: { id: true, email: true, name: true, avatarUrl: true, role: true, status: true },
  })

  if (user && user.status !== 'active' && user.status !== 'pending_verification') {
    return loginRedirect(req, 'الحساب غير نشط — تواصل مع الدعم')
  }

  if (!user) {
    const trialDays = parseInt(process.env.DEFAULT_TRIAL_DAYS || '2', 10)
    const trialEndsAt = getTrialEndDate()
    const keyCode = generateApiKey()
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'

    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: profile.email!,
          name: profile.name || '',
          avatarUrl: profile.picture || null,
          role: 'user',
          status: 'active',
          emailVerifiedAt: new Date(),
        },
        select: { id: true, email: true, name: true, avatarUrl: true, role: true, status: true },
      })
      const activationKey = await tx.activationKey.create({
        data: {
          keyCode,
          userId: newUser.id,
          status: 'active',
          plan: 'trial',
          durationDays: trialDays,
          maxDevices: parseInt(process.env.DEFAULT_MAX_DEVICES || '1', 10),
          activatedAt: new Date(),
          expiresAt: trialEndsAt,
        },
      })
      await tx.subscription.create({
        data: {
          userId: newUser.id,
          keyId: activationKey.id,
          status: 'trial',
          trialEndsAt,
          startedAt: new Date(),
          expiresAt: trialEndsAt,
        },
      })
      await tx.auditLog.create({
        data: { userId: newUser.id, action: 'register_google', details: { keyCode, trialDays }, ipAddress },
      })
      return newUser
    })
    user = created
  } else {
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'login_google', ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0' },
    })
  }

  // Re-activate / refresh status
  if (user.status !== 'active') {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'active', emailVerifiedAt: new Date() },
    })
    user.status = 'active'
  }

  // 4. Issue NextAuth-compatible JWT session token
  const maxAge = 30 * 24 * 60 * 60
  const sessionToken = await encode({
    token: {
      id: String(user.id),
      sub: String(user.id),
      email: user.email,
      name: user.name || undefined,
      picture: user.avatarUrl || undefined,
      role: user.role || 'user',
      status: 'active',
    },
    secret,
    salt: SESSION_COOKIE_NAME,
    maxAge,
  })

  // 5. Set cookie + redirect to chosen destination
  const safeCallback = callbackUrl.startsWith('/') ? callbackUrl : '/dashboard'
  const target = user.role === 'admin' && safeCallback === '/dashboard' ? '/admin' : safeCallback
  const response = NextResponse.redirect(new URL(target, req.url))

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })

  // Clear state cookie
  response.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' })

  return response
}
