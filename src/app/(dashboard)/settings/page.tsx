import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ProfileSection } from "./profile-section";
import { SecuritySection } from "./security-section";
import { DangerSection } from "./danger-section";
import { ConnectedAccountsSection } from "./connected-accounts-section";
import { BillingSection } from "./billing-section";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      password: true,
      emailVerified: true,
      accounts: {
        select: { provider: true },
      },
      subscription: {
        select: {
          plan: true,
          status: true,
          stripeCurrentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        },
      },
    },
  });

  const hasPassword = !!user?.password;
  const connectedProviders = user?.accounts.map((a) => a.provider) ?? [];
  const subscription = user?.subscription
    ? {
        plan: user.subscription.plan,
        status: user.subscription.status,
        stripeCurrentPeriodEnd: user.subscription.stripeCurrentPeriodEnd.toISOString(),
        cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
      }
    : null;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-slate-400 mt-1">
          Manage your profile, billing, security, and account preferences.
        </p>
      </div>

      <ProfileSection
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        image={user?.image ?? null}
        emailVerified={!!user?.emailVerified}
      />

      <BillingSection subscription={subscription} />

      <ConnectedAccountsSection providers={connectedProviders} />

      <SecuritySection hasPassword={hasPassword} />

      <DangerSection />
    </div>
  );
}
