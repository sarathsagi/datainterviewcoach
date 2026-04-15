"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export function DangerSection() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setError("");

    if (confirmation !== "DELETE MY ACCOUNT") {
      setError("Please type 'DELETE MY ACCOUNT' exactly to confirm");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/account/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        setLoading(false);
      } else {
        // Sign out and redirect to home
        await signOut({ callbackUrl: "/" });
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card className="border-red-900/50 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-400">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showConfirm ? (
          <Button
            variant="outline"
            className="border-red-800 text-red-400 hover:bg-red-950 hover:text-red-300"
            onClick={() => setShowConfirm(true)}
          >
            Delete Account
          </Button>
        ) : (
          <div className="space-y-3 p-4 rounded-lg border border-red-900/50 bg-red-950/20">
            <p className="text-sm text-red-400 font-medium">
              Are you sure? This will permanently delete your account, study plans, progress, and all data.
            </p>
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm" className="text-slate-300 text-xs">
                Type <span className="font-mono text-red-400">DELETE MY ACCOUNT</span> to confirm
              </Label>
              <Input
                id="deleteConfirm"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="border-red-900 bg-slate-800 text-white max-w-sm"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmation("");
                  setError("");
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-500 text-white"
                onClick={handleDelete}
                disabled={loading || confirmation !== "DELETE MY ACCOUNT"}
              >
                {loading ? "Deleting..." : "Permanently Delete Account"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
