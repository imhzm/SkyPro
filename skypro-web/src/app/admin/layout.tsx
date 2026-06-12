import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

// Server-side gate for the entire /admin surface. Runs before any admin page renders,
// so non-admins never receive the admin UI shell (defense-in-depth on top of the
// per-route API guards). Implemented in the layout (a server component) rather than
// middleware to avoid the Next.js middleware-bypass class of issues.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/login')
  }

  // Re-validate role + status against the database (not just the JWT claims), so a
  // demoted or suspended admin loses access immediately — fail-closed.
  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { role: true, status: true },
  })
  if (!user || user.role !== 'admin' || user.status !== 'active') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#060d1b] font-cairo" dir="rtl">
      <AdminSidebar />
      <div className="lg:mr-64">
        <main className="p-4 lg:p-8 pt-16 lg:pt-8">
          {children}
        </main>
      </div>
    </div>
  )
}
