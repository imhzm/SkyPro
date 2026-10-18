import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { User, Shield, Trash2, ShieldCheck } from "lucide-react";
import DeleteAccountCard from "@/components/dashboard/DeleteAccountCard";
import ProfileForm from "@/components/dashboard/ProfileForm";
import PasswordChangeForm from "@/components/dashboard/PasswordChangeForm";
import TwoFactorCard from "@/components/dashboard/TwoFactorCard";
import EmailChangeForm from "@/components/dashboard/EmailChangeForm";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/login");

  const userId = Number(session.user.id);
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
      twoFactorEnabled: true,
      lastLoginAt: true,
      lastLoginIp: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/auth/login");

  const isPasswordAccount = !!user.passwordHash;
  const memberSince = user.createdAt.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">إعدادات الحساب</h1>
        <p className="text-muted mt-1">إدارة بياناتك الشخصية والأمان</p>
      </div>

      {/* Account summary */}
      <div className="bg-panel border border-line rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-violet-500 flex items-center justify-center text-2xl font-extrabold text-white shrink-0">
            {(user.name || user.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-foreground font-bold text-lg truncate">
              {user.name || "مستخدم"}
            </h2>
            <p className="text-muted text-sm truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {user.emailVerifiedAt && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-positive">
                  ✓ بريد مؤكَّد
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/10 border border-sky-500/25 text-brand">
                {user.role === "admin" ? "مسؤول" : "مستخدم"}
              </span>
              <span className="text-muted text-xs">عضو منذ {memberSince}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <Section icon={User} title="البيانات الشخصية">
        <ProfileForm
          initialName={user.name ?? ""}
          email={user.email}
          avatarUrl={user.avatarUrl}
        />
        <div className="mt-5">
          <EmailChangeForm
            currentEmail={user.email}
            requiresPassword={isPasswordAccount}
          />
        </div>
      </Section>

      {/* Password (only for password accounts) */}
      {isPasswordAccount && (
        <Section icon={Shield} title="الأمان وكلمة المرور">
          <PasswordChangeForm />
        </Section>
      )}

      {/* 2FA */}
      <Section icon={ShieldCheck} title="التحقق بخطوتين (2FA)">
        <TwoFactorCard
          initialEnabled={user.twoFactorEnabled}
          hasPassword={isPasswordAccount}
        />
      </Section>

      {/* Last login info */}
      {user.lastLoginAt && (
        <div className="bg-panel border border-line rounded-2xl p-5 text-sm flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <span className="text-muted">آخر تسجيل دخول:</span>{" "}
            <strong className="text-muted">
              {user.lastLoginAt.toLocaleString("ar-EG", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </strong>
          </div>
          {user.lastLoginIp && (
            <div>
              <span className="text-muted">من IP:</span>{" "}
              <code className="text-muted font-mono text-xs" dir="ltr">
                {user.lastLoginIp}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Danger zone */}
      <Section icon={Trash2} title="منطقة الخطر" danger>
        <DeleteAccountCard requiresPassword={isPasswordAccount} />
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  danger = false,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-6 ${
        danger ? "bg-red-500/[0.03] border-red-500/20" : "bg-panel border-line"
      }`}
    >
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-line">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            danger
              ? "bg-red-500/15 border border-red-500/30"
              : "bg-sky-500/15 border border-sky-500/30"
          }`}
        >
          <Icon
            className={`w-4 h-4 ${danger ? "text-negative" : "text-brand"}`}
          />
        </div>
        <h3
          className={`text-base font-bold ${danger ? "text-negative" : "text-foreground"}`}
        >
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}
