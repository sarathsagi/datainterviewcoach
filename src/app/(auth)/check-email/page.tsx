"use client";

import { Suspense, useState } from "react";
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
import { Mail } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    setError("");
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
      } else {
        setSent(true);
      }
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
            <Mail className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
          <CardDescription className="text-slate-400">
            We sent a verification link to{" "}
            {emailFromQuery ? (
              <span className="text-white font-medium">{emailFromQuery}</span>
            ) : (
              "your email"
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-md bg-slate-800/50 border border-slate-700 p-4 text-sm text-slate-300 space-y-2">
            <p>Click the link in the email to verify your account. The link expires in 24 hours.</p>
            <p className="text-slate-500">
              Don&apos;t see it? Check your spam folder.
            </p>
          </div>

          {/* Resend section */}
          <div className="space-y-3">
            {!emailFromQuery && (
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
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>
            )}

            {error && (
              <div className="rounded-md bg-red-950/50 border border-red-800 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {sent ? (
              <div className="rounded-md bg-green-950/50 border border-green-800 p-3 text-sm text-green-400">
                A new verification link has been sent. Check your inbox.
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full border-slate-700 bg-slate-800 text-white hover:bg-slate-700"
                onClick={handleResend}
                disabled={loading}
              >
                {loading ? "Sending..." : "Resend Verification Email"}
              </Button>
            )}
          </div>

          <div className="text-center space-y-2">
            <Link
              href="/login"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Back to sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
