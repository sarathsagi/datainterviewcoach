## The Loading Decision

Loading is the final step — moving processed data into the destination where it will be queried. The loading strategy determines query performance, pipeline reliability, and operational cost.

The wrong loading strategy causes: duplicate data from retries, slow queries from unoptimized file layouts, warehouse table bloat, or inconsistent states when loads are interrupted.

---

## Loading into a Data Warehouse

### Bulk Load (COPY Command)

The fastest loading pattern — writes a large batch of Parquet files from S3 directly into the warehouse in one operation.

```sql
-- Snowflake bulk load
COPY INTO orders
FROM 's3://datalake/silver/orders/order_date=2024-03-15/'
FILE_FORMAT = (TYPE = 'PARQUET')
MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE;

-- BigQuery bulk load
bq load \
    --source_format=PARQUET \
    --replace \
    my_dataset.orders \
    gs://datalake/silver/orders/order_date=2024-03-15/*.parquet
```

**Characteristics:**
- Throughput: gigabytes per second
- Latency: minutes to load a day's worth of data
- Atomicity: the entire batch lands or nothing does
- Use for: daily batch loads, historical backfills, full refreshes

### INSERT / MERGE (Upsert)

For incremental loads where records can be updated after initial insertion:

```sql
-- Merge: upsert into warehouse table
-- Inserts new rows, updates rows that already exist (matched by order_id)
MERGE INTO orders AS target
USING staging_orders AS source
    ON target.order_id = source.order_id
WHEN MATCHED THEN
    UPDATE SET
        target.status         = source.status,
        target.updated_at     = source.updated_at,
        target.total_amount   = source.total_amount
WHEN NOT MATCHED THEN
    INSERT (order_id, customer_id, status, total_amount, created_at, updated_at)
    VALUES (source.order_id, source.customer_id, source.status,
            source.total_amount, source.created_at, source.updated_at);
```

**Characteristics:**
- Handles updates to existing records (full extract + MERGE = always-correct warehouse)
- Slower than bulk COPY — row-level operations
- Use for: slowly changing tables, mutable records (orders that change status)

### Overwrite Partition (Atomic Partition Replacement)

Replace a specific date partition atomically — guarantees no partial state:

```sql
-- Snowflake: overwrite a partition
INSERT OVERWRITE INTO orders
    PARTITION (order_date = '2024-03-15')
SELECT * FROM staging_orders_2024_03_15;
```

```python
# Spark: overwrite a specific partition
df.write \
    .mode("overwrite") \
    .option("partitionOverwriteMode", "dynamic") \
    .partitionBy("order_date") \
    .parquet("s3://silver/orders/")
# Only overwrites partitions that appear in df — other partitions untouched
```

**Why dynamic partition overwrite matters:** Without it, `.mode("overwrite")` wipes the entire table. With `partitionOverwriteMode = dynamic`, only the partitions present in the output DataFrame are replaced. This is the standard pattern for idempotent daily batch loads.

---

## Loading into a Data Lake (S3 / GCS)

### Partitioned Parquet Writes

The standard pattern — write Parquet files partitioned by date:

```python
df.write \
    .mode("append") \
    .partitionBy("order_date")     # creates s3://silver/orders/order_date=2024-03-15/
    .parquet("s3://silver/orders/")
```

**Partition pruning:** When a query filters on `order_date`, Spark/warehouse only reads the matching partition directories — skips everything else. A table with 3 years of data filtered to one day reads 1/1095th of the total data.

**File size matters:** Too many small files (100 KB each) → too many S3 API calls → slow queries. Too few large files (50 GB each) → can't parallelize reads. Target: **128 MB–1 GB per file**.

```python
# Coalesce before writing to avoid small file problem
df.coalesce(10)         \   # reduce to 10 partitions → 10 output files
  .write \
  .mode("overwrite") \
  .parquet("s3://silver/orders/order_date=2024-03-15/")
```

### Delta Lake — ACID Transactions on Object Storage

Delta Lake adds transactional guarantees to S3 Parquet:

```python
# Write with Delta format — transactional
df.write.format("delta").mode("overwrite").save("s3://delta/orders/")

# Upsert using Delta MERGE
from delta.tables import DeltaTable

delta_table = DeltaTable.forPath(spark, "s3://delta/orders/")
delta_table.alias("target").merge(
    source=new_orders.alias("source"),
    condition="target.order_id = source.order_id"
).whenMatchedUpdateAll() \
 .whenNotMatchedInsertAll() \
 .execute()
```

**What Delta Lake adds vs raw Parquet:**

| Feature | Raw Parquet | Delta Lake |
|---------|------------|------------|
| ACID transactions | No — partial writes visible | Yes — atomic commit |
| UPSERT (MERGE) | No — rewrite partition | Yes — native MERGE |
| Time travel | No | Yes — query any historical version |
| Schema enforcement | No | Yes — rejects incompatible writes |
| Concurrent writes | No — last write wins | Yes — optimistic concurrency |

---

## Real-Time Loading

### Streaming Inserts (Micro-Batch)

Spark Structured Streaming writes to Delta Lake continuously:

```python
stream.writeStream \
    .format("delta") \
    .option("checkpointLocation", "s3://checkpoints/orders/") \
    .outputMode("append") \
    .trigger(processingTime="1 minute") \    # micro-batch every minute
    .start("s3://delta/silver/orders/")
```

**Checkpoint importance:** The checkpoint file tracks which Kafka offsets have been successfully written. On failure and restart, Spark picks up exactly where it left off — no reprocessing, no data loss.

### Loading into Operational Stores (Redis / DynamoDB)

When processed data needs to be served by an application (not just queried by analysts):

```python
# Spark job writes ML predictions to Redis for the recommendation service
for row in predictions_df.collect():
    redis.setex(
        f"user:{row['user_id']}:recommendations",
        3600,                              # 1-hour TTL
        json.dumps(row['product_ids'])
    )
```

**Bulk write pattern for DynamoDB:**

```python
# Use batch_writer — groups 25 items per API call (DynamoDB limit)
with dynamo_table.batch_writer() as batch:
    for row in df.itertuples():
        batch.put_item(Item={
            'user_id': row.user_id,
            'segment': row.segment,
            'updated_at': row.updated_at.isoformat(),
        })
```

---

## Loading into Data Lakes — Critical Data Quality

For financial records, compliance data, or any destination where loading errors have regulatory consequences:

### Pre-Load Validation

```python
def validate_before_load(df, expected_count, expected_revenue_total):
    actual_count = df.count()
    actual_total = df.agg(F.sum("revenue_usd")).collect()[0][0]

    if actual_count < expected_count * 0.95:   # allow 5% tolerance
        raise DataQualityError(f"Row count too low: {actual_count} vs expected {expected_count}")

    if abs(actual_total - expected_revenue_total) > 0.01:
        raise DataQualityError(f"Revenue mismatch: {actual_total} vs {expected_revenue_total}")
```

### Load Verification (Post-Load Reconciliation)

After the load completes, verify the destination matches expectations:

```python
def post_load_reconcile(source_df, destination_path, partition):
    loaded_df = spark.read.parquet(f"{destination_path}/order_date={partition}/")

    source_count = source_df.count()
    loaded_count = loaded_df.count()

    if source_count != loaded_count:
        # Alert — rerun the load
        raise ReconciliationError(f"Loaded {loaded_count} rows, expected {source_count}")

    # Checksum: compare sum of a key column
    source_sum = source_df.agg(F.sum("revenue_usd")).collect()[0][0]
    loaded_sum = loaded_df.agg(F.sum("revenue_usd")).collect()[0][0]

    if abs(source_sum - loaded_sum) > 0.01:
        raise ReconciliationError(f"Revenue checksum mismatch after load")
```

---

## Idempotent Loading — The Most Important Property

An **idempotent load** produces the same result no matter how many times it runs. This is essential for retries and backfills.

```
Non-idempotent:  mode("append") on the same partition
→ Run 1: 100K rows loaded
→ Run 2 (retry after failure): another 100K rows appended = 200K rows, all duplicates

Idempotent:  mode("overwrite") with dynamic partition overwrite
→ Run 1: partition written with 100K rows
→ Run 2 (retry): partition overwritten with 100K rows = same result
```

**Making every load idempotent:**

| Pattern | Idempotent? | How |
|---------|------------|-----|
| `mode("append")` | ❌ No | Duplicate rows on retry |
| `mode("overwrite")` partition | ✅ Yes | Replaces partition each run |
| MERGE (upsert) | ✅ Yes | Updates existing rows, inserts new |
| COPY with `TRUNCATE + INSERT` | ✅ Yes | Clears and reloads the target |
| Staging table → swap | ✅ Yes | Load to staging, rename atomically |

---

## Common Interview Questions

**"How do you load data without breaking queries that are running?"**

Atomic partition replacement: write to a new partition, then swap. With Delta Lake, writes are transactional — a query sees either the old data or the new data, never a partial write. With Snowflake COPY, the entire batch is visible atomically after the COPY completes.

**"What's the small file problem and how do you fix it?"**

Streaming jobs and parallel Spark writes create many small files (one per task). Small files hurt query performance because each file requires a separate S3 API call and a Parquet footer read. Fix: `OPTIMIZE` command in Delta Lake (compacts small files into larger ones), or `coalesce` before writing in batch jobs.

**"How do you backfill 3 months of data without affecting ongoing loads?"**

Partition by date and run the backfill as a separate Airflow DAG with `max_active_runs=1`. Dynamic partition overwrite means each backfill run replaces only its own date partition — it doesn't interfere with today's live load writing to today's partition.

---

## Key Takeaways

- Bulk COPY for large batch loads (fastest, atomic); MERGE for mutable records that update; dynamic partition overwrite for idempotent daily batch loads
- Delta Lake adds ACID transactions, MERGE, and time travel to S3 Parquet — essential for production data lakes
- Checkpoint files in Spark Streaming track committed Kafka offsets — restarts resume exactly where they left off
- Target 128 MB–1 GB per Parquet file; use `coalesce()` before writing to prevent the small file problem
- **Every load must be idempotent** — `mode("append")` is not idempotent; `mode("overwrite")` with dynamic partitioning is
- Post-load reconciliation (row count + checksum verification) is mandatory for financial and compliance data
