/**
 * seed-practice-test-cases-python-pyspark.ts
 *
 * Backfills `PracticeQuestion.testCases` for the 3 PySpark problems
 * seeded by `seed-python-pyspark.ts`.
 *
 * ─── The Pyodide constraint ───────────────────────────────────────────
 * Our in-browser executor runs CPython compiled to WASM via Pyodide.
 * Pyodide has no JVM and no Spark — running real PySpark in the browser
 * is impossible. So we have two options per problem:
 *
 *   Path A — Plain-Python equivalent: re-frame the test against a
 *            pure-Python (or pandas) implementation that produces the
 *            same logical output. The user's solution still uses
 *            PySpark in the editor, but for the Run button we test a
 *            translated equivalent. A `setup` comment makes this
 *            explicit so users aren't confused.
 *
 *   Path B — Skip: leave the slug out of the test-cases map. The
 *            problem still works in scratchpad mode (no Run button);
 *            users compare to the reference solution. Used when the
 *            problem is fundamentally about a PySpark-specific perf
 *            mechanism (broadcast hints, partition salting) where the
 *            logical output isn't the point of the question.
 *
 * ─── Decisions ────────────────────────────────────────────────────────
 *   35. pyspark-window-top-n-per-group   → Path A (groupBy + rank;
 *                                          trivially expressible in
 *                                          pure Python)
 *   36. pyspark-broadcast-join           → Path B (the question IS the
 *                                          broadcast hint; the logical
 *                                          output is just an inner join
 *                                          and testing it would miss
 *                                          the point)
 *   37. pyspark-skew-handling-salting    → Path B (the question IS the
 *                                          salting mechanic; logical
 *                                          output is identical to a
 *                                          plain join)
 *
 * Run with:
 *   npx tsx prisma/seed-practice-test-cases-python-pyspark.ts
 *
 * Idempotent: matches by slug, overwrites testCases. Safe to re-run.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Shared setup note prepended to every Path-A PySpark test ─────────
//
// Surfaces in the executor next to the user's code so they understand
// why the test harness expects plain-Python types instead of DataFrames.

const PYSPARK_SETUP_NOTE = `# Note: this problem normally uses PySpark. Pyodide (the in-browser
# Python runtime) has no JVM and cannot run Spark, so for the Run
# button we test a plain-Python equivalent that produces the same
# logical output. The reference solution above still shows the
# idiomatic PySpark version — the algorithm and the data shape match
# one-to-one, only the execution substrate differs.
`;

const PYSPARK_TEST_CASES: Record<string, unknown> = {
  // ─────────────────────────────────────────────
  // 35. pyspark-window-top-n-per-group  →  Path A
  // ─────────────────────────────────────────────
  //
  // The PySpark version groups by (category, product_id), sums amount,
  // dense_ranks within category, and keeps rows where rank <= n.
  // The plain-Python equivalent uses a dict for aggregation and a
  // sort-then-dense-rank loop. Output rows mirror the DataFrame columns
  // as dicts — sorted by (category asc, rank asc) for stable ordering.
  //
  // entrypoint: top_n_products_per_category(orders, n)
  //   orders: list[dict] with keys order_id, product_id, category, amount, status
  //   returns: list[dict] with keys category, product_id, total_revenue, rank_in_category
  "pyspark-window-top-n-per-group": {
    kind: "python",
    entrypoint: "top_n_products_per_category",
    starterCode: `from typing import List, Dict, Any


def top_n_products_per_category(orders: List[Dict[str, Any]], n: int) -> List[Dict[str, Any]]:
    """Return the top-N products per category by total revenue.

    NOTE: this problem normally uses PySpark. Pyodide (the in-browser
    Python runtime) has no JVM and cannot run Spark, so for the Run
    button we test a plain-Python equivalent. The reference solution
    above shows the idiomatic PySpark version — the algorithm and
    data shape match one-to-one, only the execution substrate differs.

    Args:
        orders: list of dicts with keys
            order_id, product_id, category, amount, status
        n: keep rows whose dense_rank within category is <= n

    Returns:
        list of dicts with keys
            category, product_id, total_revenue, rank_in_category
        sorted by (category asc, rank_in_category asc).
    """
    # TODO:
    #   1. filter to status == "completed"
    #   2. aggregate amount by (category, product_id) → total_revenue
    #   3. dense_rank within each category by total_revenue desc
    #   4. keep rows where rank_in_category <= n
    #   5. return sorted by (category asc, rank_in_category asc)
    pass`,
    setup: PYSPARK_SETUP_NOTE,
    cases: [
      {
        name: "two categories, n=2 with a tie",
        args: [
          [
            { order_id: 1, product_id: 101, category: "books", amount: 25.0, status: "completed" },
            { order_id: 2, product_id: 101, category: "books", amount: 25.0, status: "completed" },
            { order_id: 3, product_id: 102, category: "books", amount: 50.0, status: "completed" },
            { order_id: 4, product_id: 103, category: "books", amount: 10.0, status: "completed" },
            { order_id: 5, product_id: 201, category: "tech", amount: 300.0, status: "completed" },
            { order_id: 6, product_id: 202, category: "tech", amount: 150.0, status: "completed" },
            { order_id: 7, product_id: 203, category: "tech", amount: 150.0, status: "completed" },
            // Filtered out — not 'completed':
            { order_id: 8, product_id: 202, category: "tech", amount: 999.0, status: "cancelled" },
          ],
          2,
        ],
        // books: 102=50 (rank 1), 101=50 (rank 1, tie), 103=10 (rank 2) → keep ranks <= 2
        // tech:  201=300 (rank 1), 202=150 (rank 2, tie), 203=150 (rank 2, tie) → keep ranks <= 2
        // dense_rank means tied rank-1 rows in books both survive at rank 1; 103 survives at rank 2.
        expected: [
          { category: "books", product_id: 101, total_revenue: 50.0, rank_in_category: 1 },
          { category: "books", product_id: 102, total_revenue: 50.0, rank_in_category: 1 },
          { category: "books", product_id: 103, total_revenue: 10.0, rank_in_category: 2 },
          { category: "tech", product_id: 201, total_revenue: 300.0, rank_in_category: 1 },
          { category: "tech", product_id: 202, total_revenue: 150.0, rank_in_category: 2 },
          { category: "tech", product_id: 203, total_revenue: 150.0, rank_in_category: 2 },
        ],
      },
      {
        name: "single category, n=1",
        args: [
          [
            { order_id: 1, product_id: 1, category: "a", amount: 10.0, status: "completed" },
            { order_id: 2, product_id: 2, category: "a", amount: 5.0, status: "completed" },
            { order_id: 3, product_id: 3, category: "a", amount: 20.0, status: "completed" },
          ],
          1,
        ],
        expected: [
          { category: "a", product_id: 3, total_revenue: 20.0, rank_in_category: 1 },
        ],
      },
      {
        name: "everything filtered out by status",
        args: [
          [
            { order_id: 1, product_id: 1, category: "a", amount: 10.0, status: "pending" },
            { order_id: 2, product_id: 2, category: "a", amount: 5.0, status: "cancelled" },
          ],
          3,
        ],
        expected: [],
        hidden: true,
      },
    ],
  },

  // ─────────────────────────────────────────────
  // 36. pyspark-broadcast-join  →  Path B (skipped)
  // ─────────────────────────────────────────────
  //
  // Intentionally omitted from this map. The whole point of the question
  // is choosing the broadcast-hash-join physical strategy and verifying
  // it via .explain() — the logical output of the join is just a
  // standard inner join, identical regardless of strategy. Running a
  // pandas merge in Pyodide and calling it "tested" would mislead users
  // about what the question is actually asking. Better to keep this in
  // scratchpad mode where users compare against the reference solution.

  // ─────────────────────────────────────────────
  // 37. pyspark-skew-handling-salting  →  Path B (skipped)
  // ─────────────────────────────────────────────
  //
  // Intentionally omitted. The salting technique is a runtime/partition
  // mechanic — its purpose is to redistribute hot keys across executors,
  // not to change the join's logical result. A plain-Python equivalent
  // would just be `dict`-merge by user_id, which doesn't exercise any
  // of what the question is actually testing (skew detection, hot-key
  // splitting, salt cardinality tradeoffs, AQE). Keep this in
  // scratchpad mode.
};

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [slug, spec] of Object.entries(PYSPARK_TEST_CASES)) {
    const result = await prisma.practiceQuestion.updateMany({
      where: { slug },
      data: { testCases: spec as object },
    });
    if (result.count === 0) {
      console.warn(`  ⚠  ${slug}: no row matches — has seed-python-pyspark.ts run?`);
      skipped++;
      continue;
    }
    const kind = (spec as { kind: string }).kind;
    console.log(`  ✓ ${slug} (${kind})`);
    updated++;
  }

  console.log(
    `\nDone. Backfilled ${updated} PySpark problem${updated === 1 ? "" : "s"}` +
      (skipped ? `, ${skipped} skipped.` : ".") +
      `\nNote: 2 of 3 PySpark problems (broadcast-join, skew-handling-salting) intentionally have no test cases — they remain in scratchpad mode. See file header for rationale.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
