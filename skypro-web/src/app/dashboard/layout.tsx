import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/dashboard/DashboardSidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { status: true, name: true, email: true, avatarUrl: true }
  })

  if (!user || user.status === 'suspended') {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-[#060d1b] font-cairo" dir="rtl">
      <DashboardSidebar user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }} />
      <div className="lg:mr-64">
        <main className="p-4 lg:p-8 pt-16 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  )
}
