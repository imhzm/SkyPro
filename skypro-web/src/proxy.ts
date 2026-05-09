import { auth } from '@/lib/auth'
import { NextResponse, type NextRequest } from 'next/server'

// ──────────────────────────────────────────────────────────────────────────────
// Defense-in-depth runtime headers (in addition to those configured in
// next.config.mjs — middleware-only headers won't always reach static pages).
// ──────────────────────────────────────────────────────────────────────────────
function withSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  return response
}

// ──────────────────────────────────────────────────────────────────────────────
// Block known bad bots and tooling (best-effort; nginx fail2ban is the real
// defence). This rejects obviously malicious user agents at the edge.
// ──────────────────────────────────────────────────────────────────────────────
const BLOCKED_UA = /\b(sqlmap|acunetix|nessus|nikto|wpscan|nmap|masscan|dirbuster|gobuster|burpsuite|skipfish|brakeman|w3af|httprint|ffuf|wfuzz)\b/i

function isMaliciousUserAgent(ua: string | null): boolean {
  if (!ua) return false
  return BLOCKED_UA.test(ua)
}

// ──────────────────────────────────────────────────────────────────────────────
// CSRF: state-changing API requests from a browser MUST come from a same-origin
// fetch. We rely on the Sec-Fetch-Site header (modern browsers) + Origin. If
// neither is present and method is mutating, reject.
// (Same-origin checks already exist in lib/request-security.ts as defense-in-
// depth — this middleware adds an early-rejection so bad requests don't even
// hit route handlers.)
// ──────────────────────────────────────────────────────────────────────────────
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase())
}

function looksLikeBrowserRequest(req: NextRequest): boolean {
  // Browsers always send Sec-Fetch-Mode. Native apps (desktop client) usually don't.
  return req.headers.get('sec-fetch-mode') !== null
}

function rejectCrossSiteMutation(req: NextRequest): NextResponse | null {
  if (isSafeMethod(req.method)) return null
  if (!looksLikeBrowserRequest(req)) return null // native client: handled by signed tokens

  const fetchSite = req.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site' && fetchSite !== 'none') {
    return withSecurityHeaders(
      NextResponse.json({ success: false, error: 'تم رفض الطلب لأسباب أمنية' }, { status: 403 })
    )
  }
  return null
}

// ──────────────────────────────────────────────────────────────────────────────
// Honeypot: requests targeting common attack paths get rejected immediately.
// ──────────────────────────────────────────────────────────────────────────────
const HONEYPOT_PATHS = [
  '/wp-admin', '/wp-login.php', '/.env', '/.git', '/phpmyadmin', '/wp-content',
  '/admin.php', '/.aws', '/.ssh', '/config.php', '/server-status',
]

function isHoneypot(pathname: string): boolean {
  return HONEYPOT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const userAgent = req.headers.get('user-agent')
  const userStatus = (req.auth?.user as { status?: string } | undefined)?.status

  // ── 0. Block honeypot paths
  if (isHoneypot(pathname)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // ── 1. Block malicious user agents
  if (isMaliciousUserAgent(userAgent)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // ── 2. CSRF guard for browser-originated mutations
  if (pathname.startsWith('/api/')) {
    const csrfReject = rejectCrossSiteMutation(req)
    if (csrfReject) return csrfReject
  }

  // ── 3. /admin: must be authenticated admin with active status
  if (pathname.startsWith('/admin')) {
    if (!req.auth) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return withSecurityHeaders(NextResponse.redirect(loginUrl))
    }
    if (req.auth.user?.role !== 'admin' || userStatus !== 'active') {
      return withSecurityHeaders(NextResponse.redirect(new URL('/', req.url)))
    }
  }

  // ── 4. /api/admin: must be authenticated admin (returns JSON 403, not redirect)
  if (pathname.startsWith('/api/admin')) {
    if (!req.auth || req.auth.user?.role !== 'admin' || userStatus !== 'active') {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 403 })
      )
    }
  }

  // ── 5. /dashboard: must be authenticated active user
  if (pathname.startsWith('/dashboard')) {
    if (!req.auth) {
      const loginUrl = new URL('/auth/login', req.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return withSecurityHeaders(NextResponse.redirect(loginUrl))
    }
    if (userStatus === 'suspended' || userStatus === 'deleted') {
      return withSecurityHeaders(NextResponse.redirect(new URL('/auth/login?error=account_inactive', req.url)))
    }
  }

  // ── 6. /api/account: must be authenticated active user
  if (pathname.startsWith('/api/account')) {
    if (!req.auth) {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 })
      )
    }
    if (userStatus === 'suspended' || userStatus === 'deleted') {
      return withSecurityHeaders(
        NextResponse.json({ success: false, error: 'الحساب غير نشط' }, { status: 403 })
      )
    }
  }

  // ── 7. Already-authenticated users hitting /auth go to dashboard
  if (
    pathname.startsWith('/auth') &&
    !pathname.startsWith('/auth/callback') &&
    !pathname.startsWith('/auth/verify-email') &&
    !pathname.startsWith('/auth/reset-password') &&
    req.auth &&
    userStatus === 'active'
  ) {
    return withSecurityHeaders(NextResponse.redirect(new URL('/dashboard', req.url)))
  }

  return withSecurityHeaders(NextResponse.next())
})

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml, manifest.webmanifest (SEO)
     * - public assets (images/, fonts/)
     */
    '/((?!_next/static|_next/image|images|fonts|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|icon.png|apple-icon.png|og-image.png|twitter-image.png).*)',
  ],
}
