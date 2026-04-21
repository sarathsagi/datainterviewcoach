## The Interview Prompt

> "Design the data engineering platform for a social media company like Instagram or Twitter/X. The system handles 500,000 user events per second — likes, comments, shares, views, and follows. It must support real-time content ranking signals, a feed relevance ML pipeline, and a business analytics warehouse."

This question appears at Meta, Twitter/X, TikTok, Snap, LinkedIn, and any platform with a content feed. It tests your ability to design a **high-throughput, multi-consumer streaming architecture** where the same event data serves very different consumers simultaneously.

---

## Step 1 — Clarify Requirements

**Scale:**
- 500K events/sec peak (assume 2–3B monthly active users)
- Content ranking signals must be fresh within 10 seconds
- Feed ML training pipeline runs daily, needs data from the previous 7 days
- Trending topics must be computed in real time (< 60-second latency)
- Analytics warehouse: data available within 3 hours

**Functional requirements:**
- Ingest all interaction events (likes, shares, comments, views, follows)
- Compute real-time engagement scores per piece of content for ranking
- Detect trending topics and hashtags
- Feed a daily ML training pipeline for personalized feed ranking
- Power a business analytics warehouse (DAU, retention, creator revenue, ad performance)

**Non-functional:**
- At-least-once delivery (duplicate events acceptable — downstream deduplication)
- 5-year event retention for model training and compliance
- GDPR: ability to delete all events for a given user_id

---

## Step 2 — High-Level Architecture

The key insight: **one event stream, multiple consumers, each with different latency and accuracy requirements.**

```mermaid
flowchart TD
    subgraph Event Sources
        A["Web / Mobile clients\n500K events/sec\nLikes, Views, Shares\nComments, Follows"]
    end

    subgraph Ingestion Layer
        B["API Gateway\nEvent validation\nUser auth check"]
        C["Kafka\ntopic: user-events\n500 partitions\npartition key: user_id"]
    end

    subgraph Consumer 1 — Real-Time Ranking
        D["Flink Job: Engagement Scorer\nPer-content score\n10-second tumbling window"]
        E["Redis\ncontent:{id}:score\nTTL: 2 hours"]
        F["Ranking Service\nReads scores for feed assembly"]
    end

    subgraph Consumer 2 — Trending Topics
        G["Flink Job: Hashtag Counter\nSliding 5-min / 1-hour windows\nTop-K per window"]
        H["Redis\ntrending:{window}:sorted_set\nTTL: 2 hours"]
    end

    subgraph Consumer 3 — Cold Storage + Warehouse
        I["Kafka → S3\nRaw Bronze\nParquet, partitioned hourly"]
        J["Spark ETL — hourly\nSilver: deduplicated\nenriched events"]
        K["dbt — daily\nGold: dimensional models\nfact_events, dim_user, dim_content"]
        L["Snowflake / BigQuery\nAnalytics warehouse"]
    end

    subgraph Consumer 4 — ML Feature Pipeline
        M["Spark Job — daily\nUser interaction sequences\n7-day sliding window features"]
        N["Feature Store\n(offline: S3, online: Redis)"]
        O["Feed Ranker\nML model training + serving"]
    end

    A --> B --> C
    C --> D --> E --> F
    C --> G --> H
    C --> I --> J --> K --> L
    J --> M --> N --> O
```

---

## Step 3 — Component Deep Dive

### Kafka — The Central Nervous System

```
Topic: user-events
Partitions: 500
Partition key: user_id
Replication: 3
Retention: 7 days (hot) + S3 archive (5 years cold)
Schema: Avro + Confluent Schema Registry
```

**Why partition by `user_id`, not `content_id`?**

The real-time engagement scorer needs to aggregate by `content_id`, which means Flink will re-key the stream internally. But partitioning by `user_id` is better for the session window use case (all events from the same user are co-located for session detection) and avoids hot partitions from viral content (a post with 1M likes in 10 minutes on `content_id` partitioning would overwhelm one partition).

**Avro schema for user events:**

```json
{
  "type": "record",
  "name": "UserEvent",
  "fields": [
    {"name": "event_id",    "type": "string"},
    {"name": "user_id",     "type": "string"},
    {"name": "content_id",  "type": "string"},
    {"name": "event_type",  "type": {"type": "enum", "symbols": ["VIEW", "LIKE", "SHARE", "COMMENT", "FOLLOW", "UNFOLLOW"]}},
    {"name": "event_time",  "type": "long",   "logicalType": "timestamp-millis"},
    {"name": "session_id",  "type": ["null", "string"], "default": null},
    {"name": "platform",    "type": {"type": "enum", "symbols": ["iOS", "Android", "Web"]}},
    {"name": "metadata",    "type": ["null", "string"], "default": null}
  ]
}
```

Schema Registry enforces backward compatibility — new fields must have defaults, field removal follows a deprecation cycle.

### Consumer 1 — Real-Time Engagement Scorer (Flink)

Computes a weighted engagement score per piece of content every 10 seconds:

```python
# Engagement weights (tuned by data science team)
WEIGHTS = {
    'SHARE':   10.0,   # shares are strongest signal
    'COMMENT':  5.0,
    'LIKE':     2.0,
    'VIEW':     0.5,
    'FOLLOW':   8.0,   # follows from a piece of content are very strong
}

class ContentEngagementAggregator(AggregateFunction):
    def create_accumulator(self):
        return defaultdict(float)

    def add(self, event, acc):
        weight = WEIGHTS.get(event['event_type'], 0.1)
        acc[event['content_id']] += weight
        return acc

    def get_result(self, acc):
        return acc   # {content_id: score}

# Re-key by content_id for aggregation
events \
    .key_by('content_id') \
    .window(TumblingEventTimeWindows.of(Time.seconds(10))) \
    .aggregate(ContentEngagementAggregator()) \
    .add_sink(RedisSink())  # content:{id}:score → float, TTL 2h
```

**Watermark:** 30-second watermark handles mobile app batching (apps buffer events for a few seconds before flushing). A 10-second window with a 30-second watermark means the window result is emitted at t+40s — acceptable for ranking.

**Redis storage:**

```
content:c_12345:score           → 847.5      (TTL: 2h)
content:c_12345:score_updated   → 1710000040 (timestamp of last update)
```

The Ranking Service reads these scores when assembling a user's feed, blending real-time engagement with longer-term ML scores.

### Consumer 2 — Trending Topics (Flink)

Counts hashtag mentions in sliding windows to detect trends:

```python
# Extract hashtags from events that contain text (comments, shares with captions)
hashtags = events \
    .filter(lambda e: e['event_type'] in ('COMMENT', 'SHARE')) \
    .flat_map(lambda e: extract_hashtags(e['metadata'])) \
    .key_by('hashtag') \
    .window(SlidingEventTimeWindows.of(
        size=Time.minutes(60),
        slide=Time.minutes(5)
    )) \
    .aggregate(HashtagCounter())
```

**Top-K with Redis sorted sets:**

```python
class RedisTopKSink(SinkFunction):
    def invoke(self, result):
        hashtag, count, window_key = result
        # Sorted set: score = count, member = hashtag
        redis.zadd(f"trending:{window_key}", {hashtag: count})
        redis.expire(f"trending:{window_key}", 7200)   # 2h TTL
        # Keep only top 100
        redis.zremrangebyrank(f"trending:{window_key}", 0, -101)
```

Query trending topics: `redis.zrevrange("trending:1h", 0, 9)` → top 10 hashtags in the last hour.

### Consumer 3 — Bronze/Silver/Gold Pipeline

**Bronze (Kafka → S3 via Kafka Connect):**

```
s3://datalake/bronze/user-events/
  year=2024/month=03/day=15/hour=14/
    part-0001.parquet  (~128 MB per partition per hour)
```

Snappy compressed Parquet. One file per Kafka partition per hour. S3 lifecycle rule: Bronze moves to Glacier after 90 days, deleted after 5 years.

**Silver (Spark, hourly):**

```python
raw = spark.read.parquet("s3://datalake/bronze/user-events/year=.../hour=...")

silver = (
    raw
    # Dedup: mobile clients can send the same event twice on retry
    .dropDuplicates(["event_id"])
    # Validate
    .filter(F.col("user_id").isNotNull() & F.col("content_id").isNotNull())
    # Enrich: join with user metadata for content classification
    .join(broadcast(content_meta), "content_id", "left")
    # Normalize event_time timezone to UTC
    .withColumn("event_date", F.to_date(F.from_unixtime(F.col("event_time") / 1000)))
)

silver.write.mode("append").partitionBy("event_date", "event_type").parquet("s3://datalake/silver/events/")
```

**Why `dropDuplicates(["event_id"])` not `dropDuplicates(["user_id", "content_id", "event_type"])`?**

The same user can like the same content multiple times (like → unlike → like). Natural key dedup would collapse these into one event. `event_id` dedup only removes true duplicates from mobile retries.

**Gold (dbt, daily):**

```sql
-- fact_events: one row per validated interaction event
-- grain: one event = one user action on one piece of content
SELECT
    e.event_id,
    u.user_key,
    c.content_key,
    d.date_key,
    e.event_type,
    e.platform,
    e.session_id,
    CASE
        WHEN e.event_type = 'LIKE'    THEN 2.0
        WHEN e.event_type = 'SHARE'   THEN 10.0
        WHEN e.event_type = 'COMMENT' THEN 5.0
        WHEN e.event_type = 'VIEW'    THEN 0.5
        ELSE 0.0
    END AS engagement_score
FROM {{ ref('silver_events') }}   e
JOIN {{ ref('dim_user') }}        u ON e.user_id    = u.user_id
JOIN {{ ref('dim_content') }}     c ON e.content_id = c.content_id
JOIN {{ ref('dim_date') }}        d ON e.event_date = d.full_date
```

### Consumer 4 — ML Feature Pipeline

Daily Spark job builds user interaction sequences for feed ranking model training:

```python
# 7-day user interaction history per user
user_sequences = (
    spark.read.parquet("s3://datalake/silver/events/")
    .filter(F.col("event_date") >= F.date_sub(F.current_date(), 7))
    .groupBy("user_id")
    .agg(
        F.collect_list(
            F.struct("content_id", "event_type", "event_time")
        ).alias("interaction_sequence"),
        # Aggregate features
        F.sum(F.when(F.col("event_type") == "LIKE", 1).otherwise(0)).alias("likes_7d"),
        F.sum(F.when(F.col("event_type") == "SHARE", 1).otherwise(0)).alias("shares_7d"),
        F.countDistinct("content_id").alias("unique_content_7d"),
        F.countDistinct("session_id").alias("sessions_7d"),
    )
)

# Write to offline feature store (S3) for training
user_sequences.write.mode("overwrite").parquet("s3://feature-store/user-features/daily/")

# Write to online feature store (Redis) for serving
# Use a separate job to push to Redis in batches
```

---

## Step 4 — GDPR Right-to-Erasure

User deletion is a legal requirement. Events are stored in multiple places — each needs a deletion strategy:

| Storage | Deletion approach |
|---------|------------------|
| Kafka | Tombstone message (null value for user_id key); TTL expires after 7 days |
| S3 Bronze | S3 Object deletion after lookup (slow, but Bronze is immutable) |
| S3 Silver/Gold | Partition by event_date + user_id hash; delete affected partitions, recompute |
| Redis | `DEL` all keys matching `user:{user_id}:*` |
| Warehouse (Snowflake) | `DELETE FROM fact_events WHERE user_key = ?` |
| Feature Store | Nightly sweep: delete user_id from feature tables |

**The challenge**: Bronze Parquet files are immutable — you can't delete one user's rows without rewriting the whole file. Solution: maintain a `deleted_users` table. All queries on Bronze join against this table to filter deleted users. Full file rewrite is batched monthly for compliance audit.

---

## Step 5 — Scaling and Failure Modes

### Hot Path Scaling

| Component | Throughput | Scaling |
|-----------|-----------|---------|
| Kafka | 500K events/sec | 500 partitions × ~1K/sec/partition — headroom for 5× |
| Flink engagement scorer | CPU-bound on window aggregation | Scale out task parallelism; RocksDB state for large cardinality |
| Redis engagement scores | 500K writes/sec + 10M reads/sec (feed assembly) | Redis Cluster, sharded by content_id; read replicas per region |
| Trending hashtag Flink | Text parsing is CPU-intensive | Pre-filter to events with text before keying |

### Cold Path Scaling

**Partition skew in Silver ETL**: viral content generates millions of events per `content_id` in a short window. Partitioning Silver by `event_type` distributes load better than `content_id`. For extreme cases, salt the join key.

**dbt daily run time**: At 4B events/day, full `fact_events` rebuild takes hours. Use `incremental` materialization with `unique_key='event_id'` — only process yesterday's partition.

### Failure Modes

**Flink engagement scorer fails:**
Checkpoint restores in ~30 seconds. Redis keys have 2-hour TTL — slightly stale scores are used for ranking during recovery. Feed quality degrades marginally, not an outage.

**Kafka consumer lag spikes:**
Monitor consumer group lag. If Flink falls behind (e.g., viral event spike), the lag buffer is Kafka's 7-day retention. Increase Flink task parallelism, throttle back if needed. Real-time scores are delayed but will catch up.

**Silver ETL fails:**
Airflow retries 3× with exponential backoff. Bronze data is safe in S3. If Silver for hour H fails, it can be rerun independently — partitioned output means no impact on hours H+1, H+2, etc.

---

## Common Interview Questions

**"Why Flink for real-time scoring instead of Spark Streaming?"**

Spark Streaming is micro-batch — 10-second trigger intervals would add latency before the window even starts. Flink processes records as they arrive, enabling true 10-second tumbling windows with results emitted immediately when the watermark advances. For a 10-second freshness SLA, Flink's record-at-a-time processing is the right choice.

**"How do you handle the viral content problem — one post getting 1M likes in 10 minutes?"**

Two issues: (1) hot Kafka partition — mitigated by partitioning by `user_id` not `content_id`; all those likes come from different users so they spread across partitions. (2) hot Redis key — one content_id key receiving millions of writes/sec. Use Redis pipelining + local Flink accumulation: aggregate in Flink for 10 seconds before writing a single Redis update, not one write per event.

**"How would you implement a 'delete all data for a user' request (GDPR)?**

Multi-step: tombstone in Kafka, filter table for Bronze S3 (rewrite monthly), direct deletes in Silver/Gold warehouse partitions, `DEL` in Redis. The hardest part is immutable Bronze Parquet — the filter table approach (not rewriting immediately) is the pragmatic solution that keeps the pipeline moving while satisfying compliance with a scheduled monthly full rewrite.

**"How does the real-time score flow into the feed ML model?"**

Two-layer ranking: (1) **real-time signal** — the Flink/Redis engagement score captures what's popular right now, used as a feature at serving time; (2) **ML model** — trained daily on 7-day interaction sequences, captures personalized user preferences. At serving time: candidate set → ML model scores each candidate using the personalized features + real-time engagement → ranked feed. The real-time score is one feature among many, not the only ranking signal.

---

## Key Takeaways

- **Fan-out from one Kafka topic to multiple consumers** — each consumer has a different latency SLA and accuracy requirement; never design one pipeline that tries to serve all of them
- **Partition by `user_id`, not `content_id`** — avoids hot partitions from viral content and supports session detection
- **Redis sorted sets for Top-K** — `ZADD` + `ZREMRANGEBYRANK` is the idiomatic Redis pattern for maintaining a bounded leaderboard
- **`event_id` dedup, not natural key dedup** — the same user-content-action can legitimately repeat; dedup only true retransmissions
- **Avro + Schema Registry** — at 500K events/sec, binary encoding reduces Kafka storage and network bandwidth by 3–5×; Schema Registry prevents breaking schema changes from reaching consumers
- **GDPR requires a deletion story for every storage layer** — immutable Bronze Parquet means a filter table approach, not immediate rewrites
- **Incremental dbt models at this scale** — daily full rebuilds of a 4B-row fact table are not viable; `is_incremental()` with date partitioning is essential
