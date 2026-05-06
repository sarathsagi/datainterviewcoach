/**
 * seed-learn-fundamentals-1.ts
 *
 * Part 1 of 3 for the "Data Engineering Fundamentals" learning path.
 * This file creates the LearningPath itself (since it's part 1) and the
 * first 4 modules. Parts 2 and 3 only append more modules.
 *
 * Modules in this file (orders 0..3):
 *   1. what-is-data-engineering
 *   2. the-data-engineering-stack
 *   3. oltp-vs-olap
 *   4. file-formats-deep-dive
 *
 * The path itself sits under ContentCategory.DATA_ENGINEERING_FUNDAMENTALS
 * and is intentionally ordered first (order: 0) so it appears at the top
 * of the Learn index for new candidates.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const PATH_SLUG = "data-engineering-fundamentals";

const MODULES_PART_1: Array<{
  slug: string;
  title: string;
  description: string;
  readTimeMinutes: number;
  content: string;
}> = [
  {
    slug: "what-is-data-engineering",
    title: "What Is Data Engineering, Really?",
    description:
      "The discipline defined: how DE differs from SWE, analytics, and MLE; the data lifecycle; where DE sits in the org; the tools landscape; and what an interviewer is actually probing when they open with 'what is data engineering to you?'",
    readTimeMinutes: 10,
    content: `# What Is Data Engineering, Really?

Almost every senior interview opens with some variant of *"so, what is data engineering to you?"* It sounds like a softball. It is not. It is a calibration question, and the interviewer is using your answer to decide what kind of follow-ups to ask for the next 45 minutes. Get this wrong and you'll spend the rest of the loop fighting a label you didn't choose.

This module is about getting it right.

## The one-line definition

> **Data engineering is the discipline of moving data from where it's produced to where it's useful, with guarantees about correctness, freshness, cost, and recoverability.**

Every word is load-bearing. "Moving" — not just storing. "Where it's produced" — sources you do not own. "Where it's useful" — a consumer with an SLA. "With guarantees" — this is the part that separates a data engineer from a script-writer.

## DE vs the other roles in the data org

This is the single most-asked clarifying question on day one of a new team, and the most-flubbed first answer in interviews. Get the boundaries crisp.

| Role | Primary output | Time horizon | Owns | Does NOT own |
|---|---|---|---|---|
| **Software Engineer** | Application features | Per-request (ms) | Source-of-truth OLTP, business logic | The downstream warehouse, BI dashboards |
| **Data Engineer** | Reliable datasets and pipelines | Minutes to hours | Ingestion, storage, transformation, serving layer | Product features, ML model code, dashboard layout |
| **Analytics Engineer** | Modeled tables and metrics layer | Hours to days | dbt models, semantic layer, metric definitions | Raw ingestion, infra, streaming |
| **Data Analyst** | Insights, dashboards, ad hoc analysis | Days | Questions answered, dashboards, reports | Pipelines that feed them |
| **ML Engineer** | Models in production | Weeks (training), ms (inference) | Feature pipelines, model serving, monitoring | Source ingestion, BI |
| **Data Scientist** | Hypotheses, experiments, models | Weeks | Research, A/B analysis, prototypes | Productionization |

The boundaries leak in real orgs — at a 50-person startup the DE *is* the analytics engineer *is* the MLE — but in interviews you are expected to know where the lines are drawn at scale.

### The litmus test

If something **breaks at 3am**, who gets paged?

- Application down → SWE.
- The warehouse table that powers Finance close is empty → **DE**.
- The dashboard renders a wrong number because the metric was redefined → AE.
- The recommender model is returning stale items → MLE.

Whoever owns the pager is whoever owns the responsibility. DE owns the pipes.

## The data lifecycle

Every dataset you'll touch in your career lives somewhere on this five-stage path:

\`\`\`
[ Generate ] → [ Collect ] → [ Store ] → [ Process ] → [ Serve ]
   product       ingestion      lake/        batch/     warehouse,
   events,       (push or       warehouse,   stream     API, ML
   sensors,      pull)          OLTP CDC     transform  feature store
   3rd-party
\`\`\`

The discipline of data engineering is the discipline of owning **stages 2 through 5** end-to-end, while *partnering* with the producer (stage 1) and the consumer (the team that uses the served dataset).

### Stage-by-stage, what you actually own

1. **Collect (Ingestion).** APIs you call, CDC you pull, queues you subscribe to, files dropped in S3. You own retries, backfills, schema drift, and "what happens when the upstream is down for 6 hours."
2. **Store (Landing / Raw zone).** Cheap, immutable, append-only. Parquet on S3, Bronze tables, raw schemas. You own retention, partition layout, file size, and compaction.
3. **Process (Transform).** Spark, dbt, Flink, BigQuery SQL. You own correctness, idempotency, test coverage, and the data contract between layers (Bronze → Silver → Gold, or raw → staging → marts).
4. **Serve.** Warehouse tables for analytics, REST APIs for apps, feature stores for ML, materialized views for low-latency lookups. You own freshness SLAs and consumer integration.
5. **(Cross-cutting) Govern.** Lineage, cataloging, PII handling, access control, cost. Not a stage — it threads through all of them.

## Where DE sits in the org chart

There are three common org topologies. You should know them and know which one your interviewer's company uses.

### 1. Centralized (the old default)

A single Data Platform org owns the warehouse, the lakehouse, and all production pipelines. Product teams file tickets. Throughput is high per pipeline but feature teams are blocked behind a queue. Common at finance, healthcare, mid-size enterprises.

### 2. Embedded / decentralized

Each product domain (Growth, Payments, Trust & Safety) has its own DEs. They share infra (a central platform team) but own their pipelines and on-call. Common at FAANG.

### 3. Data Mesh

Domains own *both* the pipelines and the data products as products. A central team provides the self-serve platform. Sounds great, often misimplemented. Mention it as a vocabulary check; do not advocate for it unless asked.

If an interviewer asks *"how would you organize the data team at our company?"* — pick #2 unless they are Series A or smaller.

## A day in the life (senior IC)

A composite week, drawn from real teams:

- **Monday morning:** Triage the weekend's failed DAGs. Two were retryable (S3 throttle), one needs a real fix (a producer added a non-nullable column without notice — your contract test caught it).
- **Monday afternoon:** Design review for a new clickstream pipeline. You push back on Lambda → Firehose → S3 because no one has thought about late-arriving events; you propose Kafka with a 24h replay window.
- **Tuesday:** Code. PR a deduplication operator. Argue in PR comments about whether to dedupe in stream or in batch. (Answer: both, with stream as best-effort and batch as the source of truth.)
- **Wednesday:** Cost review. Snowflake bill is up 18% MoM. You find a misclustered table doing full scans for an hourly job; re-clustering saves $4k/mo.
- **Thursday:** Stakeholder sync with Finance. They want to add a new metric. You translate "ARR including expansion minus churn at the customer-month grain" into a dimensional model and a freshness SLA.
- **Friday:** On-call handoff. Document one new runbook entry. Approve two PRs from the analytics-engineering team for changes downstream of your tables.

That mix — design, code, cost, stakeholders, ops — is the senior DE job. If your answer to "day in the life" is only *coding*, the interviewer will downlevel you.

## The tools landscape — a 60-second map

You should be able to draw this on a whiteboard in under a minute. Memorize the *categories*, not the logos.

| Layer | What it does | Representative tools |
|---|---|---|
| **Storage (object)** | Cheap durable bytes | S3, GCS, ADLS |
| **Storage (warehouse)** | Columnar SQL store | Snowflake, BigQuery, Redshift |
| **Storage (lakehouse)** | Open-table-format on object store | Iceberg, Delta Lake, Hudi |
| **Storage (OLTP)** | Source-of-truth transactional | Postgres, MySQL, DynamoDB |
| **Ingestion (batch)** | Extract from APIs/DBs | Fivetran, Airbyte, custom |
| **Ingestion (CDC)** | DB change capture | Debezium, Maxwell, native CDC |
| **Ingestion (stream)** | Event bus | Kafka, Kinesis, Pub/Sub |
| **Compute (batch)** | Big-data processing | Spark, BigQuery, Snowflake, Trino |
| **Compute (stream)** | Real-time processing | Flink, Spark Structured Streaming, Kafka Streams |
| **Transformation** | SQL-as-code | dbt, SQLMesh, Dataform |
| **Orchestration** | DAG scheduling | Airflow, Dagster, Prefect, Temporal |
| **Catalog / Governance** | Discovery, lineage, access | Unity, Glue, DataHub, Collibra |
| **Observability** | Data quality, freshness | Great Expectations, Soda, Monte Carlo, Anomalo |
| **BI / Serving** | Consumer surface | Looker, Tableau, Mode, Hex |

You don't need to have used all of them. You do need to be able to say *"in that category, the relevant trade-off is X, and I've used Y, but I'd reach for Z if I had to optimize for W."*

## Why this discipline exists

The reason a "data engineer" job title exists at all is that there is a structural gap in every modern company:

- The product produces **events** — opaque, schemaless-ish, unbounded, lossy.
- The business asks **questions** — "what's our 7-day retention by acquisition channel?"

You cannot answer the second from the first by hand. Someone has to:

1. Stand up the pipes that move events without losing them.
2. Define the schemas that make events comparable across teams.
3. Build the transforms that turn events into facts and dimensions.
4. Maintain those pipes when the product changes shape weekly.
5. Hold the line on data quality when 17 stakeholders each want a slightly different definition of "active user."

That is data engineering. It is closer to **infrastructure engineering with a domain modeling problem on top** than it is to either SWE or analytics. Anyone who tells you it is "just SQL" has never been on call for a missed Finance close.

## Interview traps

> **"What's the difference between a data engineer and a software engineer?"**

Trap answer: *"Data engineers work with data."* SWEs work with data too. The right axis is **the deliverable**: SWEs ship features visible to a user; DEs ship datasets visible to another team or another system. The artifact is different, not the skill.

> **"Aren't analytics engineers the same as data engineers?"**

Trap answer: yes/no without nuance. Right answer: *"They overlap on the transformation layer (dbt). DE owns everything below it — ingestion, raw storage, infra. AE owns everything above — modeling, metrics, semantic layer. At small companies one person does both; at scale they split."*

> **"What does a data engineer do that an ML engineer doesn't?"**

Trap answer: "MLEs train models." Right answer: *"DE owns the data plane up to the feature store / training set. MLE owns the model plane — training, serving, monitoring drift. The handoff is the feature pipeline; in some orgs MLE owns it, in some orgs DE does, and that boundary is one of the most contested in the field."*

## What the interviewer is actually probing

When a senior interviewer asks "what is data engineering to you?", they are checking three things in 60 seconds:

1. **Do you know the boundaries of the role?** If you say "I write SQL and Python," you sound junior. If you say "I own the contract between the systems that produce data and the systems that consume it," you sound senior.
2. **Do you have an opinion?** Strong candidates have a *take*. ("DE is closer to infra than to analytics, and the role is converging with platform engineering.") That gives the interviewer something to argue with — and arguing well is how you signal seniority.
3. **Will you scope creep or under-scope?** Saying "DE is everything data" is under-scoped. Saying "DE only does ETL" is scope-creeping into being a script writer. The senior signal is *knowing what you don't own and being explicit about hand-offs*.

## A 60-second answer to "what is data engineering to you?"

> "Data engineering is the discipline of moving data from where it's produced to where it's useful, with guarantees. The deliverable is a *dataset another team can depend on* — not a script, not a dashboard, a contract. Concretely, I own ingestion, storage layout, transformation, and the serving layer for analytics, ML, and product features that read from data. I don't own the source application's schema and I don't own the BI layout — but I own everything between. The job is closer to infrastructure than to analytics, because most of the hard problems are about correctness under failure: idempotency, late data, schema evolution, recovery. The reason the role exists is that products generate events and the business asks questions, and there is no path from one to the other without a pipeline that someone wakes up at 3am to fix."

That's the answer. Memorize the shape, not the words.

## Quick self-check

Before you move on, you should be able to answer these out loud:

1. What's the difference between a DE and an AE in one sentence?
2. Name the five stages of the data lifecycle.
3. Pick one tool per layer in the tools-landscape table and justify it.
4. What does a DE own that an MLE does not?
5. Which org topology would you propose for a 200-person Series C, and why?

If any of those is fuzzy, re-read the relevant section. The next module unpacks the canonical mental model — *Sources → Ingestion → Storage → Processing → Serving* — that everything else in this path builds on.
`,
  },
  {
    slug: "the-data-engineering-stack",
    title: "The Canonical Data Engineering Stack",
    description:
      "The five-layer mental model — Sources, Ingestion, Storage, Processing, Serving — with what each layer does, the canonical tools, decision criteria, anti-patterns, and why most teams now skip Lambda Architecture.",
    readTimeMinutes: 12,
    content: `# The Canonical Data Engineering Stack

If the previous module was *what* data engineering is, this module is *how* it's built. You should leave this module able to whiteboard the canonical stack from memory in under three minutes — because at every senior loop, you will be asked to.

## The five-layer mental model

\`\`\`
┌──────────┐   ┌────────────┐   ┌─────────┐   ┌────────────┐   ┌─────────┐
│ Sources  │──▶│ Ingestion  │──▶│ Storage │──▶│ Processing │──▶│ Serving │
└──────────┘   └────────────┘   └─────────┘   └────────────┘   └─────────┘
   apps          batch:           lake:           batch:          warehouse
   DBs           Fivetran/        S3/GCS          Spark/          BI tools
   APIs         Airbyte/EL        + Iceberg       BigQuery        APIs
   SaaS          stream:          warehouse:      stream:         feature
   IoT           Kafka/           Snowflake/      Flink/          stores
                 Kinesis          BigQuery        Streaming
                 CDC: Debezium                    SQL
\`\`\`

Every modern data platform — at every company you will ever interview at — fits in this picture. The vocabulary changes (lakehouse, mesh, fabric, vault) but the layers do not. Master the layers and you can adapt to any vendor stack in a week.

## Layer 1 — Sources

What you do **not** own, but what you have to integrate with.

| Source type | Examples | Integration pattern |
|---|---|---|
| Production OLTP | Postgres, MySQL, DynamoDB | CDC (preferred) or batch dump |
| Application events | Frontend clickstream, backend events | Event bus (Kafka/Kinesis) |
| Third-party SaaS | Salesforce, Stripe, Zendesk | Connector tools (Fivetran/Airbyte) |
| Files | CSV/Parquet drops, partner feeds | S3 watchers, SFTP |
| Streaming devices | IoT, mobile telemetry | Kinesis/Pub-Sub direct ingest |
| LLM/agent traces | OpenAI batch, agent logs | Webhook + queue or batch pull |

### The contract problem

A source you don't own can change schema without warning. The senior-DE move is to **define the contract** — what fields, what types, what nullability, what semantics — and to **enforce it at the ingestion boundary**. Anything that doesn't match the contract goes to a quarantine path, not into the main pipeline.

If your interviewer asks "how do you handle schema changes from upstream?", the wrong answer is "we update the schema." The right answer is "we have a schema registry or contract spec, ingestion validates against it, breakages alert the producer team, and we replay from the queue once the contract is updated. The pipeline is *expected* to reject malformed data — silently coercing is the bug."

## Layer 2 — Ingestion

The act of pulling (or accepting a push of) data from a source into your storage. Three flavors.

### 2a. Batch ingestion

Pull on a schedule. Hourly, daily. Good for: SaaS APIs with rate limits, daily snapshots, backfills.

- **Tools:** Fivetran, Airbyte, custom EL scripts in Python, dlt.
- **Decision criteria:** use a managed connector for any source where the cost of writing and maintaining the integration exceeds ~$2k/year of vendor cost. (At enterprise scale, Fivetran can hit 6 figures fast — at that point in-house starts winning again.)
- **Anti-pattern:** Dropping full-table snapshots daily into the warehouse. Cheap to write, expensive forever after. Use CDC the moment your source row count crosses ~10M.

### 2b. Streaming ingestion

Producer pushes events to a bus; consumers subscribe.

- **Tools:** Kafka, Kinesis, Pub/Sub, Pulsar, Redpanda.
- **Decision criteria:** Use streaming ingestion when *any* downstream consumer needs sub-15-minute latency, OR when the volume is so high that batch windows would lag.
- **Anti-pattern:** Using Kafka because it sounds modern when a 15-minute batch would suffice. Streaming has a real ops tax — you are now running stateful infrastructure with retention, partitioning, and consumer-lag dashboards. If no one needs the latency, you are paying for nothing.

### 2c. Change Data Capture (CDC)

Tail the database's write-ahead log; emit row-level change events.

- **Tools:** Debezium, AWS DMS, Fivetran's HVR, native (Aurora, Snowflake-on-Postgres).
- **Decision criteria:** Anytime you need *all* the rows from a transactional DB without scanning the whole table.
- **Anti-pattern:** CDC without a snapshot strategy. CDC starts from a point in time; you must seed the initial state from a consistent snapshot or your downstream is forever incomplete.

### Decision matrix

| Want | Pick |
|---|---|
| Daily report from a SaaS tool | Batch (Fivetran/Airbyte) |
| Real-time fraud detection | Streaming (Kafka + Flink) |
| Mirror of production Postgres for analytics | CDC (Debezium → Kafka → warehouse) |
| Partner CSV drops once a day | Batch (S3 + airflow trigger) |
| Mobile app events for product analytics | Streaming (Kinesis/Kafka) |

## Layer 3 — Storage

This is where the architectural debate of the last decade has lived.

### 3a. Data Lake

Object storage (S3, GCS, ADLS) holding raw and semi-structured files (Parquet, JSON, Avro). Cheap, infinite, schema-on-read.

- **Pros:** Cheapest by an order of magnitude. Stores anything. Decouples storage from compute.
- **Cons:** No transactions, no schema enforcement, hard to update or delete, slow point queries.

### 3b. Data Warehouse

A columnar SQL database optimized for analytics. Snowflake, BigQuery, Redshift.

- **Pros:** Fast SQL, ACID, governance, mature tooling.
- **Cons:** Expensive at scale, vendor lock-in, struggles with semi-structured data, compute coupled to storage layout.

### 3c. Lakehouse (the current consensus)

Object store + open table format (Iceberg, Delta Lake, Hudi). You get warehouse-like guarantees on lake-like cost.

- **Pros:** ACID transactions on object storage, time travel, schema evolution, multi-engine read (Spark, Trino, Snowflake, DuckDB can all read the same Iceberg table).
- **Cons:** Operationally newer; you own compaction, vacuum, and metadata management.

### Decision criteria — when to use which

| Use case | Pick |
|---|---|
| <10TB total, <10 analysts, you want speed of iteration | Pure warehouse (Snowflake/BigQuery) |
| 100TB+, multi-engine reads (Spark + Trino + ML), cost-sensitive | Lakehouse (Iceberg on S3) |
| Mixed, modern default, multi-cloud | Lakehouse + warehouse for serving (the common pattern) |
| Pure ML training datasets | Lake + Parquet, no table format needed |

### Anti-patterns

- **Warehouse as a data lake.** Storing raw JSON blobs in Snowflake VARIANT columns "because it's easy." It works until your bill makes the CFO call. Land raw in S3; load curated to Snowflake.
- **Lake without a table format.** Writing Parquet to S3 with no Iceberg/Delta on top. You have no atomic appends, no schema evolution, no concurrent writes. Modern teams do not do this anymore.
- **Three layers of warehouse-only Bronze/Silver/Gold.** Bronze should usually live in the lake; promoting Bronze → Silver → Gold all in Snowflake doubles or triples your storage and compute cost for no gain.

## Layer 4 — Processing

Turning raw into useful. Two paradigms.

### 4a. Batch processing

Process bounded chunks (an hour, a day) at a time.

- **Tools:** Spark, BigQuery, Snowflake SQL, dbt (on top of those), Trino.
- **Decision criteria:** Default to batch. Always. It is cheaper, simpler, more debuggable, easier to backfill, easier to test.

### 4b. Stream processing

Process unbounded events as they arrive.

- **Tools:** Flink, Spark Structured Streaming, Kafka Streams, Materialize, RisingWave.
- **Decision criteria:** Use streaming when latency requirements are tighter than your batch window. Note that "real-time" usually means "5 minutes," not "1 second" — clarify with the stakeholder before reaching for Flink.

### The transformation pattern: medallion / multi-hop

Whether you call it Bronze/Silver/Gold (Databricks), Raw/Staging/Marts (dbt), or Landing/Curated/Consumption — every team converges on three logical zones:

1. **Raw / Bronze.** Append-only, schema-on-read or minimally validated. Source of truth.
2. **Cleaned / Silver.** Deduped, typed, enriched, conformed dimensions. The grain is still the source's grain.
3. **Modeled / Gold.** Business-grain facts and dimensions. What stakeholders query.

If your interviewer asks "walk me through how a click event becomes a row in the daily-active-users dashboard," the *shape* of the answer is this three-zone walkthrough.

### Anti-patterns

- **Skipping the raw zone.** "We just transform on the way in." Now you can't reproduce yesterday's run when the source is corrected. **Always land raw.**
- **Transforming in the OLTP database.** Compute on the OLTP destroys read latency for the application. Always land in analytical storage first.
- **Stream when batch suffices.** A 5-minute cron is *not* streaming. It's micro-batch. It is also much, much simpler than a Flink job and you should default to it.

## Layer 5 — Serving

Where consumers actually read from. Different consumers need different shapes.

| Consumer | Shape |
|---|---|
| BI / dashboards | Wide aggregated tables in the warehouse |
| Internal APIs | Narrow point-lookup tables (often in Postgres or DynamoDB, mirrored from the warehouse) |
| ML training | Parquet datasets in the lake |
| ML inference | Online feature store (Redis, DynamoDB, Feast on top) |
| Customer-facing analytics | Pre-aggregated cubes, ClickHouse, Druid, Pinot, or warehouse with caching |
| Data science / ad hoc | Direct warehouse access with quotas |

### The reverse-ETL boundary

When the warehouse-as-source-of-truth needs to feed *back into* operational systems (push enriched customer attributes back to Salesforce or Braze), that's **reverse ETL**. Tools: Hightouch, Census. It's an explicit layer; do not pretend the warehouse can serve product features at API latencies — it cannot.

## Lambda Architecture — and why most teams skip it

You will be asked about Lambda Architecture in any DE interview that touches streaming. Here's the concise answer.

**Lambda** (Marz, ~2011): run *two* parallel pipelines — a batch layer (correct but slow) and a speed layer (fast but approximate) — and merge their outputs at serve time.

\`\`\`
                  ┌──── Batch layer ────┐
events ── split ──┤                     ├── merged view
                  └──── Speed layer ────┘
\`\`\`

**Why teams adopted it:** Pre-Flink, stream processors couldn't give you exactly-once or replayability, so you needed batch as the source of truth.

**Why teams skip it now:**

1. **Code duplication.** You wrote every transform twice — once in Spark, once in Storm — and they drifted.
2. **Modern stream processors close the gap.** Flink with checkpointing + replayable Kafka + Iceberg as a sink gives you exactly-once and replay without a second pipeline.
3. **Kappa Architecture** (Kreps, 2014) is the rebuttal: one streaming pipeline, replay from the log when you need to reprocess. Most modern teams converge here.

### What to say in the interview

> "Lambda was the right answer when stream processors were unreliable. With Flink + Kafka + Iceberg or with Snowflake's stream-table primitives, the stream is the source of truth and you replay from the log to backfill. We use Kappa-style — one pipeline, replayable. The exception is when the streaming engine genuinely cannot express the transform (window joins across days at TB scale) and you fall back to a batch correction layer running nightly."

That answer demonstrates you know both, you have an opinion, and you understand the trade-off.

## Comparison table — canonical tool per layer

| Layer | Batch-leaning | Streaming-leaning | Open / multi-engine |
|---|---|---|---|
| Ingestion | Fivetran, Airbyte | Kafka, Kinesis | Debezium, NiFi |
| Storage (raw) | S3 + Parquet | Kafka (with retention) | Iceberg, Delta |
| Storage (curated) | Snowflake, BigQuery | Materialize, Pinot | Iceberg + Trino |
| Compute | Spark, dbt | Flink, Spark Streaming | DuckDB, Trino |
| Orchestration | Airflow, Dagster | (event-driven, no scheduler) | Temporal |
| Serving | Snowflake, Redshift | Pinot, Druid, ClickHouse | Trino, DuckDB |

## Interview traps

> **"Walk me through your data stack."**

Trap: rattling off vendor names. Right answer: walk the **layers** (Sources → Ingestion → Storage → Processing → Serving) and only mention vendors as instances of layers. The interviewer is checking that you have a *mental model*, not a resume.

> **"Why didn't you use Kafka?"**

Trap: defensiveness. Right answer: "Because the consumer's freshness requirement was hourly. A scheduled batch was 1/10 the operational complexity. We'd add Kafka the moment we needed sub-15-minute latency on any consumer." Optimizing for simplicity is a senior signal.

> **"You're storing raw events in Snowflake — why?"**

Trap: explaining your stack. Right answer: "We shouldn't be — that's a known anti-pattern. Raw should live in S3, curated in Snowflake. We're paying Snowflake compute and storage rates for data that doesn't need warehouse semantics. The fix is a Bronze tier in S3 + Iceberg, with Snowflake reading via external table or loading only Silver+." Honesty about anti-patterns scores higher than defending them.

## What an interviewer is actually probing

When asked to "describe the canonical data stack," they're checking:

1. **Do you have a layered mental model, or are you a tool-collector?**
2. **Can you place a new tool you've never seen into the right layer?** (They'll often name a tool from another company's stack to test this.)
3. **Do you know the anti-patterns?** Naming things to *avoid* shows you've operated long enough to be burned.
4. **Are your defaults sane?** Senior engineers default to batch, default to lakehouse, default to managed connectors at small scale, default to in-house at large scale. Being able to articulate *defaults with thresholds* is the seniority signal.

## Self-check

1. Draw the 5-layer stack from memory. Name two tools per layer.
2. When would you choose CDC over batch ingestion?
3. What's a lakehouse, and why is Iceberg/Delta the consensus today?
4. Why was Lambda Architecture invented, and why do most teams skip it now?
5. Name three anti-patterns from this module and explain *why* each one is wrong.

The next module narrows in on the most-asked database concept question in DE interviews — OLTP vs OLAP.
`,
  },
  {
    slug: "oltp-vs-olap",
    title: "OLTP vs OLAP: The Most-Asked Database Concept",
    description:
      "Workloads, storage layouts, normalization, indexing, isolation, and the real reason Postgres and Snowflake exist as different products. Includes the 'but Postgres can do analytics too' trap and how to handle it.",
    readTimeMinutes: 12,
    content: `# OLTP vs OLAP: The Most-Asked Database Concept in DE Interviews

If you only memorize one chart in this entire path, make it the OLTP vs OLAP comparison. It comes up in **every single** data engineering interview, often within the first 15 minutes, often as a setup for a system design question. Candidates who can articulate *why* they differ — not just that they differ — separate themselves immediately.

## The headline

> **OLTP** stores rows of *current state* and is optimized for many small reads and writes per second. **OLAP** stores columns of *history* and is optimized for few large scans per minute. They are different products because they make opposite trade-offs.

## Workload comparison

| Dimension | OLTP | OLAP |
|---|---|---|
| Typical query | Read or write a single row by primary key | Aggregate millions of rows over a few columns |
| Reads per query | 1–10 rows | 10M–10B rows |
| Latency target | <10ms | seconds to minutes |
| Concurrency | thousands of concurrent users | dozens of concurrent queries |
| Write pattern | many small inserts/updates | bulk loads, append-mostly |
| Data shape | Current state, normalized | History, denormalized facts + dimensions |
| Schema | Many narrow tables | Few wide tables |
| Source of truth for | Application state | Analytical history |
| Examples | Checkout, login, posting a comment | Daily revenue dashboard, ML feature engineering |

## Why row vs columnar storage matters — the most important physical fact

This is the single most common follow-up. Get it crisp.

### Row store (OLTP)

A row store keeps the bytes of one row contiguous on disk:

\`\`\`
[id=1, user='alice', amount=10, ts=...] [id=2, user='bob', amount=15, ts=...] ...
\`\`\`

To fetch one row, you read one block. To update one row, you rewrite one block. **Optimal for point lookups and OLTP writes.**

### Columnar store (OLAP)

A columnar store keeps the bytes of one *column* contiguous on disk:

\`\`\`
ids:     [1, 2, 3, 4, 5, ...]
users:   ['alice', 'bob', 'cara', ...]
amounts: [10, 15, 20, 7, 12, ...]
ts:      [...]
\`\`\`

To compute \`SELECT SUM(amount) FROM orders WHERE ts > '2024-01-01'\`, you read **only** the \`amount\` and \`ts\` columns — never the user names, never the addresses. On a 100-column table, you skip 98 columns of I/O. That's often a 50–100x performance win for analytics.

You also get **massive compression** because adjacent values within a column are usually similar (run-length encoding, dictionary encoding, bit-packing). Real-world Parquet column chunks compress 5–20x.

### The cost columnar pays

To read or write *one full row*, you must seek 100 places (one per column). Single-row reads and writes are catastrophically slow. That's why you don't run a checkout flow on Snowflake.

\`\`\`sql
-- Postgres (OLTP, row store): 0.5 ms
SELECT * FROM users WHERE id = 12345;

-- Snowflake (OLAP, columnar): 800 ms (network + warehouse spin-up dominates)
SELECT * FROM users WHERE id = 12345;

-- Postgres (OLTP) on a 1-billion-row table: 45 seconds (full scan)
SELECT SUM(amount) FROM orders WHERE ts > '2024-01-01';

-- Snowflake (OLAP) on the same: 1.2 seconds (column-pruned, micro-partition-pruned)
SELECT SUM(amount) FROM orders WHERE ts > '2024-01-01';
\`\`\`

This is *the* asymmetry that justifies running two databases.

## Normalization vs denormalization

### OLTP wants normalized schemas (3NF or close to it)

The application is doing many small writes. You want each fact to live in *one place*, so updating "user.email" is one row in one table, not 50 redundant copies. Foreign keys, joins on the read path.

\`\`\`sql
-- Normalized OLTP
users(id, email, signup_ts)
orders(id, user_id, amount, ts)
products(id, name, price)
order_items(order_id, product_id, qty)

-- A query joins 4 tables but each table is narrow
SELECT u.email, SUM(p.price * oi.qty)
FROM users u
JOIN orders o ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.ts > now() - interval '7 days'
GROUP BY u.email;
\`\`\`

In Postgres, this query plan is doable but expensive at scale because every join is a hash or nested-loop on (potentially) huge tables.

### OLAP wants denormalized schemas (star or one-big-table)

The data is read 100x more than it's written, and joins on billion-row tables are expensive. So we **pre-join** at write time:

\`\`\`sql
-- Star schema
fact_orders(order_id, user_id, product_id, ts, amount, qty, ...)
dim_users(user_id, email, signup_cohort, country, ...)
dim_products(product_id, name, category, price, ...)
\`\`\`

Or even further — One Big Table (OBT):

\`\`\`sql
-- OBT denormalized
fact_orders_wide(order_id, ts, user_email, user_country, product_name, product_category, amount, qty, ...)
\`\`\`

OBT is what most modern lakehouses default to, because columnar storage makes the "wide table is wasteful" critique evaporate — you never read the columns you don't need.

### When to denormalize — the rule of thumb

> Denormalize when (read frequency × join cost) > (storage cost + write update cost). For analytics, this is almost always true.

## Indexing strategies — the strategies are *opposite*

### OLTP indexes

- **B-tree on primary key.** Mandatory.
- **B-tree on foreign keys.** For join performance.
- **Composite indexes** for the most common query predicates.
- **Partial indexes** for active subsets ("WHERE deleted_at IS NULL").
- **Hash indexes** for equality-only.

The cost: every index slows writes (B-trees must be maintained on insert/update). OLTP DBAs are constantly fighting "we have too many indexes."

### OLAP "indexes" (mostly aren't indexes)

OLAP systems rarely have B-tree indexes. They use:

- **Partitioning** — physically splitting data by a column (usually time). \`PARTITION BY date_trunc('day', ts)\`. The query planner skips entire partitions.
- **Clustering / sort keys** — reorganizing data on disk by a column to enable range pruning. Snowflake's micro-partitions and Redshift's sort keys are this.
- **Column min/max metadata (zone maps)** — every column chunk records its min/max. The query planner skips chunks where the predicate can't match.
- **Bloom filters** on high-cardinality predicate columns.

You don't write \`CREATE INDEX\` in Snowflake. You design *clustering* and *partitioning*. That's the senior signal — knowing the unit of pruning is a *file/chunk*, not a *row*.

## Isolation levels that matter

OLTP and OLAP also differ on what they need from the database's transaction model.

### OLTP isolation — the four ANSI levels

| Level | Dirty read | Non-repeatable read | Phantom read | Used by |
|---|---|---|---|---|
| Read Uncommitted | possible | possible | possible | almost no one |
| **Read Committed** | no | possible | possible | Postgres default, Oracle default |
| Repeatable Read | no | no | possible | MySQL/InnoDB default |
| Serializable | no | no | no | financial / correctness-critical |

The *practical* default is **Read Committed** with explicit \`SELECT ... FOR UPDATE\` for the rare race-prone path. Most "we need serializable" requirements turn out to need an idempotency key instead.

### OLAP isolation — usually snapshot

OLAP systems almost always operate in **snapshot isolation**: every query sees a consistent snapshot of the warehouse at the time the query started. Snowflake, BigQuery, and Iceberg all give you this with table-level versioning.

You will rarely worry about phantom reads in OLAP. You will *frequently* worry about **read-your-writes** when an ETL job inserts and a downstream job queries — and the answer is usually *commit ordering* or *write-then-publish-pointer* patterns, not isolation levels.

## When each wins — and a real-world picture

| Workload | Pick |
|---|---|
| User clicks "Buy" — reduce inventory by 1, write order row | OLTP (Postgres) |
| Compute 7-day rolling DAU by acquisition channel | OLAP (Snowflake) |
| Show a user their order history (100 rows by user_id) | OLTP — point lookup by indexed key |
| Train an ML model on 2 years of transactions | OLAP — full scan of fact table |
| Real-time fraud check on a single card swipe | OLTP-like (often a key-value store: Redis, DynamoDB) |
| Backfill last quarter's revenue after a logic fix | OLAP |

## Real systems — which is which

| System | Class | Storage | Notes |
|---|---|---|---|
| Postgres | OLTP | Row | The default OLTP. Has columnar extensions (Citus, Hydra) for limited OLAP. |
| MySQL | OLTP | Row | InnoDB. |
| Oracle | OLTP+ | Row, with columnar features | Hybrid in late versions. |
| SQL Server | OLTP+ | Row, with Columnstore Index | True HTAP attempt with the columnstore feature. |
| DynamoDB | OLTP | KV / wide-column | Serverless, infinite scale, single-digit ms. |
| Snowflake | OLAP | Columnar (micro-partitions) | The current consensus warehouse. |
| BigQuery | OLAP | Columnar (Capacitor) | Serverless, scales horizontally. |
| Redshift | OLAP | Columnar | Older but still common. |
| ClickHouse | OLAP | Columnar | Fast on commodity hardware; real-time analytics. |
| Druid / Pinot | OLAP | Columnar + indexed | Sub-second analytics on streaming. |
| Iceberg/Delta on S3 | OLAP | Columnar (Parquet) | The lakehouse. |
| **HTAP attempts** | both | hybrid | TiDB, SingleStore, AlloyDB, CockroachDB. |

### HTAP — the dream and the reality

HTAP (Hybrid Transactional/Analytical Processing) databases promise both. Common designs:

- **Two physical formats internally.** TiDB has TiKV (row) + TiFlash (column). Writes go to row, are replicated to column.
- **Single format, dual indexing.** SingleStore.
- **Federated.** Aurora + Aurora-Analytics-Cluster.

**Why HTAP hasn't taken over:** Resource contention. A long analytical scan steals CPU/IO from millisecond OLTP, hurting tail latency. Most companies ultimately split the workloads anyway. Mention HTAP in interviews as *"a real category, useful at small scale, but at FAANG scale we still split because contention bites."*

## The "but Postgres can do analytics too" interview trap

This is one of the most common follow-ups. The interviewer is checking whether you understand the *limits* of OLTP for analytics.

### What candidates say wrong

> "Yeah, Postgres can do analytics, you just write SQL."

That answer suggests you've never run a 200M-row aggregation on Postgres at 9am while the application is also serving traffic.

### The right answer

> "Postgres can run analytical SQL, but it makes opposite trade-offs from a warehouse. Three things bite at scale:
>
> 1. **Row storage** means every aggregate over a wide table reads every column on every row. A 100-column, 100M-row table aggregating one column reads 100x more bytes than Snowflake.
> 2. **Indexes** can mitigate single-predicate queries but multi-dimensional analytics queries can't all be indexed. You hit table scans.
> 3. **Resource contention** with OLTP traffic. A long analytical query holds buffers, eats CPU, and hurts your application's p99.
>
> The real answer is: Postgres is fine for analytics up to ~50–100GB of relevant data and read-replica isolation. Past that, the right move is CDC-replicating to a columnar store, not scaling Postgres up."

That demonstrates you understand the *physical* reasons, not just the labels.

### When Postgres-for-analytics is actually fine

- Small startups (<50GB).
- Read replicas dedicated to analytics.
- Materialized views maintained off-hours.
- Citus / Hydra columnar extensions for specific tables.

The senior framing: *use the right tool for the workload, but the threshold for "Postgres is enough" is much higher than people think — and much lower than vendors selling Snowflake will tell you.*

## Interview traps

> **"Why is OLAP faster than OLTP for analytics?"**

Trap: "It's optimized for it." Right: "Columnar storage prunes columns and chunks; OLTP must read every row of the table."

> **"Why don't we just use one database for everything?"**

Trap: "It's a best practice to split." Right: HTAP attempts exist (TiDB, SingleStore). They work at small scale. They struggle at scale because long analytical scans contend with OLTP's tail-latency requirements. The split is *physical*, not arbitrary.

> **"What isolation level should an analytics warehouse use?"**

Trap: "Serializable." Right: "Snapshot. Snowflake/BQ/Iceberg all do this. The query sees a consistent point-in-time view; you handle read-your-writes at the orchestration layer."

> **"Can a star schema work in Postgres?"**

Trap: "No, you need a warehouse." Right: "Yes. Star schema is a *modeling* technique, not a storage one. Kimball-style stars run fine in Postgres. The reason warehouses dominate analytics isn't the schema — it's the columnar physics underneath."

## What the interviewer is actually probing

1. **Do you understand the *physical* reason these are different products?** (Row vs columnar.)
2. **Can you choose between them given a workload?**
3. **Do you know the trap directions** — pushing analytics onto OLTP, or running OLTP on a warehouse — and why each fails?
4. **Have you worked with HTAP or read replicas as a real intermediate step**, or do you only know the textbook answer?

## Self-check

1. Why does columnar storage compress better than row storage?
2. What's the canonical isolation level for OLTP and for OLAP?
3. How would you scale Postgres analytics before reaching for Snowflake?
4. Define HTAP and name two attempts.
5. What is "snapshot isolation" and why do warehouses use it?

The next module dives into the file-format choices that underpin both lakes and warehouses: CSV, JSON, Avro, ORC, and especially Parquet.
`,
  },
  {
    slug: "file-formats-deep-dive",
    title: "File Formats Deep Dive: CSV, JSON, Parquet, Avro, ORC",
    description:
      "Schema enforcement, columnar vs row, compression, splittability, evolution, ecosystem support. Deep on Parquet's internals — row groups, column chunks, pages — because it's the most-asked. Ends with a 'which format for X' decision tree.",
    readTimeMinutes: 14,
    content: `# File Formats Deep Dive: CSV, JSON, Parquet, Avro, ORC

If "OLTP vs OLAP" is the most-asked database concept question, **file formats** is the most-asked storage-layer question. Every senior loop at every company that uses a lake or lakehouse will probe this. The questions sound innocent — *"why Parquet?"* — and the right answer requires understanding bytes on disk.

## The five formats you must know

| Format | Class | Schema | Row/Col | Compression | Splittable | Evolution |
|---|---|---|---|---|---|---|
| **CSV** | Text | None (header optional) | Row | Poor (gzip outside) | Only if uncompressed or bzip2 | None |
| **JSON / JSONL** | Text | Self-describing, weak | Row | Poor | JSONL splittable line-by-line | Permissive |
| **Avro** | Binary | Required, in file footer or registry | Row | Good (Snappy/Deflate) | Yes (block-level) | Strong (forward + backward) |
| **Parquet** | Binary | Required, in file footer | Columnar | Excellent | Yes (row-group-level) | Good (with caveats) |
| **ORC** | Binary | Required, in file footer | Columnar | Excellent | Yes (stripe-level) | Good |

## Format-by-format

### CSV

The world's most-deployed file format. Also the worst.

**What it is:** Comma-separated values. Each line a record. First line optionally a header.

**Pros:**
- Universal. Every tool can read it.
- Human-readable.
- Trivial to produce.

**Cons:**
- **No types.** Everything is a string. \`true\`, \`True\`, \`TRUE\`, \`1\`? Up to the reader.
- **No schema.** Column drift breaks downstream silently.
- **Quoting hell.** Commas in fields, quotes in fields, newlines in fields. RFC 4180 helps but is widely violated.
- **No compression by default.** gzip-CSV is common but **not splittable** — a single 100GB gzip file is one Spark task.
- **Verbose.** Every value is a string with a delimiter.

**Use when:** Tiny exports for humans, regulator submissions, partner exchanges where the partner refuses anything else.

**Don't use when:** Anything analytics-internal. The cost of "schema drift broke prod" exceeds the cost of converting upstream.

### JSON / JSONL

JSON for nested API responses. JSONL (one JSON object per line) for streaming logs.

**Pros:**
- Self-describing (kind of — types are JS types, no \`int64\` vs \`int32\`).
- Handles nested structures natively.
- Universal in API ecosystems.

**Cons:**
- **Verbose.** Field names repeat on every record. A 100M-row JSONL file with the field "user_id" repeats those 8 bytes 100M times.
- **Weak schema.** Optional fields, mixed types (sometimes \`amount\` is int, sometimes string), no enforcement.
- **Slow parsing.** Even with simdjson, an order of magnitude slower than binary formats.
- **No columnar pruning.** Reading "give me only the \`amount\` field" still parses the whole record.

**Use when:** Streaming raw events to a Bronze tier, log shipping, anything where schema isn't yet stable.

**Don't use when:** Your dataset is stable and read repeatedly. Convert to Parquet.

### Avro

The streaming format. Binary, row-oriented, schema-required.

**What it is:** Records serialized in a tight binary form, schema stored once per file (or in a Schema Registry), values appear without their field names.

**Pros:**
- **Excellent schema evolution.** Forward + backward compat with rules: you can add fields with defaults, rename via aliases, widen types. This is *the* selling point.
- **Compact.** Field names are not repeated; only types and values.
- **Fast deserialization.** Schema-driven decode.
- **Splittable.** Files contain "blocks" with sync markers; readers can seek to a block boundary.
- **Streaming-friendly.** Designed alongside Hadoop and Kafka. Confluent Schema Registry's default.

**Cons:**
- **Row-oriented.** Bad for column scans / analytics.
- **Less ecosystem reach in pure analytics.** Spark/Trino read it, but Parquet is the default.

**Use when:** Kafka payloads with Schema Registry, RPC payloads, ingestion intermediate where evolution is paramount and the consumer reads whole records.

**Don't use when:** Final analytics storage. Re-encode to Parquet at the Bronze→Silver boundary.

### Parquet

The analytics format. Binary, columnar, schema-required.

**What it is:** A self-describing columnar format originally from the Twitter/Cloudera collaboration on Hadoop, now the de-facto standard for the lakehouse. Used by Snowflake (internally similar), BigQuery (Capacitor), Iceberg, Delta, and every Spark/Trino/DuckDB pipeline.

**Pros:**
- **Columnar.** Read only the columns you need.
- **Excellent compression** via dictionary, RLE, bit-packing, plus a codec layer (Snappy/Zstd/Gzip).
- **Predicate pushdown.** Min/max statistics per column chunk, plus optional Bloom filters, let readers skip data.
- **Splittable** at the row-group boundary.
- **Universal in analytics.** Spark, Trino, Snowflake (external tables), BigQuery, DuckDB, Pandas, Polars, Arrow, Iceberg, Delta, Hudi all read it.

**Cons:**
- **Bad for record-by-record reads.** Reconstructing one row requires a seek per column.
- **Bad for streaming writes.** You batch writes into row groups; can't append a single row efficiently.
- **Schema evolution is real but limited** — adding nullable columns is fine; renames and type narrowing are not without a table format on top.

**This is the single most-asked file format in interviews. We'll go deep on its internals below.**

### ORC

The Hive-native columnar format. Conceptually very similar to Parquet, came out of the Hortonworks side of the Hadoop world.

**Pros:**
- **Slightly better compression** than Parquet on some workloads (better RLE on integer columns).
- **ACID support** in Hive 3+.
- **Built-in indexes** (light, medium, bloom).
- **Stripe structure** analogous to Parquet's row group.

**Cons:**
- **Smaller ecosystem** outside of the Hive/Tez/Trino-on-Hive stack.
- **Less momentum** — the lakehouse table formats (Iceberg, Delta) all defaulted to Parquet, and ORC is increasingly a legacy choice.

**Use when:** Existing Hive deployment, pure Trino-on-S3 stack where ORC's Bloom filters matter.

**Don't use when:** Greenfield lakehouse. Use Parquet.

## Parquet's internals — what every senior DE must know

This is the most-asked deep-dive. You should be able to draw this and explain it.

\`\`\`
File:
┌─────────────────────────────────────────────────────────────┐
│ Magic "PAR1"                                                │
├─────────────────────────────────────────────────────────────┤
│ Row Group 0                                                 │
│   ┌──────────────────────────────────────────────────────┐  │
│   │ Column Chunk: id                                     │  │
│   │   Page 0: [data + RLE/dict header + stats]           │  │
│   │   Page 1: [data + RLE/dict header + stats]           │  │
│   │   ...                                                │  │
│   ├──────────────────────────────────────────────────────┤  │
│   │ Column Chunk: amount                                 │  │
│   │   Page 0, Page 1, ...                                │  │
│   ├──────────────────────────────────────────────────────┤  │
│   │ Column Chunk: ts                                     │  │
│   │   ...                                                │  │
│   └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│ Row Group 1                                                 │
│   ...                                                       │
├─────────────────────────────────────────────────────────────┤
│ ...                                                         │
├─────────────────────────────────────────────────────────────┤
│ Footer:                                                     │
│   - Schema (types, names)                                   │
│   - Per-column-chunk statistics (min, max, null count)      │
│   - Per-page statistics                                     │
│   - Optional: Bloom filters                                 │
│   - Offsets to every row group / column chunk               │
├─────────────────────────────────────────────────────────────┤
│ Footer length (4 bytes) | Magic "PAR1"                      │
└─────────────────────────────────────────────────────────────┘
\`\`\`

### Row group

A **row group** is the unit of parallelism. Conceptually it's a horizontal slice of the file — say, 1 million rows. A reader can independently process row group 0 and row group 1 in parallel.

- Typical size: 128MB–1GB.
- Too small → many row groups, more metadata overhead, less efficient compression.
- Too large → fewer parallelism opportunities, more memory needed to write.

### Column chunk

Within a row group, each column's bytes are stored together — a **column chunk**. This is the unit of column pruning: a query that doesn't reference \`user_email\` skips that column chunk entirely.

### Page

Within a column chunk, data is split into **pages** (typically 1MB). Each page has its own compression codec, encoding (dictionary, RLE, plain), and stats. Pages are the unit of decode.

### Why this layout wins

A query like \`SELECT SUM(amount) FROM events WHERE ts > '2024-01-01'\` does the following:

1. **Read the footer first.** Get the schema, row group offsets, and per-row-group min/max for \`ts\`.
2. **Skip row groups** where max(\`ts\`) < '2024-01-01'.
3. **For surviving row groups, read only two column chunks**: \`amount\` and \`ts\`. Skip everything else (user_id, ip, user_agent, ...).
4. **Within column chunks, optionally skip pages** using page-level stats.
5. **Decompress + decode + aggregate.**

A 100-column, 1TB Parquet table, with 30-day retention partitioned by date, queried for one day on one column, ends up reading **megabytes** off S3 — not the full TB.

That is why Parquet wins for analytics. Memorize this. You will be asked.

### Encodings inside a page

Parquet uses several encodings, in this rough priority:

| Encoding | When applied |
|---|---|
| **Dictionary** | Default; great for low-cardinality strings (country codes, status enums). Stores a dict + indices. |
| **RLE (Run-Length Encoding)** | For repeating values. \`'US','US','US','US'\` → \`('US', 4)\`. |
| **Bit-packing** | For small integers — packs 5-bit ints 8 to a byte instead of 4 bytes each. |
| **Plain** | Fallback. |
| **Delta encoding** | For sorted numeric columns (timestamps). Stores diffs. |

These are why Parquet typically compresses 5–20x on real workloads — *before* any codec like Snappy/Zstd is applied on top. The structural compression (dict + RLE + bit-packing) does most of the work; the codec just squeezes the residual.

### Parquet pitfalls in production

- **Small files problem.** Many small Parquet files (one per micro-batch) destroy read performance — every file has metadata overhead and an S3 LIST/GET round-trip. *Compact* into 128MB–1GB files. Iceberg/Delta have built-in compaction.
- **Wrong row group size.** Default in Spark is 128MB; default in pandas is 64MB; tuning matters for read/write balance.
- **Partition column also stored in data** by default. Some engines store the partition column inside the file too — wasteful.
- **Schema mismatch on read.** Different files with different schemas in the same prefix break naive readers. Use a table format (Iceberg/Delta) to manage schema evolution.

## Compression — what actually compresses what

| Format | Without codec | With Snappy | With Zstd | With Gzip |
|---|---|---|---|---|
| CSV (1GB) | 1GB | ~600MB | ~300MB | ~280MB |
| JSON (1GB) | 1GB | ~500MB | ~250MB | ~230MB |
| Avro (1GB) | ~700MB | ~400MB | ~250MB | ~230MB |
| Parquet (1GB raw equivalent) | ~150MB | ~120MB | ~80MB | ~75MB |

(Approximate, workload-dependent.)

The point: Parquet's structural compression already beats CSV+gzip. Adding Zstd on top of Parquet is the modern best balance of ratio and decode speed.

**Default codec by use case:**

| Use case | Codec |
|---|---|
| Default analytics read-heavy | **Zstd (level 3)** |
| Spark/Trino legacy default | **Snappy** (faster, slightly larger) |
| Cold archive | **Gzip** (slowest decode, smallest size) |

## Splittability — the term you must know

A file is **splittable** if a parallel processing engine can divide it into independent chunks for parallel readers.

- **CSV uncompressed:** splittable on newlines.
- **CSV gzip:** *not splittable*. One reader, one task. **Single-threaded ingest of a 100GB gzipped CSV is the most common newcomer mistake.**
- **CSV bzip2:** splittable (bzip2 has block boundaries). Slow decode.
- **JSONL uncompressed:** splittable.
- **Avro:** splittable at block sync markers.
- **Parquet:** splittable at row group boundaries.
- **ORC:** splittable at stripe boundaries.

In an interview, if asked "why does this Spark job have one task?", *gzip-CSV* is the textbook answer.

## Schema evolution — what each format gives you

| Operation | CSV | JSON | Avro | Parquet | ORC |
|---|---|---|---|---|---|
| Add nullable column | breaks | tolerates | yes | yes | yes |
| Add required column | breaks | breaks | yes (with default) | breaks | breaks |
| Rename column | breaks | tolerates | yes (with alias) | breaks (without table format) | breaks |
| Drop column | breaks | tolerates | yes | yes (read tolerates) | yes |
| Widen type (int→long) | breaks | tolerates | yes | partial | partial |
| Narrow type | breaks | tolerates | no | no | no |

**This is why Avro dominates streaming**: schemas evolve, and Avro's evolution semantics are formal and bidirectional. **And why Parquet on raw S3 is fragile**: rename a column and your historical files become inaccessible — unless you use a table format (Iceberg/Delta) which handles evolution at the table level.

## Decision tree — which format for which use case

\`\`\`
Is the consumer human or external partner?
├── Yes → CSV (with explicit schema doc) or JSON
└── No → continue
    │
    Is this streaming over Kafka with evolving schemas?
    ├── Yes → Avro (with Schema Registry)
    └── No → continue
        │
        Is this final analytics storage in a lake / lakehouse?
        ├── Yes → Parquet (with Iceberg or Delta table format on top)
        └── No → continue
            │
            Is this an existing Hive/Tez stack?
            ├── Yes → ORC (legacy choice)
            └── No → Parquet
\`\`\`

### Quick "what would you choose for X" answers

| Workload | Format |
|---|---|
| Daily partner CSV upload | CSV (no choice) |
| Mobile app events landed in S3 Bronze | JSONL (raw), then Parquet (Silver) |
| Kafka payloads with strict schema control | Avro + Schema Registry |
| Fact tables in lakehouse | Parquet + Iceberg |
| Backup of OLTP for compliance | Parquet (or Avro if record-by-record retrieval matters) |
| LLM eval / training datasets | Parquet (default), JSONL (if conversational with nested structure) |
| Geospatial / scientific arrays | Parquet (with Arrow) or specialized (GeoParquet, Zarr) |

## Interview traps

> **"Why is Parquet faster than CSV for analytics?"**

Trap answers: "It's binary." "It's compressed." Right answer: **"It's columnar. A query that touches 2 of 100 columns reads ~2% of the bytes. CSV is row-oriented; you can't skip columns. Plus min/max stats let Parquet skip whole row groups before reading them. The columnar physics is the win; binary and compression are secondary."**

> **"Why does my Spark job on this 100GB gzipped CSV have only one task?"**

Trap answer: "Increase parallelism." Right answer: "Gzipped CSV is **not splittable**. Single reader by physics. Convert to Parquet, or to bzip2 if you must keep CSV, or split the file ahead of time."

> **"Why not always use Parquet?"**

Trap answer: "It's always best." Right answer: "It's optimized for column scans, not record reads or streaming writes. For Kafka payloads, Avro evolves better. For human-readable exports, CSV. For Bronze with rapidly changing schemas, JSONL. Pick by access pattern."

> **"Tell me about Parquet's row group."**

This is the deep-dive question. Answer: row group is the unit of parallelism (typical 128MB–1GB), contains one column chunk per column, each chunk is paged (typical 1MB), pages carry their own encoding + stats. Footer holds schema + per-row-group min/max + offsets. Readers use the footer to prune.

> **"What's the difference between Parquet and ORC?"**

Trap: "They're the same." Right: "Conceptually similar — both columnar, both Hadoop-era. ORC has slightly better integer compression and richer indexes (light/medium/Bloom). Parquet has dominant ecosystem momentum — Iceberg, Delta, Arrow, every modern engine. For greenfield, Parquet."

> **"Schema evolution in Parquet?"**

Trap: "Just works." Right: "Adding nullable columns works file-to-file. Rename / type changes do not — at the file level. To get robust evolution, you need a *table format* (Iceberg, Delta) on top, which tracks schema versions and handles rewrites. Parquet alone is not a table; Iceberg-on-Parquet is."

## What an interviewer is actually probing

When asked about file formats, the interviewer is checking:

1. **Do you understand the *physical* difference between row and columnar?**
2. **Do you know splittability and why gzip-CSV is a footgun?**
3. **Can you reason about *which format for which access pattern*** rather than reciting "use Parquet"?
4. **Have you been bitten by small files, schema drift, or non-splittable formats** — i.e. have you operated long enough to have war stories?
5. **Do you know that Parquet is not a table** — that Iceberg/Delta sit on top to handle evolution and ACID?

If you can answer those five, you sound senior.

## Self-check

1. Draw the Parquet file structure from memory: file → row group → column chunk → page.
2. Why does Parquet compress 5–20x even before a codec?
3. Why is gzipped CSV non-splittable?
4. Which format would you pick for: (a) Kafka payloads, (b) lakehouse fact tables, (c) partner exports, (d) LLM training data?
5. What's the difference between Parquet's column chunk and a row group?
6. Why does Parquet alone struggle with rename-column, and what fixes it?

That closes Part 1 of the Data Engineering Fundamentals path. The next parts cover schemas and modeling, transactional concepts (ACID, isolation), distributed systems primitives, batch vs streaming trade-offs, dimensional modeling (Kimball vs Inmon vs Data Vault), data quality, and orchestration.
`,
  },
];

async function main() {
  const pathId = `lp-${PATH_SLUG}`;

  await prisma.learningPath.upsert({
    where: { id: pathId },
    create: {
      id: pathId,
      slug: PATH_SLUG,
      title: "Data Engineering Fundamentals",
      description:
        "The senior-DE-grade fundamentals every interview probes — what the discipline actually is, the canonical stack, OLTP vs OLAP, file formats, schemas, distributed systems primitives, modeling, quality, and orchestration. Twelve modules across three parts.",
      icon: "🎓",
      category: "DATA_ENGINEERING_FUNDAMENTALS",
      level: "BEGINNER",
      order: 0,
      isPublished: true,
    },
    update: {
      slug: PATH_SLUG,
      title: "Data Engineering Fundamentals",
      description:
        "The senior-DE-grade fundamentals every interview probes — what the discipline actually is, the canonical stack, OLTP vs OLAP, file formats, schemas, distributed systems primitives, modeling, quality, and orchestration. Twelve modules across three parts.",
      icon: "🎓",
      category: "DATA_ENGINEERING_FUNDAMENTALS",
      level: "BEGINNER",
      order: 0,
      isPublished: true,
    },
  });

  for (let i = 0; i < MODULES_PART_1.length; i++) {
    const m = MODULES_PART_1[i];
    const id = `lm-${PATH_SLUG}-${String(i + 1).padStart(2, "0")}`;
    await prisma.learningModule.upsert({
      where: { id },
      create: {
        id,
        pathId,
        slug: m.slug,
        title: m.title,
        description: m.description,
        content: m.content,
        readTimeMinutes: m.readTimeMinutes,
        order: i,
        isPublished: true,
      },
      update: {
        slug: m.slug,
        title: m.title,
        description: m.description,
        content: m.content,
        readTimeMinutes: m.readTimeMinutes,
        order: i,
        isPublished: true,
      },
    });
  }

  console.log(`✓ Fundamentals path + ${MODULES_PART_1.length} modules (part 1)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
