## What Transformation Actually Covers

Transformation is the widest layer of the pipeline — it's everything that happens to data between extraction and the final analytical destination. It includes cleaning, enrichment, reshaping, aggregating, and applying business rules.

The first question to answer before designing a transformation layer: **does this need to run in real time, or can it run in batch?**

---

## Batch Transformation

Runs on a schedule (hourly, daily) against accumulated data. The default choice — simpler, cheaper, easier to test and debug.

### The Standard Transformation Checklist

Every Silver-layer transformation should cover these in order:

```python
from pyspark.sql import functions as F

def silver_transform(raw_df):
    return (
        raw_df
        # 1. Deduplication — remove exact duplicates and late-arriving replays
        .dropDuplicates(["order_id"])

        # 2. Null validation — drop or flag records missing required fields
        .filter(F.col("order_id").isNotNull() & F.col("customer_id").isNotNull())

        # 3. Type casting — strings to proper types
        .withColumn("order_date",    F.to_date("order_date_str", "yyyy-MM-dd"))
        .withColumn("total_amount",  F.col("total_amount_str").cast("decimal(12,2)"))

        # 4. Normalization — consistent values
        .withColumn("status",        F.upper(F.trim(F.col("status"))))
        .withColumn("country_code",  F.upper(F.col("country_code")))

        # 5. Derived columns — compute new fields from existing ones
        .withColumn("revenue_usd",
            F.when(F.col("currency") == "USD", F.col("total_amount"))
             .otherwise(F.col("total_amount") * F.col("exchange_rate")))

        # 6. Select only the columns the downstream layer needs
        .select("order_id", "customer_id", "order_date", "status", "revenue_usd")
    )
```

### Data Cleansing Patterns

**Handling nulls:**

```python
# Option 1: Drop rows with null in a required field
df.filter(F.col("user_id").isNotNull())

# Option 2: Fill with a default (for non-required fields)
df.fillna({"discount_pct": 0.0, "notes": ""})

# Option 3: Flag for review instead of dropping
df.withColumn("has_null_flag",
    F.when(F.col("email").isNull(), True).otherwise(False))
```

**Handling duplicates:**

```python
# Dedup by primary key — keep the most recent record
df.dropDuplicates(["order_id"])   # keeps first occurrence in partition

# Or: explicit window-based dedup (keeps the latest by timestamp)
from pyspark.sql.window import Window

w = Window.partitionBy("order_id").orderBy(F.col("_extracted_at").desc())
df.withColumn("rn", F.row_number().over(w)).filter("rn = 1").drop("rn")
```

**Why window-based dedup is better for CDC data:** `dropDuplicates` keeps an arbitrary row when there are duplicates. For CDC events, you always want the latest version (highest `_extracted_at` or `_cdc_ts`) — the window approach guarantees that.

### Data Enrichment

Enrichment adds context that wasn't in the original record by joining to reference tables:

```python
# Enrich orders with product information
orders = spark.read.parquet("s3://silver/orders/")
products = spark.read.parquet("s3://reference/products/")    # small — broadcast

enriched = orders.join(
    F.broadcast(products),   # broadcast small table → no shuffle
    on="product_id",
    how="left"               # left join — don't drop orders with unknown product
)
```

Common enrichments:
- Currency conversion (join to exchange rate table by date)
- Geo enrichment (join lat/lon to city/country lookup)
- User segment enrichment (join to current user profile)
- Product categorization (join to product catalog)

---

## Real-Time Transformation

When data must be transformed as it arrives — within seconds or minutes of ingestion.

### Spark Structured Streaming

The most common real-time transformation pattern — micro-batch, runs every 30 seconds to 5 minutes:

```python
# Read from Kafka
raw_stream = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "broker:9092")
    .option("subscribe", "raw-orders")
    .load()
)

# Parse and transform
transformed = (
    raw_stream
    .select(F.from_json(F.col("value").cast("string"), schema).alias("data"))
    .select("data.*")
    .filter(F.col("order_id").isNotNull())
    .withColumn("order_ts", F.to_timestamp("event_time_str"))
    .withColumn("revenue_usd",
        F.when(F.col("currency") == "USD", F.col("amount"))
         .otherwise(F.col("amount") * F.col("exchange_rate")))
)

# Write to Silver Delta Lake
(
    transformed.writeStream
    .format("delta")
    .option("checkpointLocation", "s3://checkpoints/orders-silver/")
    .outputMode("append")
    .trigger(processingTime="1 minute")    # micro-batch every 1 min
    .start()
)
```

### Flink for Stateful Real-Time Transformation

When transformation requires memory across events (velocity features, sessionization, pattern detection):

```python
# Stateful deduplication using Flink — remember seen IDs
class DeduplicateByEventId(KeyedProcessFunction):
    def open(self, ctx):
        # State: set of seen event_ids (with TTL to avoid unbounded growth)
        state_descriptor = ValueStateDescriptor("seen", Types.BOOLEAN())
        ttl_config = StateTtlConfig \
            .new_builder(Time.hours(24)) \
            .set_update_type(StateTtlConfig.UpdateType.OnCreateAndWrite) \
            .build()
        state_descriptor.enable_time_to_live(ttl_config)
        self.seen = ctx.get_state(state_descriptor)

    def process_element(self, event, ctx):
        if not self.seen.value():
            self.seen.update(True)
            yield event   # first time seeing this event_id — pass through
        # else: duplicate — silently drop
```

**When to use Flink vs Spark Streaming:**
- Use Spark Streaming for stateless or simple stateful transformations (windowed aggregations) — familiar API, lower operational overhead
- Use Flink when state is large (millions of keys), complex (multiple state types per key), or when you need millisecond latency

---

## Transformation at the Warehouse Layer — SQL and dbt

For the Gold layer, most transformations happen in SQL inside the warehouse. dbt manages this layer:

```sql
-- models/gold/fact_orders.sql
-- One row per completed order

WITH silver AS (
    SELECT * FROM {{ ref('silver_orders') }}
),

with_revenue AS (
    SELECT
        order_id,
        customer_id,
        product_id,
        order_date,
        status,
        quantity,
        unit_price_usd,
        quantity * unit_price_usd                               AS gross_revenue_usd,
        quantity * unit_price_usd * (1 - COALESCE(discount_pct, 0) / 100) AS net_revenue_usd
    FROM silver
    WHERE status IN ('completed', 'delivered')
)

SELECT * FROM with_revenue
```

**SQL transformation advantages over Spark for Gold:**
- Runs inside the warehouse — no Spark cluster needed
- Business logic is readable by analysts, not just engineers
- dbt adds testing, documentation, lineage tracking
- Warehouse query optimizer handles performance

---

## Transformation Quality — Testing What You Transform

Transformations introduce bugs. Test them.

### dbt tests (declarative):

```yaml
# schema.yml
models:
  - name: silver_orders
    columns:
      - name: order_id
        tests: [not_null, unique]
      - name: status
        tests:
          - accepted_values:
              values: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
      - name: revenue_usd
        tests:
          - not_null
          - dbt_utils.expression_is_true:
              expression: ">= 0"   # revenue can't be negative
```

### Spark unit tests (for complex transformation logic):

```python
def test_currency_normalization():
    input_data = [
        {"order_id": "1", "amount": 100.0, "currency": "USD", "exchange_rate": 1.0},
        {"order_id": "2", "amount": 85.0,  "currency": "EUR", "exchange_rate": 1.1},
    ]
    df = spark.createDataFrame(input_data)
    result = silver_transform(df)

    rows = {r["order_id"]: r for r in result.collect()}
    assert rows["1"]["revenue_usd"] == 100.0
    assert abs(rows["2"]["revenue_usd"] - 93.5) < 0.01
```

---

## Common Interview Questions

**"How do you handle schema evolution in transformations?"**

The Bronze layer absorbs schema changes (JSON/Avro is flexible). The transformation layer needs to be defensive: use `F.col("new_field") if "new_field" in df.columns else F.lit(None)` for optional fields. In dbt, use `{{ adapter.get_columns_in_relation(ref('source')) }}` to introspect schema dynamically. Alert when unexpected fields appear or required fields disappear.

**"What's the difference between transformation in Spark vs SQL (dbt)?"**

Spark for complex logic: UDFs, ML feature engineering, large joins that don't fit in warehouse memory, Python-native transformations. SQL/dbt for business logic: simpler, readable by analysts, runs in the warehouse without extra infrastructure, comes with testing and lineage for free. The modern pattern is Spark for Silver, dbt for Gold.

**"What's the risk of enriching data in the transformation layer vs at read time?"**

Enriching at transformation time (joining to a product catalog in Silver) freezes the enrichment at the time of transformation. If the product catalog changes, historical Silver records reflect old product names. Enriching at read time (join in Gold SQL) always uses the current catalog. The right choice depends on whether historical accuracy matters — SCD2 dimensions solve this at the cost of complexity.

---

## Key Takeaways

- Every Silver transformation follows the same checklist: dedup → null validation → type casting → normalization → derived columns → select
- Window-based dedup (keep latest by timestamp) is better than `dropDuplicates` for CDC data — guarantees you keep the most recent version
- Spark Structured Streaming for real-time Silver; Flink when state is large or latency needs to be sub-second
- SQL/dbt for Gold layer transformations — readable, testable, governed, runs in the warehouse
- State TTL in Flink prevents unbounded memory growth — always configure TTL on deduplication and session state
- Test transformations: dbt generic tests for data quality assertions, Spark unit tests for complex transformation logic
