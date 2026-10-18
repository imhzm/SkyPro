import type { Metadata } from "next";
import {
  WorkspaceToolbar,
  WorkspaceFooter,
} from "@/components/site/WorkspaceToolbar";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

export const metadata: Metadata = {
  title: "حسابي في Sky Pro",
  robots: { index: false, follow: false, nocache: true },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { status: true, name: true, email: true, avatarUrl: true },
  });

  if (!user || user.status === "suspended") {
    redirect("/auth/login");
  }

  return (
    <div className="workspace min-h-screen bg-page font-cairo" dir="rtl">
      <DashboardSidebar
        user={{ name: user.name, email: user.email, avatarUrl: user.avatarUrl }}
      />
      <div className="workspace-main lg:ms-64">
        <main className="p-4 lg:p-8 pt-16 lg:pt-8">
          <WorkspaceToolbar />
          {children}
          <WorkspaceFooter />
        </main>
      </div>
    </div>
  );
}
