## Why Performance Matters in Interviews

A candidate who can design a pipeline is good. A candidate who can explain *why* the pipeline is slow and exactly how to fix it is exceptional.

Performance questions come in two forms: "how would you optimize this query?" and "this job is taking 6 hours, what do you look at first?" Both require the same diagnostic framework.

---

## The Performance Hierarchy — Fix the Highest Layer First

Before tuning memory or parallelism, check whether you can avoid the work entirely:

```
1. Read less data         → partition pruning, predicate pushdown, projection pushdown
2. Move less data         → broadcast joins, avoid shuffles, co-locate data
3. Do less repeated work  → caching, incremental loads, materialized views
4. Tune the execution     → parallelism, memory, file sizes
```

Always work top-to-bottom. Tuning parallelism on a job that's reading 10x more data than it needs gives you a 20% improvement. Fixing the read gets you a 10x improvement.

---

## Layer 1 — Read Less Data

### Partition Pruning

Organize data by the most common filter columns. Queries on those columns skip entire directories:

```python
# Writing: partition by the columns you'll filter on
df.write \
    .partitionBy("order_date", "status") \
    .parquet("s3://silver/orders/")

# Reading: Spark reads only the matching directories
# s3://silver/orders/order_date=2024-03-15/status=completed/ — others skipped
orders = spark.read.parquet("s3://silver/orders/") \
    .filter("order_date = '2024-03-15' AND status = 'completed'")
```

**What to partition by:** Columns that appear in `WHERE` clauses most often. Date columns are almost always a good partition key. High-cardinality columns (user_id with millions of values) make poor partition keys — too many directories.

### Predicate Pushdown

Push filters as close to the data source as possible — eliminate records before they enter your pipeline.

```python
# ❌ Bad: read all orders, then filter in Spark
orders = spark.read.parquet("s3://silver/orders/")
completed = orders.filter("status = 'completed'")

# ✅ Good: push filter into the read — Parquet file scanner skips non-matching row groups
orders = spark.read.parquet("s3://silver/orders/") \
    .filter("status = 'completed'")  # Spark pushes this into the Parquet scan
```

Parquet stores min/max statistics per column per row group. If `max(status) < 'completed'` in a row group, the entire row group is skipped — without reading the actual data.

### Projection Pushdown — Only Read Needed Columns

Parquet is columnar. If you only need 3 columns, only 3 columns' bytes are read from disk:

```python
# ❌ Reads all 50 columns even though you use 3
df = spark.read.parquet("s3://silver/orders/")
result = df.select("order_id", "revenue_usd", "order_date")

# ✅ Pushes column selection into the scan — reads only 3 columns
df = spark.read.parquet("s3://silver/orders/").select("order_id", "revenue_usd", "order_date")
```

For a 50-column table where you need 3, this reduces I/O by ~94%.

---

## Layer 2 — Move Less Data

### Eliminate Shuffles with Broadcast Joins

Joins are the most expensive operation in distributed computing — they require shuffling data across all nodes. Broadcast joins eliminate the shuffle for small tables:

```python
from pyspark.sql.functions import broadcast

large_orders = spark.read.parquet("s3://silver/orders/")    # 500 GB
small_products = spark.read.parquet("s3://reference/products/")  # 10 MB

# ❌ Shuffle join — Spark shuffles 500 GB of orders by product_id
result = large_orders.join(small_products, "product_id")

# ✅ Broadcast join — products (10 MB) copied to every executor, no shuffle
result = large_orders.join(broadcast(small_products), "product_id")
```

**When to broadcast:** Table < 200 MB (configurable via `spark.sql.autoBroadcastJoinThreshold`). Spark also applies this automatically if statistics are available and the threshold is configured.

### Pre-Partition by Join Key

If you're joining two large tables repeatedly, pre-partition both by the join key — subsequent joins skip the shuffle:

```python
# Repartition once before a series of joins
orders = orders.repartition("customer_id")
returns = returns.repartition("customer_id")
support = support.repartition("customer_id")

# Now all three joins are local — no shuffle
result = orders.join(returns, "customer_id").join(support, "customer_id")
```

### Filter Early — Before Any Shuffle

```python
# ❌ Filter after join — the join already shuffled all data
result = large_orders \
    .join(customers, "customer_id") \
    .filter("large_orders.status = 'completed'")

# ✅ Filter before join — reduces data before the expensive shuffle
result = large_orders.filter("status = 'completed'") \
    .join(customers, "customer_id")
```

---

## Layer 3 — Avoid Repeated Work

### Cache DataFrames Used Multiple Times

If the same DataFrame is used in two downstream computations, cache it to avoid reading from S3 twice:

```python
silver_orders = spark.read.parquet("s3://silver/orders/") \
    .filter("order_date >= '2024-01-01'")

silver_orders.cache()
silver_orders.count()  # trigger materialization

# Both use the cached DataFrame — S3 is read only once
daily_revenue = silver_orders.groupBy("order_date").agg(F.sum("revenue_usd"))
product_mix = silver_orders.groupBy("product_id").agg(F.count("*"))

silver_orders.unpersist()  # release memory when done
```

### Incremental Loads — Process Only What Changed

The biggest performance optimization is usually not tuning Spark — it's changing the scope of work:

```python
# ❌ Full refresh: recomputes 3 years of data every day
df = spark.read.parquet("s3://silver/orders/")
daily_revenue = df.groupBy("order_date").agg(F.sum("revenue_usd"))
daily_revenue.write.mode("overwrite").parquet("s3://gold/daily_revenue/")

# ✅ Incremental: only recomputes yesterday's partition
yesterday = (datetime.today() - timedelta(days=1)).strftime('%Y-%m-%d')
df = spark.read.parquet(f"s3://silver/orders/order_date={yesterday}/")
daily_revenue = df.groupBy("order_date").agg(F.sum("revenue_usd"))
daily_revenue.write.mode("overwrite").partitionBy("order_date") \
    .option("partitionOverwriteMode", "dynamic") \
    .parquet("s3://gold/daily_revenue/")
```

Going from full refresh to incremental on a 3-year table is often a 100–1000x improvement.

---

## Layer 4 — Tune the Execution

### Data Skew — The Silent Killer

Skew happens when one partition has far more data than others. One executor processes 90% of the data while the other 99 wait — the job completes only when the slow executor finishes.

**Detecting skew:**

```python
# Check partition size distribution
df.groupBy(F.spark_partition_id()).count().orderBy("count", ascending=False).show(10)
# If one partition has 10M rows and others have 10K rows → severe skew
```

**Fixing skew — salting:**

```python
import random

# Add random salt to spread a hot key across multiple partitions
df_salted = df.withColumn("salt", (F.rand() * 10).cast("int"))
df_salted = df_salted.withColumn("salted_key",
    F.concat(F.col("customer_id"), F.lit("_"), F.col("salt")))

# Join on salted key — the hot customer_id spreads across 10 partitions
result = df_salted.join(lookup_salted, "salted_key")
```

### Tune Shuffle Partitions

The default (`spark.sql.shuffle.partitions = 200`) is rarely right:

```python
# Rule of thumb: 2-4 partitions per CPU core in the cluster
# 50-node cluster, 16 cores each = 800 cores → 1600-3200 shuffle partitions
spark.conf.set("spark.sql.shuffle.partitions", "2000")

# For small datasets: reduce to avoid overhead
# 1 GB of data → 10-20 partitions is enough
spark.conf.set("spark.sql.shuffle.partitions", "20")
```

### File Size Optimization

```python
# Compact small files in Delta Lake
spark.sql("OPTIMIZE delta.`s3://delta/silver/orders/` ZORDER BY (customer_id)")
# ZORDER co-locates related rows — queries filtering on customer_id read fewer files
```

---

## SQL Query Optimization

Performance at the warehouse layer follows similar principles:

```sql
-- ❌ Bad: full table scan, then filter
SELECT customer_id, SUM(revenue) AS total
FROM orders
WHERE order_date = '2024-03-15'  -- no partition; scans all data
GROUP BY customer_id;

-- ✅ Better: partition on order_date, materialized view for pre-aggregation
-- In Snowflake/BigQuery: use clustering key on order_date
-- In dbt: use incremental model so only new dates are computed
```

**Snowflake clustering:**

```sql
ALTER TABLE orders CLUSTER BY (order_date, status);
-- Queries on order_date prune micro-partitions — equivalent to partition pruning in Spark
```

---

## Common Interview Questions

**"This Spark job takes 6 hours. Where do you start?"**

Spark UI → Stages tab. Find the stage with the longest duration. Check: (1) Is there a massive shuffle? Reduce shuffle data with earlier filters or broadcast joins. (2) Is one task much slower than others? Skew — salt the join key. (3) Are all tasks reading the same amount? If not, partition pruning may not be working. (4) Is the job GC-heavy? Cache too much or too many objects being created.

**"When should you NOT cache a DataFrame?"**

When it's used only once downstream (caching wastes memory), when it doesn't fit in memory (Spark spills to disk — worse than re-reading from S3), or when the DataFrame is produced by a simple scan (cheaper to re-read than cache).

---

## Key Takeaways

- Fix the read first: partition pruning → predicate pushdown → projection pushdown — these often give 10–100x improvements before any tuning
- Broadcast joins eliminate shuffles for small tables — the most impactful join optimization
- Filter as early as possible in the pipeline — before any join or aggregation
- Incremental loads beat full refreshes by orders of magnitude — process only what changed
- Data skew is diagnosed by checking partition size distribution; fixed by salting the join key
- Tune `shuffle.partitions` to match your cluster size — default 200 is wrong for almost every job
