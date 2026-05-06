/**
 * seed-practice-test-cases-sql-warehouse.ts
 *
 * Backfills `PracticeQuestion.testCases` for the 10 SQL warehouse
 * problems defined in `seed-sql-warehouse.ts`.
 *
 * The shape is the discriminated-union TestSpec from
 * `src/lib/executors/types.ts`:
 *   - kind: "sql" — Postgres-compatible (PGlite) SQL with setupSql + expectedRows
 *
 * Warehouse-specific notes:
 *   - PGlite supports standard Postgres SQL only — no QUALIFY, no FLATTEN,
 *     no MERGE (until PG15, and PGlite is older), no PIVOT, no STRUCT.
 *   - Where the warehouse `solution` uses Snowflake/BigQuery sugar, the
 *     test setup is shaped so the equivalent standard-SQL approach works
 *     against PGlite.
 *   - SCD Type 2 MERGE (slug: scd-type-2-merge) is **skipped** — the
 *     "expected output" of an SCD-2 MERGE is a mutation of the dimension
 *     table, not a SELECT result. PGlite's MERGE support is missing /
 *     incomplete and the canonical solution is a multi-statement BEGIN…
 *     COMMIT block, which doesn't fit the "run a SELECT, compare rows"
 *     test harness shape.
 *   - SCD-1 MERGE (slug: scd-type-1-merge-upsert) is **skipped** for the
 *     same reason — it's a write, not a read; the testCases harness
 *     compares SELECT result rows.
 *
 * Run with:
 *   npx tsx prisma/seed-practice-test-cases-sql-warehouse.ts
 *
 * Idempotent: matches by slug, overwrites testCases. Safe to re-run.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── SQL test cases ───────────────────────────────────────────────────

const SQL_TEST_CASES: Record<string, unknown> = {
  // 1. EASY — Orphan record detection
  "detect-orphan-records": {
    kind: "sql",
    match: "ordered", // problem solution sorts by order_id
    setupSql: `
      CREATE TABLE dim_customers (
        customer_id INT PRIMARY KEY,
        name        TEXT,
        email       TEXT
      );

      CREATE TABLE stg_orders (
        order_id    INT,
        customer_id INT,
        order_date  DATE,
        amount      NUMERIC(10, 2)
      );

      INSERT INTO dim_customers VALUES
        (1, 'Alice Chen',   'alice@example.com'),
        (2, 'Bob Martinez', 'bob@example.com'),
        (3, 'Carol Singh',  'carol@example.com');

      INSERT INTO stg_orders VALUES
        (1001, 1,   '2024-11-01',  59.99),
        (1002, 2,   '2024-11-02', 129.50),
        (1003, 99,  '2024-11-02',  19.00),
        (1004, 3,   '2024-11-03',  42.00),
        (1005, 101, '2024-11-03',  75.00);
    `,
    expectedRows: [
      { order_id: 1003, customer_id: 99,  order_date: "2024-11-02", amount: "19.00" },
      { order_id: 1005, customer_id: 101, order_date: "2024-11-03", amount: "75.00" },
    ],
    starterCode: `-- Find rows in stg_orders whose customer_id has no match in dim_customers.
-- Strategy: anti-join — LEFT JOIN dim_customers and keep rows where the
-- dimension side is NULL (NOT EXISTS works equivalently).
SELECT s.order_id,
       s.customer_id,
       s.order_date,
       s.amount
FROM   stg_orders s
-- LEFT JOIN dim_customers d ON d.customer_id = s.customer_id
-- WHERE  d.customer_id IS NULL
ORDER  BY s.order_id;`,
  },

  // 2. MEDIUM — Dedup latest row per user
  "deduplicate-latest-row-per-key": {
    kind: "sql",
    match: "ordered", // solution orders by user_id
    setupSql: `
      CREATE TABLE events (
        user_id    INT,
        event_time TIMESTAMP,
        status     TEXT
      );

      INSERT INTO events VALUES
        (1, '2024-11-01 09:15:00', 'signup'),
        (1, '2024-11-02 10:00:00', 'active'),
        (1, '2024-11-05 14:22:00', 'churned'),
        (2, '2024-11-01 12:00:00', 'signup'),
        (2, '2024-11-03 08:30:00', 'active'),
        (3, '2024-11-04 16:45:00', 'signup'),
        (3, '2024-11-04 16:45:00', 'active'),
        (4, '2024-11-06 11:11:00', 'signup');
    `,
    // Tie-break: user 3 has two rows at same event_time — 'active' < 'signup' alphabetically
    expectedRows: [
      { user_id: 1, event_time: "2024-11-05 14:22:00", status: "churned" },
      { user_id: 2, event_time: "2024-11-03 08:30:00", status: "active" },
      { user_id: 3, event_time: "2024-11-04 16:45:00", status: "active" },
      { user_id: 4, event_time: "2024-11-06 11:11:00", status: "signup" },
    ],
    starterCode: `-- Keep one row per user_id — the latest event_time, tie-break on status ASC.
-- Strategy: ROW_NUMBER() in a CTE, then filter rn = 1 in the outer query.
-- (PGlite has no QUALIFY, so the subquery is required.)
WITH ranked AS (
  SELECT user_id,
         event_time,
         status
         -- , ROW_NUMBER() OVER (
         --     PARTITION BY user_id
         --     ORDER     BY event_time DESC, status ASC
         --   ) AS rn
  FROM   events
)
SELECT user_id, event_time, status
FROM   ranked
-- WHERE  rn = 1
ORDER  BY user_id;`,
  },

  // 3. MEDIUM — SCD-1 MERGE upsert
  // SKIPPED: this problem expects a MERGE / INSERT…ON CONFLICT mutation,
  // not a SELECT. The test harness compares result rows of the user's
  // query, so there's no clean way to assert "the dimension table looks
  // like X after the upsert" without a SELECT trailer the user didn't
  // write. Leaving this one to a future write-test variant.

  // 4. HARD — SCD-2 MERGE
  // SKIPPED: same reason as SCD-1 — it's a multi-statement mutation.
  // PGlite also lacks reliable MERGE support and the canonical solution
  // is BEGIN…UPDATE…INSERT…COMMIT, which doesn't fit a single-SELECT
  // expectedRows comparison.

  // 5. MEDIUM — Running total revenue
  "running-total-revenue": {
    kind: "sql",
    match: "ordered", // sorted by customer_id, order_date
    setupSql: `
      CREATE TABLE orders (
        order_id    INT,
        order_date  DATE,
        customer_id INT,
        amount      NUMERIC(10, 2)
      );

      INSERT INTO orders VALUES
        (1, '2024-09-01', 1,  50.00),
        (2, '2024-09-03', 1,  25.00),
        (3, '2024-09-07', 1, 100.00),
        (4, '2024-09-02', 2,  40.00),
        (5, '2024-09-05', 2,  60.00),
        (6, '2024-09-01', 3,  10.00),
        (7, '2024-09-10', 3, 200.00),
        (8, '2024-09-12', 3,  30.00);
    `,
    expectedRows: [
      { order_date: "2024-09-01", customer_id: 1, amount: "50.00",  running_total: "50.00" },
      { order_date: "2024-09-03", customer_id: 1, amount: "25.00",  running_total: "75.00" },
      { order_date: "2024-09-07", customer_id: 1, amount: "100.00", running_total: "175.00" },
      { order_date: "2024-09-02", customer_id: 2, amount: "40.00",  running_total: "40.00" },
      { order_date: "2024-09-05", customer_id: 2, amount: "60.00",  running_total: "100.00" },
      { order_date: "2024-09-01", customer_id: 3, amount: "10.00",  running_total: "10.00" },
      { order_date: "2024-09-10", customer_id: 3, amount: "200.00", running_total: "210.00" },
      { order_date: "2024-09-12", customer_id: 3, amount: "30.00",  running_total: "240.00" },
    ],
    starterCode: `-- Cumulative spend per customer ordered by order_date.
-- Strategy: SUM(amount) windowed, PARTITION BY customer_id (reset per group),
-- ORDER BY order_date (accumulation axis). Default frame = UNBOUNDED PRECEDING
-- to CURRENT ROW, which is exactly the running-total semantics.
SELECT order_date,
       customer_id,
       amount
       -- , SUM(amount) OVER (
       --     PARTITION BY customer_id
       --     ORDER     BY order_date
       --   ) AS running_total
FROM   orders
ORDER  BY customer_id, order_date;`,
  },

  // 6. MEDIUM — Rolling 7-day distinct active users
  "rolling-7-day-active-users": {
    kind: "sql",
    match: "ordered", // sorted by event_date
    setupSql: `
      CREATE TABLE events (
        user_id    INT,
        event_date DATE
      );

      INSERT INTO events VALUES
        (1, '2024-11-01'), (2, '2024-11-01'),
        (1, '2024-11-02'), (3, '2024-11-02'),
        (2, '2024-11-03'),
        (4, '2024-11-05'), (1, '2024-11-05'),
        (5, '2024-11-07'), (2, '2024-11-07'),
        (6, '2024-11-08'), (1, '2024-11-08'),
        (7, '2024-11-09');
    `,
    // For each event_date d, distinct users with any event in [d-6, d]:
    //   2024-11-01: {1,2}                                        -> 2
    //   2024-11-02: {1,2,3}                                      -> 3
    //   2024-11-03: {1,2,3}                                      -> 3
    //   2024-11-05: {1,2,3,4}                                    -> 4
    //   2024-11-07: {1,2,3,4,5}                                  -> 5
    //   2024-11-08: {1,2,3,4,5,6}                                -> 6
    //   2024-11-09: {1,2,4,5,6,7}  (3 last seen 11-02, out of window) -> 6
    expectedRows: [
      { event_date: "2024-11-01", rolling_7d_active_users: 2 },
      { event_date: "2024-11-02", rolling_7d_active_users: 3 },
      { event_date: "2024-11-03", rolling_7d_active_users: 3 },
      { event_date: "2024-11-05", rolling_7d_active_users: 4 },
      { event_date: "2024-11-07", rolling_7d_active_users: 5 },
      { event_date: "2024-11-08", rolling_7d_active_users: 6 },
      { event_date: "2024-11-09", rolling_7d_active_users: 6 },
    ],
    starterCode: `-- For each event_date d, count distinct users with any event in [d-6, d].
-- Strategy: PGlite/Postgres reject COUNT(DISTINCT) OVER, so use a self-join.
--   1. Reduce to distinct (user_id, event_date) pairs.
--   2. For each distinct date d, LEFT JOIN to pairs where ud.event_date
--      BETWEEN d - INTERVAL '6 day' AND d, then COUNT(DISTINCT user_id).
WITH user_days AS (
  SELECT DISTINCT user_id, event_date
  FROM   events
),
all_dates AS (
  SELECT DISTINCT event_date
  FROM   events
)
SELECT d.event_date
       -- , COUNT(DISTINCT ud.user_id) AS rolling_7d_active_users
FROM   all_dates d
-- LEFT JOIN user_days ud
--        ON ud.event_date BETWEEN d.event_date - INTERVAL '6 day'
--                              AND d.event_date
GROUP  BY d.event_date
ORDER  BY d.event_date;`,
  },

  // 7. HARD — Sessionize events
  "sessionize-events-30min-gap": {
    kind: "sql",
    match: "ordered", // sorted by user_id, session_id
    setupSql: `
      CREATE TABLE events (
        user_id    INT,
        event_time TIMESTAMP
      );

      INSERT INTO events VALUES
        (1, '2024-11-01 09:00:00'),
        (1, '2024-11-01 09:10:00'),
        (1, '2024-11-01 09:25:00'),
        (1, '2024-11-01 10:00:00'),
        (1, '2024-11-01 10:05:00'),
        (2, '2024-11-01 08:00:00'),
        (2, '2024-11-01 08:20:00'),
        (2, '2024-11-01 14:00:00'),
        (3, '2024-11-01 11:00:00');
    `,
    // user 1: session 1 = 09:00–09:25 (3 events, gap 09:25→10:00 = 35min)
    //         session 2 = 10:00–10:05 (2 events)
    // user 2: session 1 = 08:00–08:20 (2), session 2 = 14:00–14:00 (1)
    // user 3: session 1 = 11:00–11:00 (1)
    expectedRows: [
      { user_id: 1, session_id: "1", session_start: "2024-11-01 09:00:00", session_end: "2024-11-01 09:25:00", event_count: "3" },
      { user_id: 1, session_id: "2", session_start: "2024-11-01 10:00:00", session_end: "2024-11-01 10:05:00", event_count: "2" },
      { user_id: 2, session_id: "1", session_start: "2024-11-01 08:00:00", session_end: "2024-11-01 08:20:00", event_count: "2" },
      { user_id: 2, session_id: "2", session_start: "2024-11-01 14:00:00", session_end: "2024-11-01 14:00:00", event_count: "1" },
      { user_id: 3, session_id: "1", session_start: "2024-11-01 11:00:00", session_end: "2024-11-01 11:00:00", event_count: "1" },
    ],
    starterCode: `-- Group consecutive events per user into sessions; new session when the
-- gap to the previous event exceeds 30 minutes (gap-and-island).
-- Strategy:
--   1) LAG(event_time) per user to get prev_time.
--   2) Flag is_new_session = 1 when gap > 30 minutes (or prev IS NULL).
--   3) Cumulative SUM(is_new_session) over user gives the session_id.
--   4) GROUP BY user_id, session_id for start/end/count.
WITH with_gap AS (
  SELECT user_id,
         event_time
         -- , LAG(event_time) OVER (PARTITION BY user_id ORDER BY event_time) AS prev_time
  FROM   events
),
flagged AS (
  SELECT user_id,
         event_time
         -- , CASE
         --     WHEN prev_time IS NULL THEN 1
         --     WHEN event_time - prev_time > INTERVAL '30 minutes' THEN 1
         --     ELSE 0
         --   END AS is_new_session
  FROM   with_gap
),
sessioned AS (
  SELECT user_id,
         event_time
         -- , SUM(is_new_session) OVER (PARTITION BY user_id ORDER BY event_time) AS session_id
  FROM   flagged
)
SELECT user_id
       -- , session_id
       -- , MIN(event_time) AS session_start
       -- , MAX(event_time) AS session_end
       -- , COUNT(*)        AS event_count
FROM   sessioned
GROUP  BY user_id
ORDER  BY user_id;`,
  },

  // 8. MEDIUM — Pivot monthly revenue
  "pivot-monthly-revenue": {
    kind: "sql",
    match: "ordered", // sorted by product
    setupSql: `
      CREATE TABLE orders (
        order_id   INT,
        order_date DATE,
        product    TEXT,
        amount     NUMERIC(10, 2)
      );

      INSERT INTO orders VALUES
        (1,  '2024-01-05', 'Widget',      100.00),
        (2,  '2024-01-20', 'Widget',       50.00),
        (3,  '2024-02-10', 'Widget',       75.00),
        (4,  '2024-03-02', 'Widget',      120.00),
        (5,  '2024-01-08', 'Gadget',      200.00),
        (6,  '2024-02-14', 'Gadget',      180.00),
        (7,  '2024-06-25', 'Gadget',      250.00),
        (8,  '2024-11-03', 'Gadget',       90.00),
        (9,  '2024-04-01', 'Thingamajig',  60.00),
        (10, '2024-04-18', 'Thingamajig',  40.00);
    `,
    // Gadget:      jan 200, feb 180, jun 250, nov 90
    // Thingamajig: apr 100
    // Widget:      jan 150, feb 75, mar 120
    expectedRows: [
      {
        product: "Gadget",
        jan: "200.00", feb: "180.00", mar: "0",      apr: "0",
        may: "0",      jun: "250.00", jul: "0",      aug: "0",
        sep: "0",      oct: "0",      nov: "90.00",  dec: "0",
      },
      {
        product: "Thingamajig",
        jan: "0",      feb: "0",      mar: "0",      apr: "100.00",
        may: "0",      jun: "0",      jul: "0",      aug: "0",
        sep: "0",      oct: "0",      nov: "0",      dec: "0",
      },
      {
        product: "Widget",
        jan: "150.00", feb: "75.00",  mar: "120.00", apr: "0",
        may: "0",      jun: "0",      jul: "0",      aug: "0",
        sep: "0",      oct: "0",      nov: "0",      dec: "0",
      },
    ],
    starterCode: `-- Pivot 2024 monthly revenue: one row per product, one column per month.
-- Strategy: portable SUM(CASE WHEN EXTRACT(MONTH FROM order_date) = N THEN amount END)
-- per month. Wrap with COALESCE(..., 0) so months with no sales show 0 instead of NULL.
-- (PGlite has no PIVOT — this CASE-based version is the right approach anyway.)
SELECT product,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) =  1 THEN amount END), 0) AS jan,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) =  2 THEN amount END), 0) AS feb,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) =  3 THEN amount END), 0) AS mar,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) =  4 THEN amount END), 0) AS apr,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) =  5 THEN amount END), 0) AS may,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) =  6 THEN amount END), 0) AS jun,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) =  7 THEN amount END), 0) AS jul,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) =  8 THEN amount END), 0) AS aug,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) =  9 THEN amount END), 0) AS sep,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) = 10 THEN amount END), 0) AS oct,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) = 11 THEN amount END), 0) AS nov,
       COALESCE(SUM(CASE WHEN EXTRACT(MONTH FROM order_date) = 12 THEN amount END), 0) AS dec
FROM   orders
WHERE  EXTRACT(YEAR FROM order_date) = 2024
GROUP  BY product
ORDER  BY product;`,
  },

  // 9. HARD — Consecutive login streak
  "consecutive-login-streak": {
    kind: "sql",
    match: "ordered", // sorted by user_id
    setupSql: `
      CREATE TABLE logins (
        user_id    INT,
        login_date DATE
      );

      INSERT INTO logins VALUES
        (1, '2024-11-01'),
        (1, '2024-11-02'),
        (1, '2024-11-03'),
        (1, '2024-11-06'),
        (1, '2024-11-10'),
        (1, '2024-11-11'),
        (2, '2024-11-01'),
        (2, '2024-11-02'),
        (2, '2024-11-03'),
        (2, '2024-11-04'),
        (2, '2024-11-05'),
        (3, '2024-11-01'),
        (3, '2024-11-05'),
        (3, '2024-11-10');
    `,
    expectedRows: [
      { user_id: 1, longest_streak: "3" },
      { user_id: 2, longest_streak: "5" },
      { user_id: 3, longest_streak: "1" },
    ],
    starterCode: `-- Longest consecutive-day login streak per user (gap-and-island).
-- Trick: login_date - ROW_NUMBER() (per user, ordered by date) is constant
-- for any run of consecutive days; gaps shift the anchor. Group by (user, anchor),
-- count rows per group, then MAX per user.
WITH numbered AS (
  SELECT user_id,
         login_date
         -- , ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date) AS rn
  FROM   logins
),
grouped AS (
  SELECT user_id,
         login_date
         -- , login_date - (rn * INTERVAL '1 day') AS streak_anchor
  FROM   numbered
),
streaks AS (
  SELECT user_id
         -- , streak_anchor
         -- , COUNT(*) AS streak_len
  FROM   grouped
  GROUP  BY user_id  -- , streak_anchor
)
SELECT user_id
       -- , MAX(streak_len) AS longest_streak
FROM   streaks
GROUP  BY user_id
ORDER  BY user_id;`,
  },

  // 10. MEDIUM — Missing dates in series
  "missing-dates-in-series": {
    kind: "sql",
    match: "ordered", // sorted by missing_date
    setupSql: `
      CREATE TABLE daily_metrics (
        metric_date DATE,
        value       NUMERIC(10, 2)
      );

      INSERT INTO daily_metrics VALUES
        ('2024-11-01', 100.0),
        ('2024-11-02', 110.0),
        ('2024-11-04',  90.0),
        ('2024-11-07', 105.0),
        ('2024-11-08', 120.0);
    `,
    expectedRows: [
      { missing_date: "2024-11-03" },
      { missing_date: "2024-11-05" },
      { missing_date: "2024-11-06" },
    ],
    starterCode: `-- Find dates between MIN(metric_date) and MAX(metric_date) that are missing
-- from daily_metrics.
-- Strategy: build a full date spine via generate_series(), then anti-join to
-- daily_metrics (LEFT JOIN ... WHERE m.metric_date IS NULL).
WITH bounds AS (
  SELECT MIN(metric_date) AS start_date,
         MAX(metric_date) AS end_date
  FROM   daily_metrics
),
date_spine AS (
  SELECT generate_series(b.start_date, b.end_date, INTERVAL '1 day')::DATE
           AS spine_date
  FROM   bounds b
)
SELECT s.spine_date AS missing_date
FROM   date_spine s
-- LEFT JOIN daily_metrics m ON m.metric_date = s.spine_date
-- WHERE  m.metric_date IS NULL
ORDER  BY missing_date;`,
  },
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
      console.warn(`  ⚠  ${slug}: no row matches — has seed-sql-warehouse run?`);
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
    `Note: scd-type-1-merge-upsert and scd-type-2-merge intentionally not authored — they are mutation problems, not SELECT problems, and don't fit the result-row test harness.`,
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
