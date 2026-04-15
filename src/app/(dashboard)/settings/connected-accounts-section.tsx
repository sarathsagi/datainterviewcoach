"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle } from "lucide-react";

interface ConnectedAccountsSectionProps {
  providers: string[];
}

const PROVIDERS = [
  { id: "google", name: "Google", icon: "G" },
  { id: "github", name: "GitHub", icon: "GH" },
];

export function ConnectedAccountsSection({ providers }: ConnectedAccountsSectionProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {PROVIDERS.map((provider) => {
          const isConnected = providers.includes(provider.id);
          return (
            <div
              key={provider.id}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-950/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-300">
                  {provider.icon}
                </div>
                <span className="font-medium">{provider.name}</span>
              </div>
              {isConnected ? (
                <Badge variant="secondary" className="bg-green-950 text-green-400 border-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-slate-800 text-slate-500">
                  <Circle className="h-3 w-3 mr-1" />
                  Not connected
                </Badge>
              )}
            </div>
          );
        })}
        <p className="text-xs text-slate-500">
          Sign in with a provider to connect it to your account.
        </p>
      </CardContent>
    </Card>
  );
}
