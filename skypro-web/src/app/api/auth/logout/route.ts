import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getClientIp } from '@/lib/request-security'

const AUTH_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
  'authjs.callback-url',
  'next-auth.callback-url',
  'g_oauth_state',
  'sp_impersonation',
  'session_id',
]

function clearCookies(res: NextResponse) {
  for (const name of AUTH_COOKIE_NAMES) {
    res.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  }
}

async function logAndClear(req: NextRequest) {
  try {
    const session = await auth()
    if (session?.user?.id) {
      const { prisma } = await import('@/lib/db')
      await prisma.auditLog.create({
        data: {
          userId: parseInt(session.user.id),
          action: 'logout',
          ipAddress: getClientIp(req),
        },
      })
    }
  } catch {
    // best-effort audit, don't block logout
  }
}

/**
 * POST /api/auth/logout — JSON response (used by SPA forms).
 */
export async function POST(req: NextRequest) {
  try {
    await logAndClear(req)

    const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج' })
    clearCookies(response)
    return response
  } catch {
    const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج' })
    clearCookies(response)
    return response
  }
}

/**
 * GET /api/auth/logout — redirects to /auth/login after clearing cookies.
 * Allows simple link-based logout from anywhere on the site.
 */
export async function GET(req: NextRequest) {
  await logAndClear(req)

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '')
    || `${req.nextUrl.protocol}//${req.headers.get('host') || req.nextUrl.host}`

  const response = NextResponse.redirect(`${baseUrl}/auth/login?logged_out=1`)
  clearCookies(response)
  return response
}
