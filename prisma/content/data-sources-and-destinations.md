## Why Source and Destination Knowledge Matters

Every data engineering interview — whether it's system design or a technical screen — starts with the same implicit question: where does data come from, and where does it need to go? If you can't answer that clearly, you can't design the pipeline in between.

Interviewers expect you to classify sources and destinations quickly, because the classification determines your entire extraction and loading strategy.

---

## Data Sources — The Four Categories

### 1. Transactional Databases (OLTP)

Relational databases that power applications: Postgres, MySQL, Oracle, SQL Server. These are the most common data engineering source.

**Characteristics:**
- Highly normalized schemas (3NF) — optimized for writes, not reads
- Changes happen continuously as users interact with the app
- Direct bulk reads (`SELECT * FROM orders`) put load on the production database
- Schema changes happen without notice as engineers update the application

**Extraction approaches:**
| Method | How | When to use |
|--------|-----|-------------|
| Full extract | `SELECT * FROM table` on a schedule | Small tables, simple pipelines |
| Incremental | `WHERE updated_at > last_run_timestamp` | Medium tables, moderate change rate |
| CDC (Change Data Capture) | Read the database transaction log (WAL) | High-volume tables, need deletes, near-zero DB load |

**The CDC advantage:** Reading the WAL doesn't require touching the production database at all — the transaction log is written regardless of whether anyone is reading it.

### 2. Event Streams

Kafka topics, Kinesis streams, Pub/Sub — unbounded sequences of events published by applications, services, or IoT devices.

**Characteristics:**
- Append-only: events are immutable once written
- Time-ordered within a partition, not globally
- High throughput: thousands to millions of events per second
- Events can arrive late (mobile apps buffer events before flushing)
- Schema embedded per message (JSON) or stored separately (Avro + Schema Registry)

**Extraction:** Kafka consumer groups subscribe to topics. The consumer tracks its offset — the position of the last successfully processed message. On restart, consumption resumes from the committed offset.

```
Offset tracking:
  Consumer committed offset: 1,000
  Latest offset: 1,200
  Lag: 200 messages (pipeline fell behind)
```

**Key interview point:** Kafka partitions are the unit of parallelism. A consumer group with 10 consumers reading a 10-partition topic processes 10 partitions in parallel. Adding an 11th consumer gains nothing — one consumer stays idle.

### 3. REST APIs and SaaS Platforms

External services that expose data via HTTP: Salesforce, HubSpot, Stripe, Google Ads, GitHub. Data comes in JSON or XML, usually paginated.

**Characteristics:**
- Rate limits: 100–10,000 requests/hour depending on the API tier
- Pagination: APIs return 100–1,000 records per response; you need to follow `next_page` cursors to get all records
- No log-based CDC available — you can only see current state, not history of changes
- API schema changes are frequent and undocumented

**Extraction pattern:**

```python
def extract_all_pages(api_client, endpoint, since_timestamp):
    cursor = None
    while True:
        response = api_client.get(endpoint, since=since_timestamp, cursor=cursor)
        yield from response['data']
        
        cursor = response.get('next_cursor')
        if not cursor:
            break   # no more pages
        
        time.sleep(rate_limit_delay)   # respect rate limits
```

**Incremental extraction:** Most APIs support a `since` or `updated_after` parameter. Always use incremental where available — full extracts on large SaaS datasets can hit rate limits before finishing.

### 4. Files and Object Storage

CSV, JSON, Parquet, Avro dropped into S3, GCS, SFTP servers — common for partner data shares, vendor exports, and legacy systems that can't expose an API.

**Characteristics:**
- Batch delivery: files arrive on a schedule (nightly, weekly)
- No streaming — pipeline runs when a new file appears
- Schema embedded in the file or agreed out-of-band (CSV has no schema)
- Files can be very large (multi-GB CSVs are common)

**Extraction trigger:** `S3KeySensor` in Airflow — poll until the file appears, then trigger the pipeline. The flag file pattern is common: the sender drops `data_20240315.csv` first, then `data_20240315.csv.done` when writing is complete — prevents reading a partially written file.

---

## Data Destinations — Where Data Lands

### Data Warehouses

Snowflake, BigQuery, Redshift — columnar, massively parallel query engines optimized for analytical reads.

**When to use:** Business intelligence, SQL-based analytics, structured reporting.

**Loading patterns:**
- **COPY command** (bulk load from S3): fastest — loads gigabytes in seconds
- **INSERT / MERGE**: row-level upserts, slower but works for incremental updates
- **Streaming inserts** (BigQuery): row-by-row real-time ingestion, expensive per-row

### Data Lakes

S3, GCS, Azure Data Lake — cheap object storage that holds any file format at any scale.

**When to use:** Raw landing (Bronze), large-scale Spark processing, ML training data, long-term retention at low cost.

**Loading patterns:**
- Write Parquet files partitioned by date
- Use open table formats (Delta Lake, Iceberg, Hudi) to add ACID transactions and schema evolution on top of raw object storage

### Operational Databases

Writing *back* to Postgres, MySQL, or DynamoDB — when the pipeline produces results that an application needs to serve to users.

**When to use:** ML model serving (write predictions back for the app to read), recommendation systems, real-time dashboards backed by Redis or DynamoDB.

**Key constraint:** Operational databases are not designed for bulk inserts of millions of rows. Write processed results, not raw events.

### Message Queues / Streams (as destination)

Writing processed results back to Kafka — common in the streaming pattern where one pipeline's output is another pipeline's input.

**Example:** Flink reads `raw-clicks` topic → enriches with user data → writes to `enriched-clicks` topic → downstream ML pipeline consumes `enriched-clicks`.

---

## Source → Destination Matrix

| Source type | Extraction method | Destination | Pipeline pattern |
|-------------|------------------|-------------|-----------------|
| OLTP database | CDC (Debezium) | Data lake → warehouse | Streaming ingestion → batch transform |
| OLTP database | Incremental SQL | Data warehouse directly | Batch ETL |
| Kafka topic | Consumer group | S3 Bronze | Kafka Connect sink |
| Kafka topic | Flink / Spark Streaming | Delta Lake / Redis | Stream processing |
| REST API | Paginated HTTP | S3 Bronze → warehouse | Scheduled batch (Airflow) |
| File (S3, SFTP) | File sensor trigger | Data lake | Event-driven batch |

---

## Interview Pattern — Classifying Sources Quickly

When an interviewer says "design a pipeline for [company]", immediately classify their data source:

1. **Is it a database?** → CDC or incremental SQL. Ask: how large is the table? how frequently does it change?
2. **Is it an event stream?** → Kafka consumer. Ask: what's the event rate? how many partitions?
3. **Is it an API?** → HTTP extraction. Ask: what are the rate limits? does it support incremental `since` params?
4. **Is it files?** → File sensor. Ask: what format? how often do files arrive? do they use a completion flag?

This classification determines your entire ingestion architecture before you've drawn a single box.

---

## Key Takeaways

- Four source types: OLTP databases, event streams, REST APIs, files — each has a distinct extraction pattern
- CDC (WAL-based) is the best approach for OLTP databases: no production DB load, captures deletes, near-real-time
- Kafka partition count = max consumer parallelism; adding consumers beyond partition count gains nothing
- API extraction requires pagination and rate limiting; always use incremental (`since`) over full extract
- File sources need a completion flag pattern — never read a file while it's still being written
- Data lakes (S3 + Delta/Iceberg) for raw storage and scale; data warehouses (Snowflake/BigQuery) for analytical queries — they serve different purposes and are often used together
