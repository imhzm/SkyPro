import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'غير مصرح' }, { status: 401 })
    }

    const { prisma } = await import('@/lib/db')
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      include: {
        activationKeys: true,
        devices: { where: { isActive: true } },
        subscriptions: true
      }
    })

    if (!user) {
      return NextResponse.json({ success: false, error: 'المستخدم غير موجود' }, { status: 404 })
    }

    if (user.status !== 'active') {
      return NextResponse.json({ success: false, error: 'الحساب غير نشط' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        status: user.status,
        emailVerifiedAt: user.emailVerifiedAt,
        subscriptions: user.subscriptions,
        createdAt: user.createdAt
      }
    })
  } catch (err) {
    console.error('Get user error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
