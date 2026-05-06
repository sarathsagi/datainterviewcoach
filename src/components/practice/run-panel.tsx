"use client";

/**
 * RunPanel — code editor + Run button + per-test results.
 *
 * Drops into the practice-question pages (`practice/{sql,python,algorithms}/[slug]`)
 * as a replacement for the old textarea-only "Reveal Solution" flow. The
 * user types into the textarea, clicks Run, and the relevant WASM runtime
 * (PGlite for SQL, Pyodide for Python) executes their code against the
 * problem's test cases.
 *
 * Loading model:
 *   - The runner modules are dynamic-imported on first Run click. That
 *     keeps Pyodide (~6MB) and PGlite (~3MB) out of the entry chunk for
 *     users who never interact with the runner.
 *   - Worker boot for Pyodide can take 3-5s on a cold load; we surface
 *     a "Loading Python runtime..." message during that window.
 */

import { useState, useTransition } from "react";
import { Play, Loader2, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TestSpec, RunResult } from "@/lib/executors/runner";
import { CodeEditor, type CodeLanguage } from "./code-editor";

interface RunPanelProps {
  /** Question category so the placeholder + button label feel right. */
  category: "SQL" | "PYTHON_DE" | "ALGORITHMS";
  /** Parsed test spec from `PracticeQuestion.testCases`. Null when the
   *  problem hasn't been backfilled with test cases yet. */
  spec: TestSpec | null;
  /** Optional starter code shown in the textarea. SQL gets the schema
   *  comment; Python gets the function signature. */
  starterCode?: string;
  /** The reference solution from the problem row — shown via "Reveal" button. */
  solution: string;
  /** Question id — required for persisting submission history. When set,
   *  every Run click is logged to /api/practice/submission. */
  questionId?: string;
}

const PLACEHOLDER_BY_CATEGORY: Record<RunPanelProps["category"], string> = {
  SQL: "-- Write your query here\nSELECT ...",
  PYTHON_DE: "# Define the required function here\ndef solution(...):\n    ...",
  ALGORITHMS: "# Define the required function here\ndef solution(...):\n    ...",
};

const RUN_LABEL: Record<RunPanelProps["category"], string> = {
  SQL: "Run Query",
  PYTHON_DE: "Run Code",
  ALGORITHMS: "Run Code",
};

/** Map a problem category to the Prism language identifier the CodeEditor
 *  expects. Both PYTHON_DE and ALGORITHMS use Python highlighting. */
function editorLanguageFor(
  category: RunPanelProps["category"],
): CodeLanguage {
  return category === "SQL" ? "sql" : "python";
}

export function RunPanel({ category, spec, starterCode, solution, questionId }: RunPanelProps) {
  // Initial editor content — prefer the spec's authored starter code (which
  // includes exact function signature + parameter names), then fall back to
  // any prop-supplied starter, then empty. The spec is the highest-quality
  // source because it was authored alongside the test cases.
  const initialCode = spec?.starterCode ?? starterCode ?? "";
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, startRun] = useTransition();
  const [showSolution, setShowSolution] = useState(false);

  // Test cases are missing — fall back to the legacy "type, peek, self-mark"
  // flow rather than dead-ending the page.
  const noSpec = spec === null;

  const handleRun = () => {
    if (!spec) return;
    startRun(async () => {
      setResult(null);
      // Dynamic import so PGlite/Pyodide don't bloat the entry chunk.
      const { runUserCode } = await import("@/lib/executors/runner");
      const r = await runUserCode(code, spec);
      setResult(r);
      // Fire-and-forget submission record. Failures don't block the user —
      // history is nice-to-have, not a blocker for the next Run click.
      if (questionId) {
        void fetch("/api/practice/submission", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            code,
            passed: r.fatalError ? null : r.passed,
            caseResults: r.cases,
            runtimeMs: r.totalMs,
          }),
        }).catch(() => {
          /* silent — submission log is best-effort */
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Editor — textarea with monospace font. We deliberately don't
          ship a heavyweight code editor (Monaco etc.) here; the textarea
          stays light and consistent with the existing scratchpad UX. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">Your solution</p>
          {!noSpec && (
            <span className="text-[11px] text-muted-foreground/70">
              {spec.kind === "sql"
                ? "Postgres-compatible SQL"
                : "Python 3 (Pyodide)"}
            </span>
          )}
        </div>
        {/* Syntax-highlighted editor for SQL + Python categories.
            Algorithms (Python) and PYTHON_DE both use Python highlighting.
            SQL gets the SQL grammar. The component falls back to a plain
            textarea via its own internals if Prism fails to load — degrades
            gracefully so a CDN hiccup doesn't break input. */}
        <CodeEditor
          value={code}
          onChange={setCode}
          language={editorLanguageFor(category)}
          placeholder={PLACEHOLDER_BY_CATEGORY[category]}
          minHeight={220}
        />
      </div>

      {/* Action row — Run + Reveal Solution */}
      <div className="flex items-center gap-2">
        {noSpec ? (
          <span className="text-xs text-muted-foreground">
            <AlertCircle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
            Test cases not yet configured for this problem — use Reveal Solution to compare.
          </span>
        ) : (
          <Button
            onClick={handleRun}
            disabled={running || code.trim().length === 0}
            size="sm"
            className="gap-1.5"
          >
            {running ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                {RUN_LABEL[category]}
              </>
            )}
          </Button>
        )}
        <Button
          onClick={() => setShowSolution((v) => !v)}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
        >
          {showSolution ? (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Hide Solution
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> Reveal Solution
            </>
          )}
        </Button>
      </div>

      {/* Results */}
      {result && <ResultsPanel result={result} />}

      {/* Solution */}
      {showSolution && (
        <div className="rounded-md border border-border bg-muted/30 p-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Reference solution</p>
          <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {solution}
          </pre>
        </div>
      )}
    </div>
  );
}

function ResultsPanel({ result }: { result: RunResult }) {
  if (result.fatalError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 space-y-1">
        <p className="text-sm font-medium text-destructive flex items-center gap-1.5">
          <XCircle className="h-4 w-4" />
          Couldn&apos;t run your code
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">{result.fatalError}</p>
      </div>
    );
  }

  const passed = result.cases.filter((c) => c.passed).length;
  const total = result.cases.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p
          className={`text-sm font-medium flex items-center gap-1.5 ${
            result.passed
              ? "text-green-600 dark:text-green-400"
              : "text-orange-600 dark:text-orange-400"
          }`}
        >
          {result.passed ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {passed}/{total} cases passed
        </p>
        <span className="text-xs text-muted-foreground tabular-nums">
          {result.totalMs}ms
        </span>
      </div>

      <div className="rounded-md border border-border divide-y divide-border bg-muted/20 overflow-hidden">
        {result.cases.map((c) => (
          <div key={c.index} className="px-3 py-2 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium">
                {c.passed ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                )}
                {c.hidden ? `Hidden case #${c.index + 1}` : c.name ?? `Case #${c.index + 1}`}
              </span>
              {c.durationMs != null && (
                <span className="text-muted-foreground tabular-nums">{c.durationMs}ms</span>
              )}
            </div>
            {!c.passed && c.error && !c.hidden && (
              <p className="text-muted-foreground/90 leading-relaxed pl-5">{c.error}</p>
            )}
            {!c.passed && c.actual !== undefined && c.expected !== undefined && (
              <div className="pl-5 space-y-1">
                <div>
                  <span className="text-muted-foreground/70">Expected: </span>
                  <code className="bg-background/40 rounded px-1 py-0.5">
                    {JSON.stringify(c.expected)}
                  </code>
                </div>
                <div>
                  <span className="text-muted-foreground/70">Got: </span>
                  <code className="bg-background/40 rounded px-1 py-0.5">
                    {JSON.stringify(c.actual)}
                  </code>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
