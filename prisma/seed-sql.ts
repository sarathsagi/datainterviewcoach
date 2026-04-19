import { PrismaClient, PracticeCategory, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Shared Schema Context ────────────────────────────────────────────────────
// Most questions use this e-commerce + HR schema so the context feels consistent.

const ECOMMERCE_SCHEMA = `
**Tables available:**

\`\`\`sql
-- customers
customers (
  customer_id   BIGINT PRIMARY KEY,
  name          VARCHAR,
  email         VARCHAR,
  country       VARCHAR,
  plan          VARCHAR,   -- 'free' | 'pro' | 'enterprise'
  created_at    TIMESTAMP
)

-- products
products (
  product_id    BIGINT PRIMARY KEY,
  name          VARCHAR,
  category      VARCHAR,
  price         DECIMAL(10,2)
)

-- orders
orders (
  order_id      BIGINT PRIMARY KEY,
  customer_id   BIGINT,
  product_id    BIGINT,
  quantity      INT,
  amount        DECIMAL(10,2),
  status        VARCHAR,   -- 'completed' | 'pending' | 'refunded' | 'cancelled'
  created_at    TIMESTAMP
)

-- events (clickstream)
events (
  event_id      BIGINT PRIMARY KEY,
  user_id       BIGINT,
  session_id    VARCHAR,
  event_type    VARCHAR,   -- 'page_view' | 'add_to_cart' | 'checkout' | 'purchase'
  page          VARCHAR,
  created_at    TIMESTAMP
)
\`\`\`
`;

const HR_SCHEMA = `
**Tables available:**

\`\`\`sql
employees (
  emp_id        BIGINT PRIMARY KEY,
  name          VARCHAR,
  department    VARCHAR,
  salary        DECIMAL(10,2),
  manager_id    BIGINT,        -- self-referencing FK to emp_id
  hire_date     DATE
)
\`\`\`
`;

const SCD_SCHEMA = `
**Tables available:**

\`\`\`sql
-- SCD Type 2 dimension table
dim_customers (
  surrogate_key  BIGINT PRIMARY KEY,
  customer_id    BIGINT,        -- natural key
  name           VARCHAR,
  email          VARCHAR,
  plan           VARCHAR,
  effective_from DATE,
  effective_to   DATE,          -- NULL means current record
  is_current     BOOLEAN
)

-- fact table
fact_orders (
  order_id       BIGINT PRIMARY KEY,
  customer_id    BIGINT,        -- natural key
  amount         DECIMAL(10,2),
  order_date     DATE
)
\`\`\`
`;

const SUBSCRIPTION_SCHEMA = `
**Tables available:**

\`\`\`sql
-- User subscription periods
subscriptions (
  sub_id       BIGINT PRIMARY KEY,
  user_id      BIGINT,
  start_date   DATE,
  end_date     DATE
)
\`\`\`
`;

const sqlQuestions = [
  // ═══════════════════════════════════════════════
  // EASY (12)
  // ═══════════════════════════════════════════════
  {
    slug: "top-customers-by-revenue",
    title: "Top 10 Customers by Revenue",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Find the **top 10 customers** by total revenue from **completed orders only**.

Return: \`customer_id\`, \`name\`, \`email\`, \`total_orders\` (count), \`total_revenue\` (sum of amount).

Order by \`total_revenue\` descending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "JOIN the customers and orders tables on customer_id.",
      "Use WHERE status = 'completed' to filter to completed orders only.",
      "GROUP BY customer_id, name, email — then aggregate COUNT and SUM.",
      "Use ORDER BY total_revenue DESC LIMIT 10 at the end.",
    ],
    solution: `SELECT
  c.customer_id,
  c.name,
  c.email,
  COUNT(o.order_id)   AS total_orders,
  SUM(o.amount)       AS total_revenue
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.customer_id, c.name, c.email
ORDER BY total_revenue DESC
LIMIT 10;`,
    explanation: `We JOIN customers → orders on the foreign key, filter to completed orders with WHERE, aggregate with COUNT/SUM per customer, then ORDER BY revenue and LIMIT 10. In a warehouse context you'd push the LIMIT into a QUALIFY with RANK() to make it composable.`,
    tags: ["join", "aggregation", "group-by", "filter"],
    order: 1,
  },
  {
    slug: "departments-above-avg-salary",
    title: "Departments Above Average Salary",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Find all departments where the **average salary is greater than $85,000**.

Return: \`department\`, \`avg_salary\` (rounded to 2 decimal places), \`employee_count\`.

Order by \`avg_salary\` descending.`,
    context: HR_SCHEMA,
    hints: [
      "GROUP BY department and use AVG(salary).",
      "To filter on an aggregated value, use HAVING — not WHERE.",
      "Use ROUND(AVG(salary), 2) for clean output.",
    ],
    solution: `SELECT
  department,
  ROUND(AVG(salary), 2) AS avg_salary,
  COUNT(*)              AS employee_count
FROM employees
GROUP BY department
HAVING AVG(salary) > 85000
ORDER BY avg_salary DESC;`,
    explanation: `HAVING filters on the result of aggregate functions — that's the key distinction from WHERE, which filters individual rows before grouping. Always use HAVING for post-aggregation filters.`,
    tags: ["aggregation", "having", "group-by"],
    order: 2,
  },
  {
    slug: "customers-with-no-orders",
    title: "Customers With No Orders",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Find all customers who have **never placed an order**.

Return: \`customer_id\`, \`name\`, \`email\`, \`created_at\`.

Order by \`created_at\` ascending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Use a LEFT JOIN from customers → orders.",
      "After a LEFT JOIN, rows with no match in orders will have NULL for order columns.",
      "Filter with WHERE o.order_id IS NULL to keep only unmatched customers.",
      "Alternatively, use NOT EXISTS or NOT IN — LEFT JOIN + IS NULL is typically the most performant.",
    ],
    solution: `-- Method 1: LEFT JOIN + IS NULL (most common in interviews)
SELECT
  c.customer_id,
  c.name,
  c.email,
  c.created_at
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id
WHERE o.order_id IS NULL
ORDER BY c.created_at;

-- Method 2: NOT EXISTS (semantically clearest)
SELECT customer_id, name, email, created_at
FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id
)
ORDER BY created_at;`,
    explanation: `LEFT JOIN returns all customers even if there's no matching order. When there's no match, all order columns are NULL. Filtering on WHERE order_id IS NULL isolates customers with zero orders. NOT EXISTS is often more readable and equally performant with proper indexes.`,
    tags: ["join", "left-join", "null", "anti-join"],
    order: 3,
  },
  {
    slug: "monthly-revenue-trend",
    title: "Monthly Revenue Trend",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Calculate **total revenue per month** for completed orders.

Return: \`year\`, \`month\`, \`revenue\`, \`order_count\`.

Order by year and month ascending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Extract year and month from created_at using DATE_TRUNC or EXTRACT.",
      "Filter to status = 'completed' first.",
      "GROUP BY the extracted year and month values.",
    ],
    solution: `SELECT
  EXTRACT(YEAR  FROM created_at) AS year,
  EXTRACT(MONTH FROM created_at) AS month,
  SUM(amount)                    AS revenue,
  COUNT(order_id)                AS order_count
FROM orders
WHERE status = 'completed'
GROUP BY
  EXTRACT(YEAR  FROM created_at),
  EXTRACT(MONTH FROM created_at)
ORDER BY year, month;

-- Cleaner alternative using DATE_TRUNC (BigQuery: DATE_TRUNC(created_at, MONTH))
SELECT
  DATE_TRUNC('month', created_at) AS month_start,
  SUM(amount)                     AS revenue,
  COUNT(order_id)                 AS order_count
FROM orders
WHERE status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month_start;`,
    explanation: `DATE_TRUNC is the cleanest approach — it truncates a timestamp to the start of the month (e.g. 2024-03-15 → 2024-03-01). EXTRACT gives you individual year/month integers which are useful when you need separate columns. In BigQuery use DATE_TRUNC(col, MONTH); in Snowflake DATE_TRUNC('MONTH', col).`,
    tags: ["date-functions", "aggregation", "group-by", "time-series"],
    order: 4,
  },
  {
    slug: "find-duplicate-emails",
    title: "Find Duplicate Email Addresses",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Find all **email addresses that appear more than once** in the customers table.

Return: \`email\`, \`duplicate_count\`, \`earliest_created_at\`.

Order by \`duplicate_count\` descending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "GROUP BY email and use COUNT(*) to find how many times each appears.",
      "Use HAVING COUNT(*) > 1 to keep only duplicates.",
      "Use MIN(created_at) to get the earliest record.",
    ],
    solution: `SELECT
  email,
  COUNT(*)       AS duplicate_count,
  MIN(created_at) AS earliest_created_at
FROM customers
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;`,
    explanation: `This is a classic deduplication detection pattern. GROUP BY the candidate key (email), count occurrences, filter on HAVING. In a DE context you'd then use ROW_NUMBER() to keep only one record per email — see the 'Latest Record Per Group' problem for that next step.`,
    tags: ["aggregation", "having", "deduplication"],
    order: 5,
  },
  {
    slug: "revenue-by-order-status",
    title: "Revenue Breakdown by Order Status",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Show the **total revenue and order count broken down by order status**.

Also calculate each status's **percentage of total revenue** (rounded to 1 decimal place).

Return: \`status\`, \`order_count\`, \`revenue\`, \`revenue_pct\`.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "GROUP BY status to get per-status totals.",
      "To get the percentage, divide each status revenue by the overall total.",
      "Use a window function SUM(SUM(amount)) OVER () to get the grand total without a subquery.",
    ],
    solution: `SELECT
  status,
  COUNT(*)                                              AS order_count,
  SUM(amount)                                           AS revenue,
  ROUND(
    100.0 * SUM(amount) / SUM(SUM(amount)) OVER (),
    1
  )                                                     AS revenue_pct
FROM orders
GROUP BY status
ORDER BY revenue DESC;`,
    explanation: `SUM(SUM(amount)) OVER () is a window function applied on top of the GROUP BY result — the inner SUM aggregates per group, the outer SUM OVER () adds them all up across all groups. This avoids a self-join or subquery to get the grand total. Interviewers love seeing this pattern.`,
    tags: ["aggregation", "window-functions", "percentage"],
    order: 6,
  },
  {
    slug: "orders-last-30-days",
    title: "Orders Placed in the Last 30 Days",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Find all **completed orders placed in the last 30 days**.

Return: \`order_id\`, \`customer_id\`, \`amount\`, \`created_at\`.

Also add a column \`days_ago\` showing how many days ago the order was placed (integer).

Order by \`created_at\` descending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Filter with WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'.",
      "Use DATE_DIFF or EXTRACT(DAY FROM NOW() - created_at) for days_ago.",
    ],
    solution: `SELECT
  order_id,
  customer_id,
  amount,
  created_at,
  EXTRACT(DAY FROM NOW() - created_at)::INT AS days_ago
FROM orders
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- BigQuery version:
-- WHERE status = 'completed'
--   AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)`,
    explanation: `Relative date filtering is foundational. Use NOW() - INTERVAL '30 days' in PostgreSQL/Snowflake, DATEADD(DAY, -30, GETDATE()) in SQL Server, TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY) in BigQuery. Always be aware of the dialect you're being asked about.`,
    tags: ["date-functions", "filter", "interval"],
    order: 7,
  },
  {
    slug: "email-domain-extraction",
    title: "Most Common Email Domains",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Extract the **domain from each customer's email** (the part after @) and count how many customers use each domain.

Return: \`domain\`, \`customer_count\`.

Show only domains with **more than 5 customers**, ordered by \`customer_count\` descending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Use SPLIT_PART(email, '@', 2) in PostgreSQL/Snowflake to extract the domain.",
      "In BigQuery use SPLIT(email, '@')[SAFE_OFFSET(1)].",
      "GROUP BY the extracted domain and filter with HAVING COUNT(*) > 5.",
    ],
    solution: `-- PostgreSQL / Snowflake
SELECT
  SPLIT_PART(email, '@', 2) AS domain,
  COUNT(*)                  AS customer_count
FROM customers
GROUP BY SPLIT_PART(email, '@', 2)
HAVING COUNT(*) > 5
ORDER BY customer_count DESC;

-- BigQuery
SELECT
  SPLIT(email, '@')[SAFE_OFFSET(1)] AS domain,
  COUNT(*)                          AS customer_count
FROM customers
GROUP BY 1
HAVING COUNT(*) > 5
ORDER BY customer_count DESC;`,
    explanation: `String parsing is tested often. SPLIT_PART is the most concise in PostgreSQL/Snowflake. Know the equivalent for your target platform. The pattern of extract → group → filter with HAVING is reusable for any derived categorical column.`,
    tags: ["string-functions", "aggregation", "having"],
    order: 8,
  },
  {
    slug: "categorize-orders-by-size",
    title: "Categorize Orders by Size",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Classify each order into a size bucket using CASE WHEN:
- **Small**: amount < $50
- **Medium**: $50–$199.99
- **Large**: $200–$999.99
- **Enterprise**: $1,000+

Return: \`bucket\`, \`order_count\`, \`total_revenue\`, \`avg_order_value\` (rounded to 2 dp).

Include all orders regardless of status.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Use CASE WHEN amount < 50 THEN 'Small' ... END inside the SELECT.",
      "Wrap it in a subquery or CTE, then GROUP BY bucket.",
      "Or use CASE WHEN directly inside GROUP BY.",
    ],
    solution: `SELECT
  CASE
    WHEN amount < 50      THEN 'Small'
    WHEN amount < 200     THEN 'Medium'
    WHEN amount < 1000    THEN 'Large'
    ELSE                       'Enterprise'
  END                         AS bucket,
  COUNT(*)                    AS order_count,
  SUM(amount)                 AS total_revenue,
  ROUND(AVG(amount), 2)       AS avg_order_value
FROM orders
GROUP BY 1
ORDER BY MIN(amount);`,
    explanation: `CASE WHEN inside GROUP BY 1 groups on the derived expression without repeating it. The ORDER BY MIN(amount) ensures buckets appear in ascending value order — a clean trick to order non-numeric labels by their underlying values.`,
    tags: ["case-when", "aggregation", "group-by"],
    order: 9,
  },
  {
    slug: "daily-active-users",
    title: "Daily Active Users (DAU)",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Calculate **Daily Active Users (DAU)** — the number of distinct users who had at least one event on each day.

Return: \`event_date\`, \`dau\`.

Show the last 14 days only, ordered by \`event_date\` ascending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Cast/truncate created_at to a date using DATE_TRUNC or CAST.",
      "Use COUNT(DISTINCT user_id) to count unique users per day.",
      "Filter with WHERE created_at >= CURRENT_DATE - 14.",
    ],
    solution: `SELECT
  DATE_TRUNC('day', created_at)::DATE  AS event_date,
  COUNT(DISTINCT user_id)              AS dau
FROM events
WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
GROUP BY DATE_TRUNC('day', created_at)::DATE
ORDER BY event_date;`,
    explanation: `DAU is one of the most common product metrics. The key is COUNT(DISTINCT user_id) — counting total events would count the same user multiple times. DATE_TRUNC to day removes the time component so all events on the same day group together. This query is the base for many downstream metrics (WAU, MAU, stickiness ratios).`,
    tags: ["aggregation", "count-distinct", "date-functions", "metrics"],
    order: 10,
  },
  {
    slug: "product-revenue-by-category",
    title: "Product Revenue by Category",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `Show **total revenue per product category** from completed orders.

Include the **average order value** and the **number of distinct products sold** per category.

Return: \`category\`, \`total_revenue\`, \`avg_order_value\`, \`distinct_products_sold\`.

Order by \`total_revenue\` descending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "JOIN orders → products on product_id.",
      "Filter to status = 'completed'.",
      "GROUP BY p.category and aggregate SUM, AVG, COUNT(DISTINCT).",
    ],
    solution: `SELECT
  p.category,
  SUM(o.amount)              AS total_revenue,
  ROUND(AVG(o.amount), 2)   AS avg_order_value,
  COUNT(DISTINCT o.product_id) AS distinct_products_sold
FROM orders o
JOIN products p ON o.product_id = p.product_id
WHERE o.status = 'completed'
GROUP BY p.category
ORDER BY total_revenue DESC;`,
    explanation: `Multi-table JOIN with per-group aggregation is the most common SQL pattern in analytics. Note COUNT(DISTINCT product_id) vs COUNT(product_id) — the former counts unique products, the latter counts total order lines. Always clarify "distinct" vs "total" with your interviewer.`,
    tags: ["join", "aggregation", "count-distinct"],
    order: 11,
  },
  {
    slug: "new-vs-returning-customers",
    title: "New vs Returning Customers Per Month",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.EASY,
    description: `For each month, count the number of **new customers** (first order ever) vs **returning customers** (have ordered before).

Return: \`order_month\`, \`new_customers\`, \`returning_customers\`.

Order by \`order_month\` ascending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "First, find each customer's very first order date using MIN(created_at).",
      "Then for each order, compare its month to the customer's first order month.",
      "If it matches → new customer that month. If different → returning.",
      "Use a CTE or subquery to get the first_order_date per customer.",
    ],
    solution: `WITH first_orders AS (
  SELECT
    customer_id,
    DATE_TRUNC('month', MIN(created_at)) AS first_order_month
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
),
monthly_orders AS (
  SELECT
    o.customer_id,
    DATE_TRUNC('month', o.created_at) AS order_month,
    fo.first_order_month
  FROM orders o
  JOIN first_orders fo ON o.customer_id = fo.customer_id
  WHERE o.status = 'completed'
)
SELECT
  order_month,
  COUNT(DISTINCT CASE WHEN order_month = first_order_month THEN customer_id END) AS new_customers,
  COUNT(DISTINCT CASE WHEN order_month != first_order_month THEN customer_id END) AS returning_customers
FROM monthly_orders
GROUP BY order_month
ORDER BY order_month;`,
    explanation: `This uses a CTE to pre-compute each customer's acquisition month, then a conditional COUNT(DISTINCT) to split new vs returning. The CASE WHEN inside COUNT(DISTINCT ...) returns the customer_id only when the condition is true, NULL otherwise — and COUNT ignores NULLs. This is a very common product analytics pattern.`,
    tags: ["cte", "conditional-aggregation", "join", "cohort"],
    order: 12,
  },

  // ═══════════════════════════════════════════════
  // MEDIUM (15)
  // ═══════════════════════════════════════════════
  {
    slug: "running-total-daily-revenue",
    title: "Running Total of Daily Revenue",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Calculate the **running (cumulative) total of completed order revenue** by day.

Return: \`order_date\`, \`daily_revenue\`, \`running_total\`.

Show only the current calendar month, ordered by \`order_date\` ascending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "First aggregate daily revenue with GROUP BY.",
      "Then apply SUM(...) OVER (ORDER BY order_date) as a window function.",
      "Use a CTE to separate the aggregation from the window function.",
    ],
    solution: `WITH daily AS (
  SELECT
    DATE_TRUNC('day', created_at)::DATE AS order_date,
    SUM(amount)                         AS daily_revenue
  FROM orders
  WHERE status = 'completed'
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY DATE_TRUNC('day', created_at)::DATE
)
SELECT
  order_date,
  daily_revenue,
  SUM(daily_revenue) OVER (ORDER BY order_date) AS running_total
FROM daily
ORDER BY order_date;`,
    explanation: `SUM(...) OVER (ORDER BY date) is the canonical running total pattern. The OVER (ORDER BY) clause means "sum everything from the first row up to and including this row." Separating the GROUP BY aggregation into a CTE first keeps the code readable and avoids nesting window functions inside GROUP BY.`,
    tags: ["window-functions", "running-total", "cte", "time-series"],
    order: 13,
  },
  {
    slug: "top-3-products-per-category",
    title: "Top 3 Products per Category",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Find the **top 3 products by total revenue within each category** (completed orders only).

Return: \`category\`, \`product_name\`, \`total_revenue\`, \`rank_in_category\`.

Include all categories, ordered by category and rank.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "JOIN orders → products, filter to completed.",
      "GROUP BY category and product to get revenue per product.",
      "Use RANK() or DENSE_RANK() OVER (PARTITION BY category ORDER BY revenue DESC) to rank within category.",
      "Wrap in a CTE and filter WHERE rank <= 3.",
    ],
    solution: `WITH product_revenue AS (
  SELECT
    p.category,
    p.name                AS product_name,
    SUM(o.amount)         AS total_revenue
  FROM orders o
  JOIN products p ON o.product_id = p.product_id
  WHERE o.status = 'completed'
  GROUP BY p.category, p.name
),
ranked AS (
  SELECT
    *,
    RANK() OVER (PARTITION BY category ORDER BY total_revenue DESC) AS rank_in_category
  FROM product_revenue
)
SELECT category, product_name, total_revenue, rank_in_category
FROM ranked
WHERE rank_in_category <= 3
ORDER BY category, rank_in_category;`,
    explanation: `PARTITION BY category restarts the rank counter for each category. RANK() vs DENSE_RANK(): RANK leaves gaps after ties (1,2,2,4), DENSE_RANK doesn't (1,2,2,3). If you want exactly 3 per category even with ties, use ROW_NUMBER(). This "top-N per group" pattern with RANK + CTE filter is one of the most frequently asked SQL interview patterns.`,
    tags: ["window-functions", "rank", "partition-by", "cte", "top-n"],
    order: 14,
  },
  {
    slug: "nth-highest-salary",
    title: "Find the Nth Highest Salary",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Write a query to find the **3rd highest distinct salary** across all employees.

Then generalize it: show the **top 5 distinct salaries with their rank**.`,
    context: HR_SCHEMA,
    hints: [
      "Use DENSE_RANK() to rank distinct salary values.",
      "DENSE_RANK ensures no gaps — 3rd highest is always rank 3 even if multiple employees share rank 2.",
      "Filter with WHERE dense_rank_val = 3 for the specific case.",
    ],
    solution: `-- Specific: 3rd highest salary
WITH ranked_salaries AS (
  SELECT
    salary,
    DENSE_RANK() OVER (ORDER BY salary DESC) AS salary_rank
  FROM employees
)
SELECT DISTINCT salary, salary_rank
FROM ranked_salaries
WHERE salary_rank = 3;

-- General: top 5 distinct salaries with rank
SELECT DISTINCT
  salary,
  DENSE_RANK() OVER (ORDER BY salary DESC) AS salary_rank
FROM employees
WHERE DENSE_RANK() OVER (ORDER BY salary DESC) <= 5  -- Note: this doesn't work directly
ORDER BY salary_rank;

-- Correct general approach using CTE:
WITH ranked AS (
  SELECT DISTINCT
    salary,
    DENSE_RANK() OVER (ORDER BY salary DESC) AS salary_rank
  FROM employees
)
SELECT salary, salary_rank
FROM ranked
WHERE salary_rank <= 5
ORDER BY salary_rank;`,
    explanation: `DENSE_RANK() gives consecutive rank numbers with no gaps for tied values. You can't filter on a window function in the same SELECT where it's defined — always wrap in a CTE or subquery first. This is a classic interview question that tests whether candidates know DENSE_RANK vs RANK vs ROW_NUMBER.`,
    tags: ["window-functions", "dense-rank", "distinct"],
    order: 15,
  },
  {
    slug: "seven-day-rolling-average",
    title: "7-Day Rolling Average of DAU",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Calculate the **7-day rolling average of Daily Active Users (DAU)**.

Return: \`event_date\`, \`dau\`, \`rolling_7d_avg\` (rounded to 1 decimal).

Order by \`event_date\` ascending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "First calculate DAU per day using COUNT(DISTINCT user_id).",
      "Then apply AVG(dau) OVER (ORDER BY event_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW).",
      "ROWS BETWEEN 6 PRECEDING AND CURRENT ROW means this row + the 6 previous = 7 rows.",
    ],
    solution: `WITH daily_active AS (
  SELECT
    DATE_TRUNC('day', created_at)::DATE AS event_date,
    COUNT(DISTINCT user_id)             AS dau
  FROM events
  GROUP BY DATE_TRUNC('day', created_at)::DATE
)
SELECT
  event_date,
  dau,
  ROUND(
    AVG(dau) OVER (
      ORDER BY event_date
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ),
    1
  ) AS rolling_7d_avg
FROM daily_active
ORDER BY event_date;`,
    explanation: `The ROWS BETWEEN 6 PRECEDING AND CURRENT ROW frame clause defines a 7-row window. Unlike the default RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, ROWS uses physical rows not values — this matters for date gaps. For the first 6 days, the average is calculated on fewer than 7 rows (no null padding). To exclude those early rows, wrap in a CTE and filter WHERE event_date >= MIN(event_date) + INTERVAL '6 days'.`,
    tags: ["window-functions", "rolling-average", "frames", "dau"],
    order: 16,
  },
  {
    slug: "year-over-year-revenue-growth",
    title: "Year-over-Year Revenue Growth",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Calculate **month-over-month revenue** and the **year-over-year (YoY) percentage growth** for each month.

Return: \`year\`, \`month\`, \`revenue\`, \`prev_year_revenue\`, \`yoy_growth_pct\` (rounded to 1 dp).`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "First aggregate monthly revenue per year.",
      "Use LAG(revenue, 12) OVER (ORDER BY year, month) to look back 12 months.",
      "YoY growth = (current - previous) / previous * 100.",
      "Handle NULL for the first 12 months (no prior year data).",
    ],
    solution: `WITH monthly AS (
  SELECT
    EXTRACT(YEAR  FROM created_at)::INT  AS year,
    EXTRACT(MONTH FROM created_at)::INT  AS month,
    SUM(amount)                          AS revenue
  FROM orders
  WHERE status = 'completed'
  GROUP BY 1, 2
),
with_lag AS (
  SELECT
    year,
    month,
    revenue,
    LAG(revenue, 12) OVER (ORDER BY year, month) AS prev_year_revenue
  FROM monthly
)
SELECT
  year,
  month,
  revenue,
  prev_year_revenue,
  ROUND(
    100.0 * (revenue - prev_year_revenue) / NULLIF(prev_year_revenue, 0),
    1
  ) AS yoy_growth_pct
FROM with_lag
ORDER BY year, month;`,
    explanation: `LAG(revenue, 12) looks back 12 rows in the ORDER BY year, month sequence — which corresponds to exactly 12 months prior. NULLIF(prev_year_revenue, 0) prevents division-by-zero errors. The first 12 months will have NULL for prev_year_revenue and yoy_growth_pct since there's no prior year data. This pattern is reusable for any period-over-period comparison.`,
    tags: ["window-functions", "lag", "yoy", "time-series"],
    order: 17,
  },
  {
    slug: "deduplicate-latest-record",
    title: "Deduplicate — Keep Latest Record per User",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `The \`customers\` table has **duplicate rows** for some customers (same customer_id, different created_at due to re-ingestion bugs).

Write a query to **keep only the most recent record per customer_id** and discard all others.

Return all columns from the deduplicated result.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Use ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) to number rows per customer.",
      "Row numbered 1 is the latest record for each customer.",
      "Filter WHERE row_num = 1 in an outer CTE or subquery.",
    ],
    solution: `WITH ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id
      ORDER BY created_at DESC
    ) AS row_num
  FROM customers
)
SELECT customer_id, name, email, country, plan, created_at
FROM ranked
WHERE row_num = 1;`,
    explanation: `ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC) assigns 1 to the most recent row per customer. Filtering on row_num = 1 keeps exactly one row per customer — unlike RANK() or DENSE_RANK() which would keep tied rows. This is the industry-standard deduplication pattern used in every production data pipeline.`,
    tags: ["window-functions", "row-number", "deduplication", "partition-by"],
    order: 18,
  },
  {
    slug: "funnel-conversion-analysis",
    title: "Funnel Conversion Analysis",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Using the events table, calculate the **conversion rate between each step of the purchase funnel**:

\`page_view → add_to_cart → checkout → purchase\`

Return: \`funnel_step\`, \`users\`, \`conversion_from_previous\` (%), \`conversion_from_top\` (%).`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Use COUNT(DISTINCT user_id) for each event_type to count unique users at each step.",
      "Conditional aggregation with CASE WHEN or filtered subqueries work well here.",
      "Divide by the top-of-funnel (page_view) count for conversion from top.",
      "Divide by the previous step count for step-by-step conversion.",
    ],
    solution: `WITH funnel AS (
  SELECT
    COUNT(DISTINCT CASE WHEN event_type = 'page_view'   THEN user_id END) AS page_views,
    COUNT(DISTINCT CASE WHEN event_type = 'add_to_cart' THEN user_id END) AS add_to_carts,
    COUNT(DISTINCT CASE WHEN event_type = 'checkout'    THEN user_id END) AS checkouts,
    COUNT(DISTINCT CASE WHEN event_type = 'purchase'    THEN user_id END) AS purchases
  FROM events
)
SELECT
  step, users,
  ROUND(100.0 * users / LAG(users) OVER (ORDER BY step_order), 1) AS conv_from_prev,
  ROUND(100.0 * users / FIRST_VALUE(users) OVER (ORDER BY step_order), 1) AS conv_from_top
FROM (
  SELECT 1 AS step_order, 'page_view'   AS step, page_views   AS users FROM funnel
  UNION ALL
  SELECT 2, 'add_to_cart', add_to_carts FROM funnel
  UNION ALL
  SELECT 3, 'checkout',    checkouts    FROM funnel
  UNION ALL
  SELECT 4, 'purchase',    purchases    FROM funnel
) steps;`,
    explanation: `Conditional COUNT(DISTINCT) inside a single pass is efficient — one scan of the events table gives all funnel counts. Unpivoting with UNION ALL then lets us apply LAG and FIRST_VALUE as window functions over the ordered funnel steps. In BigQuery/Snowflake you can also use COUNTIF() instead of COUNT(DISTINCT CASE WHEN ...).`,
    tags: ["funnel", "conditional-aggregation", "window-functions", "product-analytics"],
    order: 19,
  },
  {
    slug: "cohort-retention-analysis",
    title: "Monthly Cohort Retention",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Calculate **30-day and 60-day retention** for customers acquired each month.

A customer is "retained at day 30" if they placed another order between day 1 and day 30 after their first order.

Return: \`cohort_month\`, \`cohort_size\`, \`retained_day30\`, \`retention_day30_pct\`, \`retained_day60\`, \`retention_day60_pct\`.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Find each customer's first order date (acquisition event).",
      "Then look for subsequent orders within 30 or 60 days of that first order.",
      "Use COUNT(DISTINCT ...) with a date condition to count retained customers.",
      "Group by the month of the first order to get cohorts.",
    ],
    solution: `WITH first_orders AS (
  SELECT
    customer_id,
    MIN(created_at)                        AS first_order_at,
    DATE_TRUNC('month', MIN(created_at))   AS cohort_month
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
),
retention AS (
  SELECT
    f.customer_id,
    f.cohort_month,
    MAX(CASE WHEN o.created_at BETWEEN f.first_order_at + INTERVAL '1 day'
                                   AND f.first_order_at + INTERVAL '30 days'
             THEN 1 ELSE 0 END) AS retained_30,
    MAX(CASE WHEN o.created_at BETWEEN f.first_order_at + INTERVAL '1 day'
                                   AND f.first_order_at + INTERVAL '60 days'
             THEN 1 ELSE 0 END) AS retained_60
  FROM first_orders f
  LEFT JOIN orders o
    ON f.customer_id = o.customer_id
   AND o.status = 'completed'
   AND o.created_at > f.first_order_at
  GROUP BY f.customer_id, f.cohort_month
)
SELECT
  cohort_month,
  COUNT(*)                            AS cohort_size,
  SUM(retained_30)                    AS retained_day30,
  ROUND(100.0 * SUM(retained_30) / COUNT(*), 1) AS retention_day30_pct,
  SUM(retained_60)                    AS retained_day60,
  ROUND(100.0 * SUM(retained_60) / COUNT(*), 1) AS retention_day60_pct
FROM retention
GROUP BY cohort_month
ORDER BY cohort_month;`,
    explanation: `Cohort retention is one of the most important product metrics. The pattern: (1) identify the acquisition event per user, (2) join back to activity within the retention window, (3) aggregate per cohort. MAX(CASE WHEN ... THEN 1 ELSE 0) per user gives a 1 if they had any activity in the window, 0 otherwise — then SUM gives the retained count.`,
    tags: ["cohort", "retention", "cte", "join", "product-analytics"],
    order: 20,
  },
  {
    slug: "employees-earning-more-than-manager",
    title: "Employees Earning More Than Their Manager",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Find all employees who **earn more than their direct manager**.

Return: \`employee_name\`, \`employee_salary\`, \`manager_name\`, \`manager_salary\`.

Order by the salary difference descending.`,
    context: HR_SCHEMA,
    hints: [
      "This requires a self-join on the employees table.",
      "Join employees (as emp) to employees (as mgr) on emp.manager_id = mgr.emp_id.",
      "Filter WHERE emp.salary > mgr.salary.",
    ],
    solution: `SELECT
  emp.name                        AS employee_name,
  emp.salary                      AS employee_salary,
  mgr.name                        AS manager_name,
  mgr.salary                      AS manager_salary,
  emp.salary - mgr.salary         AS salary_difference
FROM employees emp
JOIN employees mgr ON emp.manager_id = mgr.emp_id
WHERE emp.salary > mgr.salary
ORDER BY salary_difference DESC;`,
    explanation: `Self-join is the key concept — joining a table to itself using different aliases. emp represents the employee row, mgr represents their manager row. The join condition emp.manager_id = mgr.emp_id links each employee to their manager. Then simple WHERE filtering finds those who out-earn their boss.`,
    tags: ["self-join", "join", "filter"],
    order: 21,
  },
  {
    slug: "day-over-day-revenue-change",
    title: "Day-over-Day Revenue Change",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `For each day, show the **daily revenue** and the **absolute and percentage change from the prior day**.

Return: \`order_date\`, \`revenue\`, \`prev_day_revenue\`, \`change_abs\`, \`change_pct\` (rounded to 1 dp).`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Aggregate daily revenue first with GROUP BY.",
      "Use LAG(revenue, 1) OVER (ORDER BY order_date) for the previous day's value.",
      "Calculate the difference and percentage from those two columns.",
    ],
    solution: `WITH daily AS (
  SELECT
    DATE_TRUNC('day', created_at)::DATE AS order_date,
    SUM(amount)                         AS revenue
  FROM orders
  WHERE status = 'completed'
  GROUP BY DATE_TRUNC('day', created_at)::DATE
)
SELECT
  order_date,
  revenue,
  LAG(revenue) OVER (ORDER BY order_date)                                   AS prev_day_revenue,
  revenue - LAG(revenue) OVER (ORDER BY order_date)                          AS change_abs,
  ROUND(
    100.0 * (revenue - LAG(revenue) OVER (ORDER BY order_date))
           / NULLIF(LAG(revenue) OVER (ORDER BY order_date), 0),
    1
  )                                                                           AS change_pct
FROM daily
ORDER BY order_date;`,
    explanation: `LAG(revenue, 1) — the default offset is 1 so you can write LAG(revenue). Note LAG is computed 3 times; for efficiency, compute it once in the CTE. NULLIF prevents division by zero when prev_day_revenue is 0. This is the basis for any period-comparison metric.`,
    tags: ["window-functions", "lag", "time-series", "metrics"],
    order: 22,
  },
  {
    slug: "first-last-purchase-per-customer",
    title: "First and Last Purchase per Customer",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `For each customer, find their **first purchase date**, **last purchase date**, **total orders**, and **average days between orders**.

Return: \`customer_id\`, \`name\`, \`first_purchase\`, \`last_purchase\`, \`total_orders\`, \`avg_days_between_orders\` (rounded to 1 dp).

Only include customers with **more than 1 completed order**.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Use MIN(created_at) and MAX(created_at) for first and last purchase.",
      "Average days between orders = total date span / (order_count - 1).",
      "EXTRACT(DAY FROM max_date - min_date) / (count - 1) gives avg gap.",
      "Filter with HAVING COUNT(*) > 1.",
    ],
    solution: `SELECT
  c.customer_id,
  c.name,
  MIN(o.created_at)::DATE                        AS first_purchase,
  MAX(o.created_at)::DATE                        AS last_purchase,
  COUNT(o.order_id)                              AS total_orders,
  ROUND(
    EXTRACT(DAY FROM MAX(o.created_at) - MIN(o.created_at))
    / NULLIF(COUNT(o.order_id) - 1, 0),
    1
  )                                              AS avg_days_between_orders
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE o.status = 'completed'
GROUP BY c.customer_id, c.name
HAVING COUNT(o.order_id) > 1
ORDER BY total_orders DESC;`,
    explanation: `The avg days between orders formula is (last_date - first_date) / (count - 1). For 3 orders spanning 60 days: 60 / 2 = 30 days between orders. NULLIF(count - 1, 0) handles the edge case of exactly 1 order (though HAVING > 1 already removes those here). EXTRACT(DAY FROM interval) is PostgreSQL; in BigQuery use DATE_DIFF.`,
    tags: ["aggregation", "join", "date-functions", "having"],
    order: 23,
  },
  {
    slug: "ntile-order-buckets",
    title: "NTILE Revenue Quartiles",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Classify customers into **revenue quartiles** (Q1 = bottom 25%, Q4 = top 25%) based on their total completed order revenue.

Return: \`customer_id\`, \`name\`, \`total_revenue\`, \`quartile\` (1–4).

Order by \`total_revenue\` descending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "First calculate total revenue per customer in a CTE.",
      "Apply NTILE(4) OVER (ORDER BY total_revenue ASC) to assign quartile 1–4.",
      "NTILE(4) splits rows into 4 equally-sized buckets ordered by the column.",
    ],
    solution: `WITH customer_revenue AS (
  SELECT
    c.customer_id,
    c.name,
    SUM(o.amount) AS total_revenue
  FROM customers c
  JOIN orders o ON c.customer_id = o.customer_id
  WHERE o.status = 'completed'
  GROUP BY c.customer_id, c.name
)
SELECT
  customer_id,
  name,
  total_revenue,
  NTILE(4) OVER (ORDER BY total_revenue ASC) AS quartile
FROM customer_revenue
ORDER BY total_revenue DESC;`,
    explanation: `NTILE(N) divides the result set into N equal buckets and assigns each row a bucket number 1–N. ORDER BY ASC means Q1 = lowest revenue, Q4 = highest. Interviewers use quartile-based segmentation for customer LTV analysis — knowing NTILE is a useful differentiator.`,
    tags: ["window-functions", "ntile", "segmentation"],
    order: 24,
  },
  {
    slug: "purchase-gap-detection",
    title: "Detect Long Gaps Between Purchases",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `For each customer, find the **longest gap in days between consecutive orders** (completed only).

Return: \`customer_id\`, \`name\`, \`order_before\`, \`order_after\`, \`gap_days\`.

Show only gaps **greater than 90 days**, ordered by \`gap_days\` descending.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Use LAG(created_at) OVER (PARTITION BY customer_id ORDER BY created_at) to get the previous order date.",
      "Calculate the difference in days between consecutive orders.",
      "Filter for gaps > 90 days.",
    ],
    solution: `WITH ordered_purchases AS (
  SELECT
    o.customer_id,
    c.name,
    o.created_at::DATE                                          AS order_date,
    LAG(o.created_at::DATE) OVER (
      PARTITION BY o.customer_id
      ORDER BY o.created_at
    )                                                           AS prev_order_date
  FROM orders o
  JOIN customers c ON o.customer_id = c.customer_id
  WHERE o.status = 'completed'
)
SELECT
  customer_id,
  name,
  prev_order_date   AS order_before,
  order_date        AS order_after,
  order_date - prev_order_date AS gap_days
FROM ordered_purchases
WHERE prev_order_date IS NOT NULL
  AND (order_date - prev_order_date) > 90
ORDER BY gap_days DESC;`,
    explanation: `PARTITION BY customer_id ensures LAG restarts for each customer's sequence. Subtracting two DATE values in PostgreSQL gives an integer (days); in BigQuery use DATE_DIFF(after, before, DAY). This pattern is used in churn analysis — customers with gaps > N days are at-risk.`,
    tags: ["window-functions", "lag", "partition-by", "date-diff"],
    order: 25,
  },
  {
    slug: "conditional-pivot-by-month",
    title: "Pivot Monthly Revenue by Quarter",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Pivot the revenue data to show **each quarter as a column** for the last 2 years.

Return: \`year\`, \`q1_revenue\`, \`q2_revenue\`, \`q3_revenue\`, \`q4_revenue\`.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Use CASE WHEN EXTRACT(QUARTER FROM created_at) = 1 THEN amount END inside SUM().",
      "Repeat for Q2, Q3, Q4 — this is conditional aggregation, not a true PIVOT.",
      "GROUP BY EXTRACT(YEAR FROM created_at).",
    ],
    solution: `SELECT
  EXTRACT(YEAR FROM created_at)::INT AS year,
  SUM(CASE WHEN EXTRACT(QUARTER FROM created_at) = 1 THEN amount END) AS q1_revenue,
  SUM(CASE WHEN EXTRACT(QUARTER FROM created_at) = 2 THEN amount END) AS q2_revenue,
  SUM(CASE WHEN EXTRACT(QUARTER FROM created_at) = 3 THEN amount END) AS q3_revenue,
  SUM(CASE WHEN EXTRACT(QUARTER FROM created_at) = 4 THEN amount END) AS q4_revenue
FROM orders
WHERE status = 'completed'
  AND created_at >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '2 years')
GROUP BY EXTRACT(YEAR FROM created_at)::INT
ORDER BY year;`,
    explanation: `Conditional aggregation (SUM + CASE WHEN) is the ANSI-SQL way to pivot. True PIVOT syntax exists in SQL Server and Snowflake but isn't universal. This approach works in all dialects. EXTRACT(QUARTER ...) returns 1–4 directly. Interviewers test this to see if you can reshape data without a pivot table.`,
    tags: ["pivot", "conditional-aggregation", "case-when"],
    order: 26,
  },
  {
    slug: "sessionization",
    title: "Sessionize User Events (30-min Gap)",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.MEDIUM,
    description: `Assign a **session_number** to each user's events where a new session starts whenever the gap between consecutive events **exceeds 30 minutes**.

Return: \`user_id\`, \`event_id\`, \`created_at\`, \`session_number\`.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Use LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) to get previous event time.",
      "Flag each row as new_session = 1 if gap > 30 minutes (or it's the first event).",
      "Cumulative SUM of new_session gives the session number per user.",
    ],
    solution: `WITH flagged AS (
  SELECT
    user_id,
    event_id,
    created_at,
    CASE
      WHEN created_at - LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at)
           > INTERVAL '30 minutes'
        OR LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) IS NULL
      THEN 1
      ELSE 0
    END AS is_new_session
  FROM events
)
SELECT
  user_id,
  event_id,
  created_at,
  SUM(is_new_session) OVER (
    PARTITION BY user_id
    ORDER BY created_at
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS session_number
FROM flagged
ORDER BY user_id, created_at;`,
    explanation: `Sessionization = gaps-and-islands applied to time series. Step 1: flag each row as a session start (gap > threshold OR first event). Step 2: running SUM of the flag gives a session counter that increments on each new session. This is a very common pattern in clickstream and product analytics pipelines.`,
    tags: ["sessionization", "window-functions", "lag", "gaps-islands"],
    order: 27,
  },

  // ═══════════════════════════════════════════════
  // HARD (8)
  // ═══════════════════════════════════════════════
  {
    slug: "recursive-cte-org-hierarchy",
    title: "Full Org Hierarchy with Recursive CTE",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `Using a recursive CTE, find **all direct and indirect reports of a given manager** (e.g. emp_id = 1), showing their **depth level** in the hierarchy.

Return: \`emp_id\`, \`name\`, \`department\`, \`salary\`, \`depth\` (1 = direct report, 2 = report's report, etc.).

Order by \`depth\`, then \`name\`.`,
    context: HR_SCHEMA,
    hints: [
      "Recursive CTEs have two parts: an anchor (base case) and a recursive member joined with UNION ALL.",
      "Anchor: select direct reports of the root manager (manager_id = 1).",
      "Recursive: join employees to the previous iteration on manager_id = emp_id.",
      "Add depth + 1 in each recursive step.",
    ],
    solution: `WITH RECURSIVE org_tree AS (
  -- Anchor: direct reports of emp_id = 1
  SELECT
    emp_id,
    name,
    department,
    salary,
    manager_id,
    1 AS depth
  FROM employees
  WHERE manager_id = 1

  UNION ALL

  -- Recursive: their reports
  SELECT
    e.emp_id,
    e.name,
    e.department,
    e.salary,
    e.manager_id,
    ot.depth + 1
  FROM employees e
  JOIN org_tree ot ON e.manager_id = ot.emp_id
)
SELECT emp_id, name, department, salary, depth
FROM org_tree
ORDER BY depth, name;`,
    explanation: `Recursive CTEs are the only pure-SQL way to traverse hierarchies of unknown depth. The anchor runs once, the recursive member runs repeatedly joining to its own output until no new rows are produced. In production, always add a depth limit (WHERE depth <= 20) to prevent infinite loops from data cycles. Supported in PostgreSQL, Snowflake, BigQuery, SQL Server, and most modern warehouses.`,
    tags: ["recursive-cte", "hierarchy", "advanced"],
    order: 28,
  },
  {
    slug: "gaps-and-islands",
    title: "Gaps and Islands — Subscription Periods",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `Given a table of subscription periods per user, **merge overlapping or consecutive periods** into single continuous periods (islands), and **find any gaps** where the user had no active subscription.

First, show merged continuous periods. Then show gaps between periods.

Return for gaps: \`user_id\`, \`gap_start\`, \`gap_end\`, \`gap_days\`.`,
    context: SUBSCRIPTION_SCHEMA,
    hints: [
      "Sort periods by user_id and start_date. Use LAG to get the previous end_date.",
      "A gap exists where start_date > previous end_date + 1 day.",
      "To merge overlapping periods (islands): use a running MAX of end_date to detect when a period extends further than previous ones.",
      "This is a classic 'gaps and islands' problem — there are multiple approaches.",
    ],
    solution: `-- Step 1: Find gaps between subscription periods
WITH ordered AS (
  SELECT
    user_id,
    start_date,
    end_date,
    LAG(end_date) OVER (PARTITION BY user_id ORDER BY start_date) AS prev_end
  FROM subscriptions
),
gaps AS (
  SELECT
    user_id,
    prev_end + INTERVAL '1 day'   AS gap_start,
    start_date - INTERVAL '1 day' AS gap_end,
    start_date - prev_end - 1     AS gap_days
  FROM ordered
  WHERE start_date > prev_end + INTERVAL '1 day'
)
SELECT * FROM gaps ORDER BY user_id, gap_start;

-- Step 2: Merge overlapping/adjacent periods into islands
WITH sorted AS (
  SELECT
    user_id, start_date, end_date,
    CASE
      WHEN start_date <= LAG(end_date) OVER (PARTITION BY user_id ORDER BY start_date)
        + INTERVAL '1 day'
      THEN 0 ELSE 1
    END AS new_island
  FROM subscriptions
),
numbered AS (
  SELECT *,
    SUM(new_island) OVER (PARTITION BY user_id ORDER BY start_date) AS island_id
  FROM sorted
)
SELECT user_id, MIN(start_date) AS period_start, MAX(end_date) AS period_end
FROM numbered
GROUP BY user_id, island_id
ORDER BY user_id, period_start;`,
    explanation: `Gaps and islands is one of the hardest categories of SQL problems. Gaps: use LAG to find the previous period's end, then check if the next period starts more than 1 day later. Islands (merging overlaps): flag a new island whenever a period doesn't overlap with the previous, then use a running SUM to assign island IDs, then GROUP BY island. This pattern appears in subscription analytics, SLA tracking, and any time-series continuity analysis.`,
    tags: ["gaps-islands", "window-functions", "lag", "advanced", "time-series"],
    order: 29,
  },
  {
    slug: "median-without-function",
    title: "Calculate Median Without MEDIAN()",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `Calculate the **median order amount** per product category using only standard window functions — **without using any MEDIAN() function**.

Return: \`category\`, \`median_order_amount\`.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Use PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) if your dialect supports it (PostgreSQL, Snowflake).",
      "If not: use ROW_NUMBER() and COUNT() — the median is at position (n+1)/2 for odd counts, or average of n/2 and n/2+1 for even.",
      "PERCENTILE_CONT(0.5) is the most interviewer-friendly approach — show you know it exists.",
    ],
    solution: `-- Method 1: PERCENTILE_CONT (PostgreSQL, Snowflake, BigQuery)
SELECT
  p.category,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY o.amount) AS median_order_amount
FROM orders o
JOIN products p ON o.product_id = p.product_id
WHERE o.status = 'completed'
GROUP BY p.category
ORDER BY p.category;

-- Method 2: Row-number approach (works in any SQL dialect)
WITH ranked AS (
  SELECT
    p.category,
    o.amount,
    ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY o.amount) AS rn,
    COUNT(*) OVER (PARTITION BY p.category) AS total
  FROM orders o
  JOIN products p ON o.product_id = p.product_id
  WHERE o.status = 'completed'
)
SELECT
  category,
  AVG(amount) AS median_order_amount
FROM ranked
WHERE rn IN (FLOOR((total + 1) / 2.0), CEIL((total + 1) / 2.0))
GROUP BY category;`,
    explanation: `PERCENTILE_CONT(0.5) is the clean answer — it handles both odd and even counts, interpolating when needed. The row-number method works in all dialects: for odd N, the median is at row (N+1)/2; for even N, average rows N/2 and N/2+1. The FLOOR/CEIL trick selects both middle positions in one WHERE clause. Always mention PERCENTILE_CONT first, then offer the generic approach.`,
    tags: ["window-functions", "statistics", "percentile", "advanced"],
    order: 30,
  },
  {
    slug: "scd2-point-in-time-query",
    title: "Query SCD2 Table for Point-in-Time Value",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `The \`dim_customers\` table is a **Slowly Changing Dimension Type 2** table.

Write a query to join \`fact_orders\` with the correct **historical version of the customer record** — i.e., the customer's plan *at the time of the order*.

Return: \`order_id\`, \`order_date\`, \`customer_id\`, \`plan_at_order_time\`, \`amount\`.`,
    context: SCD_SCHEMA,
    hints: [
      "Join fact_orders to dim_customers on customer_id (natural key).",
      "Also join on order_date BETWEEN effective_from AND COALESCE(effective_to, '9999-12-31').",
      "This ensures you get the dimension row that was active when the order happened.",
    ],
    solution: `SELECT
  f.order_id,
  f.order_date,
  f.customer_id,
  d.plan      AS plan_at_order_time,
  f.amount
FROM fact_orders f
JOIN dim_customers d
  ON  f.customer_id = d.customer_id
  AND f.order_date  BETWEEN d.effective_from
                        AND COALESCE(d.effective_to, '9999-12-31'::DATE)
ORDER BY f.order_date;`,
    explanation: `The key SCD2 join pattern: join on the natural key AND the date range. COALESCE(effective_to, '9999-12-31') handles the current (open-ended) record. This query returns the customer attribute (plan) as it was when the order was placed — not their current plan. This is the fundamental reason SCD2 exists: to enable accurate historical analysis.`,
    tags: ["scd", "scd2", "join", "date-range", "data-warehouse"],
    order: 31,
  },
  {
    slug: "incremental-watermark-load",
    title: "Incremental Load with Watermark",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `You are building an incremental pipeline. A \`watermark\` table stores the last successful load timestamp per table.

Write a query to **extract only the orders modified since the last load**.

Then write the query to **update the watermark** after a successful load.

\`\`\`sql
-- watermark table
watermark (table_name VARCHAR, last_loaded_at TIMESTAMP)
\`\`\``,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Read the last_loaded_at for 'orders' from the watermark table using a subquery.",
      "Filter orders WHERE updated_at > (SELECT last_loaded_at FROM watermark WHERE table_name = 'orders').",
      "After loading, UPDATE watermark SET last_loaded_at = MAX(updated_at) from the extracted batch.",
      "Note: orders needs an updated_at column for this pattern to work.",
    ],
    solution: `-- Step 1: Extract records since last watermark
SELECT *
FROM orders
WHERE created_at > (
  SELECT last_loaded_at
  FROM watermark
  WHERE table_name = 'orders'
);

-- Step 2: With an updated_at column (more robust — catches updates not just inserts)
SELECT *
FROM orders
WHERE updated_at > (
  SELECT COALESCE(last_loaded_at, '1970-01-01'::TIMESTAMP)
  FROM watermark
  WHERE table_name = 'orders'
);

-- Step 3: Update watermark after successful load
UPDATE watermark
SET last_loaded_at = (SELECT MAX(updated_at) FROM orders)
WHERE table_name = 'orders';

-- Step 4: Initialize watermark if table doesn't exist yet
INSERT INTO watermark (table_name, last_loaded_at)
VALUES ('orders', '1970-01-01')
ON CONFLICT (table_name) DO NOTHING;`,
    explanation: `Watermark-based incremental loading is the foundation of most production ETL. The pattern: (1) read the last_loaded_at, (2) extract rows where updated_at > watermark, (3) load them to target, (4) update watermark to MAX(updated_at) of the batch. COALESCE with epoch handles first-run (null watermark). Critical caveat: this requires an updated_at column on the source — without it, updates are invisible. For tables without updated_at, you need CDC or full snapshots.`,
    tags: ["incremental-load", "watermark", "etl", "data-warehouse"],
    order: 32,
  },
  {
    slug: "rolling-distinct-count",
    title: "Rolling 7-Day Unique User Count",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `Calculate the **rolling 7-day unique user count** — i.e., for each day, count the number of distinct users who had at least one event in the **preceding 7 days** (including today).

Return: \`event_date\`, \`rolling_7d_unique_users\`.

> Note: This cannot be done with a simple AVG window — COUNT(DISTINCT) over a window frame is not supported in most SQL dialects. Explain how you'd approach it.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Standard window functions can't do COUNT(DISTINCT) over a frame — this is a known SQL limitation.",
      "Approach 1: Self-join — for each date, join to events within date-6 to date, then count distinct.",
      "Approach 2: Explode each event across 7 future dates, then count distinct per date.",
      "Approach 3: Use a probabilistic data structure (HLL) available in BigQuery/Snowflake.",
    ],
    solution: `-- Approach 1: Self-join (works, but expensive for large tables)
SELECT
  d.event_date,
  COUNT(DISTINCT e.user_id) AS rolling_7d_unique_users
FROM (
  SELECT DISTINCT DATE_TRUNC('day', created_at)::DATE AS event_date
  FROM events
) d
JOIN events e
  ON e.created_at::DATE BETWEEN d.event_date - INTERVAL '6 days' AND d.event_date
GROUP BY d.event_date
ORDER BY d.event_date;

-- Approach 2: Explode events across 7 days (more scalable with proper indexing)
WITH event_days AS (
  SELECT
    user_id,
    generate_series(
      DATE_TRUNC('day', created_at)::DATE,
      (DATE_TRUNC('day', created_at) + INTERVAL '6 days')::DATE,
      '1 day'
    )::DATE AS reporting_date
  FROM events
)
SELECT
  reporting_date,
  COUNT(DISTINCT user_id) AS rolling_7d_unique_users
FROM event_days
GROUP BY reporting_date
ORDER BY reporting_date;

-- Approach 3: BigQuery HyperLogLog (approximate, very fast)
-- SELECT date, HLL_COUNT.MERGE(sketch) FROM ... (BigQuery specific)`,
    explanation: `This is a "trick question" — COUNT(DISTINCT) within window frames isn't supported in standard SQL. Knowing this limitation is what interviewers are testing. The self-join approach is correct but O(n²); the explode approach is more parallel-friendly but expands data volume 7x. HLL (HyperLogLog) in BigQuery/Snowflake gives ~2% error with massive speed gains and is the production answer at scale.`,
    tags: ["count-distinct", "rolling", "advanced", "window-functions", "hll"],
    order: 33,
  },
  {
    slug: "customer-lifetime-value-segments",
    title: "Customer Lifetime Value Segmentation",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `Calculate **Customer Lifetime Value (CLV)** and segment customers using the **RFM model**:
- **Recency**: days since last order (lower = better)
- **Frequency**: total number of orders
- **Monetary**: total revenue

Score each dimension 1–4 using NTILE(4). Then classify:
- RFM total 10–12 → "Champions"
- 7–9 → "Loyal"
- 4–6 → "At Risk"
- 1–3 → "Lost"

Return: \`customer_id\`, \`name\`, \`recency_days\`, \`frequency\`, \`monetary\`, \`rfm_score\`, \`segment\`.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Calculate R, F, M per customer in a CTE.",
      "Apply NTILE(4) on each dimension separately. Note: for Recency, lower days = better, so use ORDER BY recency_days DESC to give NTILE 4 to most recent.",
      "Sum the three NTILE scores for a combined RFM score (3–12).",
      "Use CASE WHEN on the sum to assign segments.",
    ],
    solution: `WITH rfm_raw AS (
  SELECT
    c.customer_id,
    c.name,
    CURRENT_DATE - MAX(o.created_at::DATE) AS recency_days,
    COUNT(o.order_id)                      AS frequency,
    SUM(o.amount)                          AS monetary
  FROM customers c
  JOIN orders o ON c.customer_id = o.customer_id
  WHERE o.status = 'completed'
  GROUP BY c.customer_id, c.name
),
rfm_scored AS (
  SELECT *,
    NTILE(4) OVER (ORDER BY recency_days DESC) AS r_score,  -- DESC so recent = 4
    NTILE(4) OVER (ORDER BY frequency ASC)     AS f_score,
    NTILE(4) OVER (ORDER BY monetary ASC)      AS m_score
  FROM rfm_raw
)
SELECT
  customer_id,
  name,
  recency_days,
  frequency,
  monetary,
  r_score + f_score + m_score AS rfm_score,
  CASE
    WHEN r_score + f_score + m_score >= 10 THEN 'Champions'
    WHEN r_score + f_score + m_score >= 7  THEN 'Loyal'
    WHEN r_score + f_score + m_score >= 4  THEN 'At Risk'
    ELSE 'Lost'
  END AS segment
FROM rfm_scored
ORDER BY rfm_score DESC;`,
    explanation: `RFM is a classic customer segmentation framework used in e-commerce and marketing analytics. The key insight for Recency scoring: ORDER BY recency_days DESC means lower (more recent) days gets higher NTILE. Each NTILE runs as a separate window so they're independent. Summing 3 scores of 1–4 gives a 3–12 range. This query pattern is used in production at companies like Shopify, HubSpot, and Salesforce for customer health scoring.`,
    tags: ["rfm", "ntile", "segmentation", "window-functions", "customer-analytics"],
    order: 34,
  },
  {
    slug: "date-spine-missing-days",
    title: "Generate Date Spine for Missing Days",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `The \`orders\` table has gaps — some days have no completed orders.

Write a query to produce a **complete daily revenue report with no missing dates** (missing days should show 0 revenue).

Show the last 90 days.

Return: \`date\`, \`daily_revenue\`, \`order_count\`.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Generate a date spine (sequence of all dates) using generate_series in PostgreSQL or a numbers table trick.",
      "LEFT JOIN your revenue aggregate to the date spine.",
      "Use COALESCE(revenue, 0) to fill missing days with 0.",
    ],
    solution: `-- PostgreSQL / Redshift (generate_series)
WITH date_spine AS (
  SELECT
    generate_series(
      CURRENT_DATE - INTERVAL '89 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    )::DATE AS date
),
daily_revenue AS (
  SELECT
    created_at::DATE AS order_date,
    SUM(amount)      AS daily_revenue,
    COUNT(order_id)  AS order_count
  FROM orders
  WHERE status = 'completed'
    AND created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY created_at::DATE
)
SELECT
  ds.date,
  COALESCE(dr.daily_revenue, 0) AS daily_revenue,
  COALESCE(dr.order_count, 0)   AS order_count
FROM date_spine ds
LEFT JOIN daily_revenue dr ON ds.date = dr.order_date
ORDER BY ds.date;

-- BigQuery equivalent
-- GENERATE_DATE_ARRAY(DATE_SUB(CURRENT_DATE(), INTERVAL 89 DAY), CURRENT_DATE(), INTERVAL 1 DAY)`,
    explanation: `Date spine + LEFT JOIN is the canonical pattern for "no missing dates" reports. Without it, days with zero activity simply don't appear in the result. In PostgreSQL use generate_series; in BigQuery use GENERATE_DATE_ARRAY; in Snowflake use a generator with SEQ4(). In production, many teams keep a permanent calendar/date dimension table seeded with years of dates for exactly this purpose.`,
    tags: ["date-spine", "generate-series", "left-join", "coalesce", "data-warehouse"],
    order: 35,
  },

  // ═══════════════════════════════════════════════
  // DATA WAREHOUSE (7)
  // ═══════════════════════════════════════════════
  {
    slug: "star-schema-multi-join",
    title: "Star Schema Multi-Dimension Join",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `You have a star schema:

\`\`\`sql
fact_orders (order_id, customer_sk, product_sk, date_sk, amount, quantity)
dim_customers (customer_sk, customer_id, name, country, plan)
dim_products (product_sk, product_id, name, category, price)
dim_date (date_sk, date, year, month, quarter, day_of_week, is_weekend)
\`\`\`

Write a query to show **total weekend revenue by product category and customer plan** for Q4 of the most recent year.`,
    context: undefined,
    hints: [
      "Join fact_orders to all three dimensions on their surrogate keys.",
      "Filter dim_date for is_weekend = TRUE and quarter = 4.",
      "GROUP BY category and plan.",
    ],
    solution: `SELECT
  dp.category,
  dc.plan,
  SUM(fo.amount)   AS total_revenue,
  COUNT(fo.order_id) AS order_count
FROM fact_orders fo
JOIN dim_customers dc ON fo.customer_sk = dc.customer_sk
JOIN dim_products  dp ON fo.product_sk  = dp.product_sk
JOIN dim_date      dd ON fo.date_sk     = dd.date_sk
WHERE dd.is_weekend = TRUE
  AND dd.quarter    = 4
  AND dd.year       = EXTRACT(YEAR FROM CURRENT_DATE)
GROUP BY dp.category, dc.plan
ORDER BY total_revenue DESC;`,
    explanation: `Star schema joins always follow this pattern: anchor on the fact table, JOIN to each dimension using surrogate keys (not natural keys). Filtering on dimension columns (quarter, is_weekend) before the aggregation is efficient because the dim_date join eliminates fact rows early. This is why date and dimension tables carry these attributes — to enable fast, clear filter logic without date arithmetic on the fact table.`,
    tags: ["star-schema", "data-warehouse", "join", "dimensional-modeling"],
    order: 36,
  },
  {
    slug: "merge-upsert-incremental",
    title: "MERGE for Incremental Upsert",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `Write a **MERGE (UPSERT) statement** to incrementally load new customer data into a target table.

Rules:
- If a customer already exists (matched on customer_id): **UPDATE** name, email, plan, updated_at
- If the customer is new (no match): **INSERT** the full row

\`\`\`sql
-- Source: staging_customers (same schema as customers)
-- Target: customers
\`\`\``,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "MERGE ... USING source ON (target.customer_id = source.customer_id).",
      "WHEN MATCHED THEN UPDATE SET ...",
      "WHEN NOT MATCHED THEN INSERT ...",
      "Supported in PostgreSQL 15+, Snowflake, BigQuery, SQL Server, Oracle.",
    ],
    solution: `-- Standard SQL MERGE (PostgreSQL 15+, Snowflake, SQL Server)
MERGE INTO customers AS tgt
USING staging_customers AS src
  ON tgt.customer_id = src.customer_id

WHEN MATCHED THEN
  UPDATE SET
    name       = src.name,
    email      = src.email,
    plan       = src.plan,
    updated_at = NOW()

WHEN NOT MATCHED THEN
  INSERT (customer_id, name, email, country, plan, created_at)
  VALUES (src.customer_id, src.name, src.email, src.country, src.plan, NOW());

-- BigQuery equivalent (slightly different syntax)
MERGE customers AS tgt
USING staging_customers AS src
ON tgt.customer_id = src.customer_id
WHEN MATCHED THEN
  UPDATE SET name = src.name, email = src.email, plan = src.plan
WHEN NOT MATCHED THEN
  INSERT ROW;`,
    explanation: `MERGE is the SQL standard for upsert — it handles insert/update/delete in one atomic statement. This prevents the race conditions of a separate "check then insert/update" approach. In production dbt pipelines, MERGE is what runs under the hood for incremental models with unique_key. Know that MERGE didn't exist in PostgreSQL before v15 — older codebases use INSERT ... ON CONFLICT (UPSERT syntax).`,
    tags: ["merge", "upsert", "incremental-load", "data-warehouse"],
    order: 37,
  },
  {
    slug: "scd2-merge-implementation",
    title: "SCD Type 2 Full MERGE Implementation",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `Implement the full **SCD Type 2 MERGE logic** to load changes from \`staging_customers\` into \`dim_customers\`.

Rules:
- **New record** (no match on customer_id): INSERT with effective_from = today, effective_to = NULL, is_current = TRUE
- **Changed record** (match on customer_id, but plan or email changed): Expire old row (effective_to = yesterday, is_current = FALSE) AND insert new row
- **Unchanged record**: do nothing

\`\`\`sql
dim_customers (surrogate_key, customer_id, name, email, plan, effective_from, effective_to, is_current)
staging_customers (customer_id, name, email, plan)
\`\`\``,
    context: undefined,
    hints: [
      "SCD2 needs two operations: expire old rows + insert new rows. Standard MERGE may not support both in one statement in all dialects.",
      "Step 1: UPDATE matching current rows where tracked attributes changed → set effective_to = CURRENT_DATE - 1, is_current = FALSE.",
      "Step 2: INSERT new rows for changed and new records.",
      "Or use a single MERGE with WHEN MATCHED AND (change condition) THEN UPDATE, plus WHEN NOT MATCHED THEN INSERT.",
    ],
    solution: `-- Step 1: Expire changed rows
UPDATE dim_customers tgt
SET
  effective_to = CURRENT_DATE - INTERVAL '1 day',
  is_current   = FALSE
FROM staging_customers src
WHERE tgt.customer_id = src.customer_id
  AND tgt.is_current  = TRUE
  AND (tgt.email <> src.email OR tgt.plan <> src.plan);

-- Step 2: Insert new rows (new customers + changed records)
INSERT INTO dim_customers
  (customer_id, name, email, plan, effective_from, effective_to, is_current)
SELECT
  src.customer_id,
  src.name,
  src.email,
  src.plan,
  CURRENT_DATE   AS effective_from,
  NULL           AS effective_to,
  TRUE           AS is_current
FROM staging_customers src
LEFT JOIN dim_customers tgt
  ON  src.customer_id = tgt.customer_id
  AND tgt.is_current  = TRUE
WHERE tgt.customer_id IS NULL          -- new customer
   OR (tgt.email <> src.email OR tgt.plan <> src.plan);  -- changed`,
    explanation: `SCD2 is one of the most tested data warehouse concepts. The two-step pattern (expire + insert) is safer than trying to do it in a single MERGE because the INSERT for changed rows needs to happen after the UPDATE. In production dbt, use the built-in SCD2 snapshot feature (dbt snapshot). Key interview points: what happens with same-day changes? What if source has multiple changes for one customer? How do you handle deletes?`,
    tags: ["scd2", "data-warehouse", "merge", "dimensional-modeling", "advanced"],
    order: 38,
  },
  {
    slug: "partition-pruning-query",
    title: "Write a Partition-Pruning Query",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `The \`orders\` table is **partitioned by month** on \`created_at\`.

Explain what partition pruning is, and rewrite the following **bad query** that defeats pruning:

\`\`\`sql
-- Bad query (defeats pruning):
SELECT * FROM orders
WHERE EXTRACT(YEAR FROM created_at) = 2024
  AND EXTRACT(MONTH FROM created_at) = 3;
\`\`\`

Write the **correct version** that enables partition pruning.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Partition pruning means the query engine skips reading partitions that can't match the filter.",
      "For pruning to work, the filter must be on the raw partition column, not a derived expression.",
      "EXTRACT(MONTH FROM created_at) wraps the column in a function — the engine can't map this to partition boundaries.",
      "Use a range condition on the raw created_at column instead.",
    ],
    solution: `-- Bad: wrapping created_at in EXTRACT defeats partition pruning
-- The query engine can't determine which partitions to skip
SELECT * FROM orders
WHERE EXTRACT(YEAR FROM created_at) = 2024
  AND EXTRACT(MONTH FROM created_at) = 3;

-- Good: filter on the raw column using a range
SELECT * FROM orders
WHERE created_at >= '2024-03-01'
  AND created_at <  '2024-04-01';

-- Also good (equivalent):
WHERE DATE_TRUNC('month', created_at) = '2024-03-01'
-- Note: DATE_TRUNC may or may not enable pruning depending on the engine --
-- a range filter is always safe.`,
    explanation: `Partition pruning is a critical optimization in every modern warehouse (BigQuery, Snowflake, Databricks, Hive). When you apply a function to the partition column (YEAR(), MONTH(), TO_CHAR()), the engine sees a computed column — it can't look up partition boundaries for it, so it scans all partitions. A raw range filter (>= / <) directly maps to partition boundaries. This is a fundamental concept tested at every senior DE interview.`,
    tags: ["partition-pruning", "query-optimization", "performance", "data-warehouse"],
    order: 39,
  },
  {
    slug: "insert-overwrite-snapshot",
    title: "Daily Snapshot Table Design",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `You need to track the **daily state of customer plans** — capturing a full snapshot every day so you can query what plans looked like on any historical date.

Design the snapshot table schema, write the **daily INSERT** to capture today's snapshot, and write a query to answer: *"How many customers were on the Pro plan on 2024-06-15?"*`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "A snapshot table adds a snapshot_date column to capture which day the snapshot represents.",
      "The daily load inserts all current customers with snapshot_date = CURRENT_DATE.",
      "To query a historical date, filter WHERE snapshot_date = '2024-06-15'.",
      "This approach trades storage for simplicity — unlike SCD2 it doesn't require complex MERGE logic.",
    ],
    solution: `-- 1. Snapshot table schema
CREATE TABLE customer_daily_snapshot AS (
  snapshot_date   DATE,
  customer_id     BIGINT,
  name            VARCHAR,
  email           VARCHAR,
  plan            VARCHAR,
  created_at      TIMESTAMP
);
-- Partition by snapshot_date for efficient historical queries

-- 2. Daily INSERT to capture today's snapshot
INSERT INTO customer_daily_snapshot
SELECT
  CURRENT_DATE AS snapshot_date,
  customer_id,
  name,
  email,
  plan,
  created_at
FROM customers;

-- In most pipelines, first delete today if already loaded (idempotent load):
DELETE FROM customer_daily_snapshot WHERE snapshot_date = CURRENT_DATE;
INSERT INTO customer_daily_snapshot SELECT CURRENT_DATE, * FROM customers;

-- 3. Query: Pro plan count on 2024-06-15
SELECT COUNT(*) AS pro_customers
FROM customer_daily_snapshot
WHERE snapshot_date = '2024-06-15'
  AND plan = 'pro';`,
    explanation: `Daily snapshot tables are the simplest way to enable point-in-time queries without SCD complexity. The trade-off is storage: a 1M customer table creates 365M rows/year. That's acceptable with column-oriented storage and partition pruning on snapshot_date. Always make the daily load idempotent (DELETE + INSERT for the current date) so it's safe to re-run. This pattern is used at scale in Redshift, BigQuery, and Snowflake where columnar compression makes it cheap.`,
    tags: ["snapshot", "data-warehouse", "partitioning", "point-in-time"],
    order: 40,
  },
  {
    slug: "late-arriving-data-handling",
    title: "Handle Late-Arriving Fact Data",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `Your pipeline runs daily, but some orders arrive **1–3 days late** in the source system (e.g. settlement delays).

Given a \`daily_revenue_summary\` table:
\`\`\`sql
daily_revenue_summary (report_date DATE, revenue DECIMAL, order_count INT, last_updated TIMESTAMP)
\`\`\`

Write the logic to **reprocess and correct the last 7 days** of the summary table to incorporate late-arriving orders.`,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Late arriving data means past summary rows are now incorrect — you need to recompute and overwrite them.",
      "Recompute daily aggregates for the last 7 days from the raw orders table.",
      "Use MERGE or DELETE + INSERT to update the summary rows.",
    ],
    solution: `-- Step 1: Recompute correct aggregates for last 7 days
WITH corrected AS (
  SELECT
    created_at::DATE AS report_date,
    SUM(amount)      AS revenue,
    COUNT(order_id)  AS order_count,
    NOW()            AS last_updated
  FROM orders
  WHERE status = 'completed'
    AND created_at::DATE >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY created_at::DATE
)
-- Step 2: Upsert into summary table
MERGE INTO daily_revenue_summary AS tgt
USING corrected AS src
  ON tgt.report_date = src.report_date
WHEN MATCHED THEN
  UPDATE SET
    revenue      = src.revenue,
    order_count  = src.order_count,
    last_updated = src.last_updated
WHEN NOT MATCHED THEN
  INSERT (report_date, revenue, order_count, last_updated)
  VALUES (src.report_date, src.revenue, src.order_count, src.last_updated);`,
    explanation: `Late-arriving data is one of the most common real-world DE challenges. The solution is a "lookback window" — always reprocess the last N days to absorb late arrivals. The window (7 days) should be set based on your maximum known latency. In dbt, this is the late_arriving_rows / lookback_window configuration on incremental models. In production, you also want alerting when data arrives later than your SLA window.`,
    tags: ["late-arriving-data", "incremental-load", "merge", "data-warehouse", "pipeline-design"],
    order: 41,
  },
  {
    slug: "explain-query-optimization",
    title: "Query Optimization: Spot the Problem",
    category: PracticeCategory.SQL,
    difficulty: Difficulty.HARD,
    description: `Review the following query and identify **3 performance problems**. Then rewrite it as an optimized version.

\`\`\`sql
-- Slow query (runs 45 minutes on 500M row table):
SELECT *
FROM orders o
WHERE UPPER(o.status) = 'COMPLETED'
  AND YEAR(o.created_at) = 2024
  AND o.customer_id IN (
    SELECT customer_id FROM customers WHERE country = 'US'
  )
ORDER BY o.created_at DESC;
\`\`\``,
    context: ECOMMERCE_SCHEMA,
    hints: [
      "Problem 1: UPPER(status) wraps a column in a function — prevents index use.",
      "Problem 2: YEAR(created_at) wraps the partition/index column — defeats pruning.",
      "Problem 3: SELECT * returns all columns — expensive I/O especially with wide rows.",
      "Bonus: IN (subquery) can sometimes be slower than EXISTS or JOIN for large subqueries.",
    ],
    solution: `-- Problems identified:
-- 1. UPPER(status) = 'COMPLETED' → defeats index on status
-- 2. YEAR(created_at) = 2024 → defeats partition pruning and index
-- 3. SELECT * → reads all columns, including large unused ones
-- 4. IN (subquery) → can cause row-by-row evaluation in some engines

-- Optimized version:
SELECT
  o.order_id,
  o.customer_id,
  o.amount,
  o.status,
  o.created_at
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE o.status = 'completed'                      -- no function wrapping
  AND o.created_at >= '2024-01-01'               -- range filter for partition pruning
  AND o.created_at <  '2025-01-01'
  AND c.country = 'US'                           -- JOIN instead of IN subquery
ORDER BY o.created_at DESC;`,
    explanation: `This is a classic query review question. Key rules: (1) Never wrap indexed or partitioned columns in functions — store data in a consistent case instead and compare directly. (2) Use range filters on date columns for partition pruning. (3) Avoid SELECT * in production — list only needed columns. (4) JOIN is generally preferable to IN (subquery) for large datasets as the optimizer can choose better join strategies. These 4 principles eliminate 80%+ of slow query issues in the wild.`,
    tags: ["query-optimization", "performance", "indexes", "partition-pruning"],
    order: 42,
  },
];

async function main() {
  console.log("🌱 Seeding SQL practice questions...");

  for (const q of sqlQuestions) {
    await prisma.practiceQuestion.upsert({
      where: { slug: q.slug },
      update: {
        title: q.title,
        difficulty: q.difficulty,
        description: q.description,
        context: q.context ?? null,
        hints: q.hints,
        solution: q.solution,
        explanation: q.explanation,
        tags: q.tags,
        order: q.order,
      },
      create: {
        ...q,
        context: q.context ?? null,
        category: PracticeCategory.SQL,
      },
    });
  }

  console.log(`✅ Seeded ${sqlQuestions.length} SQL practice questions.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
