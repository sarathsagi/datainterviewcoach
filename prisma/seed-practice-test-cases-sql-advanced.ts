/**
 * seed-practice-test-cases-sql-advanced.ts
 *
 * Backfills `PracticeQuestion.testCases` for the 6 advanced SQL
 * problems seeded by `seed-sql-advanced.ts` (orders 43-48).
 *
 * Conforms to the SqlTestSpec discriminated union in
 * `src/lib/executors/types.ts`. The runner spins up a fresh PGlite
 * per question, runs `setupSql`, then executes the user's query and
 * compares result rows against `expectedRows`.
 *
 * A few of the advanced problems are skipped here because PGlite
 * (Postgres in WASM) doesn't ship the relevant warehouse-only
 * functions, or the expected row shape can't be made deterministic
 * against PGlite's JSON serializer:
 *   • json-aggregate-customer-orders — jsonb output ordering /
 *     serialization is not stable enough for a strict equality
 *     comparison in the runner.
 *   • approx-count-distinct-hll       — APPROX_COUNT_DISTINCT and
 *     HLL_* are warehouse functions; PGlite doesn't implement them.
 *
 * Run with:
 *   npx tsx prisma/seed-practice-test-cases-sql-advanced.ts
 *
 * Idempotent: matches by slug, overwrites testCases. Safe to re-run.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── SQL test cases ────────────────────────────────────────────────────

const SQL_TEST_CASES: Record<string, unknown> = {
  // 43. PERCENTILE_CONT — latency SLOs
  //
  // Two qualifying endpoints (>= 100 requests):
  //   /a:  durations 1..100   → p50=50.5,  p95=95.05,  p99=99.01
  //   /c:  durations 1..200   → p50=100.5, p95=190.05, p99=198.01
  // One excluded endpoint:
  //   /b:  50 rows, fails HAVING COUNT(*) >= 100
  //
  // All rows have created_at = NOW() so they fall within the
  // last-24h window regardless of when the test runs.
  //
  // ORDER BY p99_ms DESC — /c first (198.01), then /a (99.01).
  "percentile-latency-by-endpoint": {
    kind: "sql",
    match: "ordered",
    starterCode: `-- p50 / p95 / p99 latency per endpoint, last 24h, only endpoints with >= 100 requests.
-- Use PERCENTILE_CONT(fraction) WITHIN GROUP (ORDER BY duration_ms).
SELECT
  endpoint,
  COUNT(*) AS request_count,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY duration_ms) AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) AS p95_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) AS p99_ms
FROM api_requests
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY endpoint
HAVING COUNT(*) >= 100
ORDER BY p99_ms DESC;`,
    setupSql: `
      CREATE TABLE api_requests (
        request_id   BIGINT PRIMARY KEY,
        endpoint     TEXT,
        method       TEXT,
        status_code  INT,
        duration_ms  INT,
        created_at   TIMESTAMP
      );
      INSERT INTO api_requests (request_id, endpoint, method, status_code, duration_ms, created_at)
      SELECT g, '/a', 'GET', 200, g, NOW()
      FROM generate_series(1, 100) AS g;
      INSERT INTO api_requests (request_id, endpoint, method, status_code, duration_ms, created_at)
      SELECT 1000 + g, '/b', 'GET', 200, g, NOW()
      FROM generate_series(1, 50) AS g;
      INSERT INTO api_requests (request_id, endpoint, method, status_code, duration_ms, created_at)
      SELECT 2000 + g, '/c', 'GET', 200, g, NOW()
      FROM generate_series(1, 200) AS g;
    `,
    expectedRows: [
      { endpoint: "/c", request_count: 200, p50_ms: 100.5, p95_ms: 190.05, p99_ms: 198.01 },
      { endpoint: "/a", request_count: 100, p50_ms: 50.5,  p95_ms: 95.05,  p99_ms: 99.01  },
    ],
  },

  // 44. LATERAL join — top-N-per-group
  //
  // Alice (1): 4 completed orders + 1 cancelled → top 3 by recency
  // Bob   (2): 2 completed orders → both appear
  // Carol (3): 1 cancelled order → drops out (inner join semantics
  //            for both LATERAL and ROW_NUMBER versions).
  //
  // ORDER BY customer_id, created_at DESC.
  "lateral-join-top-orders-per-customer": {
    kind: "sql",
    match: "ordered",
    starterCode: `-- Top 3 most recent COMPLETED orders per customer.
-- Try a LATERAL join (customers CROSS JOIN LATERAL (... LIMIT 3)).
SELECT
  c.customer_id,
  c.name,
  o.order_id,
  o.amount,
  o.created_at
FROM customers c
CROSS JOIN LATERAL (
  SELECT order_id, amount, created_at
  FROM orders
  WHERE customer_id = c.customer_id
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 3
) o
ORDER BY c.customer_id, o.created_at DESC;`,
    setupSql: `
      CREATE TABLE customers (
        customer_id BIGINT PRIMARY KEY,
        name        TEXT,
        email       TEXT,
        country     TEXT,
        plan        TEXT,
        created_at  TIMESTAMP
      );
      CREATE TABLE orders (
        order_id    BIGINT PRIMARY KEY,
        customer_id BIGINT REFERENCES customers(customer_id),
        product_id  BIGINT,
        quantity    INT,
        amount      INT,
        status      TEXT,
        created_at  TIMESTAMP
      );
      INSERT INTO customers (customer_id, name, email, country, plan, created_at) VALUES
        (1, 'Alice', 'alice@example.com', 'US', 'free', '2025-01-01'),
        (2, 'Bob',   'bob@example.com',   'US', 'pro',  '2025-01-01'),
        (3, 'Carol', 'carol@example.com', 'UK', 'free', '2025-01-01');
      INSERT INTO orders (order_id, customer_id, product_id, quantity, amount, status, created_at) VALUES
        (101, 1, 1, 1, 50, 'completed', '2026-01-01 00:00:00'),
        (102, 1, 1, 1, 60, 'completed', '2026-01-02 00:00:00'),
        (103, 1, 1, 1, 70, 'completed', '2026-01-03 00:00:00'),
        (104, 1, 1, 1, 80, 'completed', '2026-01-04 00:00:00'),
        (105, 1, 1, 1, 90, 'cancelled', '2026-01-05 00:00:00'),
        (201, 2, 1, 1, 100, 'completed', '2026-02-01 00:00:00'),
        (202, 2, 1, 1, 110, 'completed', '2026-02-02 00:00:00'),
        (301, 3, 1, 1, 200, 'cancelled', '2026-03-01 00:00:00');
    `,
    expectedRows: [
      { customer_id: 1, name: "Alice", order_id: 104, amount: 80, created_at: "2026-01-04T00:00:00.000Z" },
      { customer_id: 1, name: "Alice", order_id: 103, amount: 70, created_at: "2026-01-03T00:00:00.000Z" },
      { customer_id: 1, name: "Alice", order_id: 102, amount: 60, created_at: "2026-01-02T00:00:00.000Z" },
      { customer_id: 2, name: "Bob",   order_id: 202, amount: 110, created_at: "2026-02-02T00:00:00.000Z" },
      { customer_id: 2, name: "Bob",   order_id: 201, amount: 100, created_at: "2026-02-01T00:00:00.000Z" },
    ],
  },

  // 45. GROUPING SETS / CUBE — revenue rollup
  //
  // Customers:
  //   c1 US/free, c2 US/pro, c3 UK/free
  // Completed-order revenue:
  //   US/free = 150, US/pro = 200, UK/free = 400
  //   US      = 350, UK     = 400
  //   free    = 550, pro    = 200
  //   grand   = 750
  // is_subtotal = (GROUPING(country) + GROUPING(plan)) > 0
  //
  // Set match — order-insensitive — because CUBE row order varies.
  "grouping-sets-revenue-rollup": {
    kind: "sql",
    starterCode: `-- Revenue rollup: detail (country, plan), subtotals by country, by plan, and grand total.
-- Use CUBE (or GROUPING SETS). Use GROUPING() to flag subtotal rows.
SELECT
  c.country,
  c.plan,
  SUM(o.amount) AS total_revenue,
  (GROUPING(c.country) + GROUPING(c.plan)) > 0 AS is_subtotal
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = 'completed'
GROUP BY CUBE(c.country, c.plan);`,
    setupSql: `
      CREATE TABLE customers (
        customer_id BIGINT PRIMARY KEY,
        name        TEXT,
        email       TEXT,
        country     TEXT,
        plan        TEXT,
        created_at  TIMESTAMP
      );
      CREATE TABLE orders (
        order_id    BIGINT PRIMARY KEY,
        customer_id BIGINT REFERENCES customers(customer_id),
        product_id  BIGINT,
        quantity    INT,
        amount      INT,
        status      TEXT,
        created_at  TIMESTAMP
      );
      INSERT INTO customers (customer_id, name, email, country, plan, created_at) VALUES
        (1, 'Alice', 'a@x.com', 'US', 'free', '2025-01-01'),
        (2, 'Bob',   'b@x.com', 'US', 'pro',  '2025-01-01'),
        (3, 'Carol', 'c@x.com', 'UK', 'free', '2025-01-01');
      INSERT INTO orders (order_id, customer_id, product_id, quantity, amount, status, created_at) VALUES
        (101, 1, 1, 1, 100, 'completed', '2026-01-01'),
        (102, 1, 1, 1,  50, 'completed', '2026-01-02'),
        (103, 1, 1, 1,  77, 'cancelled', '2026-01-03'),
        (201, 2, 1, 1, 200, 'completed', '2026-02-01'),
        (301, 3, 1, 1, 300, 'completed', '2026-03-01'),
        (302, 3, 1, 1, 100, 'completed', '2026-03-02');
    `,
    expectedRows: [
      // Detail rows
      { country: "US", plan: "free", total_revenue: 150, is_subtotal: false },
      { country: "US", plan: "pro",  total_revenue: 200, is_subtotal: false },
      { country: "UK", plan: "free", total_revenue: 400, is_subtotal: false },
      // Subtotals by country
      { country: "US", plan: null,   total_revenue: 350, is_subtotal: true  },
      { country: "UK", plan: null,   total_revenue: 400, is_subtotal: true  },
      // Subtotals by plan
      { country: null, plan: "free", total_revenue: 550, is_subtotal: true  },
      { country: null, plan: "pro",  total_revenue: 200, is_subtotal: true  },
      // Grand total
      { country: null, plan: null,   total_revenue: 750, is_subtotal: true  },
    ],
  },

  // 47. QUALIFY — top-3 products per month
  //
  // Postgres doesn't support QUALIFY, so the user's portable-fallback
  // CTE is what runs here. We test the result shape, not the syntax.
  //
  // Month 2026-01: p1=300, p2=200, p3=200, p4=100
  //   dense_rank: p1=1, p2=2, p3=2, p4=3 → all 4 within top 3 ranks
  // Month 2026-02: p1=500, p2=400, p3=300, p4=100
  //   dense_rank: 1, 2, 3, 4 → first 3
  //
  // ORDER BY month, rank_in_month — within a tied rank, order is
  // implementation-defined, so we keep just one tie-pair and let the
  // runner sort... actually we need ordered match for this problem.
  // To stay deterministic, the inner ORDER BY is augmented with
  // product_id only by some users; we mark the spec ordered but give
  // a tie-free dataset to avoid that footgun.
  //
  // Reworked dataset (no ties): see numbers above for Feb; for Jan
  // bump p3 to 250 so all dense_ranks are unique.
  "qualify-rank-filter": {
    kind: "sql",
    match: "ordered",
    starterCode: `-- Top 3 products per month by revenue (completed orders only).
-- Postgres has no QUALIFY — use a CTE + DENSE_RANK() and filter in an outer SELECT.
WITH monthly AS (
  SELECT
    DATE_TRUNC('month', o.created_at) AS month,
    p.product_id,
    p.name AS product_name,
    SUM(o.amount) AS month_revenue
  FROM orders o
  JOIN products p ON p.product_id = o.product_id
  WHERE o.status = 'completed'
  GROUP BY DATE_TRUNC('month', o.created_at), p.product_id, p.name
),
ranked AS (
  SELECT
    month, product_id, product_name, month_revenue,
    DENSE_RANK() OVER (PARTITION BY month ORDER BY month_revenue DESC) AS rank_in_month
  FROM monthly
)
SELECT month, product_id, product_name, month_revenue, rank_in_month
FROM ranked
WHERE rank_in_month <= 3
ORDER BY month, rank_in_month;`,
    setupSql: `
      CREATE TABLE products (
        product_id BIGINT PRIMARY KEY,
        name       TEXT,
        category   TEXT,
        price      INT
      );
      CREATE TABLE orders (
        order_id    BIGINT PRIMARY KEY,
        customer_id BIGINT,
        product_id  BIGINT REFERENCES products(product_id),
        quantity    INT,
        amount      INT,
        status      TEXT,
        created_at  TIMESTAMP
      );
      INSERT INTO products (product_id, name, category, price) VALUES
        (1, 'P1', 'cat', 10),
        (2, 'P2', 'cat', 10),
        (3, 'P3', 'cat', 10),
        (4, 'P4', 'cat', 10);
      -- January: p1=300, p2=250, p3=200, p4=100  (no ties, ranks 1..4 → top 3 → first 3)
      INSERT INTO orders (order_id, customer_id, product_id, quantity, amount, status, created_at) VALUES
        (1, 1, 1, 1, 300, 'completed', '2026-01-15'),
        (2, 1, 2, 1, 250, 'completed', '2026-01-15'),
        (3, 1, 3, 1, 200, 'completed', '2026-01-15'),
        (4, 1, 4, 1, 100, 'completed', '2026-01-15'),
        -- February: p1=500, p2=400, p3=300, p4=100
        (5, 1, 1, 1, 500, 'completed', '2026-02-10'),
        (6, 1, 2, 1, 400, 'completed', '2026-02-10'),
        (7, 1, 3, 1, 300, 'completed', '2026-02-10'),
        (8, 1, 4, 1, 100, 'completed', '2026-02-10'),
        -- Cancelled — must be excluded
        (9, 1, 1, 1, 9999, 'cancelled', '2026-01-20');
    `,
    expectedRows: [
      { month: "2026-01-01T00:00:00.000Z", product_id: 1, product_name: "P1", month_revenue: 300, rank_in_month: 1 },
      { month: "2026-01-01T00:00:00.000Z", product_id: 2, product_name: "P2", month_revenue: 250, rank_in_month: 2 },
      { month: "2026-01-01T00:00:00.000Z", product_id: 3, product_name: "P3", month_revenue: 200, rank_in_month: 3 },
      { month: "2026-02-01T00:00:00.000Z", product_id: 1, product_name: "P1", month_revenue: 500, rank_in_month: 1 },
      { month: "2026-02-01T00:00:00.000Z", product_id: 2, product_name: "P2", month_revenue: 400, rank_in_month: 2 },
      { month: "2026-02-01T00:00:00.000Z", product_id: 3, product_name: "P3", month_revenue: 300, rank_in_month: 3 },
    ],
  },

  // 46. json-aggregate-customer-orders — SKIPPED
  // 48. approx-count-distinct-hll       — SKIPPED
  // (See header comment for rationale.)
};

async function main() {
  let updated = 0;
  let skipped = 0;

  for (const [slug, spec] of Object.entries(SQL_TEST_CASES)) {
    const result = await prisma.practiceQuestion.updateMany({
      where: { slug },
      data: { testCases: spec as object },
    });
    if (result.count === 0) {
      console.warn(`  ⚠  ${slug}: no row matches — has seed-sql-advanced run?`);
      skipped++;
      continue;
    }
    const kind = (spec as { kind: string }).kind;
    console.log(`  ✓ ${slug} (${kind})`);
    updated++;
  }

  console.log(
    `\nDone. Backfilled ${updated} problems${skipped ? `, ${skipped} skipped` : ""}.`,
  );
  console.log(
    `Note: 2 of 6 advanced-SQL problems intentionally have no test cases ` +
      `(json-aggregate-customer-orders, approx-count-distinct-hll) — see file header.`,
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
