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
    <div className="min-h-screen bg-background">
      {/* Subtle radial gradient behind content — Apple-style ambient depth */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.50 0.24 264 / 8%) 0%, transparent 70%)",
        }}
      />
      <DashboardNav user={session.user} />
      <main className="max-w-6xl mx-auto px-4 py-10">{children}</main>
    </div>
  );
}
