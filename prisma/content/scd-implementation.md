## From Theory to Production

Understanding SCD types is necessary but not sufficient. In interviews and on the job, you need to demonstrate how to actually implement them — the DDL, the ETL merge logic, the dbt patterns, and the warehouse-specific considerations.

This article implements Type 2 in full (the most important type), then covers the patterns for Types 1, 3, and 6.

---

## Complete Type 2 Implementation

### Step 1 — DDL

```sql
CREATE TABLE dim_customer (
  -- Surrogate key: warehouse-generated, stable identifier for historical rows
  customer_key    BIGSERIAL     PRIMARY KEY,

  -- Natural key: source system identifier (not unique in this table — same customer has multiple rows)
  customer_id     VARCHAR(20)   NOT NULL,

  -- Business attributes
  full_name       VARCHAR(200)  NOT NULL,
  email           VARCHAR(255)  NOT NULL,
  city            VARCHAR(100),
  state           VARCHAR(50),
  segment         VARCHAR(50)   NOT NULL,

  -- SCD Type 2 metadata columns
  effective_from  DATE          NOT NULL,
  effective_to    DATE,         -- NULL = currently active row
  is_current      BOOLEAN       NOT NULL DEFAULT true,

  -- Audit
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Performance: fast lookup of current row by natural key
CREATE UNIQUE INDEX idx_dim_customer_current
  ON dim_customer (customer_id)
  WHERE is_current = true;

-- Performance: historical point-in-time lookups
CREATE INDEX idx_dim_customer_natural_key
  ON dim_customer (customer_id, effective_from, effective_to);
```

> **Interview tip:** The partial unique index `WHERE is_current = true` enforces exactly one active row per customer at the database level. Without it, a bug in your ETL could leave two "current" rows for the same customer — a silent error that corrupts every report.

### Step 2 — Initial Load

The first load treats every source row as a new current record:

```sql
INSERT INTO dim_customer
  (customer_id, full_name, email, city, state, segment,
   effective_from, effective_to, is_current)
SELECT
  customer_id,
  full_name,
  email,
  city,
  state,
  segment,
  CURRENT_DATE AS effective_from,
  NULL         AS effective_to,
  true         AS is_current
FROM source_customer;
```

### Step 3 — Incremental ETL (the MERGE pattern)

The daily ETL runs in three phases:

**Phase 1 — Identify changed records:**

```sql
CREATE TEMP TABLE changed_customers AS
SELECT
  s.customer_id,
  s.full_name,
  s.email,
  s.city,
  s.state,
  s.segment
FROM source_customer s
JOIN dim_customer d
  ON s.customer_id = d.customer_id
  AND d.is_current = true
WHERE
  s.city    <> d.city    OR
  s.state   <> d.state   OR
  s.segment <> d.segment;
  -- Note: email and name changes might be Type 1 corrections — handle separately
```

**Phase 2 — Expire the old rows:**

```sql
UPDATE dim_customer
SET
  effective_to = CURRENT_DATE - INTERVAL '1 day',
  is_current   = false,
  updated_at   = now()
WHERE customer_id IN (SELECT customer_id FROM changed_customers)
  AND is_current = true;
```

**Phase 3 — Insert new current rows:**

```sql
INSERT INTO dim_customer
  (customer_id, full_name, email, city, state, segment,
   effective_from, effective_to, is_current)
SELECT
  customer_id,
  full_name,
  email,
  city,
  state,
  segment,
  CURRENT_DATE AS effective_from,
  NULL         AS effective_to,
  true         AS is_current
FROM changed_customers;
```

**New records (first appearance in source):**

```sql
INSERT INTO dim_customer
  (customer_id, full_name, email, city, state, segment,
   effective_from, effective_to, is_current)
SELECT
  s.customer_id,
  s.full_name,
  s.email,
  s.city,
  s.state,
  s.segment,
  CURRENT_DATE,
  NULL,
  true
FROM source_customer s
LEFT JOIN dim_customer d ON s.customer_id = d.customer_id
WHERE d.customer_id IS NULL;
```

### Step 4 — Querying the Dimension

```sql
-- Current state of all customers
SELECT customer_id, full_name, city, segment
FROM dim_customer
WHERE is_current = true;

-- Historical state: what was Alice's segment on Feb 1, 2024?
SELECT segment
FROM dim_customer
WHERE customer_id = 'C001'
  AND effective_from <= '2024-02-01'
  AND (effective_to IS NULL OR effective_to >= '2024-02-01');

-- Full change history for a customer
SELECT segment, city, effective_from, effective_to
FROM dim_customer
WHERE customer_id = 'C001'
ORDER BY effective_from;
```

---

## Implementing Type 1 (Alongside Type 2)

In practice, most dimensions have a mix of SCD types per attribute. Name and email corrections are Type 1; city and segment changes are Type 2.

When a Type 1 attribute changes, propagate the correction to **all rows** for that customer — including historical rows:

```sql
-- Alice corrects a typo in her name: Type 1 update on all her rows
UPDATE dim_customer
SET
  full_name  = 'Alice Nguyen-Chen',
  updated_at = now()
WHERE customer_id = 'C001';
-- Updates all rows (current and historical) — intentional
```

> This is why `full_name` doesn't carry history. The correction is retroactive by design — you want every historical query to reflect the corrected name, not the typo.

---

## Implementing Type 3

Type 3 adds a `previous_*` column and a `changed_on` timestamp. On each update, shift current to previous before writing the new value:

```sql
ALTER TABLE dim_customer
  ADD COLUMN prev_segment       VARCHAR(50),
  ADD COLUMN segment_changed_on DATE;

-- Type 3 update for Alice's segment change
UPDATE dim_customer
SET
  prev_segment       = segment,          -- archive current value
  segment            = 'Premium',        -- write new value
  segment_changed_on = '2024-03-01',
  updated_at         = now()
WHERE customer_id = 'C001'
  AND is_current = true;
```

Query comparing revenue before vs after segment change:

```sql
SELECT
  d.customer_id,
  d.full_name,
  d.prev_segment,
  d.segment AS current_segment,
  SUM(CASE WHEN f.order_date < d.segment_changed_on
           THEN f.revenue END) AS revenue_before_upgrade,
  SUM(CASE WHEN f.order_date >= d.segment_changed_on
           THEN f.revenue END) AS revenue_after_upgrade
FROM dim_customer d
JOIN fact_order f ON d.customer_key = f.customer_key
WHERE d.prev_segment IS NOT NULL
GROUP BY 1, 2, 3, 4;
```

---

## Implementing Type 6 (Hybrid)

Type 6 extends Type 2 by adding a `current_*` column that always reflects today's value — even on historical rows. After any Type 2 change, the `current_segment` must be updated on all rows for that customer:

```sql
ALTER TABLE dim_customer
  ADD COLUMN current_segment VARCHAR(50);

-- After a Type 2 insert, back-fill current_segment on all rows
UPDATE dim_customer
SET current_segment = (
  SELECT segment
  FROM dim_customer
  WHERE customer_id = dim_customer.customer_id
    AND is_current = true
);
-- This runs after every Type 2 update — updates all historical rows for the customer
```

**The power of Type 6 in a single query:**

```sql
-- Revenue by "segment at time of purchase" vs "customer's current segment"
SELECT
  d.segment         AS segment_at_purchase,
  d.current_segment AS segment_today,
  SUM(f.revenue)    AS revenue
FROM fact_order f
JOIN dim_customer d ON f.customer_key = d.customer_key
GROUP BY 1, 2
ORDER BY revenue DESC;
```

Without Type 6, this query would require a self-join or subquery to get the current segment.

---

## dbt Implementation

In modern data stacks, SCDs are almost always implemented in dbt using snapshots. dbt handles the expire-and-insert logic automatically.

**`snapshots/customers.sql`:**

```sql
{% snapshot dim_customer_snapshot %}

{{
  config(
    target_schema = 'snapshots',
    unique_key    = 'customer_id',
    strategy      = 'timestamp',
    updated_at    = 'updated_at',
    invalidate_hard_deletes = true
  )
}}

SELECT
  customer_id,
  full_name,
  email,
  city,
  state,
  segment,
  updated_at
FROM {{ source('crm', 'customer') }}

{% endsnapshot %}
```

dbt adds `dbt_scd_id`, `dbt_updated_at`, `dbt_valid_from`, and `dbt_valid_to` columns automatically — equivalent to `effective_from`, `effective_to`. Run with `dbt snapshot`.

**For Type 1 attributes alongside Type 2:**

Use a `strategy = 'check'` config and list only the Type 2 columns in `check_cols`. Type 1 columns are excluded — dbt won't create a new row when they change, but the current row's value will be updated.

```sql
{{
  config(
    strategy   = 'check',
    unique_key  = 'customer_id',
    check_cols  = ['city', 'state', 'segment']  -- only these trigger a new row
  )
}}
```

---

## Warehouse-Specific Considerations

| Platform | Consideration |
|---------|--------------|
| **Snowflake** | `MERGE` statement is available and performant. Use `CLUSTER BY (customer_id)` on large dimension tables to co-locate rows for the same customer |
| **BigQuery** | No `UPDATE` on partitioned columns — use `MERGE` with a `WHEN MATCHED THEN UPDATE / WHEN NOT MATCHED THEN INSERT` pattern. Consider partitioning by `effective_from` |
| **Redshift** | `UPDATE` + `INSERT` is preferred over `MERGE` for large tables. Avoid frequent single-row updates — batch changes and apply in one pass |
| **Databricks / Delta Lake** | `MERGE INTO` is fully supported with ACID guarantees. Delta's time travel (`VERSION AS OF`, `TIMESTAMP AS OF`) can supplement or replace SCD 2 for audit-only use cases |

---

## Common Interview Questions

**"Walk me through how you'd implement a Type 2 SCD in production."**

Create the dimension table with surrogate key, natural key, business attributes, and three metadata columns: `effective_from`, `effective_to` (nullable), `is_current`. Add a partial unique index on `(natural_key) WHERE is_current = true`. ETL runs in three phases: identify changed records by comparing source to current dimension rows, expire old rows by setting `effective_to` and `is_current = false`, insert new rows with `effective_from = today` and `is_current = true`. New records are inserted as fresh current rows.

**"How does a fact table know which dimension row to join to?"**

At the time a fact record is inserted, the ETL stamps the surrogate key of the *currently active* dimension row onto the fact. That surrogate key is permanent on the fact — it doesn't change even when the dimension changes. When you join later, you get the dimension row that was current when the fact occurred — which is the historical row. This is why surrogate keys in Type 2 are per-version, not per-entity.

**"What happens if a source record is deleted — how do you handle hard deletes in a Type 2 dimension?"**

Mark the row as inactive with `effective_to = today` and `is_current = false`. If the source system doesn't send deletes explicitly (common in CDC setups), use a "full load compare" strategy: anything in the current dimension that's no longer in the source extract is treated as deleted. Alternatively, use dbt's `invalidate_hard_deletes = true` config.

**"How would you implement SCDs in dbt?"**

Use dbt snapshots. Configure `unique_key`, choose `strategy = 'timestamp'` (compares `updated_at`) or `strategy = 'check'` (compares specific columns). Run `dbt snapshot` on a schedule. dbt generates `dbt_valid_from` / `dbt_valid_to` columns and handles the expire-and-insert logic automatically. Downstream models reference `{{ ref('snapshot_name') }}` and filter on `dbt_valid_to IS NULL` for current records.

---

## Key Takeaways

- Type 2 ETL runs in three phases: detect changes, expire old rows (set `effective_to`, `is_current = false`), insert new rows
- Add a partial unique index on `(natural_key) WHERE is_current = true` to enforce one active row per entity at the database level
- Mix SCD types per attribute: Type 1 for corrections (propagate to all rows), Type 2 for meaningful business changes
- Type 6 requires updating `current_*` columns on all rows after every change — an extra UPDATE step that many teams skip until the reporting need arises
- In dbt, use snapshots for Type 2; `check_cols` controls which attributes trigger a new row vs an in-place update
- On BigQuery and Redshift, use `MERGE` / batched UPDATE+INSERT patterns rather than row-by-row updates
- Delta Lake time travel (`TIMESTAMP AS OF`) can supplement SCD 2 for point-in-time queries without maintaining `effective_from`/`effective_to` columns
