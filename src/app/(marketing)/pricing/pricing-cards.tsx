"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles } from "lucide-react";
import { PLANS } from "@/lib/stripe";

type BillingInterval = "month" | "year";

export function PricingCards() {
  const { data: session } = useSession();
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("month");
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

  const monthlyPrice = 19;
  const yearlyPrice = 149;
  const yearlyMonthly = Math.round((yearlyPrice / 12) * 100) / 100;

  return (
    <div>
      {/* Interval Toggle */}
      <div className="flex items-center justify-center gap-3 mb-10">
        <button
          onClick={() => setInterval("month")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            interval === "month"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setInterval("year")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            interval === "year"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Yearly
          <Badge className="ml-2 bg-green-900 text-green-400 border-green-700 text-xs">
            Save 35%
          </Badge>
        </button>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Free Plan */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-xl">{PLANS.free.name}</CardTitle>
            <p className="text-sm text-slate-400">{PLANS.free.description}</p>
            <div className="pt-4">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-slate-400 ml-1">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => router.push(session ? "/dashboard" : "/signup")}
            >
              {session ? "Current Plan" : "Get Started Free"}
            </Button>
            <ul className="space-y-3">
              {PLANS.free.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-400">
                  <CheckCircle2 className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="border-indigo-600 bg-slate-900/50 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-indigo-600 text-white border-indigo-500">
              <Sparkles className="h-3 w-3 mr-1" />
              Most Popular
            </Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-xl">{PLANS.pro.name}</CardTitle>
            <p className="text-sm text-slate-400">{PLANS.pro.description}</p>
            <div className="pt-4">
              <span className="text-4xl font-bold">
                ${interval === "month" ? monthlyPrice : yearlyMonthly}
              </span>
              <span className="text-slate-400 ml-1">/month</span>
              {interval === "year" && (
                <span className="block text-sm text-slate-500 mt-1">
                  ${yearlyPrice} billed annually
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-500"
              onClick={() =>
                handleCheckout(
                  interval === "month" ? "pro_monthly" : "pro_yearly"
                )
              }
              disabled={loading}
            >
              {loading ? "Redirecting..." : "Upgrade to Pro"}
            </Button>
            <ul className="space-y-3">
              {PLANS.pro.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* FAQ note */}
      <p className="text-center text-sm text-slate-500 mt-10">
        All plans include a 7-day free trial. Cancel anytime from your account settings.
      </p>
    </div>
  );
}
