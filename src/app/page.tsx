import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  BookOpen,
  Zap,
  BarChart3,
} from "lucide-react";

const pillars = [
  {
    icon: Code2,
    title: "Practice Problems",
    description: "200+ SQL and Python challenges tailored to data engineering interviews, graded by difficulty.",
  },
  {
    icon: BookOpen,
    title: "Concept Learning",
    description: "13 structured learning paths covering data modeling, streaming, cloud warehousing, and more.",
  },
  {
    icon: Zap,
    title: "Quiz Mode",
    description: "Flashcard-style rapid review across 8 topic decks — flip, recall, and rate your confidence.",
  },
  {
    icon: BarChart3,
    title: "Progress Tracking",
    description: "See your weak areas, track streaks, and know exactly where you stand before your interview.",
  },
];

/*
  Type scale (applied consistently across every section):
  ─────────────────────────────────────────────────────
  Hero H1          text-5xl / sm:text-6xl  font-bold
  Section heading  text-3xl                font-bold
  Section subtext  text-base               text-white/40
  Card title       text-base               font-semibold
  Card body        text-sm                 text-white/40
  Feature list     text-sm                 text-white/50 or /70
  Labels / tags    text-xs                 uppercase tracking-widest
*/

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#06060a] text-white">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 h-14 border-b border-white/[0.07]"
        style={{ background: "oklch(0.055 0.002 280 / 85%)", backdropFilter: "blur(24px)" }}
      >
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex-shrink-0">
            <Image src="/logo-full.svg" alt="Data Interview Coach" width={210} height={36} priority />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-white/50 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="sm"
                className="border-white/15 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-sm"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative pt-24 pb-20 text-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 40% at 50% -5%, oklch(0.50 0.24 264 / 12%) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-3xl mx-auto px-4">
          {/* text-5xl / sm:text-6xl — hero only */}
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.08] mb-6">
            Land Your Dream
            <br />
            <span className="text-indigo-400">Data Engineering Role.</span>
          </h1>

          {/* text-base for hero subtext */}
          <p className="text-base text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            Practice SQL and Python, master key concepts, quiz yourself on flashcards,
            and track exactly where you need to improve — all in one focused platform.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/signup">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 gap-2 text-base h-11">
                Start Free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/8 text-white/70 hover:text-white px-8 text-base h-11">
                See Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── What you get ─────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-5xl mx-auto px-4">
          {/* text-3xl — consistent section heading */}
          <h2 className="text-3xl font-bold text-center mb-3">Everything you need to prep</h2>
          {/* text-base — consistent section subtext */}
          <p className="text-base text-white/40 text-center mb-12">
            No fluff. Just the tools that move the needle.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 hover:border-indigo-700/40 hover:bg-white/[0.05] transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-indigo-400" />
                  </div>
                  {/* text-base — card title */}
                  <h3 className="text-base font-semibold mb-2">{p.title}</h3>
                  {/* text-sm — card body */}
                  <p className="text-sm text-white/40 leading-relaxed">{p.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          {/* text-3xl — consistent section heading */}
          <h2 className="text-3xl font-bold mb-3">Simple, honest pricing</h2>
          {/* text-base — consistent section subtext */}
          <p className="text-base text-white/40 mb-12">Start free. Upgrade when you're ready. Cancel anytime.</p>

          <div className="grid sm:grid-cols-2 gap-4 text-left">

            {/* Free */}
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-5">
              <div>
                {/* text-xs — plan label */}
                <p className="text-xs text-white/40 uppercase tracking-widest mb-2">Free</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-base text-white/40 mb-1">/month</span>
                </div>
              </div>
              <Link href="/signup">
                <Button variant="outline" className="w-full border-white/15 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm">
                  Get Started Free
                </Button>
              </Link>
              <ul className="space-y-3">
                {[
                  "5 practice problems per day",
                  "Access to all learning paths",
                  "Quiz mode — all decks",
                  "Basic progress tracking",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/50">
                    <CheckCircle2 className="h-4 w-4 text-white/25 mt-0.5 shrink-0" />
                    {f}
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
                {/* text-xs — plan label */}
                <p className="text-xs text-indigo-400 uppercase tracking-widest mb-2">Pro</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold">$9.99</span>
                  <span className="text-base text-white/40 mb-1">/month</span>
                </div>
                <p className="text-sm text-green-400 mt-1.5">or $4.99/mo billed yearly — save 50%</p>
              </div>
              <Link href="/pricing">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm">
                  Upgrade to Pro
                </Button>
              </Link>
              <ul className="space-y-3">
                {[
                  "Unlimited practice problems",
                  "AI hints & coaching on every problem",
                  "Weakness detection & smart nudges",
                  "Company-specific prep paths",
                  "Progress analytics & readiness score",
                  "Priority support",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                    <CheckCircle2 className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.06]">
        <div className="max-w-xl mx-auto px-4 text-center">
          {/* text-3xl — consistent section heading */}
          <h2 className="text-3xl font-bold mb-3">Ready to start?</h2>
          {/* text-base — consistent section subtext */}
          <p className="text-base text-white/40 mb-8">
            Free to use. No credit card required.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white px-10 gap-2 text-base h-11">
              Start Prepping Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Data Interview Coach" width={14} height={14} />
            Data Interview Coach
          </div>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="/pricing" className="hover:text-white/60 transition-colors">Pricing</Link>
          </div>
          <div>&copy; {new Date().getFullYear()} All rights reserved.</div>
        </div>
      </footer>

    </div>
  );
}
