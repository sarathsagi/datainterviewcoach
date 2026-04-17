import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Target,
  TrendingUp,
  Zap,
  Calendar,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Database,
  Code2,
} from "lucide-react";

const features = [
  {
    icon: Code2,
    title: "Python & SQL Mastery",
    description:
      "Practice Python coding challenges and SQL queries tailored to data engineering interviews at top companies.",
  },
  {
    icon: Target,
    title: "Personalized Study Plan",
    description:
      "AI generates a day-by-day prep plan based on your target companies, timeline, and skill gaps.",
  },
  {
    icon: Database,
    title: "Data Modeling & System Design",
    description:
      "Master dimensional modeling, schema design, and data pipeline architecture with guided practice.",
  },
  {
    icon: Brain,
    title: "AI-Powered Coaching",
    description:
      "Get personalized hints, query optimization tips, and explanations from an AI that adapts to your level.",
  },
  {
    icon: TrendingUp,
    title: "Weakness Detection",
    description:
      "Automatically identifies your weak areas across Python, SQL, and system design — then adjusts your plan.",
  },
  {
    icon: Zap,
    title: "Smart Nudges",
    description:
      "Context-aware reminders that keep you on track. Not generic notifications — real accountability.",
  },
  {
    icon: Calendar,
    title: "Interview Countdown",
    description:
      "Your prep plan adapts to your interview date. Fall behind? The plan restructures automatically.",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    description:
      "Track streaks, topic coverage, time spent, and readiness score across all five prep areas.",
  },
];

const prepAreas = [
  { label: "Python Coding", category: "Python" },
  { label: "SQL Queries & Optimization", category: "SQL" },
  { label: "Data Pipeline Design", category: "System Design" },
  { label: "Dimensional Modeling", category: "Data Modeling" },
  { label: "Schema Design", category: "Data Modeling" },
  { label: "ETL / ELT Patterns", category: "System Design" },
  { label: "Data Warehousing", category: "System Design" },
  { label: "Window Functions", category: "SQL" },
  { label: "Python Data Structures", category: "Python" },
  { label: "Spark & Distributed Systems", category: "System Design" },
  { label: "Culture Fit & Behavioral", category: "Culture Fit" },
  { label: "Data Quality & Testing", category: "System Design" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo-full.svg" alt="Data Interview Coach" width={160} height={32} />
          </div>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/login">
              <Button variant="outline" className="border-slate-700 bg-slate-900 hover:bg-slate-800">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-transparent to-transparent" />
        <div className="max-w-6xl mx-auto px-4 pt-24 pb-20 text-center relative">
          <Badge variant="secondary" className="mb-6 bg-indigo-950 text-indigo-300 border-indigo-800">
            AI-Powered Data Engineering Interview Prep
          </Badge>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
            Land Your Dream
            <br />
            <span className="text-indigo-400">Data Engineering Role.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Master Python, SQL, system design, and data modeling with an AI coach
            that builds your study plan, tracks your progress, and keeps you
            accountable — so you walk into every interview ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-lg px-8">
                Start Prepping Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div>
              <div className="text-3xl font-bold text-indigo-400">5</div>
              <div className="text-sm text-slate-500">Core Prep Areas</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-400">200+</div>
              <div className="text-sm text-slate-500">Practice Problems</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-indigo-400">AI</div>
              <div className="text-sm text-slate-500">Powered Coaching</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            Three steps to a personalized, adaptive interview prep experience.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Tell Us Your Goals",
                desc: "Target companies, interview date, current skill level, and available hours per day.",
              },
              {
                step: "2",
                title: "Get Your Plan",
                desc: "AI generates a day-by-day study plan covering Python, SQL, System Design, Data Modeling, and Culture Fit.",
              },
              {
                step: "3",
                title: "Practice Daily",
                desc: "Solve Python and SQL challenges with AI hints, track streaks, and watch your readiness score climb.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-6 rounded-xl border border-slate-800 bg-slate-900/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Everything You Need to Ace Your Interview
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-xl mx-auto">
            Not just a problem bank. A complete prep system powered by AI.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-slate-800 bg-slate-900/50 hover:border-indigo-800/50 transition-colors"
              >
                <feature.icon className="h-8 w-8 text-indigo-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Comprehensive Topic Coverage</h2>
          <p className="text-slate-400 mb-10 max-w-xl mx-auto">
            From Python coding and SQL mastery to system design and culture fit — everything a data engineer needs.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {prepAreas.map((area) => (
              <div
                key={area.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800 bg-slate-900/50 text-sm"
              >
                <CheckCircle2 className="h-4 w-4 text-indigo-400" />
                {area.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-slate-800/50">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Preparing?</h2>
          <p className="text-slate-400 mb-8">
            Join data engineers who are using AI to prepare smarter, not harder.
          </p>
          <Link href="/login">
            <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-lg px-8">
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Data Interview Coach" width={16} height={16} />
            Data Interview Coach
          </div>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="hover:text-slate-300 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-slate-300 transition-colors">
              Privacy Policy
            </Link>
          </div>
          <div>&copy; {new Date().getFullYear()} All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
