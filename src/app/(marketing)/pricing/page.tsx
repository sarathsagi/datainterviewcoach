import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PricingCards } from "./pricing-cards";

export const metadata: Metadata = {
  title: "Pricing | Data Interview Coach",
  description: "Start free. Upgrade to Pro for unlimited practice, AI coaching, and full analytics.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#06060a] text-white flex flex-col">

      {/* Nav */}
      <nav
        className="sticky top-0 z-50 h-14 border-b border-white/[0.07]"
        style={{ background: "oklch(0.055 0.002 280 / 85%)", backdropFilter: "blur(24px)" }}
      >
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
          <Link href="/" className="flex-shrink-0">
            <Image src="/logo-full.svg" alt="Data Interview Coach" width={152} height={30} priority />
          </Link>
          <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
            Sign In
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 py-16 w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 tracking-tight">Simple, transparent pricing</h1>
          <p className="text-white/40 text-base max-w-md mx-auto">
            Start free — no credit card required. Upgrade when you want unlimited access.
          </p>
        </div>

        <PricingCards />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="Data Interview Coach" width={14} height={14} />
            Data Interview Coach
          </div>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
          </div>
          <div>&copy; {new Date().getFullYear()} All rights reserved.</div>
        </div>
      </footer>

    </div>
  );
}
