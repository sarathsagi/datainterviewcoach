import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const decks: { topic: string; topicSlug: string; cards: { front: string; back: string }[] }[] = [
  {
    topic: "Data Modeling",
    topicSlug: "data-modeling",
    cards: [
      {
        front: "What is the grain of a fact table?",
        back: "The grain defines exactly what one row represents — the most atomic unit being measured (e.g., 'one row per order line item'). It's the single most important decision in dimensional modeling. Getting it wrong causes double-counting and incorrect aggregations.",
      },
      {
        front: "What is a surrogate key, and why use one instead of a natural key?",
        back: "A system-generated, meaningless integer used as the dimension's primary key. Surrogate keys decouple the warehouse from source system changes, support SCD Type 2 (each version gets its own surrogate key), and provide a stable join target regardless of what happens upstream.",
      },
      {
        front: "What is SCD Type 2 and how does it track history?",
        back: "SCD Type 2 preserves full history by inserting a new row for each attribute change. Each row has effective_start_date, effective_end_date (or is_current flag), and a new surrogate key. The natural key stays constant across all versions. Active records conventionally use 9999-12-31 as end date.",
      },
      {
        front: "Star schema vs. snowflake schema — what's the key difference?",
        back: "Star schema: dimension tables are fully denormalized (one level, direct join to fact). Snowflake schema: dimension tables are normalized into sub-dimensions (multiple levels, more joins). Star schema is preferred for analytics — simpler SQL, fewer JOINs, and better BI tool performance.",
      },
      {
        front: "What is a conformed dimension?",
        back: "A dimension shared across multiple fact tables with identical keys, attributes, and semantics (e.g., the same Date or Customer dimension used by both Sales and Inventory). Conformed dimensions enable drill-across analysis between subject areas without creating mismatched joins.",
      },
      {
        front: "What is a degenerate dimension?",
        back: "A dimension key stored directly in the fact table with no corresponding dimension table — it has no useful attributes beyond the key itself. Examples: order_number, invoice_id, transaction_id. You can filter and group by them, but there's nothing to join to.",
      },
      {
        front: "What is a junk dimension?",
        back: "A dimension that consolidates multiple low-cardinality flags and indicators into one table to avoid cluttering the fact table. Example: combining is_gift, is_first_order, is_loyalty_member into a JunkDimension with 2³ = 8 rows (one for each combination). Reduces fact table width significantly.",
      },
      {
        front: "What distinguishes additive, semi-additive, and non-additive measures?",
        back: "Additive: can be summed across all dimensions (revenue, quantity). Semi-additive: meaningful to sum across some dimensions but not time — e.g., account balance (sum across accounts makes sense; summing daily balances across months does not). Non-additive: cannot be summed at all — ratios, percentages, distinct counts.",
      },
      {
        front: "What is a bridge table in dimensional modeling?",
        back: "A bridge table resolves a many-to-many relationship between a fact table and a multi-valued dimension. Example: a customer can hold multiple accounts — a CustomerAccountBridge links them, often with a weighting factor (e.g., 1/number_of_accounts) to prevent double-counting.",
      },
      {
        front: "What is 3NF (Third Normal Form) and when is it used?",
        back: "A table is in 3NF when: (1) it's in 2NF, and (2) no non-key column depends on another non-key column (no transitive dependencies). This is the standard for OLTP design. Data warehouses intentionally violate 3NF through denormalization to reduce JOIN complexity and improve analytical query performance.",
      },
    ],
  },

  {
    topic: "SQL Concepts",
    topicSlug: "sql",
    cards: [
      {
        front: "What does PARTITION BY do in a window function?",
        back: "Divides rows into groups for the window calculation — without collapsing rows like GROUP BY does. Each row retains its individual identity while also seeing group-level calculations. Example: SUM(revenue) OVER (PARTITION BY customer_id) adds a per-customer total to every row in the result set.",
      },
      {
        front: "What is the difference between WHERE and HAVING?",
        back: "WHERE filters rows before grouping — it cannot reference aggregate functions. HAVING filters groups after aggregation — it can reference aggregate functions. Rule of thumb: WHERE is for row-level conditions on raw data; HAVING is for conditions on the output of GROUP BY.",
      },
      {
        front: "What does LAG() / LEAD() do, and give a practical use case?",
        back: "LAG(col, n) returns the value of col from n rows before the current row within the partition+order. LEAD(col, n) returns n rows after. Use cases: month-over-month revenue change (current_month - LAG(revenue) OVER (PARTITION BY product ORDER BY month)), time delta between events, detecting state transitions.",
      },
      {
        front: "What is the difference between RANK(), DENSE_RANK(), and ROW_NUMBER()?",
        back: "All assign a number per row within a partition. ROW_NUMBER: always unique sequential integers (no ties). RANK: tied rows share the same rank, next rank skips (1, 1, 3). DENSE_RANK: tied rows share rank, next rank doesn't skip (1, 1, 2). Use DENSE_RANK for top-N-per-group without gaps.",
      },
      {
        front: "What is a CTE (Common Table Expression) and when should you use one?",
        back: "A CTE (WITH clause) creates a named temporary result set within a single query. Use CTEs to: break a complex query into readable, named steps; avoid repeating identical subquery logic; write recursive queries (WITH RECURSIVE). Unlike subqueries, CTEs can be referenced multiple times in the same query.",
      },
      {
        front: "What does the MERGE statement do?",
        back: "MERGE (UPSERT) performs INSERT, UPDATE, and DELETE in a single atomic operation based on a join condition. When source row matches target: UPDATE or DELETE. When source row has no match in target: INSERT. Essential for idempotent CDC loads, SCD Type 2 updates, and incremental processing.",
      },
      {
        front: "What is partition pruning and why does it matter for cost?",
        back: "The query optimizer eliminates entire storage partitions that cannot contain rows matching a WHERE filter — they are never read from disk. A table partitioned by date with WHERE event_date = '2024-01-01' skips all other partitions. In BigQuery/Snowflake, this directly reduces bytes scanned and cost.",
      },
      {
        front: "What does EXPLAIN ANALYZE tell you about a query?",
        back: "EXPLAIN ANALYZE runs the query and shows the actual execution plan with real metrics per node: actual row counts, actual timings, estimated vs actual discrepancies, memory usage, and whether indexes were used. Use it to find: missing indexes (sequential scans), bad cardinality estimates, slow join strategies.",
      },
      {
        front: "What is a materialized view?",
        back: "A precomputed, physically stored query result that can be queried directly. Unlike regular views (which re-execute on every access), materialized views read from cached storage. Trade-off: fast reads but requires refresh when underlying data changes. Use for expensive aggregations queried frequently by BI tools.",
      },
      {
        front: "What is a lateral join and when is it useful?",
        back: "A LATERAL join (or CROSS JOIN LATERAL) allows the right-hand subquery to reference columns from tables to its left — like a correlated subquery that returns multiple rows. Use cases: get top-N rows per group efficiently, unnest arrays with access to outer columns, apply a table-valued function per row.",
      },
    ],
  },

  {
    topic: "Streaming & CDC",
    topicSlug: "streaming-cdc",
    cards: [
      {
        front: "What is log-based CDC and why is it preferred over trigger-based?",
        back: "Log-based CDC reads the database's transaction log (WAL in PostgreSQL, binlog in MySQL) rather than using DB triggers. Advantages: near-zero overhead on the source DB, captures all change types including deletes, preserves commit order, and does not require schema changes. Tools: Debezium, AWS DMS.",
      },
      {
        front: "What is the difference between at-least-once, at-most-once, and exactly-once?",
        back: "At-most-once: events may be lost but never duplicated (fire and forget). At-least-once: no events lost but duplicates possible — consumers must be idempotent. Exactly-once: no loss, no duplicates — requires coordination between source, processor, and sink (e.g., Kafka transactions + idempotent producers).",
      },
      {
        front: "What is a watermark in streaming?",
        back: "A threshold defining how late data can arrive and still be included in a time window. A watermark of event_time - 10 minutes means the system waits 10 minutes past a window's end before finalizing it. Events arriving after the watermark are either dropped or trigger a late-data update, depending on configuration.",
      },
      {
        front: "What is backpressure in a streaming pipeline?",
        back: "The mechanism by which a slow downstream consumer signals the upstream producer to slow down. Without backpressure, producers overwhelm consumers causing memory exhaustion or data loss. Handled via: Kafka's pull model (consumers pull at their own pace), reactive streams protocol, or dropping messages with explicit shed-load policies.",
      },
      {
        front: "What is a Kafka tombstone record?",
        back: "A message with a valid key and a null value. Used in log-compacted topics to represent deletes: Kafka compaction retains only the latest value per key, then eventually removes tombstones too. CDC connectors emit tombstones when source rows are deleted, keeping compacted topics consistent with source data.",
      },
      {
        front: "What is consumer group lag in Kafka?",
        back: "The difference between the latest offset (newest message in a partition) and the consumer group's committed offset (last message processed). High lag means consumers are falling behind producers. Monitor with kafka-consumer-groups.sh, Burrow, or Prometheus. Persistent lag indicates a need to scale consumers or optimize processing.",
      },
      {
        front: "What is the role of a schema registry in event streaming?",
        back: "A centralized store for Avro/JSON/Protobuf schemas. Producers register schemas before publishing; each message includes a schema ID. Consumers fetch the schema to deserialize messages. Compatibility rules (backward, forward, full) ensure producers don't break existing consumers when evolving schemas.",
      },
      {
        front: "What is stateful stream processing?",
        back: "Stream processing that maintains state between events — counting events per user per session, joining two streams on matching keys, or computing running totals. Requires a state backend (RocksDB in Flink, changelog topics in Kafka Streams) to persist state durably so processing can resume correctly after failures.",
      },
    ],
  },

  {
    topic: "Data Architecture",
    topicSlug: "data-architecture",
    cards: [
      {
        front: "What is a data lakehouse?",
        back: "An architecture that combines data lake flexibility (cheap open-format object storage, ML-friendly) with data warehouse capabilities (ACID transactions, schema enforcement, BI-quality SQL performance). Implemented with Delta Lake, Apache Iceberg, or Apache Hudi on top of S3/GCS/ADLS. Eliminates the need to copy data between a lake and warehouse.",
      },
      {
        front: "What are the three layers of the medallion architecture?",
        back: "Bronze: raw, append-only data exactly as ingested from sources — no transforms, no deletes. Silver: cleaned, deduplicated, conformed data with enforced schema. Gold: business-level aggregates, denormalized tables, and metrics optimized for BI and data science consumption. Each layer adds trust without destroying source data.",
      },
      {
        front: "What is a data contract?",
        back: "A formal, machine-enforceable agreement between a data producer and its consumers specifying: schema and data types, quality SLOs (null rates, uniqueness), delivery SLAs, and change notification obligations. Shifts the cost of breaking changes to producers before consumers are affected. Tools: Soda, Great Expectations, custom YAML specs.",
      },
      {
        front: "What is data mesh and its four core principles?",
        back: "A decentralized architecture where domain teams own and publish data as products. The four principles: (1) Domain ownership — teams own their data end-to-end. (2) Data as a product — discoverable, trustworthy, documented. (3) Self-serve infrastructure — platform enables teams without central bottleneck. (4) Federated governance — global standards applied locally.",
      },
      {
        front: "Lambda vs. Kappa architecture — what's the fundamental difference?",
        back: "Lambda: two separate code paths — batch layer (accurate, high latency) and speed layer (approximate, low latency) merged in a serving layer. Main pain: maintaining two codebases for the same logic. Kappa: a single streaming code path for everything. Historical reprocessing is done by replaying a long-retention event log (Kafka). Kappa is simpler but requires a powerful streaming system.",
      },
      {
        front: "What is ETL vs. ELT?",
        back: "ETL (Extract-Transform-Load): data is transformed in an intermediate system before loading into the warehouse. Bottleneck: the transformation infrastructure. ELT (Extract-Load-Transform): raw data loads directly into the warehouse, then transformed using SQL/dbt inside the warehouse. ELT became dominant when cloud warehouse compute became cheap. dbt is the primary ELT transformation tool.",
      },
      {
        front: "What is event sourcing?",
        back: "A pattern where system state changes are stored as a sequence of immutable events rather than overwriting current state. Current state is derived by replaying all events. Benefits: complete audit trail, time travel to any past state, easy event-driven integrations. Kafka is commonly used as the event log.",
      },
      {
        front: "What is a data catalog?",
        back: "A centralized inventory of data assets (tables, pipelines, dashboards, ML models) enriched with metadata: schema, data lineage, quality metrics, ownership, documentation, and usage stats. Helps consumers discover available data and understand its trustworthiness. Tools: DataHub, Amundsen, Alation, Google Data Catalog.",
      },
    ],
  },

  {
    topic: "Open Table Formats",
    topicSlug: "open-table-formats",
    cards: [
      {
        front: "What problem do open table formats (Delta Lake, Iceberg, Hudi) solve?",
        back: "Object storage (S3, GCS, ADLS) provides no transactions, schema enforcement, or consistency guarantees beyond file-level operations. Open table formats add a metadata layer that enables: ACID transactions, schema evolution, time travel, concurrent reads/writes, and efficient metadata pruning — all on Parquet/ORC files in object storage.",
      },
      {
        front: "How does Delta Lake's transaction log work?",
        back: "Every commit creates a JSON file in the _delta_log directory listing added and removed data files, schema changes, and operation metadata. This log enables: atomicity (all-or-nothing commits), time travel (read any historical version by replaying to that log entry), snapshot isolation (readers see a consistent state), and write conflict detection.",
      },
      {
        front: "How does Apache Iceberg's metadata hierarchy differ from Delta Lake?",
        back: "Iceberg uses a tree: metadata.json → manifest list (per snapshot) → manifest files (per partition group) → Parquet data files. Delta uses a flat JSON transaction log. Iceberg's tree enables efficient pruning at petabyte scale — query engines jump directly to relevant manifest files without scanning all metadata, unlike Delta's linear log.",
      },
      {
        front: "What is Copy-on-Write (CoW) vs. Merge-on-Read (MoR) in Apache Hudi?",
        back: "CoW: every update rewrites entire Parquet files — clean, fast reads (no merging needed) but slower, more expensive writes. MoR: updates written to delta log files alongside base Parquet files, merged at read time or during compaction — very fast writes but reads must merge base + delta until compaction runs. Use CoW for read-heavy, MoR for write-heavy CDC ingestion.",
      },
      {
        front: "How does time travel work in Iceberg?",
        back: "Every Iceberg commit creates an immutable snapshot pointing to the current set of data files. Old snapshots are retained until explicitly expired. Query with: SELECT * FROM table FOR SYSTEM_VERSION AS OF <snapshot_id> or FOR SYSTEM_TIME AS OF '2024-01-01 00:00:00'. Historical files are never overwritten — old snapshots are still valid.",
      },
      {
        front: "What is partition evolution in Iceberg and why is it significant?",
        back: "The ability to change a table's partition scheme without rewriting existing data. Example: switch from monthly to daily partitioning for recent data as volume grows. Iceberg stores the partition spec per data file in metadata. Queries transparently handle both partition layouts simultaneously — impossible with traditional Hive-style partitioning.",
      },
      {
        front: "Why is schema evolution safer in Iceberg than with raw Parquet?",
        back: "Iceberg tracks columns by stable IDs (not by name or position). Renaming a column or reordering columns only updates metadata — existing data files remain valid since mapping is by ID, not position. Raw Parquet files use positional column ordering: renaming a column breaks any reader expecting the old position or name.",
      },
      {
        front: "What is Z-ordering (ZORDER BY) in Delta Lake?",
        back: "A multi-dimensional clustering technique that co-locates related data within Parquet files. OPTIMIZE ... ZORDER BY (col1, col2) compacts small files and rearranges rows so similar values in those columns are physically stored together. Improves data skipping for equality and range filters on those columns — similar to Snowflake's clustering keys.",
      },
    ],
  },

  {
    topic: "Cloud & Warehousing",
    topicSlug: "cloud-warehousing",
    cards: [
      {
        front: "What is BigQuery's pricing model for on-demand queries?",
        back: "BigQuery on-demand charges per byte of data scanned (~$5/TB). You are NOT charged per row returned, per query, or per execution time. This is why: selecting only needed columns, partitioning tables (skip entire partitions), and clustering (reduce rows scanned within partitions) are the three most impactful cost optimizations.",
      },
      {
        front: "What is a Snowflake virtual warehouse?",
        back: "An independent compute cluster that executes SQL queries. Each warehouse has dedicated CPU, memory, and local SSD cache. Multiple warehouses can read from the same storage layer simultaneously without resource contention. Auto-suspend pauses billing when idle; auto-resume starts it on demand. Size up for complex queries; add multi-cluster for concurrency.",
      },
      {
        front: "What is Snowflake's result cache?",
        back: "A global cache at the Cloud Services layer that stores query results for 24 hours. If an identical query runs against unchanged data, Snowflake serves it from cache with zero compute cost. Unlike the warehouse-level cache (local SSD), the result cache persists across warehouse suspensions and is shared across users.",
      },
      {
        front: "What is data skew in distributed query engines and how do you fix it?",
        back: "When one partition/node processes far more data than others, it becomes the bottleneck while others sit idle. Causes: skewed join keys (e.g., NULLs all routing to one partition), hot user IDs. Fixes: salting (add random prefix to keys), broadcast joins for small tables, SKEW join hints in Spark, BigQuery's approximate skew handling.",
      },
      {
        front: "What is predicate pushdown?",
        back: "An optimization where filter conditions are pushed as close to the data source as possible — evaluated when reading files rather than after loading data into memory. Parquet column statistics (min/max per row group) enable skipping row groups that can't match a filter. Critical for performance in all columnar formats: Parquet, ORC, Delta, Iceberg.",
      },
      {
        front: "When should you use BigQuery flat-rate (slot) pricing vs. on-demand?",
        back: "On-demand is cheaper for sporadic, unpredictable workloads. Flat-rate (slot reservations) is more economical for consistent, high-volume workloads where monthly on-demand cost exceeds the slot commitment cost. Rough break-even: ~$2K/month on-demand usage. Flat-rate also provides guaranteed capacity — no competition with other users.",
      },
      {
        front: "What is the difference between BigQuery partitioning and clustering?",
        back: "Partitioning physically divides table data into separate storage segments by a column (date, integer range). Clustering sorts data within each partition by 1–4 columns. Partitioning prunes entire segments (biggest impact); clustering further reduces rows scanned within a partition. Both are free, additive, and can be combined.",
      },
      {
        front: "What is object storage eventual consistency, and does it still apply to S3?",
        back: "Historically S3 had eventual consistency for overwrite PUTs and DELETEs — you might read stale data immediately after a write. Since December 2020, Amazon S3 offers strong read-after-write consistency for all operations in all regions. GCS and ADLS also offer strong consistency. This matters for ETL pipelines that immediately read files after writing them.",
      },
    ],
  },

  {
    topic: "Python Engineering",
    topicSlug: "python",
    cards: [
      {
        front: "What is a Python generator and when should you use one?",
        back: "A function that uses yield to produce values lazily — one at a time, on demand — rather than building the full collection in memory. Use generators for: processing large files line-by-line, reading paginated API results, creating data pipeline stages. A 10M row file processed with a generator uses O(1) memory; a list uses O(n).",
      },
      {
        front: "What is a Python decorator?",
        back: "A function that wraps another function to add behavior without modifying the original. Syntax: @decorator. Common DE uses: @retry (retry failed API calls), @timer (log execution time), @validate_schema (check input data types). Always use functools.wraps(func) inside the wrapper to preserve the original function's name and docstring.",
      },
      {
        front: "What is a context manager and what problem does it solve?",
        back: "An object with __enter__ and __exit__ methods (or using @contextmanager) that guarantees cleanup code runs even if an exception occurs. Use with: statement. Examples: open() closes files, engine.connect() commits/rolls back DB transactions. Prevents resource leaks (open file handles, unclosed DB connections) in long-running pipelines.",
      },
      {
        front: "What is the Python GIL and how does it affect data engineering workloads?",
        back: "The Global Interpreter Lock prevents multiple Python threads from executing Python bytecode simultaneously. For CPU-bound work (data transformation, parsing): use multiprocessing — separate processes each have their own GIL. For I/O-bound work (API calls, DB queries): threading or asyncio works well — the GIL releases during I/O waits, allowing concurrency.",
      },
      {
        front: "What is exponential backoff with jitter?",
        back: "A retry strategy that increases wait time exponentially after each failure (2^n seconds) plus a random jitter to prevent the 'thundering herd' — many clients retrying simultaneously and overwhelming the server together. Formula: wait = min(cap, base * 2^attempt) + random(0, base). Use for API rate limits, transient network errors, DB connection failures.",
      },
      {
        front: "What are Python dataclasses and why use them?",
        back: "The @dataclass decorator auto-generates __init__, __repr__, and __eq__ based on class field annotations. Use for: typed config objects, schema definitions, data transfer objects. Add frozen=True for immutable configs (safe to use as dict keys). More concise than manual __init__ methods; lighter than pydantic for simple cases.",
      },
      {
        front: "What is the difference between concurrency and parallelism in Python?",
        back: "Concurrency: tasks make progress by interleaving on a single CPU core — threading and asyncio. Good for I/O-bound work (API calls, file reads) where tasks spend most time waiting. Parallelism: tasks truly execute simultaneously on multiple CPU cores — multiprocessing. Necessary for CPU-bound work since the GIL blocks true thread parallelism.",
      },
      {
        front: "When would you use ThreadPoolExecutor vs. ProcessPoolExecutor?",
        back: "ThreadPoolExecutor: best for I/O-bound tasks (parallel API calls, parallel DB queries) where the GIL releases during waits, allowing threads to overlap. ProcessPoolExecutor: best for CPU-bound tasks (heavy data transformation, compression) where multiple CPU cores are needed. Use with concurrent.futures.as_completed() to process results as they arrive.",
      },
    ],
  },

  {
    topic: "System Design",
    topicSlug: "system-design",
    cards: [
      {
        front: "What is idempotency in data pipelines and why is it critical?",
        back: "An operation is idempotent if running it multiple times produces the same result as running it once. Critical because failures and retries are inevitable. Design for idempotency using: MERGE/UPSERT instead of INSERT, writing to deterministic output paths, overwriting instead of appending. An idempotent pipeline can be safely retried after any failure without data corruption.",
      },
      {
        front: "What is the CAP theorem?",
        back: "During a network partition, a distributed system must choose between Consistency (every read returns the most recent write) and Availability (every request receives a response, possibly stale). CP systems (HBase, ZooKeeper) return errors rather than stale data. AP systems (Cassandra, DynamoDB) return stale data rather than errors.",
      },
      {
        front: "What is a watermark in streaming and how does it handle late data?",
        back: "A watermark is the system's estimate of how far event time has progressed. It defines a threshold: events with event_time < watermark are considered late. When the watermark advances past a window's end time, that window is finalized. Late events can: trigger a window update (allowed lateness), be routed to a side output, or be dropped — depending on policy.",
      },
      {
        front: "What causes hot partitions in Kafka and how do you prevent them?",
        back: "Hot partitions occur when a partition key has very uneven cardinality — e.g., 80% of events share the same key, routing to one partition. Prevention: choose high-cardinality keys (user_id, session_id) for natural distribution, use round-robin (null key) when ordering doesn't matter, hash-based partitioning with a salt prefix for skewed keys.",
      },
      {
        front: "What is the difference between a data pipeline SLA and SLO?",
        back: "SLO (Service Level Objective): the internal target you set for yourself — e.g., 'pipeline completes within 30 minutes of data landing 95% of the time.' SLA (Service Level Agreement): the contractual commitment to a customer or downstream team — e.g., 'dashboard data is no more than 1 hour stale.' SLOs are typically tighter than SLAs to leave a buffer.",
      },
      {
        front: "What is the difference between row-oriented and columnar storage?",
        back: "Row-oriented (CSV, RDBMS heap): all columns for a row are stored together. Fast for full-row reads and writes (OLTP). Columnar (Parquet, ORC): all values for one column are stored together. Enables: reading only queried columns (I/O reduction), high compression ratios (similar values compress well), vectorized execution. Columnar storage is the standard for analytical workloads.",
      },
      {
        front: "What is a dead letter queue (DLQ)?",
        back: "A queue where messages that fail processing after all retries are sent instead of being dropped or causing an infinite retry loop. DLQs allow: debugging failed messages, reprocessing after fixing the root cause, alerting on persistent failures. Every production data pipeline should have a DLQ strategy — silent message dropping is dangerous.",
      },
      {
        front: "What is the difference between push-based and pull-based data pipelines?",
        back: "Push-based: the producer sends data to the consumer as soon as it's available — e.g., webhook, Kafka producer writing to a topic. Consumer must handle variable throughput. Pull-based: the consumer requests data when it's ready — e.g., Kafka consumer, batch job polling an API. Easier backpressure management. Most production systems use pull-based consumption.",
      },
    ],
  },
];

async function main() {
  let total = 0;

  for (const deck of decks) {
    // Delete existing cards for this topic to enable clean re-seeding
    await prisma.flashCard.deleteMany({ where: { topicSlug: deck.topicSlug } });

    for (let i = 0; i < deck.cards.length; i++) {
      await prisma.flashCard.create({
        data: {
          topic: deck.topic,
          topicSlug: deck.topicSlug,
          front: deck.cards[i].front,
          back: deck.cards[i].back,
          order: i,
        },
      });
      total++;
    }

    console.log(`✅  ${deck.topic}: ${deck.cards.length} cards`);
  }

  console.log(`\n🎉 Seeded ${total} flashcards across ${decks.length} decks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
