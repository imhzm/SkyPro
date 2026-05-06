import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

function withSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  return response
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const userStatus = (req.auth?.user as { status?: string } | undefined)?.status

  if (pathname.startsWith('/admin')) {
    if (!req.auth) {
      return withSecurityHeaders(NextResponse.redirect(new URL('/auth/login', req.url)))
    }
    if (req.auth.user?.role !== 'admin' || userStatus !== 'active') {
      return withSecurityHeaders(NextResponse.redirect(new URL('/', req.url)))
    }
  }

  if (pathname.startsWith('/auth') && pathname !== '/auth/callback' && req.auth && userStatus === 'active') {
    return withSecurityHeaders(NextResponse.redirect(new URL('/', req.url)))
  }

  return withSecurityHeaders(NextResponse.next())
})

export const config = {
  matcher: ['/admin/:path*', '/auth/:path*', '/api/:path*']
}
