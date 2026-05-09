'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { User, Shield, Trash2 } from 'lucide-react'
import DeleteAccountCard from '@/components/dashboard/DeleteAccountCard'
import ProfileForm from '@/components/dashboard/ProfileForm'
import PasswordChangeForm from '@/components/dashboard/PasswordChangeForm'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/auth/login')

  const userId = Number(session.user.id)
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
      passwordHash: true,
      createdAt: true,
    },
  })

  if (!user) redirect('/auth/login')

  const isPasswordAccount = !!user.passwordHash
  const memberSince = user.createdAt.toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">إعدادات الحساب</h1>
        <p className="text-slate-400 mt-1">إدارة بياناتك الشخصية والأمان</p>
      </div>

      {/* Account summary */}
      <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-2xl font-extrabold text-white shrink-0">
            {(user.name || user.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-white font-bold text-lg truncate">{user.name || 'مستخدم'}</h2>
            <p className="text-slate-400 text-sm truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {user.emailVerifiedAt && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                  ✓ بريد مؤكَّد
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 border border-sky-500/25 text-sky-300">
                {user.role === 'admin' ? 'مسؤول' : 'مستخدم'}
              </span>
              <span className="text-slate-500 text-xs">عضو منذ {memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <Section icon={User} title="البيانات الشخصية">
        <ProfileForm initialName={user.name ?? ''} email={user.email} avatarUrl={user.avatarUrl} />
      </Section>

      {/* Password (only for password accounts) */}
      {isPasswordAccount && (
        <Section icon={Shield} title="الأمان وكلمة المرور">
          <PasswordChangeForm />
        </Section>
      )}

      {/* Danger zone */}
      <Section icon={Trash2} title="منطقة الخطر" danger>
        <DeleteAccountCard requiresPassword={isPasswordAccount} />
      </Section>
    </div>
  )
}

function Section({
  icon: Icon, title, danger = false, children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      className={`rounded-2xl border p-6 ${
        danger ? 'bg-red-500/[0.03] border-red-500/20' : 'bg-white/[0.03] border-white/8'
      }`}
    >
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          danger ? 'bg-red-500/15 border border-red-500/30' : 'bg-sky-500/15 border border-sky-500/30'
        }`}>
          <Icon className={`w-4 h-4 ${danger ? 'text-red-400' : 'text-sky-300'}`} />
        </div>
        <h3 className={`text-base font-bold ${danger ? 'text-red-300' : 'text-white'}`}>{title}</h3>
      </div>
      {children}
    </section>
  )
}
