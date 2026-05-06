/**
 * seed-learn-fundamentals-2.ts
 *
 * PART 2 of 3 for the "Data Engineering Fundamentals" learning path.
 * The path itself is created in part 1; this script only upserts modules
 * 5–8 (orders 4–7). Senior-DE depth: opinionated, interview-grade, no fluff.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const PATH_SLUG = "data-engineering-fundamentals";
const PATH_ID = `lp-${PATH_SLUG}`;

const MODULES_PART_2: Array<{
  slug: string;
  title: string;
  description: string;
  readTimeMinutes: number;
  content: string;
}> = [
  {
    slug: "batch-vs-streaming",
    title: "Batch vs Streaming: The Processing Dichotomy",
    description:
      "Latency, complexity, cost, and debugging differences. When batch wins, when streaming wins, the rise and fall of Lambda architecture, Kappa, and the modern dual-mode reality in Flink/Beam.",
    readTimeMinutes: 12,
    content: `# Batch vs Streaming: The Processing Dichotomy

Every data platform eventually has the batch-vs-streaming conversation. Junior engineers pick streaming because it sounds modern. Senior engineers pick batch because it's *almost always good enough* — and reach for streaming only when the business genuinely needs sub-minute freshness.

This module exists so you can defend that choice in an interview.

## The four dimensions that actually matter

| Dimension | Batch | Streaming |
|---|---|---|
| **Latency** | Minutes to hours | Milliseconds to seconds |
| **Complexity** | Linear, restartable, cheap mental model | Stateful, out-of-order, watermark-aware, much harder |
| **Cost** | Cheaper per record (bulk reads, columnar scans) | More expensive (always-on compute, hot state) |
| **Debugging** | Re-run yesterday's job and inspect output | Reproduce a state at a point in time across operators |

If you remember nothing else: **streaming buys you latency at the cost of every other dimension**. The interviewer wants to hear that you priced that trade-off.

## When batch wins

- **Correctness over freshness.** Finance reporting, regulatory exports, attribution windows that close at midnight UTC. The business answer is "as of yesterday EOD," not "right now."
- **Slow-moving truth.** Dimension tables, reference data, ML training sets. Recomputing nightly is fine and saves you a streaming join you'll regret.
- **Big windows.** A 90-day rolling aggregation in Flink keeps 90 days of state hot. The same thing in Spark on Parquet costs cents.
- **Backfills.** Replay six months of history? Batch chews through it in hours. Streaming replays force you to retune watermarks, re-grow state, and pray.
- **Simplicity.** A team of three cannot operate a 24/7 Flink job. Don't pretend they can.

## When streaming wins

- **Fraud detection** — minutes-old fraud is unactionable.
- **Real-time personalization** — homepage rerank, ad bidding, search reranking.
- **Operational monitoring** — alerts on revenue drop, broken funnels, latency spikes.
- **Inventory and pricing** — flash sales, dynamic pricing, last-seat-on-the-flight.
- **Compliance with tight SLAs** — GDPR deletion within 30 days is batch; AML transaction screening in seconds is streaming.

The litmus test: *would the business pay $X more per month to cut latency from 1 hour to 1 second?* If the answer is no, build batch.

## Lambda architecture — and why it died

Around 2013, Nathan Marz published the **Lambda architecture**: run a *batch layer* for correctness, a *speed layer* for low-latency approximations, and a *serving layer* that merges them.

\`\`\`
                ┌──────────────┐
   events ──┬──▶│ Batch layer  │──▶ accurate views
            │   └──────────────┘                     ┌──────────┐
            │   ┌──────────────┐                     │ Serving  │──▶ queries
            └──▶│ Speed layer  │──▶ realtime views──▶│  layer   │
                └──────────────┘                     └──────────┘
\`\`\`

It worked. It was also miserable to operate: **two codebases, two semantics, two on-call rotations, two sources of bugs**. Reconciling the two layers ate teams alive.

## Kappa architecture — streaming-only

Jay Kreps' response (2014): use a streaming engine for everything. Backfills become "rewind the log and reprocess." One codebase, one mental model.

Kappa works beautifully when:
- Your log is durable and long-retention (Kafka with tiered storage, Pulsar, Kinesis).
- Your streaming engine can replay history at high throughput.
- Your state size is bounded.

Kappa breaks when:
- Backfills require six months of history and your Kafka retention is 7 days.
- A historical correctness fix needs a one-off SQL query — and your streaming engine doesn't speak SQL well over old data.

## The modern reality: dual-mode engines

Flink, Beam, and Spark Structured Streaming converged on the same answer: **the same code should run in batch or streaming mode**. The engine treats batch as "a stream that ends." This is the practical resolution to the Lambda/Kappa wars.

\`\`\`python
# Apache Beam — same pipeline, two run modes
pipeline = (
    p
    | beam.io.ReadFromKafka(topic="orders") if streaming
       else beam.io.ReadFromParquet("s3://orders/2026-05-*/")
    | beam.Map(parse)
    | beam.WindowInto(FixedWindows(60))
    | beam.CombinePerKey(sum)
    | beam.io.WriteToBigQuery(table)
)
\`\`\`

In production, most modern stacks are **hybrid by accident**: streaming for the hot path, nightly batch for re-derivation and correctness audits. That's not Lambda — it's pragmatism.

## Interview probe: "you said streaming — what changes about your error handling?"

This is where 80% of candidates fall apart. Strong answer hits all five:

1. **Retries are no longer free.** A failed batch job re-runs from the start with the same input. A failed streaming operator must resume from a checkpoint, replay from the source, and reconcile state.
2. **Poison pills block the pipeline.** One unparseable record can stall a partition forever. You need a dead-letter topic, not a try/except that drops silently.
3. **Backpressure is real.** Slow sinks propagate upstream until the source stops consuming. You need to monitor lag, not just error rate.
4. **State recovery is bounded by checkpoint size.** A 500 GB RocksDB state takes minutes to restore. SLA implications are non-trivial.
5. **Out-of-order events.** A late event that arrives after the window closed either: gets dropped, triggers a recomputation, or goes to a side output. You must declare which.

## Cost reality check

A naive comparison: a Spark batch job that runs for 30 minutes nightly costs vastly less than a Flink job running 24x7 against the same data. Multiply by team operational overhead. **Streaming is roughly 10–50x more expensive per record processed** when you account for hot state, always-on compute, and on-call burden.

## Interview traps

1. **"We'll use streaming so we can do batch later."** — Backwards. Build batch, add streaming when latency requirements force you to.
2. **"Lambda gives us correctness AND speed."** — In theory. In practice, it gives you two systems that disagree.
3. **"Spark Structured Streaming is real streaming."** — Micro-batch. Latency floor is hundreds of ms, not single-digit ms. Fine for most use cases, but say it.
4. **"Kafka is a streaming engine."** — Kafka is a log. Your streaming engine is Flink/Beam/Spark *on top of* Kafka.

## What an interviewer is probing

When they ask "batch or streaming?", they're checking:
- Can you articulate the latency / complexity / cost triangle?
- Do you reach for the simpler tool first?
- Do you understand state, watermarks, and replay?
- Have you actually operated a streaming system at 3am?

The right tone: "Default to batch. Reach for streaming when the business case justifies the operational cost. Most 'real-time' requirements are actually 'within 5 minutes' requirements, and Airflow + a 5-minute schedule covers them."

## Practice question

*A product manager wants a "real-time" dashboard showing daily active users. What do you build?*

Strong answer: clarify what "real-time" means. If they accept 5-minute freshness, schedule a Spark job every 5 minutes against an event log. If they need sub-second, you're now justifying a Flink job, hot state, a serving store like Druid or Pinot, and on-call coverage. Make them choose with eyes open.
`,
  },
  {
    slug: "etl-vs-elt",
    title: "ETL vs ELT: Why the Cloud Warehouse Killed the T-in-the-Middle",
    description:
      "Why ETL emerged in the 90s, why the cloud warehouse made ELT viable, what dbt actually does, and the cases where ETL still wins (PII redaction, weak source systems, egress costs).",
    readTimeMinutes: 10,
    content: `# ETL vs ELT: Why the Cloud Warehouse Killed the T-in-the-Middle

If you say "ETL pipeline" in a 2026 interview without flinching, the interviewer marks you as someone who hasn't kept up. The order of operations matters — and the shift from **E-T-L** to **E-L-T** is one of the few genuine architectural revolutions data engineering has had in the last decade.

## The 30-second history

**1990s — ETL is born.** Warehouses (Teradata, Oracle, DB2) were expensive, capacity-constrained, and slow at general-purpose computation. You couldn't afford to load raw data and transform it inside the warehouse — the warehouse hours were too precious. So you bought Informatica, Ab Initio, or DataStage, and ran transformations on a *separate compute tier* before loading clean rows into the warehouse.

\`\`\`
Source ──▶ ETL server (Informatica) ──transform──▶ Warehouse (Teradata)
            [compute lives here]              [storage + queries live here]
\`\`\`

**2012-ish — the cloud warehouse arrives.** Redshift, then BigQuery, then Snowflake. Three things changed simultaneously:
1. Storage decoupled from compute — load whatever you want, it's cheap.
2. Compute scaled elastically — transformations no longer compete with BI queries.
3. SQL got better — window functions, JSON support, semi-structured types, UDFs.

Suddenly, the case for a separate transform tier collapsed. Why pay Informatica licenses *and* run a separate cluster when your warehouse can do the join in 8 seconds?

**2016 — dbt formalizes ELT.** Tristan Handy's insight: if transformations now live in the warehouse, treat them as **version-controlled SQL**. dbt isn't a transformation engine — it's a *workflow* that runs SQL, tracks lineage, tests, and documents.

## The shift, visualized

| | ETL (1990s–2010s) | ELT (2015–today) |
|---|---|---|
| **Order** | Extract → Transform → Load | Extract → Load → Transform |
| **Where compute lives** | Separate tier (Informatica, Talend) | Inside the warehouse (Snowflake, BigQuery, Databricks) |
| **Schema** | Schema-on-write — must be clean before load | Schema-on-read — load raw, transform later |
| **Tooling** | GUI-based, proprietary, expensive | SQL + dbt + git, mostly open-source |
| **Iteration speed** | Slow — change a transform = redeploy ETL job | Fast — change a SQL file, dbt run |
| **Reproducibility** | Hard — transforms happen in flight, no raw data kept | Easy — raw data is preserved, re-transform anytime |
| **Cost model** | License + server + data engineer | Warehouse compute + analytics engineer |

## Why ELT won (mostly)

1. **Compute moved to where data lives.** The warehouse already has the data; shipping it out to transform and back in is a tax.
2. **Schema-on-read became viable.** JSON, VARIANT, STRUCT types let you land messy data and parse later. Source schema changes don't break the load step.
3. **SQL is the lingua franca.** Analysts, analytics engineers, and DEs all read it. Informatica mappings were a black box only one team understood.
4. **Raw data preserved = reproducibility.** When a metric is wrong in production, you re-derive it from the raw landing zone. ETL pipelines threw away the raw rows.
5. **dbt made transformations testable.** Unit tests, schema tests, freshness tests. ETL tools never had this culture.

## When ETL still makes sense

ELT is not universally better. Senior engineers know the four cases where T-in-the-middle still wins:

### 1. PII redaction at the boundary
You cannot legally land raw SSNs, full credit card numbers, or HIPAA-protected fields in a warehouse a hundred analysts can query. **Tokenize, hash, or drop in flight** — that's an in-flight transform, which is ETL by definition. Common pattern: a Lambda or Flink job tokenizes PII before the warehouse loader sees it.

### 2. Weak source systems
A 20-year-old MySQL primary with 4 cores cannot tolerate \`SELECT * FROM events\` against 8 billion rows. You incrementally extract, push to S3, and let the warehouse pull. The "T" here is the smart extraction logic — chunked, throttled, watermark-aware.

### 3. Network egress cost
Cross-region or cross-cloud data movement is *expensive* (often $0.02–$0.09 per GB). If you can pre-aggregate at the source — turn 1 TB of raw events into 5 GB of hourly rollups — you save real money. That's transform-before-load.

### 4. Regulatory data sovereignty
The data legally cannot leave a region. You transform in-region (perhaps to a non-PII derivative) before loading to a global warehouse.

## The modern data stack picture

\`\`\`
                                    ┌─────────────────────────┐
   ┌──────────┐                     │   Warehouse / Lakehouse │
   │ Postgres │──┐                  │  (Snowflake / BQ /      │
   ├──────────┤  │  Fivetran /      │   Databricks)           │
   │  Stripe  │──┼──Airbyte / ─────▶│                         │
   ├──────────┤  │  custom EL       │   raw.*  ──▶ staging.*  │
   │ Salesforce│──┘                  │                ▼        │
   └──────────┘                     │   marts.* ◀── dbt run   │
                                    └────────────┬────────────┘
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │  BI: Looker / Tableau   │
                                    │  Reverse ETL: Hightouch │
                                    │  ML: Feature stores     │
                                    └─────────────────────────┘
\`\`\`

The roles:
- **EL tools** (Fivetran, Airbyte, Stitch, custom): just move bytes. No business logic. Land raw.
- **Warehouse / lakehouse**: storage + compute. Holds raw, staging, and marts.
- **dbt**: orchestrates SQL transformations, tracks lineage, runs tests.
- **Reverse ETL**: ships warehouse data back into operational tools (Salesforce, Marketo).

## What dbt actually is (and isn't)

**Is**: a Python CLI that compiles Jinja-templated SQL into pure SQL, runs it against your warehouse in dependency order, runs tests, and emits docs.

**Is not**: a query engine, a scheduler, a data mover. It does not extract, it does not load, it does not run on its own — Airflow, Dagster, Prefect, or dbt Cloud schedule it.

\`\`\`sql
-- models/marts/fct_orders.sql
{{ config(materialized='incremental', unique_key='order_id') }}

select
  o.order_id,
  o.customer_id,
  o.created_at,
  sum(li.amount) as order_total
from {{ ref('stg_orders') }} o
join {{ ref('stg_line_items') }} li using (order_id)
{% if is_incremental() %}
  where o.created_at > (select max(created_at) from {{ this }})
{% endif %}
group by 1, 2, 3
\`\`\`

The \`ref()\` is the load-bearing piece — it builds a DAG dbt uses to schedule runs.

## Interview trap: "ELT is always better"

It isn't. The right framing:

> "I default to ELT because it's faster to iterate, preserves raw data, and lets analytics engineers own transformations in SQL. I'd push transformation upstream when there's a legal, cost, or capacity reason — PII redaction, weak source systems, cross-region egress. In practice, most modern stacks are 95% ELT with a thin pre-load layer for sensitive fields."

## What an interviewer is probing

- Do you know *why* the shift happened? (Cloud warehouse economics.)
- Can you defend ELT without sounding like a vendor?
- Do you understand when ETL is still right?
- Can you place dbt accurately in the stack?

## Common mistakes

1. **Calling Fivetran "ETL".** It's EL. The T is dbt.
2. **Loading raw PII into the warehouse "we'll mask it in dbt".** Too late — it's in query history, in backups, in dev clones.
3. **Using dbt for streaming.** dbt is batch SQL. For streaming, look at Materialize, RisingWave, or Flink SQL.
4. **Materializing every model as a table.** Views are free; tables cost storage. Use \`incremental\` for big facts, \`view\` for thin transforms, \`table\` for marts.
`,
  },
  {
    slug: "data-lake-vs-warehouse-vs-lakehouse",
    title: "Data Lake vs Warehouse vs Lakehouse: Three Patterns, Three Trade-offs",
    description:
      "Lake (raw, cheap, hard to query), warehouse (structured, fast, expensive at scale), lakehouse (Iceberg/Delta/Hudi on object store). Cost, query latency, schema, ACID, ML-friendliness — and where lakehouse still falls short.",
    readTimeMinutes: 12,
    content: `# Data Lake vs Warehouse vs Lakehouse: Three Patterns, Three Trade-offs

These three terms get used interchangeably in job postings, vendor decks, and bad blog posts. They are not interchangeable. They are three distinct architectural patterns, each born from a real failure of the previous one. A senior data engineer can place any company's stack on this spectrum within 30 seconds of looking at it.

## The 60-second history

1. **1990s — warehouses.** Teradata, Oracle, DB2. Structured, schema-on-write, expensive per TB, fast at SQL.
2. **2010 — data lakes.** Hadoop, then S3. Cheap storage, schema-on-read, "land everything, figure it out later." Worked for raw flexibility, failed at query performance and governance. The phrase "data swamp" is real.
3. **2018 — lakehouse.** Databricks (Delta), Netflix (Iceberg), Uber (Hudi) all independently built table formats on top of object storage. The pitch: warehouse-grade ACID and performance, on lake-grade cheap storage.

## The three patterns side by side

| | Data Lake | Warehouse | Lakehouse |
|---|---|---|---|
| **Storage** | Object store (S3, GCS, ADLS) | Proprietary columnar (Snowflake FDN, BQ Capacitor) | Object store + open table format (Iceberg, Delta, Hudi) |
| **File format** | Parquet, ORC, JSON, CSV | Vendor-controlled | Parquet under an Iceberg/Delta manifest |
| **Schema enforcement** | None by default | Strict — schema-on-write | Strict via table format metadata |
| **ACID** | No | Yes | Yes (snapshot-based) |
| **Query latency** | Seconds to minutes (Athena/Trino) | Sub-second to seconds | Seconds (closing the gap) |
| **Cost — storage** | Cheapest ($0.023/GB/mo S3) | Expensive (often 5–10x lake) | Cheapest (same object store) |
| **Cost — compute** | Pay-per-query (Athena) or cluster (EMR) | Bundled or per-credit | Pay-per-query or cluster |
| **ML-friendly** | Excellent — files are Python/Spark-readable | Painful — must export | Excellent — open formats |
| **Governance** | DIY | Built-in | Maturing (Unity Catalog, Polaris, Tabular) |
| **Time travel** | No | Some (Snowflake) | Yes (snapshots) |
| **Schema evolution** | Manual, dangerous | Managed | Managed via format |

## Pattern 1 — The data lake

A bucket, a folder convention, and a query engine.

\`\`\`
s3://mycompany-datalake/
  raw/events/dt=2026-05-03/hour=14/part-0001.parquet
  raw/events/dt=2026-05-03/hour=14/part-0002.parquet
  curated/orders/year=2026/month=05/...
\`\`\`

**What you get:** infinite scale, cheap storage, language-agnostic access (Spark, Trino, Pandas, anything that reads Parquet). You can land 10 PB and not feel it on the bill.

**What hurts:**
- **No transactions.** Two writers stomping the same partition = corruption.
- **No schema enforcement.** A producer adds a field, half the files have it, half don't. Queries break in subtle ways.
- **Listing is slow.** Querying a partition with 100k files = 100k S3 listObjects calls.
- **No deletes.** GDPR "delete user 12345" means rewriting partitions by hand.
- **No statistics.** The query engine plans blind.

This is why the term *data swamp* exists. A lake without governance, schema, and ACID becomes write-only in two years.

## Pattern 2 — The warehouse

Snowflake, BigQuery, Redshift. Closed storage format, integrated compute, SQL as the only interface.

**What you get:**
- Sub-second queries on TB-scale tables.
- ACID, transactions, MERGE, GDPR deletes work natively.
- Workload isolation (Snowflake virtual warehouses, BQ slots).
- Time travel, undrop, fail-safe.
- Strong governance: row-level security, masking, lineage.

**What hurts:**
- **Cost at scale.** A 1 PB Snowflake bill in the high six figures is not unusual. Storage alone runs $20–40 per TB-month vs S3's $23.
- **Vendor lock-in.** Your data is in a proprietary format. Egress is slow and metered.
- **ML is awkward.** Training a model on 500 GB of warehouse data means exporting it. Snowpark and BQ ML help but don't replace a real ML stack.
- **Semi-structured ceiling.** VARIANT/JSON works but isn't where the warehouse is fastest.

## Pattern 3 — The lakehouse

Object store + open table format + a metadata layer.

\`\`\`
s3://mycompany-lakehouse/orders/
  data/                          ← Parquet files
    part-0001-uuid.parquet
    part-0002-uuid.parquet
  metadata/                      ← Iceberg/Delta manifest
    v1.metadata.json
    v2.metadata.json             ← snapshot pointer
    snap-1234.avro
\`\`\`

The format (Iceberg, Delta, Hudi) gives you:
- **ACID via snapshots.** Each write produces a new snapshot; readers see consistent point-in-time.
- **Schema evolution.** Add columns, rename, drop, with manifest tracking.
- **Time travel.** \`SELECT ... FOR VERSION AS OF 1234\`.
- **Partition evolution** (Iceberg specifically) — change partitioning without rewriting history.
- **Hidden partitioning.** No more \`WHERE dt = '2026-05-03' AND year=2026\` boilerplate.
- **Efficient deletes** via copy-on-write or merge-on-read.

\`\`\`sql
-- Iceberg via Spark / Trino / Snowflake / BigQuery (all support it)
MERGE INTO orders_iceberg t
USING updates u ON t.order_id = u.order_id
WHEN MATCHED THEN UPDATE SET status = u.status
WHEN NOT MATCHED THEN INSERT *;

SELECT * FROM orders_iceberg FOR TIMESTAMP AS OF '2026-05-01 00:00:00';
\`\`\`

### The three formats — pick one

| | Delta Lake | Apache Iceberg | Apache Hudi |
|---|---|---|---|
| **Origin** | Databricks | Netflix | Uber |
| **Strength** | Tight Spark/Databricks integration | Engine-neutral, best schema evolution | Best for streaming upserts (MoR) |
| **Catalog** | Unity Catalog | REST catalog, Glue, Polaris, Nessie | Hive metastore, Glue |
| **Adoption signal** | Default if you're on Databricks | Default for multi-engine (Snowflake, BQ, Trino, Flink all read it) | Best for CDC-heavy upsert workloads |

In 2026, **Iceberg has won the multi-engine wars.** Snowflake, BigQuery, Databricks, Trino, Flink, Spark all read and write it. Delta is still dominant inside Databricks. Hudi keeps a niche in heavy upsert pipelines.

## When to pick each

### Pick a warehouse if:
- You're a small-to-mid team (<20 engineers).
- Your workload is BI + dashboards + occasional ML feature pulls.
- TB scale, not PB scale.
- Time-to-value matters more than long-term cost optimization.

### Pick a lake if:
- You have huge raw landing volumes you'll only query occasionally.
- ML/data science is the primary workload.
- You already have a strong platform team to handle the governance gap.
- You need format and engine optionality.

### Pick a lakehouse if:
- You're at scale (high TB to PB).
- You have mixed workloads — BI, ML, streaming — and don't want two copies of the data.
- You're worried about vendor lock-in.
- You can invest in the operational maturity (catalog, compaction, vacuum, table maintenance).

## Where lakehouse is *not* yet better

Vendor decks pretend lakehouse is universally superior. It isn't. Honest gaps:

1. **Sub-second BI on large tables.** A well-tuned Snowflake or BigQuery still beats Iceberg on Trino at p95 dashboard latency. Caching layers (Starburst Warp, Dremio reflections) close it but don't eliminate it.
2. **Operational complexity.** Lakehouses need *table maintenance*: compaction (small-files problem), snapshot expiration, manifest rewriting, orphan file cleanup. Warehouses do this invisibly.
3. **Concurrency at write.** Many concurrent writers to the same Iceberg table cause commit conflicts. Warehouses serialize transparently.
4. **Governance maturity.** Row-level security, column masking, and unified policy across engines is still evolving (Unity Catalog, Polaris, Lake Formation are all younger than Snowflake's RBAC).
5. **Streaming write semantics.** Hudi MoR is the best of the three; Iceberg's streaming story is improving but still has gaps in exactly-once sinks.

## The small-files problem (deserves its own callout)

Streaming writes to Iceberg/Delta produce many small files (one per micro-batch). Query performance collapses linearly with file count. **Compaction is mandatory operational work**, not a nice-to-have. Budget for it.

## Interview traps

1. **"Lakehouse replaces warehouse."** — Not yet, and possibly not for BI workloads.
2. **"S3 + Parquet = data lake."** — That's a *bucket of files*. A data lake needs a catalog, governance, and a query engine.
3. **"Delta is open source."** — Delta is open-source, but the deepest features ship first in Databricks. Iceberg has broader true-open governance.
4. **"We picked Hudi because it's newer."** — Hudi is the *oldest* of the three. Pick on workload fit, not novelty.

## What an interviewer is probing

- Can you place each pattern on cost / latency / governance axes?
- Do you know *why* lakehouses exist (the lake's failure modes)?
- Are you honest about where lakehouse falls short?
- Do you understand the operational tax (compaction, catalog, snapshot expiry)?

## Practice question

*A 50-person fintech is on Snowflake spending $80k/month, mostly on a few enormous fact tables and ML feature extraction. What do you propose?*

Strong answer: don't rip out Snowflake. Move the **two largest tables** to Iceberg on S3, keep the marts in Snowflake (which now reads Iceberg natively). ML jobs read Iceberg directly via Spark, bypassing Snowflake compute. You keep BI latency, drop storage cost, and decouple ML from warehouse credits. This is the dominant 2026 pattern.
`,
  },
  {
    slug: "idempotency-and-exactly-once",
    title: "Idempotency and Exactly-Once: The Most-Tested DE Concept",
    description:
      "Idempotency definition, why retries demand it, at-least-once + idempotent sink = effective exactly-once, dedupe keys, upserts, transactional outboxes, Kafka EOS, Flink checkpoints. The 'user clicks pay twice' walkthrough.",
    readTimeMinutes: 14,
    content: `# Idempotency and Exactly-Once: The Most-Tested DE Concept

If you can only deeply learn one distributed-systems concept before a senior DE interview loop, learn this one. Every system design round, every streaming round, every payment-flow question routes through it. The candidates who get strong signals here are the ones who treat idempotency not as a buzzword but as a *design discipline*.

## What idempotency actually means

A function \`f\` is idempotent if \`f(f(x)) == f(x)\`. Applied once or applied a hundred times, the result is the same.

| Operation | Idempotent? | Why |
|---|---|---|
| \`SET balance = 100\` | Yes | Same final state regardless of repetition |
| \`balance = balance + 10\` | **No** | Repeats compound |
| \`INSERT INTO orders ...\` | **No** | Each call adds a row |
| \`INSERT ... ON CONFLICT (order_id) DO NOTHING\` | Yes | Conflict ignores duplicates |
| \`UPSERT (order_id, status) VALUES (...)\` | Yes | Same key, same final state |
| \`DELETE WHERE id = 5\` | Yes | Already-deleted is still deleted |
| \`POST /orders\` (no key) | **No** | Each request creates a new order |
| \`PUT /orders/{idempotency_key}\` | Yes | Same key returns same outcome |

## Why retries make idempotency mandatory

In a distributed system, **every network call is implicitly retried**. The retry might be in your code (\`@retry(3)\`), in a queue redelivery (Kafka, SQS), in an HTTP layer (504 → retry), or in a human (user double-clicks the button). The fundamental problem:

> When the caller times out, it does not know whether the work happened or not.

The server might have completed the action and the response was lost. Or the server never received the request. The caller has no way to tell. The only safe default is to **retry**, and the only way retries don't break the system is **idempotent operations**.

## At-least-once + idempotent sink = effective exactly-once

This is the load-bearing sentence of the entire field. Memorize it.

True exactly-once delivery is impossible across an unreliable network (FLP impossibility, Two Generals, etc.). What we *can* achieve:

- **At-least-once delivery** — easy. Retry on failure. Maybe duplicates.
- **Idempotent processing** — apply each message such that duplicates produce the same result.
- **Net effect** — the world looks like every message was processed exactly once.

This is sometimes called **effectively-once** or **exactly-once semantics** (EOS). The wire still sees duplicates; the *outcome* doesn't.

## The five idempotency patterns

### 1. Dedupe key + persistent set

The simplest pattern. Assign every event a stable unique ID at the source. Before processing, check if you've seen it.

\`\`\`python
def handle_event(event):
    if redis.set(f"seen:{event.id}", "1", nx=True, ex=86400):
        process(event)        # first time
    else:
        return                 # duplicate, skip
\`\`\`

Pitfalls:
- TTL must exceed the *maximum* possible reorder/retry window. 24 hours is usually safe; for replays, consider 7+ days.
- Redis is not durable by default. For payments, back it with Postgres.
- The \`SET NX\` and the \`process\` are not atomic — a crash between them duplicates work. Make \`process\` itself idempotent too (defense in depth).

### 2. Database upsert by natural key

\`\`\`sql
INSERT INTO orders (order_id, customer_id, amount, status)
VALUES ($1, $2, $3, $4)
ON CONFLICT (order_id) DO UPDATE
  SET status = EXCLUDED.status,
      updated_at = now()
WHERE orders.status_version < EXCLUDED.status_version;
\`\`\`

The \`status_version\` guard prevents an out-of-order older event from overwriting a newer one. Pure idempotency without the guard would let a stale retry overwrite progress.

### 3. Idempotency keys on APIs (Stripe pattern)

\`\`\`
POST /v1/charges
Idempotency-Key: 7d8e6f3a-...
\`\`\`

Server stores \`(idempotency_key → response)\` for 24 hours. A retry with the same key returns the same response without re-charging the card. This is the gold-standard pattern for HTTP APIs and the one Stripe popularized.

Implementation requires:
- A unique constraint on \`idempotency_key\`.
- Storing the *response*, not just a marker — otherwise a retry returns 500 even though the work succeeded.
- Distinguishing "in-flight" from "completed" — concurrent retries must not race.

### 4. Write-then-commit (transactional outbox)

The classic dual-write problem: you must update the database *and* publish a Kafka message. If you do both, one might fail. If you wrap both in a 2PC, you've made your life painful.

The transactional outbox pattern:

\`\`\`sql
BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  INSERT INTO outbox (id, topic, payload) VALUES (gen_random_uuid(), 'transfers', '{...}');
COMMIT;
\`\`\`

A separate process (CDC via Debezium, or a polling worker) reads the outbox table and publishes to Kafka, deleting after successful publish. Because the outbox row was committed atomically with the business write, you cannot lose the event. Because the publisher uses the outbox row's UUID as the Kafka message key, downstream consumers can dedupe.

### 5. Two-phase commit (avoid)

XA / 2PC works in theory and is a graveyard in practice: blocking on coordinator failure, poor performance, fragile recovery. **Mention it in interviews, then explain why you don't use it.** The exception is single-system 2PC inside a single platform (e.g., Kafka transactions, which are 2PC under the hood but operationally hidden).

## How real systems implement EOS

### Kafka transactions

\`\`\`java
producer.initTransactions();
producer.beginTransaction();
producer.send(new ProducerRecord<>("output", key, value));
producer.sendOffsetsToTransaction(offsets, consumerGroupMetadata);
producer.commitTransaction();
\`\`\`

What this gives you:
- Writes to the output topic + the *consumer offset commit* are atomic.
- Consumers with \`isolation.level=read_committed\` only see committed transactions.
- A producer crash with a stable \`transactional.id\` resumes the same producer epoch and aborts the in-flight transaction.

What it does *not* give you:
- Exactly-once when the sink is not Kafka. The transaction boundary stops at the cluster.

### Flink checkpoints + exactly-once sinks

Flink's exactly-once guarantee:
1. Periodically inserts **checkpoint barriers** through the dataflow.
2. Each operator snapshots state when it sees the barrier.
3. A failure rolls all operators back to the last completed checkpoint.
4. **Sinks** must support exactly-once via either:
   - Idempotent writes (upsert by key), or
   - Two-phase commit sinks (Flink coordinates pre-commit + commit with the sink, e.g., \`KafkaSink\` with EOS, or \`FileSink\` with atomic rename).

The catch: end-to-end exactly-once requires the *source* to be replayable (Kafka offsets, file offsets) and the *sink* to be transactional or idempotent. Miss either, and you have at-least-once with optimistic claims.

### Spark idempotent writes

Structured Streaming exposes \`foreachBatch\` where each micro-batch has a stable batch ID. You write atomically by:

\`\`\`python
def write_batch(df, batch_id):
    (df.write
        .mode("overwrite")
        .option("replaceWhere", f"batch_id = {batch_id}")
        .format("delta")
        .save(path))
\`\`\`

The \`replaceWhere\` makes the write idempotent on retry — the same batch ID overwrites itself, no duplicates. Delta/Iceberg snapshots make this clean.

## The interview question: "user clicks pay twice — what happens?"

This is the canonical probe. Walk it cleanly:

**Step 1 — Frontend.** The pay button must be disabled on first click and the request tagged with a client-generated **idempotency key** (UUID). Even with the disable, network retries will replay the same request body — same key.

**Step 2 — API gateway / payment service.** On receipt:
\`\`\`
INSERT INTO payment_intents (idempotency_key, status, ...)
VALUES (?, 'pending', ...)
ON CONFLICT (idempotency_key) DO NOTHING
RETURNING *;
\`\`\`
- If the insert succeeded, this is the first time. Proceed.
- If it conflicted, look up the existing row. If \`status = 'completed'\`, return the stored response. If \`status = 'pending'\`, either wait briefly or return a 409 telling the client to retry shortly.

**Step 3 — Charging the card.** The payment processor (Stripe, Adyen) also accepts an idempotency key. Pass the *same* key downstream. Now even if your service retries the charge call, Stripe dedupes on its end.

**Step 4 — Updating internal state.** The charge result is written back transactionally:
\`\`\`sql
BEGIN;
  UPDATE payment_intents
    SET status = 'completed', stripe_charge_id = ?, response = ?
    WHERE idempotency_key = ? AND status = 'pending';
  INSERT INTO outbox (...) VALUES (...);  -- emit "payment.succeeded"
COMMIT;
\`\`\`

**Step 5 — Downstream consumers.** The \`payment.succeeded\` event flows through Kafka to ledger, fulfillment, email. Each consumer:
- Reads with at-least-once.
- Dedupes by \`payment_intent_id\` (the natural key) before mutating its own state.
- Ledger uses upsert: \`INSERT ... ON CONFLICT (payment_intent_id) DO NOTHING\`.

**Step 6 — Failure modes you must mention.**
- *Network timeout between API and Stripe.* Retry safe — same idempotency key.
- *Crash after Stripe charge but before DB write.* Recovery: on next request with same key, look up Stripe by idempotency key and reconcile.
- *DB commit succeeds but outbox publisher fails.* Outbox row stays; publisher retries; consumers dedupe.
- *User clicks 5x in 200ms.* All 5 carry the same key (frontend pins it). 4 conflict on insert.

A candidate who walks this cleanly is a senior. A candidate who says "we use exactly-once Kafka" is not.

## Interview traps

1. **"We'll use Kafka exactly-once."** — Only inside Kafka. State your sink semantics separately.
2. **"Idempotency means safe to retry."** — Sloppy. It means *equivalent outcome on retry*. A retry that returns 500 every time is still not idempotent in the useful sense.
3. **"Just use a unique constraint."** — Necessary, not sufficient. You also need to handle the conflict case correctly (return prior response, not a generic 409).
4. **"We dedupe in the warehouse."** — That's tail-end deduplication. Acceptable for analytics, unacceptable for ledgers, payments, or any system where intermediate state matters.
5. **"Two-phase commit solves it."** — In theory. In practice, no senior team chooses XA in 2026.

## What an interviewer is probing

- Do you reflexively reach for idempotency keys on every external call?
- Can you distinguish *delivery* semantics from *processing* semantics?
- Do you understand where the EOS boundary lives (Kafka cluster, Flink dataflow, your DB)?
- Can you reason about partial failures without hand-waving?

## The summary you should be able to deliver in 60 seconds

> "Exactly-once doesn't really exist on the wire. What we build is at-least-once delivery plus idempotent sinks, which gives effective exactly-once. The patterns are: idempotency keys on every mutating API, upserts on natural keys for database writes, dedupe sets for streaming, and the transactional outbox for the dual-write problem. Inside Kafka I use transactions for read-process-write. Outside Kafka, I make the sink idempotent. For payments specifically, the idempotency key is propagated end-to-end — frontend, API, processor, ledger — so a double-click, a network retry, and a service crash all converge on a single charge."

If you can say that — and back it up with the patterns above — you will pass the round.
`,
  },
];

async function main() {
  for (let i = 0; i < MODULES_PART_2.length; i++) {
    const m = MODULES_PART_2[i];
    const orderNum = i + 4; // modules 5–8 = orders 4–7
    const id = `lm-${PATH_SLUG}-${String(orderNum + 1).padStart(2, "0")}`;
    await prisma.learningModule.upsert({
      where: { id },
      create: {
        id,
        pathId: PATH_ID,
        slug: m.slug,
        title: m.title,
        description: m.description,
        content: m.content,
        readTimeMinutes: m.readTimeMinutes,
        order: orderNum,
        isPublished: true,
      },
      update: {
        slug: m.slug,
        title: m.title,
        description: m.description,
        content: m.content,
        readTimeMinutes: m.readTimeMinutes,
        order: orderNum,
        isPublished: true,
      },
    });
  }
  console.log(`✓ Fundamentals modules 5-8 (part 2)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
