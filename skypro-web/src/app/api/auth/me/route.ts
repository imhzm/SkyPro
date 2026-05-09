import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 })
    }

    const userId = Number(session.user.id)
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ success: false, error: 'جلسة غير صالحة' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        subscriptions: {
          select: {
            id: true,
            status: true,
            trialEndsAt: true,
            startedAt: true,
            expiresAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 })
    }

    if (user.status !== 'active') {
      return NextResponse.json({ success: false, error: 'الحساب غير نشط' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: user })
  } catch (err) {
    console.error('Get user error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
