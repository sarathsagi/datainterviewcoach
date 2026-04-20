import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
      typescript: true,
    });
  }
  return stripe;
}

// ─── Plan Configuration ─────────────────────────────────────

export const PLANS = {
  free: {
    name: "Free",
    description: "Get started with basic features",
    features: [
      "5 practice problems per day",
      "Basic study plan",
      "Progress tracking",
      "Community topics",
    ],
    limits: {
      problemsPerDay: 5,
      aiHintsPerDay: 3,
      mockInterviews: false,
    },
  },
  pro: {
    name: "Pro",
    description: "Everything you need to ace your interview",
    features: [
      "Unlimited practice problems",
      "AI-powered personalized study plan",
      "Unlimited AI hints & coaching",
      "Weakness detection & plan adjustment",
      "Smart accountability nudges",
      "Progress analytics & readiness score",
      "Company-specific prep paths",
      "Priority support",
    ],
    limits: {
      problemsPerDay: Infinity,
      aiHintsPerDay: Infinity,
      mockInterviews: true,
    },
  },
} as const;

export const PRICES = {
  pro_monthly: {
    plan: "pro" as const,
    interval: "month" as const,
    amount: 999, // $9.99/month
    stripePriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "",
  },
  pro_yearly: {
    plan: "pro" as const,
    interval: "year" as const,
    amount: 5988, // $59.88/year ($4.99/mo — save 50%)
    stripePriceId: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? "",
  },
} as const;

// ─── Helper Functions ───────────────────────────────────────

export function getUserPlan(subscription: { status: string; stripeCurrentPeriodEnd: Date } | null): "free" | "pro" {
  if (
    subscription &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING") &&
    subscription.stripeCurrentPeriodEnd > new Date()
  ) {
    return "pro";
  }
  return "free";
}

export function formatAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
