"use client";

import { useState } from "react";
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
import { validateEmail } from "@/lib/password";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">Reset Password</CardTitle>
          <CardDescription className="text-slate-400">
            Enter your email and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {success ? (
            <div className="space-y-4">
              <div className="rounded-md bg-green-950/50 border border-green-800 p-4 text-sm text-green-400">
                If an account exists with that email, you will receive a password
                reset link shortly. Check your inbox and spam folder.
              </div>
              <Button
                variant="outline"
                className="w-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
              >
                Try another email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-950/50 border border-red-800 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500"
              >
                {loading ? "Sending..." : "Send Reset Link"}
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
