import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getUserPlan, PLANS } from "@/lib/stripe";

export async function getCurrentUserPlan() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { plan: "free" as const, limits: PLANS.free.limits };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { status: true, stripeCurrentPeriodEnd: true },
  });

  const plan = getUserPlan(subscription);
  return { plan, limits: PLANS[plan].limits };
}

export async function requirePro(): Promise<boolean> {
  const { plan } = await getCurrentUserPlan();
  return plan === "pro";
}
