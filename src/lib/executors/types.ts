/**
 * Test-case shapes for the in-browser code executor.
 *
 * The `PracticeQuestion.testCases` JSON column on a per-question row
 * conforms to one of these discriminated-union variants. The shape is
 * stored as JSON not because we love typing `as Foo` everywhere, but
 * because it varies per category and a strict relational schema would
 * mean three nullable JSON fields anyway.
 *
 * Every variant carries `kind: "python" | "sql" | "algorithms"` so the
 * runner can dispatch to the right WASM backend without inspecting the
 * `PracticeQuestion.category` enum twice.
 */

// ── Python / Algorithms ──────────────────────────────────────────────
//
// Test cases call a single function the user defines in their solution.
// The runner imports the user's code, locates `entrypoint`, and calls
// it with each `args` tuple. Output is compared to `expected` with a
// deep equality check (after JSON-roundtripping, so tuple↔list etc.
// don't trip us up).

export interface PythonTestCase {
  /** Optional human-friendly label shown in results UI. */
  name?: string;
  /** Positional args, JSON-serializable. */
  args: unknown[];
  /** Expected return value, JSON-serializable. */
  expected: unknown;
  /** True iff this case should remain hidden until the user runs the
   *  solution at least once (anti-overfit; mimics LeetCode "hidden tests"). */
  hidden?: boolean;
}

export interface PythonTestSpec {
  kind: "python";
  /** Function name to call. The user's code must define this symbol. */
  entrypoint: string;
  /** Optional setup code prepended to the user's solution (helpers,
   *  imports, fixtures). Runs once per test case in a fresh module. */
  setup?: string;
  /** Starter code shown in the editor when the user opens the problem.
   *  Should include the exact function signature the test runner expects
   *  (parameter names, type hints) plus a `pass` body. The Pyodide worker
   *  also accepts camelCase + Solution-class variants, but the starter
   *  shows the canonical snake_case form to teach the convention. */
  starterCode?: string;
  cases: PythonTestCase[];
}

// ── SQL ──────────────────────────────────────────────────────────────
//
// The runner spins up a fresh PGlite instance per question, runs
// `setupSql` to populate sample tables, then runs the user's query
// and compares result rows to `expectedRows`.
//
// `match: "set"` (default) treats the result and expected as unordered
// sets (sorted by JSON.stringify before compare). `match: "ordered"`
// requires identical row order — used for ranking/pagination problems
// where the ORDER BY is the whole point of the question.

export interface SqlTestSpec {
  kind: "sql";
  /** DDL + DML to seed the database before running the user's query.
   *  Run as a single batch script (multiple statements separated by `;`). */
  setupSql: string;
  /** Expected result rows. Each row is { columnName: value }. */
  expectedRows: Record<string, unknown>[];
  /** "set" = order-insensitive (sorted by JSON.stringify before compare).
   *  "ordered" = preserve order, fail on row-order mismatch. */
  match?: "set" | "ordered";
  /** Starter code shown in the editor — typically a SELECT skeleton
   *  showing the columns the result should include and any required
   *  ORDER BY. Helps users hit the right column names without guessing. */
  starterCode?: string;
  /** Cases the runner doesn't reveal until the user has run their query
   *  at least once (anti-overfit). Each is a separate {setupSql, expectedRows}. */
  hiddenCases?: { setupSql: string; expectedRows: Record<string, unknown>[] }[];
}

// ── Discriminated union ──────────────────────────────────────────────

export type TestSpec = PythonTestSpec | SqlTestSpec;

// ── Result shapes ────────────────────────────────────────────────────

export interface CaseResult {
  index: number;
  name?: string;
  passed: boolean;
  /** Truthy when passed === false. */
  error?: string;
  /** Set when passed === false and the failure is a value mismatch
   *  (vs a runtime error). Pretty-printed for the UI diff. */
  expected?: unknown;
  actual?: unknown;
  /** Wall time in milliseconds. Useful when a test passes but is slow. */
  durationMs?: number;
  /** Hidden cases are reported with reduced detail — caller knows the
   *  pass/fail but doesn't see the input/expected, mimicking LeetCode. */
  hidden?: boolean;
}

export interface RunResult {
  /** True iff every (non-hidden + hidden) case passed. */
  passed: boolean;
  /** Per-case results, in the order the cases were declared. */
  cases: CaseResult[];
  /** Total runtime including executor warm-up. Useful for showing
   *  "ran in 2.3s" in the UI. */
  totalMs: number;
  /** Set when the runner itself errored (couldn't load WASM, syntax
   *  error in user code that prevents any test from running, etc.).
   *  Distinct from per-case failures. */
  fatalError?: string;
}
