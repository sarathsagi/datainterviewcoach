/**
 * seed-learn-fundamentals-3.ts
 *
 * Part 3 of the "Data Engineering Fundamentals" learning path.
 * Adds modules 9-12 (orders 8-11): schema evolution, data quality,
 * distributed systems primer for DE, and cloud storage fundamentals.
 *
 * The path itself is created in part 1; this file ONLY upserts modules.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const PATH_SLUG = "data-engineering-fundamentals";
const PATH_ID = `lp-${PATH_SLUG}`;

const MODULES_PART_3: Array<{
  slug: string;
  title: string;
  description: string;
  readTimeMinutes: number;
  content: string;
}> = [
  {
    slug: "schema-evolution-basics",
    title: "Schema Evolution: Why It Always Breaks and How to Stop Bleeding",
    description:
      "Forward vs backward compatibility, when each matters, additive-only writes, schema registries, Avro/Parquet/JSON evolution semantics, and the migration patterns (dual-writes, blue-green, expand-and-contract) that don't take down production.",
    readTimeMinutes: 10,
    content: `# Schema Evolution: Why It Always Breaks and How to Stop Bleeding

Every data engineer eventually files the same incident ticket: *"a producer added a field, a consumer crashed, the dashboard is empty."* Schema evolution is the single most common cause of pipeline outages at scale, and it's the single most likely follow-up question after any "tell me about a system you built" answer.

This module is the rulebook.

## Why schemas change in the first place

Schemas are not specifications handed down from a planning committee. They are negotiated contracts that drift because:

- **Product changes** — a new checkout flow needs a new field on the order event.
- **Bug fixes** — a field was always nullable but the schema said \`required\`; someone "tightens" it.
- **Deprecations** — \`user_id\` (int32) gets replaced by \`user_uuid\` (string).
- **Source-system upgrades** — a SaaS vendor renames a column in their export.
- **Re-modeling** — what used to be one event splits into three.

You will never stop schema change. You will only manage it.

## Forward vs backward vs full compatibility

This is the vocabulary every interviewer expects you to use precisely.

| Term | Meaning | Who it protects |
|---|---|---|
| **Backward compatible** | New schema can read **old** data | Consumers upgraded first |
| **Forward compatible** | Old schema can read **new** data | Producers upgraded first |
| **Full compatibility** | Both directions work | You don't control rollout order |
| **Breaking change** | Neither direction works | You're paged |

### When each matters

- **Backward compatibility** is the default goal. You upgrade the consumer, point it at a topic that still has years of old data, and it must keep working. Almost every analytics pipeline needs this — backfills, re-reads, historical reprocessing.
- **Forward compatibility** matters when you can't upgrade all consumers at the same instant. The producer ships first; some consumers are still on the old schema; they must not crash.
- **Full compatibility** is what you want for any contract crossing organizational boundaries (your team's Kafka topic consumed by three other teams).

> Interview probe: *"You change a field from optional to required. Backward or forward incompatible?"* — Both. Old data lacks the field (breaks new readers requiring it = backward incompatible). Old producers may emit records without the field (breaks new schema = forward incompatible). This is why **never tighten** is the cardinal rule.

## The cardinal rule: additive-only writes

If you do nothing else, do this:

1. **Add fields with defaults.** Never add a required field.
2. **Never rename.** Add the new name, deprecate the old.
3. **Never change types.** \`int32 → int64\` is technically safe in some formats, never safe in others; just don't.
4. **Never delete.** Mark deprecated, stop writing, retire after every consumer is off it.

Additive-only writes give you backward AND forward compatibility almost for free.

## Format-by-format evolution semantics

The rules differ wildly by serialization format. Candidates who say "we used Avro for evolution" without being able to explain *why* lose the point.

| Format | Add field | Remove field | Rename | Reorder | Type widen |
|---|---|---|---|---|---|
| **JSON** | Free (consumer ignores unknowns if tolerant) | Free (consumer treats as null) | Breaking | N/A | Breaking |
| **Avro** | Need default value in reader schema | Need default value in writer schema | Use \`aliases\` | Free (named fields) | Some (int→long, float→double) |
| **Protobuf** | Free (unknown fields preserved) | Free (reserve the tag number!) | Free (tag number is identity) | Free | Limited |
| **Parquet** | Free (column-oriented, name-based) | Free | Breaking unless you re-write | Free | Limited |
| **Thrift** | Free if optional + new tag | Free if reserved | Free (tag-based) | Free | Limited |

### The Avro gotcha

Avro evolution requires **both** schemas at read time — the writer's schema (what made the bytes) and the reader's schema (what your code expects). The Avro library reconciles them. This is why Confluent Schema Registry exists: it stores writer schemas keyed by ID embedded in each message, so consumers can fetch the right writer schema on demand.

### The Parquet gotcha

Parquet is named-column. Adding a column is free; renaming is not. Many teams "rename" by reading old files, projecting old → new, and rewriting — this is a multi-petabyte mistake nobody warns you about until it's running.

### The JSON gotcha

JSON has no schema, so the *consumer's* tolerance is the schema. If your consumer does \`row["price"]\` instead of \`row.get("price")\`, every missing field is a 3 AM page.

## Schema registries: what they actually do

Confluent Schema Registry, AWS Glue Schema Registry, Apicurio. The real value is not "central storage of schemas." It's:

1. **Compatibility enforcement at write time.** A producer registering a new version is rejected if it violates the configured compatibility mode (BACKWARD, FORWARD, FULL, NONE).
2. **Version IDs in the wire format.** Every Avro/Protobuf message ships with a 4-byte schema ID prefix. The consumer fetches and caches the corresponding writer schema.
3. **Evolution governance.** The registry is the audit trail when something breaks.

> Interview trap: *"We used a schema registry so we never had outages."* — Wrong. Registries enforce *format-level* compatibility. They cannot tell you that semantically the field \`amount\` flipped from cents to dollars. That requires a **data contract** + tests, not a schema check.

## The naive ALTER TABLE story

Every team does this once:

\`\`\`sql
ALTER TABLE orders ADD COLUMN promo_code VARCHAR(64);
\`\`\`

Why it breaks pipelines:

- The downstream Spark job has a hardcoded select-list — the new column is silently ignored, fine.
- The dbt model has \`SELECT *\` — the new column shows up, downstream model schema changes, BI tool refuses to refresh.
- The CDC connector emits a schema-change event — consumers crash on the unknown event type.
- Someone runs \`ALTER TABLE ... DROP COLUMN promo_code\` two weeks later — and now Parquet files in the lake have the column, the table doesn't, and \`SELECT *\` from a copy-on-read table errors.

The DDL was 12 characters. The blast radius was 4 teams.

## Migration patterns that actually work

### 1. Dual-writes (additive)

When introducing a new field, write **both** old and new for a deprecation window. Consumers migrate at their own pace. Stop writing the old field only after telemetry shows zero readers.

### 2. Expand-and-contract (the safe rename)

This is the canonical pattern for every "rename" or "type-change" migration:

| Phase | Producer | Consumer | Storage |
|---|---|---|---|
| **Expand** | Writes both \`old_col\` and \`new_col\` | Old or new readers both work | Both columns present |
| **Migrate** | Same | Migrate consumers one by one to \`new_col\` | Both columns present |
| **Contract** | Stops writing \`old_col\` | All on \`new_col\` | Drop \`old_col\` after grace period |

This is the *only* safe rename pattern at scale. Every other approach is a coordinated outage.

### 3. Blue-green for storage layer changes

When the change isn't just a column but a whole table or schema:

- **Blue** = current pipeline writing to \`orders_v1\`.
- **Green** = new pipeline writing to \`orders_v2\` with the new schema.
- Run both in parallel. Validate row counts and aggregates match.
- Cut over BI/consumers to green.
- Decommission blue.

Cost: 2x storage during migration. Worth it.

### 4. Shadow reads / dark launch

For consumer-side changes — read both old and new schemas, log diffs, do not act on the new path. After a week of clean diffs, flip.

## Interview answer template

> *"A downstream consumer breaks because the schema changed — what's your remediation?"*

A senior answer hits five beats:

1. **Stop the bleed.** Pin the consumer to the last-known-good schema version (registry rollback or pin to a frozen Avro schema file). Get the dashboard green.
2. **Diagnose.** Was it a true breaking change (field type, required field added) or a tolerance bug in the consumer (e.g., \`row["x"]\` vs \`row.get("x")\`)?
3. **Reverse out the producer change** if it was non-additive. Re-emit it under expand-and-contract.
4. **Backfill.** If the bad schema was already written to S3/Kafka for hours, you need to either reprocess or compensate. Quantify the rows affected.
5. **Prevent.** Add the missing compatibility check (registry mode = BACKWARD), add a contract test in CI, document who approves schema changes for this domain.

## Interview traps

1. **"We use Protobuf so we're safe."** — Protobuf is *tolerant*, not *safe*. Forgetting to reserve a deleted field's tag number = future field reuses the tag = silent data corruption.
2. **"Schema registry prevents all breakage."** — It prevents wire-format breakage. Not semantic drift, not nullability tightening at the application layer.
3. **"Avro is better than Parquet for evolution."** — Different layers. Avro is row-oriented for streams; Parquet is columnar for analytics. Both evolve fine if you follow additive rules.
4. **"Just version the topic — \`orders_v2\`."** — Now you have two topics, two retention policies, and N consumers to migrate. Sometimes correct, often a cop-out for not designing evolution properly.

## What to default to

- Format: Avro for streams, Parquet for analytics, JSON only if you're forced to.
- Registry: on, BACKWARD compatibility minimum, FULL for cross-team contracts.
- Process: every schema PR requires a contract test that loads a fixture of *old* data through the new schema.
- Culture: the producer team owns the contract; consumers raise issues, not patches.
`,
  },
  {
    slug: "data-quality-fundamentals",
    title: "Data Quality Fundamentals: Tests, Contracts, and the Shift Left",
    description:
      "What 'quality' actually means in DE — completeness, accuracy, freshness, uniqueness, consistency. Tests vs contracts vs SLAs/SLOs, the shift-left philosophy, the dbt/Great Expectations/Soda/Monte Carlo landscape, and how to actually investigate a 0-sales dashboard.",
    readTimeMinutes: 12,
    content: `# Data Quality Fundamentals: Tests, Contracts, and the Shift Left

The most common reason a senior DE candidate gets downleveled is a weak data quality story. Anyone can wire up Airflow + Spark + Snowflake. Quality is what separates "I built a pipeline" from "I built a pipeline a business can rely on."

## What "quality" actually means

There is no single definition, but the industry has converged on six dimensions. Memorize them.

| Dimension | Question it answers | Example failure |
|---|---|---|
| **Completeness** | Is every expected record present? | 5% of orders missing because Kafka consumer crashed |
| **Accuracy** | Do values match reality? | \`price_usd\` actually contains EUR for 2 days |
| **Freshness / Timeliness** | Is the data recent enough to be useful? | Dashboard shows yesterday because DAG failed silently |
| **Uniqueness** | Are duplicates absent? | Same payment processed twice; \`COUNT DISTINCT\` lies |
| **Consistency** | Do related datasets agree? | Order total ≠ sum of line items across two tables |
| **Validity** | Do values match the expected format/range? | \`country_code\` = \`"USA"\` when schema says ISO-2 |

Some authors add **Integrity** (foreign keys hold) as a seventh. In interviews, naming five of these confidently and giving one example each is enough.

## Tests vs Contracts vs SLAs vs SLOs

These four words are often used interchangeably. They are not the same.

| Concept | Where it lives | What it does | Who acts on it |
|---|---|---|---|
| **Test** | dbt / Great Expectations / Soda | Asserts a property of a single table at a point in time | The DE team running the pipeline |
| **Contract** | Code / schema registry / repo | Defines the producer's promise about a dataset | Producer vs Consumer |
| **SLA** | Org-level agreement | Business commitment ("daily by 8 AM ET, 99.5% of the time") | The org pays a penalty if violated |
| **SLO** | Internal target | Engineering budget that informs alerting ("freshness < 30 min, 99.9%") | The on-call rotation |

Tests run *every pipeline run*. Contracts gate *deploys*. SLOs drive *paging*. SLAs drive *escalation*.

## The shift-left philosophy

Old-school quality:

\`\`\`
Source → Ingest → Transform → Warehouse → BI → "the dashboard is wrong"
                                                      ▲
                                       discovery happens here
\`\`\`

Shift-left quality:

\`\`\`
Source → Ingest → Transform → Warehouse → BI
   │        │         │            │
   ▼        ▼         ▼            ▼
 Contract  Schema   Tests       Anomaly
 enforced  check    fail fast   detection
\`\`\`

The principle: **catch the issue as close to where it was created as possible**. Costs of detection grow exponentially as data flows downstream:

- Source caught: 1x — you reject the bad write.
- Ingest caught: 10x — you quarantine and reprocess.
- Transform caught: 100x — you backfill all derived tables.
- BI caught: 1000x — you have already misled an executive.

## The four layers where you should test

### 1. Source / contract layer

Producer signs a contract: "schema X, freshness Y, primary key on Z, no nulls in W." Enforced at write time via:

- Schema registry compatibility checks.
- Producer-side validators (a thin library wrapping every emit).
- Reject-on-violation queues (DLQ for events that fail the contract).

### 2. Ingestion layer

The first time the data lands in your boundary. Check:

- **Row count** vs expected (e.g., source said 1.2M, you got 800K → alert).
- **Schema match** vs registered.
- **PK uniqueness**.
- **Watermark / max event time** is moving forward.

### 3. Transformation layer

dbt-style tests on every model:

\`\`\`yaml
models:
  - name: dim_customers
    columns:
      - name: customer_id
        tests:
          - unique
          - not_null
      - name: country_code
        tests:
          - accepted_values:
              values: ['US', 'CA', 'MX', ...]
      - name: signup_date
        tests:
          - dbt_utils.expression_is_true:
              expression: ">= '2010-01-01'"
\`\`\`

### 4. Serving / observability layer

Statistical / behavioral checks:

- Row count today vs trailing 7-day median.
- Distribution drift on key numerical columns (KS test, p-value threshold).
- Null rate change > 2σ.
- Freshness SLO breach (last update older than threshold).

## The tooling landscape

| Tool | Best at | Limits |
|---|---|---|
| **dbt tests** | In-warehouse, declarative, version-controlled with the model | Only runs when dbt runs; assertion-style |
| **Great Expectations** | Rich expectation library, profiling, docs generation | Heavy; the "expectation suite" can become its own legacy product |
| **Soda** | YAML-first, lightweight, multi-warehouse | Smaller test library than GE |
| **Monte Carlo / Bigeye / Anomalo** | ML-driven anomaly detection on freshness, volume, schema, distributions | Black-boxy; cost; false positives until tuned |
| **Custom SQL + Airflow sensors** | Free, infinite flexibility | You're now a quality-platform team |

The senior take: dbt tests + a managed observability tool covers ~90% of needs. Great Expectations only if you have a strong stewardship culture to maintain it.

## Observability vs Monitoring vs Alerting

Three words used interchangeably by candidates and interviewers. Differentiate:

- **Monitoring** = collecting metrics on known-knowns. "Row count, freshness lag, null rate."
- **Observability** = the property of being able to answer *unknown* questions about your system after the fact. "Why did the row count drop on Tuesday at 3 PM?" → you can drill into lineage, sample bad rows, see which upstream changed.
- **Alerting** = paging humans on metric thresholds. A subset of monitoring.

A pipeline with monitoring but no observability tells you *something is wrong* but not *what*. That's a 4-hour incident instead of a 20-minute one.

## Anomaly detection vs hard thresholds

| Approach | Pros | Cons | When to use |
|---|---|---|---|
| **Hard threshold** (\`row_count > 1000\`) | Predictable, easy to reason about | Stale; needs constant retuning | Stable, well-understood pipelines |
| **Statistical** (z-score on trailing 30d) | Adapts to growth/seasonality | Cold start; struggles with structural breaks | Mature pipelines with history |
| **ML anomaly** (Monte Carlo et al.) | Catches subtle drift | Expensive; opaque; alert fatigue | High-value tables, executive dashboards |

The right answer in interviews is **layered**: hard thresholds for the catastrophic ("zero rows" — a true anomaly model often misses this because zero is a frequent prior), statistical for the gradual, ML for the long tail.

## The "0 sales today" investigation playbook

This is the canonical interview question. Walk through it like a doctor doing triage.

**Step 0 — Confirm the report.** Run the underlying query yourself. Is it actually zero, or is it a BI cache?

**Step 1 — Scope.** Zero across all regions, all products? Or just a slice? A slice tells you the bug; a global zero is almost always upstream.

**Step 2 — Freshness check.** When was the fact table last updated?
- If stale → DAG / job problem. Go check the orchestrator.
- If fresh → data IS flowing, but is wrong. Continue.

**Step 3 — Volume vs values.** Is the row count zero, or are the rows there but \`amount = 0\`?
- Zero rows: ingestion broke (Kafka lag, source system down, S3 prefix wrong).
- Rows present but amount=0: a code or schema change neutered the field. Check recent deploys.

**Step 4 — Lineage walk upstream.** \`fact_sales\` ← \`stg_orders\` ← \`raw.orders_kafka\` ← producer service. Check row counts at each step. The level where it drops is where it broke.

**Step 5 — Recent changes.** What deployed in the last 24h? Schema change? New code? New feature flag? Talk to the producer team.

**Step 6 — Communicate.** While investigating, post status updates every 15 min. The business hears "I'm investigating" much better than silence.

**Step 7 — Remediate.** Backfill once the bug is fixed. Validate row counts and totals match a trusted reference (yesterday-vs-trailing-7d).

**Step 8 — Postmortem.** Add the test that would have caught this. If the answer is "no test could have caught this," you didn't think hard enough.

> Interview trap: jumping straight to "I'd reprocess from S3." The senior signal is *triage discipline* — confirm, scope, isolate, then act.

## Interview traps

1. **"We had 100% test coverage."** — Coverage of *what*? Tests are not free; over-testing creates alert fatigue and slow CI. Quality is about the *right* tests, not all the tests.
2. **"Data contracts solve everything."** — Contracts solve the producer-consumer interface. They don't solve a field that drifts in semantics, or a source system that genuinely changed.
3. **"We use ML for anomaly detection."** — Cool. What's the false-positive rate? How do you tune it? What does the on-call do at 3 AM with a "score: 0.87" alert?
4. **"Dashboards are the source of truth."** — Dashboards are *views*. The source of truth is the warehouse model with tests, lineage, and ownership.

## Defaults

- Every dbt model: \`unique\` + \`not_null\` on PK, \`relationships\` on FKs.
- Every fact table: row-count-vs-trailing-median anomaly check, freshness SLO.
- Every cross-team contract: schema registry + a CI test that loads producer fixtures.
- Every dataset: an owner. No owner = no quality.
`,
  },
  {
    slug: "distributed-systems-primer-for-de",
    title: "Distributed Systems Primer for Data Engineers",
    description:
      "The distsys vocabulary every DE candidate is expected to wield: CAP, PACELC, partitioning strategies (range/hash/list/composite), replication and leader election, and consistency models — every section tied back to a real DE pattern.",
    readTimeMinutes: 14,
    content: `# Distributed Systems Primer for Data Engineers

You will not be asked to derive Paxos in a DE interview. You *will* be asked: "Why did you partition by user_id?" "Is that AP or CP?" "What consistency does Snowflake give you?"

This module covers the distsys surface area DEs are actually graded on. Every concept ends with a DE pattern, not academic theory.

## CAP — and why everyone gets it slightly wrong

CAP says: a distributed system facing a network **partition** must choose between **consistency** (every read sees the latest write) and **availability** (every request returns a response).

The candidate failure mode is saying "We chose AP" or "We chose CP" as if it's a system-wide property. **It's per-operation.** A single system can be CP for some calls and AP for others.

### CP wins: ledgers, payments, inventory

A bank cannot return "balance: 100" if a partition might have caused a withdrawal you don't see. The bank prefers to time out (sacrifice A) over showing an old number (sacrifice C).

DE pattern: a transactional fact table behind \`SELECT FOR UPDATE\` in Postgres, the consistency-critical leg of a CDC pipeline.

### AP wins: shopping cart, social feed, telemetry

Amazon famously argued that an unavailable cart loses revenue immediately, while a cart that briefly shows two states reconciles fine. Choose A; reconcile later via vector clocks / last-write-wins / CRDTs.

DE pattern: streaming ingestion into S3 — accept the write into a buffer immediately, accept duplicates, dedupe at read time. You favored A because losing the write was worse than seeing it twice briefly.

### The lie: "no partition, no problem"

CAP only triggers during a partition. The rest of the time, you trade *consistency vs latency* — which is what PACELC formalizes. Most DE interviewers are happy if you mention PACELC by name.

## PACELC — because CAP is incomplete

> **If P**artition: choose **A**vailability or **C**onsistency. **E**lse: choose **L**atency or **C**onsistency.

| System | PA/PC | EL/EC | Read as |
|---|---|---|---|
| **DynamoDB** (default) | PA | EL | "Always available; eventually consistent for low-latency reads" |
| **DynamoDB** (strongly consistent reads) | PC | EC | "Higher latency, always fresh" |
| **Cassandra** | PA | EL | "Tunable, but the default is fast and eventually consistent" |
| **HBase** | PC | EC | "Single master per region; you wait for it" |
| **Spanner** | PC | EC | "Globally consistent; latency is the cost of TrueTime" |
| **Snowflake** | PC | EC (per-account) | "Strong reads after commit; cross-region replication is async" |
| **Kafka** (acks=all) | PC | EC | "ISR-based; leader-followers; consistent within partition" |

If you can answer "What's Cassandra's PACELC?" with "PA/EL — partitioned, choose availability; in steady state, choose latency" you have outclassed 80% of candidates.

## Partitioning — the DE bread and butter

Partitioning splits a dataset across nodes so storage and compute scale horizontally. This is the single most consequential design choice in any distributed data system.

### Strategies

| Strategy | How keys map to partitions | Pros | Cons |
|---|---|---|---|
| **Range** | Sort key, contiguous ranges per partition | Range scans efficient | Hot ranges (recent timestamps!) |
| **Hash** | \`hash(key) mod N\` | Even distribution | Range scans require fan-out |
| **List** | Explicit mapping (e.g., country → partition) | Simple multi-tenant isolation | Skew if list is uneven |
| **Composite / Hash-of-prefix** | Hash on outer key, range on inner | Best of both for time-series | Complex; harder to reason about |

### The hot-partition trap

Partition by timestamp = every write goes to the partition holding "now" = one node carries all the load = the cluster's effective throughput is one node's throughput.

Cure: prefix the key. \`{user_id}#{timestamp}\` or \`{hash(user_id) mod 256}#{timestamp}\` spreads writes across all partitions while preserving per-user range scans.

### Postgres vs Kafka vs Snowflake — same word, different meaning

| System | "Partition" means | What you control |
|---|---|---|
| **Postgres** (declarative partitioning) | Child tables holding subsets of rows | Range / List / Hash, defined in DDL |
| **Kafka** | Independent ordered logs sharing a topic | Number of partitions + the producer's partition key |
| **Snowflake** | Micro-partitions: 16 MB columnar files, automatic | Cluster keys (a hint), not direct control |
| **HDFS / S3 + Hive** | Directory prefix conventions (\`year=/month=/\`) | The prefix scheme |
| **Cassandra / Dynamo** | Hash partition + clustering columns | Partition key vs clustering key |

> Interview probe: *"You partition Kafka by \`user_id\`. What do you gain and what do you give up?"*
>
> Gain: per-user ordering (key→partition is deterministic). Loss: a hot user becomes a hot partition; rebalancing requires repartitioning the topic.

### The "how many partitions?" question

The senior answer is "enough that no single partition exceeds peak throughput, and not so many that broker overhead dominates." For Kafka: 10–100 per topic typical, scaling rule is \`max(target_throughput / per_consumer_throughput, target_throughput / per_partition_throughput)\`.

## Replication — the second half of every storage system

Replication keeps copies of each partition for durability and availability.

### Sync vs async

| Mode | Write latency | Durability on failure | Use |
|---|---|---|---|
| **Synchronous** (write to all replicas before ack) | High | No data loss | Bank ledgers, control planes |
| **Asynchronous** (ack after leader, replicate later) | Low | Last few writes can be lost | Analytics, telemetry |
| **Quorum** (W of N) | Tunable | Tunable | Cassandra, Dynamo |

Kafka's \`acks=all\` is *quorum-on-ISR*: the leader acks once all in-sync replicas have the record. Not "all configured replicas" — only the ones currently in-sync. This is a very common follow-up.

### Leader-follower vs leaderless

| Topology | Examples | Trade-off |
|---|---|---|
| **Single leader** | Postgres, Kafka per-partition, MySQL | Simple consistency; leader is bottleneck |
| **Multi-leader** | Multi-region active-active databases | Conflict resolution becomes the hard problem |
| **Leaderless / quorum** | Cassandra, Dynamo, Riak | Tunable, but read repair / hinted handoff complexity |

### Leader election

Kafka uses a controller (originally ZooKeeper, now KRaft) to elect partition leaders. Postgres uses external orchestration (Patroni, RDS failover). Spanner uses Paxos groups per shard.

What an interviewer wants you to know: *leader election takes time*. During failover (typically 5–30 s for Kafka, longer for Postgres), writes to that partition pause or fail. Your pipeline must tolerate this.

## Consistency models — name them, don't bluff them

Ranked from strongest to weakest, with one-line examples:

| Model | One-line | Example |
|---|---|---|
| **Linearizable** (strong) | Reads see the most recent write, system-wide, in real time | Spanner, etcd, ZooKeeper |
| **Sequential** | All replicas see writes in the same order; ordering ≠ real-time | Single-leader Postgres replicas with sync replication |
| **Causal** | If write A happened before B, everyone sees A before B; concurrent writes can reorder | Comments-and-replies in a social feed |
| **Read-your-writes** | A client always sees its own writes | Session affinity hacks in eventually-consistent stores |
| **Monotonic reads** | A client never sees time go backward | Read pinning to one replica |
| **Eventual** | All replicas converge if writes stop | DNS, Cassandra default, S3 cross-region replication |

> Interview probe: *"What consistency does a Kafka consumer get?"*
>
> Per-partition: total order, sequential. Across partitions: no ordering guarantee. *Within* a single key (because keys deterministically hash to partitions): causal-ish — same-key writes are observed in producer order.

## Why this matters for the DE patterns you'll be asked about

| Pattern | Distsys property invoked |
|---|---|
| Kafka exactly-once | Idempotent producer + transactional sequence numbers per partition; PC/EC within Kafka |
| Spark shuffle | Partitioning by hash; range partitioning for sort-merge |
| dbt incremental | Read-your-writes against the warehouse; idempotent re-runs |
| CDC into a lake | Eventual consistency at the lake; need a "merge" layer for read-time consistency |
| Multi-region replication for analytics | Async replication = stale dashboards in DR region; document SLO |
| Snowflake time-travel | Snapshot isolation = one form of strong consistency over a versioned store |

## Interview traps

1. **"We're CP."** — You mean *for this operation*, not as a system property. Saying "the system is CP" earns a follow-up that exposes you.
2. **"Eventual consistency means data is sometimes wrong."** — No. It means *not yet converged*. Big difference. The data is *correct*, just not visible everywhere yet.
3. **"More partitions = more throughput."** — Up to a point. Past it, broker overhead, rebalance time, and consumer count dominate. There is an optimum.
4. **"Two-phase commit gives us cross-system consistency."** — In theory. In practice, 2PC blocks on coordinator failure and is allergic to long-lived participants. Modern stacks prefer outbox + CDC.
5. **"Quorum means (N+1)/2 reads and writes."** — Quorum is whatever \`R + W > N\` you choose. The tunable is the point.

## Defaults to walk in with

- Partitioning: hash on a high-cardinality key; never on time alone.
- Replication: 3x with quorum reads/writes (\`R=W=2, N=3\`) for OLTP-ish; async for analytics.
- Consistency: linearizable for control plane (config, schema, leader info), eventual for data plane.
- Failover: design for it, document the SLO, test it quarterly.
`,
  },
  {
    slug: "cloud-storage-fundamentals",
    title: "Cloud Storage Fundamentals: S3, GCS, and Why HDFS Lost",
    description:
      "Object stores from a DE-pipeline angle: cost/latency profile, why they replaced HDFS for analytics, bucket layout for parallelism, Hive-style partitioning, request rate limits and prefix scaling, storage tiers, and what changes when you move a pipeline from HDFS to S3.",
    readTimeMinutes: 10,
    content: `# Cloud Storage Fundamentals: S3, GCS, and Why HDFS Lost

Every modern lakehouse — Iceberg, Delta, Hudi, Snowflake external tables, BigQuery external — sits on top of an object store. If you don't understand the object store's quirks, your "scalable" pipeline will eat its own throughput, your bill will surprise you, and your interviewer will catch you.

## What an object store actually is

Forget filesystems. An object store is a flat key→blob map exposed over HTTP.

| Property | Filesystem (HDFS, ext4) | Object store (S3, GCS, Azure Blob) |
|---|---|---|
| **Hierarchy** | Real directories | Flat namespace; "/" in keys is convention |
| **Mutation** | In-place edits | Replace whole object only |
| **Append** | Yes | No (S3) / limited (GCS) |
| **Rename** | Atomic, O(1) | Copy + delete; O(N) and not atomic |
| **Listing** | O(1) per dir | Paginated prefix scan; eventual on some ops |
| **Latency** | Microseconds | First-byte ~30–80 ms |
| **Throughput** | Local disk speed | Many GB/s aggregate, per-prefix limited |
| **Cost model** | Hardware + ops | Pay per byte stored, per request, per byte egressed |

Internalize: **rename is not free**, **append does not exist**, **listing is paginated**.

## Why object stores replaced HDFS for analytics

HDFS was the gold standard 2010–2016. It lost because:

1. **Coupled storage and compute.** Scaling storage required scaling NameNodes and DataNodes; scaling compute required more workers each holding spinning disks. The cloud severed this — S3 storage scales independently of EMR/Databricks compute.
2. **NameNode was a single point of attention.** Federation and HA helped; the cloud just sidesteps it.
3. **Cost.** Triple-replicated HDFS at $0.10/GB-month-equivalent for hardware + ops vs S3 Standard at $0.023/GB-month. 4–10x cheaper, before storage tiers.
4. **Durability.** S3 advertises 11 9s. Run an HDFS cluster yourself and you'll see 4–6.
5. **Ecosystem.** Every tool — Spark, Trino, Snowflake, BigQuery, Athena, Iceberg, Delta — has a first-class S3 reader. HDFS is a second-class citizen now.

## The cost/latency profile (memorize the order of magnitude)

| Operation | Typical latency | Typical cost |
|---|---|---|
| GET (small object) | 30–80 ms first byte | $0.0004 / 1k requests (S3 Standard) |
| PUT | 50–200 ms | $0.005 / 1k requests |
| LIST (1000 keys) | 100–500 ms | $0.005 / request |
| Storage (Standard) | n/a | $0.023 / GB-month |
| Storage (IA) | n/a | $0.0125 / GB-month + retrieval fee |
| Storage (Glacier Deep) | hours to retrieve | $0.00099 / GB-month |
| Egress to internet | n/a | $0.05–0.09 / GB |
| Egress same region, same cloud | n/a | Free |

Two truths fall out:

- **Many small objects = expensive.** A million 10 KB files cost more in PUT requests than 100 GB of data costs to store for a year. This is *the* cost antipattern of small-file-itis in lakes.
- **Egress dominates** any cross-cloud or cross-region pipeline. Architect to keep compute next to storage.

## Bucket layout: prefixes are the parallelism unit

S3 partitions throughput per *key prefix* via internal sharding. Recent docs say S3 auto-scales prefixes, but in practice:

- A single prefix sustains ~3,500 PUT/COPY/POST/DELETE per second and ~5,500 GET/HEAD per second.
- More prefixes → more parallel throughput.
- Sequentially-numbered keys (\`logs/2026/05/03/00001\`, \`00002\`, ...) defeat sharding. **Hash the prefix** for write-heavy workloads:

\`\`\`
logs/3a/2026/05/03/00001.parquet
logs/9f/2026/05/03/00001.parquet
logs/c1/2026/05/03/00001.parquet
\`\`\`

The first 2 hex chars = 256 prefixes = ~256× parallelism for ingestion.

## Hive-style partitioning — the read-side layout

For analytics, the dominant convention is Hive-style:

\`\`\`
s3://bucket/warehouse/sales/year=2026/month=05/day=03/region=us/part-0001.parquet
\`\`\`

Why this works:

- Query engines (Spark, Trino, Athena, BigQuery external) understand the convention and **prune partitions** on \`WHERE year=2026 AND month=05\`.
- A \`LIST\` call on \`year=2026/month=05/\` returns only the relevant partitions instead of the whole table.
- Each partition is a write boundary — appending a day = adding a directory.

Pitfalls:

- **Too granular** (\`day/hour/minute/second\`) → millions of tiny files → query planning becomes the bottleneck.
- **Too coarse** (\`year=\` only) → no pruning → full scans.
- **High-cardinality partition columns** (e.g., \`user_id\`) → catastrophe; one partition per user creates millions of prefixes.

Rule of thumb: aim for partitions of 100 MB to 10 GB compressed. Combine with file sizes of ~128 MB to 1 GB for optimal columnar reads.

## Manifest files — the modern fix

Pure Hive partitioning has limits: a *single LIST* across millions of partitions is slow, and there is no atomic "switch from old version to new." Manifest-file-based table formats (Iceberg, Delta, Hudi) solve this by:

- Storing the *list of files* explicitly in a manifest.
- Updating the manifest atomically (one PUT) for table commits.
- Allowing time-travel via versioned manifests.
- Enabling per-file column statistics for skip-pruning.

If you're designing a new lake in 2026, the answer is *not* "Hive-style + Glue catalog." It's *Iceberg or Delta on top of S3*.

## Access patterns to know

- **Range reads** (\`Range: bytes=0-65535\`) — Parquet column readers use this constantly to fetch column chunks without downloading the whole file. Free in S3 GET cost.
- **Prefix listing** — \`LIST bucket/prefix/\`, paginated 1000 keys at a time. Slow; cache in metadata catalogs (Glue, Hive Metastore).
- **Batch deletes** — \`DeleteObjects\` API takes up to 1000 keys per call. Critical for retention jobs.
- **Multipart upload** — for objects > 100 MB, upload in 5–100 MB parts in parallel. Enables resumability and higher aggregate throughput per object.

## Performance gotchas

### Eventual consistency on listing (historical)

Pre-Dec-2020, S3 had eventual consistency for LIST after PUT/DELETE. A job could write a file, list immediately, and *not see it*. Strong read-after-write is now the default for S3 — but **older code, S3-compatible stores (MinIO older versions, Ceph), and cross-region replication still surface this**. Iceberg/Delta sidestep it entirely by using manifest commits.

### The 5500 RPS prefix limit

Bursty ingestion (e.g., a Spark job writing 50,000 files in 10 seconds to one prefix) hits 503 SlowDown errors. Cure: hash-prefix as above, OR rely on S3's auto-scaling (which warms up over minutes, not seconds — so this is not a substitute for design).

### Many small files

100k × 10KB files = same total bytes as 1 × 1GB file. The query engine pays:

- 100k LIST + GET round-trips (each ~50 ms first byte).
- 100k Parquet footer reads.
- Planning overhead per file.

Result: a 30-second query becomes a 30-minute query. Cure: **compact** (Iceberg's \`OPTIMIZE\` / Delta's \`OPTIMIZE\` / Spark coalesce on write).

### Per-account request limits

S3 has account- and region-level burst limits. A runaway backfill can throttle the whole org. Watch \`5xxErrors\` and \`SlowDown\` in CloudWatch.

## Storage tiers — when to use which

| Tier | Latency to first byte | $/GB-month | Min duration | Use case |
|---|---|---|---|---|
| **S3 Standard** | ms | $0.023 | none | Hot analytics, recent partitions |
| **S3 Intelligent-Tiering** | ms | varies | 30 days | Default for unknown access patterns |
| **S3 Standard-IA** | ms | $0.0125 | 30 days | Older partitions read occasionally |
| **S3 Glacier Instant** | ms | $0.004 | 90 days | Compliance, occasional reads |
| **S3 Glacier Flexible** | minutes-hours | $0.0036 | 90 days | Archive |
| **S3 Glacier Deep Archive** | hours | $0.00099 | 180 days | Compliance vault |

Sensible default: lifecycle rule pushing partitions to Standard-IA at 30 days, Glacier Instant at 180 days, Deep at 365.

> Cost trap: Standard-IA has a *minimum object size* (128 KB billed regardless). Tiering small files to IA costs *more*, not less.

## What changes when you move a pipeline from HDFS to S3

This is the canonical interview close. A senior answer hits seven points:

1. **Renames are no longer free.** Spark's \`_temporary\` write commit pattern (write to staging, rename to final) becomes O(N) and fails partially. Switch to the **S3A magic committer** or **Iceberg/Delta** to avoid rename in the commit path.
2. **No append.** Anything that wrote append-style on HDFS (e.g., Flume to HDFS) needs replacement — either rolling new objects or using a streaming-aware format.
3. **List is slow and paginated.** Replace any \`hadoop fs -ls\` style enumeration with a metadata catalog (Glue, Hive Metastore, Iceberg manifest).
4. **Storage and compute decouple.** Your compute cluster has no local data; everything is read over network. Plan for **caching** (Alluxio, EMR Local Disk Caching) for hot tables.
5. **Cost model flips.** No more "the cluster is paid for, queries are free." Now every \`SELECT *\` is dollars. Push partition pruning, projection, and predicate pushdown harder.
6. **Failure modes change.** No NameNode pages; instead, watch S3 throttling, prefix hot-spots, and eventual consistency on S3-compatible stores.
7. **Security model changes.** HDFS Kerberos → IAM roles, bucket policies, KMS encryption. Cross-account access becomes a regular design concern.

## Interview traps

1. **"S3 is a filesystem."** — It is not. The first follow-up will catch you on rename or append.
2. **"It's eventually consistent."** — Out of date for native S3 since Dec 2020. Still true for some S3-compatible stores. Be precise.
3. **"More small files = more parallelism."** — Wrong inflection. Beyond ~hundreds of files per partition, planning overhead dominates I/O parallelism gains.
4. **"Glacier is cheap."** — Storage is cheap; *retrieval* is expensive and slow. People who put hot data in Glacier pay for it.
5. **"Multi-region replication gives me HA."** — It gives you durability + read locality. Application HA still requires *your code* to fail over, and replication is async.

## Defaults

- Format: Parquet, ZSTD or Snappy, ~256 MB target file size.
- Partitioning: Hive-style on the highest-selectivity time column + at most one categorical.
- Layout: hash-prefix for write-heavy ingest paths; raw Hive for read-heavy curated tables.
- Table format: Iceberg or Delta — never raw Hive in 2026 for new builds.
- Lifecycle: Standard → Standard-IA at 30 days → Glacier Instant at 180 days; never tier files < 128 KB.
- Compute next to storage: same region, ideally same AZ for high-throughput jobs.
`,
  },
];

async function main() {
  for (let i = 0; i < MODULES_PART_3.length; i++) {
    const m = MODULES_PART_3[i];
    const orderNum = i + 8; // modules 9-12 = orders 8-11
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
  console.log(`✓ Fundamentals modules 9-12 (part 3)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
