"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lightbulb,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ThumbsUp,
  RefreshCw,
} from "lucide-react";

interface ProblemClientProps {
  questionId: string;
  hints: string[];
  solution: string;
  explanation: string;
  initialStatus: string | null;
  prevSlug: string | null;
  nextSlug: string | null;
}

const STATUS_CONFIG = {
  SOLVED: {
    label: "Solved",
    className: "bg-green-700 hover:bg-green-600 text-white",
    icon: CheckCircle2,
  },
  ATTEMPTED: {
    label: "Need Practice",
    className: "bg-yellow-700 hover:bg-yellow-600 text-white",
    icon: RefreshCw,
  },
};

export function ProblemClient({
  questionId,
  hints,
  solution,
  explanation,
  initialStatus,
  prevSlug,
  nextSlug,
}: ProblemClientProps) {
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [solutionVisible, setSolutionVisible] = useState(false);
  const [scratchpad, setScratchpad] = useState("");
  const [status, setStatus] = useState<string | null>(initialStatus);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function markStatus(newStatus: "SOLVED" | "ATTEMPTED") {
    const optimistic = newStatus === status ? null : newStatus;
    setStatus(optimistic);

    await fetch("/api/practice/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId,
        status: optimistic ?? "SKIPPED",
      }),
    });

    startTransition(() => router.refresh());
  }

  function revealNextHint() {
    if (hintsRevealed < hints.length) setHintsRevealed((n) => n + 1);
  }

  function reset() {
    setHintsRevealed(0);
    setSolutionVisible(false);
    setScratchpad("");
  }

  return (
    <div className="space-y-5">
      {/* Scratch Pad */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">
          Your Answer (scratch pad — not evaluated)
        </label>
        <textarea
          value={scratchpad}
          onChange={(e) => setScratchpad(e.target.value)}
          placeholder="Write your SQL here before looking at hints or the solution..."
          rows={8}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 text-slate-200 text-sm font-mono p-3 resize-y focus:outline-none focus:border-indigo-600 placeholder:text-slate-600"
        />
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Hint button */}
        {hints.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
            onClick={revealNextHint}
            disabled={hintsRevealed >= hints.length}
          >
            <Lightbulb className="h-4 w-4 text-yellow-400" />
            {hintsRevealed === 0
              ? "Show Hint 1"
              : hintsRevealed < hints.length
              ? `Show Hint ${hintsRevealed + 1}`
              : "All hints shown"}
          </Button>
        )}

        {/* Reveal solution */}
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
          onClick={() => setSolutionVisible((v) => !v)}
        >
          {solutionVisible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {solutionVisible ? "Hide Solution" : "Reveal Solution"}
        </Button>

        {/* Reset */}
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-slate-300 gap-1.5"
          onClick={reset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
      </div>

      {/* Hints */}
      {hintsRevealed > 0 && (
        <div className="space-y-2">
          {hints.slice(0, hintsRevealed).map((hint, i) => (
            <div
              key={i}
              className="flex gap-2.5 p-3 rounded-lg bg-yellow-950/20 border border-yellow-900/30"
            >
              <Lightbulb className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-200/80">{hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* Solution */}
      {solutionVisible && (
        <div className="space-y-3">
          <div className="rounded-lg border border-indigo-900/50 bg-slate-950 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50">
              <span className="text-xs font-medium text-indigo-400">Solution</span>
              <button
                onClick={() => navigator.clipboard.writeText(solution)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 text-sm text-slate-200 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
              {solution}
            </pre>
          </div>

          {/* Explanation */}
          <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-900/30">
            <p className="text-xs font-medium text-indigo-400 mb-1.5">Why this works</p>
            <p className="text-sm text-slate-300 leading-relaxed">{explanation}</p>
          </div>

          {/* Mark buttons — show after solution is revealed */}
          <div className="flex items-center gap-3 pt-1">
            <p className="text-sm text-slate-400">How did you do?</p>
            <Button
              size="sm"
              className={`gap-1.5 ${status === "SOLVED" ? "bg-green-700 hover:bg-green-600" : "bg-slate-800 hover:bg-green-800"} text-white`}
              onClick={() => markStatus("SOLVED")}
              disabled={isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {status === "SOLVED" ? "Marked Solved ✓" : "Got It"}
            </Button>
            <Button
              size="sm"
              className={`gap-1.5 ${status === "ATTEMPTED" ? "bg-yellow-700 hover:bg-yellow-600" : "bg-slate-800 hover:bg-yellow-800"} text-white`}
              onClick={() => markStatus("ATTEMPTED")}
              disabled={isPending}
            >
              <RefreshCw className="h-4 w-4" />
              {status === "ATTEMPTED" ? "Needs Practice ✓" : "Need Practice"}
            </Button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        {prevSlug ? (
          <a
            href={`/practice/sql/${prevSlug}`}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </a>
        ) : (
          <div />
        )}
        {nextSlug ? (
          <a
            href={`/practice/sql/${nextSlug}`}
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Next Problem
            <ChevronRight className="h-4 w-4" />
          </a>
        ) : (
          <a
            href="/practice/sql"
            className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 transition-colors"
          >
            All done!
            <ChevronRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}
