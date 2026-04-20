"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { PLANS } from "@/lib/stripe";

type BillingInterval = "month" | "year";

export function PricingCards() {
  const { data: session } = useSession();
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("year");
  const [loading, setLoading] = useState(false);

  async function handleCheckout(priceKey: string) {
    if (!session) {
      router.push("/login");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceKey }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  // Monthly: $9.99  |  Yearly: $4.99/mo ($59.88/yr — save 50%)
  const monthlyPrice  = 9.99;
  const yearlyMonthly = 4.99;
  const yearlyTotal   = 59.88;
  const savings       = Math.round((1 - yearlyMonthly / monthlyPrice) * 100);

  return (
    <div>
      {/* Interval Toggle */}
      <div className="flex items-center justify-center gap-1 mb-10 p-1 rounded-lg border border-white/[0.08] bg-white/[0.03] w-fit mx-auto">
        <button
          onClick={() => setInterval("month")}
          className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors ${
            interval === "month"
              ? "bg-indigo-600 text-white shadow"
              : "text-white/40 hover:text-white"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval("year")}
          className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            interval === "year"
              ? "bg-indigo-600 text-white shadow"
              : "text-white/40 hover:text-white"
          }`}
        >
          Yearly
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            Save {savings}%
          </span>
        </button>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">

        {/* Free */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-5">
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">{PLANS.free.name}</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-white/40 text-sm mb-1">/month</span>
            </div>
            <p className="text-xs text-white/30 mt-1">{PLANS.free.description}</p>
          </div>

          <Button
            variant="outline"
            className="w-full border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white"
            onClick={() => router.push(session ? "/dashboard" : "/signup")}
          >
            {session ? "Go to Dashboard" : "Get Started Free"}
          </Button>

          <ul className="space-y-2.5">
            {PLANS.free.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-white/40">
                <CheckCircle2 className="h-4 w-4 text-white/20 mt-0.5 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Pro */}
        <div className="rounded-xl border border-indigo-500/50 bg-indigo-500/[0.06] p-6 space-y-5 relative">
          <div className="absolute -top-3 left-5">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-medium">
              Most Popular
            </span>
          </div>

          <div>
            <p className="text-xs text-indigo-400 uppercase tracking-widest mb-1">{PLANS.pro.name}</p>
            <div className="flex items-end gap-1">
              <span className="text-4xl font-bold">
                ${interval === "month" ? monthlyPrice : yearlyMonthly}
              </span>
              <span className="text-white/40 text-sm mb-1">/month</span>
            </div>
            {interval === "year" ? (
              <p className="text-xs text-green-400 mt-1">${yearlyTotal} billed annually</p>
            ) : (
              <p className="text-xs text-white/30 mt-1">{PLANS.pro.description}</p>
            )}
          </div>

          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
            onClick={() =>
              handleCheckout(interval === "month" ? "pro_monthly" : "pro_yearly")
            }
            disabled={loading}
          >
            {loading ? "Redirecting…" : "Upgrade to Pro"}
          </Button>

          <ul className="space-y-2.5">
            {PLANS.pro.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
                <CheckCircle2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-center text-xs text-white/25 mt-8">
        All plans include a 7-day free trial. Cancel anytime from your account settings.
      </p>
    </div>
  );
}
