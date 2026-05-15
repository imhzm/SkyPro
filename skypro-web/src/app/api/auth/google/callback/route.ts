import { NextRequest, NextResponse } from 'next/server'
import { encode } from 'next-auth/jwt'
import { prisma } from '@/lib/db'
import { generateApiKey, getTrialEndDate, hashPassword, generateRandomPassword } from '@/lib/utils'
import { sendEmail, generateWelcomeEmail, generateWelcomeEmailText } from '@/lib/email'
import { checkRateLimit, getClientIp } from '@/lib/request-security'

export const dynamic = 'force-dynamic'

const STATE_COOKIE = 'g_oauth_state'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

const SESSION_COOKIE_NAME = process.env.NODE_ENV === 'production'
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token'

function getPublicBase(req: NextRequest) {
  // Always prefer NEXTAUTH_URL — the request URL behind a reverse proxy may
  // resolve to localhost which corrupts redirects.
  const env = process.env.NEXTAUTH_URL?.replace(/\/$/, '')
  if (env) return env
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '')
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host
  return `${proto}://${host}`
}

function loginRedirect(req: NextRequest, error: string) {
  return NextResponse.redirect(
    `${getPublicBase(req)}/auth/login?error=${encodeURIComponent(error)}`
  )
}

function getRedirectUri(req: NextRequest) {
  return `${getPublicBase(req)}/api/auth/google/callback`
}

/** Fire-and-forget welcome email — never block the redirect */
async function sendWelcomeEmailSafe(data: {
  name?: string | null
  email: string
  password?: string | null
  serial: string
  expiryDate: string
  planLabel?: string
  loginMethod?: string
}) {
  try {
    console.log('[GoogleCallback] Sending welcome email to:', data.email)
    const result = await sendEmail({
      to: data.email,
      subject: 'بيانات تجربة SkyPro المجانية',
      text: generateWelcomeEmailText(data),
      html: generateWelcomeEmail(data),
    })
    if (result.success) {
      console.log('[GoogleCallback] Email sent OK:', result.messageId)
    } else {
      console.error('[GoogleCallback] Email send failed:', result.error)
    }
  } catch (err) {
    console.error('[GoogleCallback] Email error:', err instanceof Error ? err.message : err)
  }
}

export async function GET(req: NextRequest) {
  // Rate-limit callback per IP (prevent abuse / brute-force on state)
  const ip = getClientIp(req)
  const limit = checkRateLimit(`google-oauth:callback:${ip}`, 60, 60 * 60 * 1000)
  if (!limit.allowed) {
    return loginRedirect(req, 'محاولات كثيرة — انتظر قليلاً')
  }

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

  // 1. Exchange code -> tokens
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

  // 3. Find or create user
  let user = await prisma.user.findUnique({
    where: { email: profile.email },
    select: {
      id: true, email: true, name: true, avatarUrl: true,
      role: true, status: true, passwordHash: true,
    },
  })

  let isNewUser = false
  let welcomeEmailData: Parameters<typeof sendWelcomeEmailSafe>[0] | null = null

  if (user) {
    // Block deleted/suspended accounts
    if (user.status === 'suspended') {
      return loginRedirect(req, 'الحساب محظور — تواصل مع الدعم')
    }
    if (user.status === 'deleted') {
      return loginRedirect(req, 'هذا الحساب محذوف ولا يمكن استخدامه')
    }
    // Prevent OAuth account hijacking on unverified Google emails
    if (user.passwordHash && !profile.verified_email) {
      return loginRedirect(req, 'سجّل الدخول بكلمة المرور أولاً ثم اربط Google من الإعدادات')
    }
  }

  if (!user) {
    // ── NEW USER: create account + trial + auto-password ──
    isNewUser = true
    const trialDays = parseInt(process.env.DEFAULT_TRIAL_DAYS || '2', 10)
    const trialEndsAt = getTrialEndDate()
    const keyCode = generateApiKey()
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0'

    // Auto-generate a password so the user can also login with email/password
    const plainPassword = generateRandomPassword(14)
    const hashedPassword = hashPassword(plainPassword)

    const created = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: profile.email!,
          name: profile.name || '',
          avatarUrl: profile.picture || null,
          passwordHash: hashedPassword,
          role: 'user',
          status: 'active',
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true, email: true, name: true, avatarUrl: true,
          role: true, status: true, passwordHash: true,
        },
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
        data: {
          userId: newUser.id,
          action: 'register_google',
          details: { keyCode, trialDays, autoPasswordSet: true },
          ipAddress,
        },
      })
      return newUser
    })
    user = created

    // Prepare welcome email data (will be sent after building the response)
    welcomeEmailData = {
      name: user.name || 'عميلنا الكريم',
      email: user.email,
      password: plainPassword,
      serial: keyCode,
      expiryDate: trialEndsAt.toLocaleDateString('ar-EG'),
      planLabel: `تجربة مجانية لمدة ${trialDays} يوم`,
      loginMethod: 'Google',
    }
  } else {
    // ── EXISTING USER ──
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login_google',
        ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0',
      },
    })

    // If existing user has no activation key, create a trial key
    const existingKey = await prisma.activationKey.findFirst({
      where: {
        userId: user.id,
        status: { in: ['active', 'available'] },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!existingKey) {
      const trialDays = parseInt(process.env.DEFAULT_TRIAL_DAYS || '2', 10)
      const trialEndsAt = getTrialEndDate()
      const keyCode = generateApiKey()

      const activationKey = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user!.id },
          data: {
            status: 'active',
            emailVerifiedAt: user!.status === 'pending_verification' ? new Date() : undefined,
          },
        })

        const newKey = await tx.activationKey.create({
          data: {
            keyCode,
            userId: user!.id,
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
            userId: user!.id,
            keyId: newKey.id,
            status: 'trial',
            trialEndsAt,
            startedAt: new Date(),
            expiresAt: trialEndsAt,
          },
        })

        await tx.auditLog.create({
          data: {
            userId: user!.id,
            action: 'google_trial_activation_created',
            details: { keyCode, trialDays },
            ipAddress: '0.0.0.0',
          },
        })

        return newKey
      })

      isNewUser = true // treat as new for welcome experience
      welcomeEmailData = {
        name: user.name || 'عميلنا الكريم',
        email: user.email,
        serial: activationKey.keyCode,
        expiryDate: trialEndsAt.toLocaleDateString('ar-EG'),
        planLabel: `تجربة مجانية لمدة ${trialDays} يوم`,
        loginMethod: 'Google',
      }
    }
  }

  // Activate pending_verification accounts (Google verified the email)
  if (user.status === 'pending_verification') {
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

  // 5. Set cookie + redirect
  const safeCallback = callbackUrl.startsWith('/') ? callbackUrl : '/dashboard'
  let target = user.role === 'admin' && safeCallback === '/dashboard' ? '/admin' : safeCallback

  // For new users, add welcome flag so dashboard shows the welcome modal
  if (isNewUser && target === '/dashboard') {
    target = '/dashboard?welcome=1'
  }

  const response = NextResponse.redirect(`${getPublicBase(req)}${target}`)

  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })

  // Clear state cookie
  response.cookies.set(STATE_COOKIE, '', { maxAge: 0, path: '/' })

  // 6. Send welcome email BEFORE returning the redirect.
  // We await this to ensure the email is sent — Next.js may GC the scope on response.
  // SMTP with pooling is fast (~1-3s) so the redirect delay is acceptable for registration.
  if (welcomeEmailData) {
    await sendWelcomeEmailSafe(welcomeEmailData)
  }

  return response
}
