import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardNav from "@/components/layout/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <DashboardNav user={session.user} />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
