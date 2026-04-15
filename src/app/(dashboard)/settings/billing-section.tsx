"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ExternalLink } from "lucide-react";

interface BillingSectionProps {
  subscription: {
    plan: string;
    status: string;
    stripeCurrentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export function BillingSection({ subscription }: BillingSectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isActive =
    subscription &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING") &&
    new Date(subscription.stripeCurrentPeriodEnd) > new Date();

  const planLabel = subscription?.plan === "PRO_YEARLY" ? "Pro (Yearly)" : "Pro (Monthly)";

  async function handleManageBilling() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Billing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isActive ? (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-800 bg-slate-950/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{planLabel}</span>
                  <Badge className="bg-green-950 text-green-400 border-green-800">
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels on ${new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}`
                    : `Renews on ${new Date(subscription.stripeCurrentPeriodEnd).toLocaleDateString()}`}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={handleManageBilling}
              disabled={loading}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {loading ? "Opening..." : "Manage Billing"}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg border border-slate-800 bg-slate-950/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Free Plan</span>
                  <Badge variant="secondary" className="bg-slate-800 text-slate-400">
                    Current
                  </Badge>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Limited to 5 problems per day and 3 AI hints
                </p>
              </div>
            </div>

            <Button
              className="bg-indigo-600 hover:bg-indigo-500"
              onClick={() => router.push("/pricing")}
            >
              Upgrade to Pro
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
