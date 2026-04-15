"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Brain, ArrowLeft } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/ui/password-strength";
import { validatePassword } from "@/lib/password";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) setToken(t);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur">
          <CardContent className="pt-6 space-y-4">
            <div className="rounded-md bg-red-950/50 border border-red-800 p-4 text-sm text-red-400">
              Invalid or missing reset token. Please request a new password reset link.
            </div>
            <Link href="/forgot-password">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500">
                Request New Link
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">Set New Password</CardTitle>
          <CardDescription className="text-slate-400">
            Choose a strong password for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <div className="space-y-4">
              <div className="rounded-md bg-green-950/50 border border-green-800 p-4 text-sm text-green-400">
                Your password has been reset successfully!
              </div>
              <Link href="/login">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500">
                  Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-950/50 border border-red-800 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
                <PasswordStrengthIndicator password={password} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-400">Passwords do not match</p>
                )}
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
