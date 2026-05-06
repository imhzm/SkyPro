import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getClientIp, rejectCrossSite } from '@/lib/request-security'

const AUTH_COOKIE_NAMES = [
  'authjs.session-token',
  '__Secure-authjs.session-token',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'authjs.csrf-token',
  '__Host-authjs.csrf-token',
]

export async function POST(req: NextRequest) {
  try {
    const crossSite = rejectCrossSite(req)
    if (crossSite) return crossSite

    const session = await auth()

    if (session?.user?.id) {
      const { prisma } = await import('@/lib/db')
      await prisma.auditLog.create({
        data: {
          userId: parseInt(session.user.id),
          action: 'logout',
          ipAddress: getClientIp(req)
        }
      })
    }

    const response = NextResponse.json({ success: true, message: 'تم تسجيل الخروج' })
    response.cookies.set('session_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    })
    for (const cookieName of AUTH_COOKIE_NAMES) {
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
    }

    return response
  } catch (err) {
    console.error('Logout error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
