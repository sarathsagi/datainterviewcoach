import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const quizzes: Record<
  string,
  { question: string; options: string[]; answer: number; explanation: string }[]
> = {
  "data-modeling": [
    {
      question: "What does the 'grain' of a fact table define?",
      options: [
        "The number of rows in the table",
        "The level of detail each row represents — the most atomic unit being measured",
        "The primary key strategy for the fact table",
        "The number of dimension tables connected via foreign keys",
      ],
      answer: 1,
      explanation:
        "The grain is the single most important design decision in dimensional modeling. It defines exactly what one row means — for example, 'one row per order line item.' Getting the grain wrong leads to double-counting and incorrect aggregations.",
    },
    {
      question:
        "Which normalization form eliminates transitive dependencies, where a non-key column depends on another non-key column?",
      options: ["1NF", "2NF", "3NF", "BCNF"],
      answer: 2,
      explanation:
        "3NF requires that no non-key attribute depends on another non-key attribute. If City depends on ZipCode and ZipCode depends on CustomerID, that's a transitive dependency violating 3NF. BCNF is stricter but 3NF is the practical standard for OLTP design.",
    },
    {
      question: "What is a degenerate dimension?",
      options: [
        "A dimension with very low cardinality (e.g., a boolean flag)",
        "A dimension key stored in the fact table with no corresponding dimension table",
        "A deprecated dimension no longer used in reporting",
        "A Type 1 SCD that overwrites historical values",
      ],
      answer: 1,
      explanation:
        "A degenerate dimension (e.g., order_number, invoice_number) has no attributes worth putting in a separate table — it's just the transaction identifier. It lives in the fact table as a key you can filter and group by, but there's no dimension table to join.",
    },
    {
      question: "What best describes a conformed dimension?",
      options: [
        "A dimension that matches the grain of its primary fact table",
        "A dimension shared across multiple fact tables with identical keys and semantics",
        "A dimension built entirely from surrogate keys",
        "A dimension that contains only current (non-historical) records",
      ],
      answer: 1,
      explanation:
        "Conformed dimensions (e.g., a shared Date or Customer dimension) allow you to drill across multiple fact tables. If Sales and Inventory both use the same Date dimension with the same keys, you can join their results on date without ambiguity.",
    },
    {
      question: "Why are surrogate keys preferred over natural keys as dimension primary keys?",
      options: [
        "Natural keys are always non-unique, making surrogate keys necessary",
        "Surrogate keys decouple the warehouse from source system changes, support SCD history rows, and provide a stable join target",
        "Surrogate keys compress better in columnar storage",
        "Natural keys cannot be indexed in most databases",
      ],
      answer: 1,
      explanation:
        "Natural keys (e.g., customer_id from CRM) can change, be reused, or carry source-system meaning. Surrogate keys are system-generated integers that remain stable, allow SCD Type 2 to create multiple rows for one entity, and keep the warehouse independent of upstream system changes.",
    },
    {
      question:
        "In a fact table, what is the difference between an additive, semi-additive, and non-additive measure?",
      options: [
        "Additive: sums across all dimensions. Semi-additive: sums across some dimensions (e.g., not time). Non-additive: cannot be summed at all (e.g., ratios)",
        "Additive: stored as integers. Semi-additive: stored as decimals. Non-additive: stored as strings",
        "Additive: calculated at query time. Semi-additive: pre-aggregated. Non-additive: derived from other measures",
        "There is no practical difference — all measures should be summed the same way",
      ],
      answer: 0,
      explanation:
        "Account balance is a classic semi-additive measure — you can sum balances across accounts but averaging across time periods is more meaningful than summing. Ratios like profit margin are non-additive; you must recompute them from their components rather than summing.",
    },
  ],

  "change-data-capture": [
    {
      question:
        "What is the primary advantage of log-based CDC over trigger-based CDC?",
      options: [
        "Log-based CDC is easier to implement and requires no database configuration",
        "Log-based CDC reads the transaction log asynchronously, adding near-zero overhead to the source database",
        "Log-based CDC works out of the box with all databases without special permissions",
        "Log-based CDC guarantees exactly-once delivery natively",
      ],
      answer: 1,
      explanation:
        "Trigger-based CDC fires database triggers on every INSERT/UPDATE/DELETE, which adds overhead to every write operation. Log-based CDC (e.g., Debezium reading Postgres WAL) reads change events after they're committed, decoupling capture from the transactional write path.",
    },
    {
      question: "What does 'at-least-once delivery' guarantee in a CDC pipeline?",
      options: [
        "Every event is delivered exactly once with no duplicates",
        "Events are delivered strictly in commit order",
        "Every event is delivered at least once — duplicates are possible and consumers must be idempotent",
        "Events may be lost but are never duplicated",
      ],
      answer: 2,
      explanation:
        "At-least-once is the practical default for most CDC systems. Connectors may replay events after a restart (from the last checkpoint LSN), so consumers must handle duplicates — typically via UPSERT on primary key rather than blind INSERT.",
    },
    {
      question:
        "What role does an LSN (Log Sequence Number) play in Postgres-based CDC?",
      options: [
        "It encrypts change events for secure transmission to Kafka",
        "It defines the schema of change events using Avro encoding",
        "It uniquely identifies a position in the WAL, used as a cursor so the connector can resume after restarts without replaying all history",
        "It counts the total number of transactions processed since the connector started",
      ],
      answer: 2,
      explanation:
        "The LSN is the WAL cursor. Debezium stores the last-processed LSN in Kafka Connect's offset store. On restart, it resumes from that LSN rather than replaying the entire log, enabling fault tolerance without full reprocessing.",
    },
    {
      question:
        "What is a Kafka tombstone record and why is it important for CDC delete events?",
      options: [
        "A record with a special schema that marks schema evolution events",
        "A null-value message for a given key, which signals Kafka log compaction to remove that key's history",
        "A checkpoint record used by Kafka Connect to track consumer group offsets",
        "A marker for the beginning of a Kafka transaction boundary",
      ],
      answer: 1,
      explanation:
        "Log compaction in Kafka retains only the latest value per key. When a row is deleted in CDC, the connector emits a tombstone (key=row PK, value=null). Compaction then removes all prior values for that key, keeping the compacted log consistent with source data.",
    },
    {
      question:
        "When loading CDC changes into a warehouse, which pattern best handles idempotent upserts?",
      options: [
        "Always INSERT new rows and never modify existing rows",
        "Drop and reload the entire target table on every micro-batch",
        "MERGE (upsert) on primary key — INSERT if new, UPDATE if changed, using a last-modified timestamp to handle late arrivals",
        "Apply events strictly in arrival order without any deduplication",
      ],
      answer: 2,
      explanation:
        "MERGE/UPSERT on primary key is idempotent — replaying the same event produces the same result. Using a last-modified timestamp prevents older late-arriving events from overwriting newer data. This is the foundation of CDC load patterns in BigQuery, Snowflake, and Databricks.",
    },
    {
      question: "What is schema evolution in CDC, and how does a Schema Registry help?",
      options: [
        "Schema evolution means changing the CDC connector version; the registry tracks connector releases",
        "Schema evolution is adding/removing columns in the source; the registry stores versioned Avro/JSON schemas so consumers can deserialize old and new events without breaking",
        "Schema evolution is a Kafka topic partitioning strategy for handling wide tables",
        "Schema evolution refers to time-travel queries against historical CDC events",
      ],
      answer: 1,
      explanation:
        "When a source table adds a column, old consumers shouldn't break. A Schema Registry (e.g., Confluent) stores each schema version with compatibility rules (backward, forward). Consumers fetch the correct schema version per message, enabling graceful evolution.",
    },
  ],

  "gcp-data-engineering": [
    {
      question: "How does BigQuery on-demand pricing work?",
      options: [
        "You pay per row returned by your query",
        "You pay per byte of data processed (scanned) by your query — approximately $5 per TB",
        "You pay per query execution, billed in 1-second increments",
        "You pay a flat monthly rate regardless of query volume",
      ],
      answer: 1,
      explanation:
        "BigQuery on-demand bills for bytes processed (scanned), not bytes stored or returned. This is why selecting only needed columns and partitioning/clustering tables to reduce scan size matters so much for cost optimization.",
    },
    {
      question:
        "Which GCP service is the recommended choice for real-time streaming data ingestion into the data platform?",
      options: ["Cloud Storage", "Cloud SQL", "Pub/Sub", "Cloud Spanner"],
      answer: 2,
      explanation:
        "Pub/Sub is GCP's managed messaging service for decoupled, real-time event streaming. It handles fan-out to multiple consumers (BigQuery, Dataflow, Cloud Functions) and is the standard entry point for streaming data before processing or loading.",
    },
    {
      question: "What is the relationship between GCP projects, datasets, and BigQuery tables?",
      options: [
        "Projects contain datasets; datasets contain tables, views, and routines — the three form the full resource hierarchy",
        "Datasets are physical storage units; projects are logical groupings within a dataset",
        "Projects define compute resources; datasets define storage; tables are the billing unit",
        "All three are interchangeable — you can nest them in any order",
      ],
      answer: 0,
      explanation:
        "The BigQuery hierarchy is project → dataset → table (or view). Access control is applied at dataset or table level. This structure maps to a three-part table name: `project.dataset.table` used in SQL queries.",
    },
    {
      question:
        "In Dataflow streaming pipelines, what is a 'window' used for?",
      options: [
        "A UI panel in the Dataflow console for monitoring worker health",
        "A bounded time range used to group streaming elements so aggregations (like counts or sums) can be computed over a finite set",
        "A memory buffer that stages data before writing to BigQuery",
        "A checkpoint mechanism for exactly-once processing guarantees",
      ],
      answer: 1,
      explanation:
        "Streaming data is unbounded, so you need windows to compute aggregates. Fixed windows group data in non-overlapping intervals (e.g., every 5 minutes). Sliding windows overlap. Session windows group by inactivity gaps. Without windows you can't meaningfully aggregate streaming data.",
    },
    {
      question: "How do BigQuery external tables differ from native tables?",
      options: [
        "External tables are faster because data stays closer to compute",
        "External tables reference data stored in Cloud Storage (or other sources) without loading it — queries read directly from the source on each execution",
        "External tables support streaming inserts; native tables support batch loads only",
        "External tables are automatically clustered and partitioned by BigQuery",
      ],
      answer: 1,
      explanation:
        "External tables (federated queries) let you query GCS files (CSV, JSON, Parquet, Avro) without ETL. They're ideal for raw landing zones or occasionally queried data. The tradeoff: no caching, no partitioning benefits, and performance depends on GCS throughput.",
    },
    {
      question: "Cloud Composer is a managed service built on which open-source orchestrator?",
      options: ["Apache Spark", "Apache Kafka", "Apache Airflow", "Apache Beam"],
      answer: 2,
      explanation:
        "Cloud Composer is Google's managed Apache Airflow. It handles cluster provisioning, upgrades, and scaling. DAGs are written in Python using Airflow's operators and stored in a GCS bucket that Composer syncs automatically.",
    },
  ],

  "slowly-changing-dimensions": [
    {
      question: "What happens to existing data in an SCD Type 1 implementation when an attribute changes?",
      options: [
        "A new row is added with an effective date, preserving the old value",
        "The existing row is overwritten in place — historical values are permanently lost",
        "A separate history table is populated before the update",
        "A version number is incremented and both rows are retained",
      ],
      answer: 1,
      explanation:
        "SCD Type 1 is the simplest approach: just UPDATE the row. This is appropriate when you don't care about history (e.g., fixing a typo in a name). Any facts already joined to this dimension before the change will now reflect the new value when re-queried.",
    },
    {
      question:
        "In SCD Type 2, which columns are added to track full attribute history?",
      options: [
        "created_at and deleted_at timestamps",
        "effective_start_date, effective_end_date (or is_current flag), plus a surrogate key per version",
        "version_number and row_checksum",
        "insert_date and update_date audit columns",
      ],
      answer: 1,
      explanation:
        "SCD Type 2 inserts a new row for each change. You close the previous row by setting its end date (or is_current = false) and open a new row with today as the start date. The surrogate key changes per version, while the natural key stays the same across rows.",
    },
    {
      question:
        "What is the conventional sentinel value for the effective_end_date of currently active SCD Type 2 records?",
      options: [
        "NULL — indicating no end date has been set",
        "The current date — updated nightly by a batch job",
        "A far-future date like 9999-12-31 or 2099-12-31",
        "The date the record was first inserted",
      ],
      answer: 2,
      explanation:
        "Using 9999-12-31 as the end date for active records allows simple BETWEEN queries without NULL checks. `WHERE current_date BETWEEN eff_start AND eff_end` returns both current and historical records correctly, making time-travel queries straightforward.",
    },
    {
      question: "What is SCD Type 3 and what is its key limitation?",
      options: [
        "Type 3 stores unlimited history via row versioning; its limitation is storage cost",
        "Type 3 adds previous_value and current_value columns for a single attribute — it only tracks one level of change history",
        "Type 3 moves rapidly changing attributes to a mini-dimension table",
        "Type 3 uses cryptographic hashing to detect changes; it cannot track multi-column changes",
      ],
      answer: 1,
      explanation:
        "SCD Type 3 adds a 'previous_region' column alongside 'current_region'. It can answer 'what was the previous value?' but not 'what was the value 3 changes ago?' — it only holds one prior version. Use it when exactly one level of history is needed and simplicity is valued.",
    },
    {
      question:
        "What is the mini-dimension pattern (sometimes called SCD Type 4) used for?",
      options: [
        "Keeping all history of small lookup tables in the fact table itself",
        "Splitting rapidly changing attributes (e.g., income_band, age_group) into a separate dimension table to avoid bloating the core dimension with frequent inserts",
        "Creating a summary view of SCD Type 2 that shows only current records",
        "Applying Type 1 overwrite logic to a subset of columns in a Type 2 dimension",
      ],
      answer: 1,
      explanation:
        "If a Customer dimension would generate thousands of SCD2 rows because demographics change frequently, you can move those volatile attributes to a mini-dimension (e.g., CustomerDemographic). The fact table carries a foreign key to both dimensions, avoiding Customer dimension bloat.",
    },
    {
      question:
        "When comparing old and new attribute values to detect SCD changes at scale in SQL, what is the most efficient technique?",
      options: [
        "Comparing every column one-by-one with OR conditions in a WHERE clause",
        "Computing an MD5 or SHA hash of all tracked columns and comparing a single hash value",
        "Using EXCEPT between old and new datasets",
        "Full outer join and checking for NULLs on either side",
      ],
      answer: 1,
      explanation:
        "Hashing the concatenation of all tracked columns (MD5(col1 || col2 || ...)) into a single row_hash stored in the dimension table lets you detect any change with one equality comparison. This is common in dbt SCD Type 2 implementations and CDC load jobs.",
    },
  ],

  "gcp-advanced-services": [
    {
      question: "What is the difference between BigQuery table partitioning and clustering?",
      options: [
        "They are equivalent — choosing one makes the other redundant",
        "Partitioning physically separates data into storage segments by a column value (eliminating entire partitions from scans); clustering sorts data within each partition by one or more columns (reducing rows scanned)",
        "Clustering divides data into segments; partitioning sorts within clusters",
        "Partitioning is for streaming data; clustering is for batch-loaded data only",
      ],
      answer: 1,
      explanation:
        "Partitioning prunes entire storage segments — a query filtering on `event_date = '2024-01-01'` skips all other date partitions. Clustering further reduces work within a partition by sorting data so BigQuery can skip row groups where the clustered column value doesn't match the filter.",
    },
    {
      question: "What is a BigQuery materialized view and how does it differ from a regular view?",
      options: [
        "A materialized view stores query results physically and is automatically and incrementally refreshed when base tables change — queries on it can be served from cached results",
        "A materialized view is a regular view that has been manually exported to Cloud Storage",
        "A materialized view caches results for 24 hours, after which it must be manually refreshed",
        "Materialized views are identical to regular views but support DML statements",
      ],
      answer: 0,
      explanation:
        "Unlike regular views (which re-execute the full query on every access), materialized views pre-compute and store results. BigQuery incrementally refreshes them when base tables change. The query optimizer can also rewrite queries that would benefit from the materialized view, even if you don't explicitly query it.",
    },
    {
      question: "BigQuery Omni enables what capability?",
      options: [
        "Querying BigQuery from mobile devices without a browser",
        "Running BigQuery SQL against data stored in AWS S3 or Azure Blob Storage without moving the data",
        "Federating queries across multiple GCP projects in a single SQL statement",
        "Automatically optimizing slot usage across flat-rate reservations",
      ],
      answer: 1,
      explanation:
        "BigQuery Omni uses Anthos to run BigQuery compute in AWS and Azure regions. You can query your S3 or Azure Blob data with standard BigQuery SQL without ETL, enabling multi-cloud analytics from a single query interface.",
    },
    {
      question: "What kind of information does `INFORMATION_SCHEMA.JOBS_BY_PROJECT` provide?",
      options: [
        "Table schemas and column metadata across all datasets",
        "Real-time slot usage and reservation assignments for current queries",
        "Historical query execution metadata: user, bytes processed, slot milliseconds, creation time, and error details",
        "Access control policies applied to datasets and tables",
      ],
      answer: 2,
      explanation:
        "INFORMATION_SCHEMA.JOBS is invaluable for cost auditing and performance tuning. You can find the most expensive queries, identify users scanning the most bytes, track query trends over time, and debug errors — all with SQL.",
    },
    {
      question: "When is flat-rate (slot reservation) pricing more cost-effective than on-demand BigQuery pricing?",
      options: [
        "Always — slots are always cheaper than on-demand",
        "For occasional, unpredictable ad-hoc queries where usage is hard to forecast",
        "When running consistent, high-volume workloads where monthly slot costs are less than the equivalent on-demand bytes-processed cost",
        "Only for streaming inserts, which are not covered by on-demand pricing",
      ],
      answer: 2,
      explanation:
        "The break-even point varies, but heavy continuous workloads benefit from flat-rate slots. On-demand is more economical for sporadic usage. The decision usually comes down to: estimate monthly on-demand cost and compare with slot commitment cost at your usage tier.",
    },
    {
      question: "What does BigQuery BI Engine do?",
      options: [
        "It is a separate Google product for building data dashboards without SQL",
        "An in-memory analysis service that accelerates SQL queries and BI tool integrations (Looker Studio, Looker) with sub-second response times",
        "A query optimizer that automatically rewrites slow queries to use materialized views",
        "A streaming insert API that batches rows before loading into BigQuery tables",
      ],
      answer: 1,
      explanation:
        "BI Engine maintains hot data in memory on BigQuery's servers. It dramatically speeds up the interactive queries that BI tools generate (filter, group, sort operations). You reserve capacity in GB and it's automatically used for eligible queries from connected BI tools.",
    },
  ],

  "snowflake-performance": [
    {
      question: "How does Snowflake's result cache work?",
      options: [
        "Results are cached on the virtual warehouse and expire after 1 hour",
        "Results are cached at the Cloud Services layer for 24 hours and are automatically served if the underlying data and query are identical",
        "Snowflake caches only metadata — full query results are never stored",
        "The result cache is per-user and requires manual configuration to enable",
      ],
      answer: 1,
      explanation:
        "Snowflake's result cache is global (not warehouse-specific), persists for 24 hours, and is automatically invalidated if any underlying table changes. This means identical queries from different users or sessions share cached results — great for dashboard queries that run repeatedly on the same data.",
    },
    {
      question: "What are Snowflake micro-partitions?",
      options: [
        "Manually defined partition keys similar to Hive-style partitioning",
        "Automatically managed, contiguous compressed columnar storage units (~50–500MB uncompressed) that Snowflake maintains without user intervention",
        "In-memory partitions created on virtual warehouses to speed up sorting",
        "Network partitions between Snowflake's cloud layers",
      ],
      answer: 1,
      explanation:
        "Snowflake automatically divides all tables into micro-partitions as data is loaded. Each micro-partition stores column min/max metadata, enabling partition pruning without any manual partitioning by the user. This is fundamentally different from Hive-style partitioning where you explicitly define partition keys.",
    },
    {
      question: "When is adding a clustering key to a Snowflake table beneficial?",
      options: [
        "On every table larger than 1GB to maintain query performance",
        "On small dimension tables to improve JOIN performance",
        "On large tables (typically 1TB+) with poor natural data ordering relative to common query filters — where micro-partition pruning is inefficient without clustering",
        "On all tables that are queried by multiple concurrent users",
      ],
      answer: 2,
      explanation:
        "If data arrives in random order relative to your most common filter column (e.g., rows for all customers arrive mixed by date rather than ordered by date), clustering re-orders data to improve pruning. The overhead of maintaining clustering is only worth it for large tables with clear query patterns.",
    },
    {
      question:
        "What is Snowflake's query profile and what specific problem does it help solve?",
      options: [
        "It records which users ran which queries for compliance auditing",
        "It shows a visual execution plan with per-operator statistics (rows processed, bytes scanned, spill to disk, wait times) to identify bottlenecks like data skew or missing partition pruning",
        "It provides cost estimates before running expensive queries",
        "It is a configuration panel for tuning virtual warehouse auto-suspend settings",
      ],
      answer: 1,
      explanation:
        "The query profile in Snowflake's UI or via EXPLAIN shows every operator in the execution plan with actual runtime statistics. You can identify if a JOIN is causing a data spill to remote storage (a major slowdown), whether partition pruning is happening, or if one node is processing far more data than others (skew).",
    },
    {
      question:
        "What does the SEARCH OPTIMIZATION SERVICE in Snowflake improve, and for what query pattern?",
      options: [
        "Full-table scans on large tables with no filtering",
        "JOIN performance between two large fact tables",
        "Point lookups and high-selectivity equality predicates on large tables, by building a search access path that persists on Cloud Storage",
        "Streaming insert throughput for high-volume event data",
      ],
      answer: 2,
      explanation:
        "Search Optimization is designed for queries like `WHERE user_id = '12345'` on billion-row tables. Regular micro-partition pruning doesn't help much with high-cardinality equality filters. The search access path maintains additional per-value metadata so Snowflake can pinpoint exactly which micro-partitions contain a specific value.",
    },
    {
      question:
        "What is the key architectural difference between scaling up (larger warehouse) vs. scaling out (multi-cluster warehouse) in Snowflake?",
      options: [
        "They are functionally equivalent — choose based on cost only",
        "Scaling up improves performance of individual complex queries (more compute per query); scaling out (multi-cluster) improves concurrency by serving more simultaneous queries without queuing",
        "Scaling up increases storage capacity; scaling out increases compute power",
        "Scaling out is only available on the Enterprise tier; scaling up is available on all tiers",
      ],
      answer: 1,
      explanation:
        "If a single query is slow, a larger warehouse gives it more nodes and memory. If many users are queued waiting for a warehouse, multi-cluster auto-scales by adding more warehouses to handle concurrent demand. A common mistake is scaling up when the real problem is concurrency.",
    },
  ],

  "cicd-data-engineering": [
    {
      question: "What does `dbt test` run against your models?",
      options: [
        "It compiles SQL without executing it, checking for syntax errors only",
        "It runs schema tests (not_null, unique, accepted_values, relationships) and any custom data tests defined in YAML or SQL test files against model outputs",
        "It deploys models to the production target and runs smoke queries",
        "It generates model documentation and lineage graphs",
      ],
      answer: 1,
      explanation:
        "dbt tests are data quality assertions that run SQL queries and fail if any rows are returned. Generic tests (unique, not_null) are configured in YAML. Singular tests are standalone .sql files in the tests/ directory. Both fail the CI run if violations are found.",
    },
    {
      question:
        "What is the recommended strategy for isolating dev, staging, and production environments in dbt?",
      options: [
        "Use a single schema for all environments and prefix table names with the environment name",
        "Use environment-specific target schemas (e.g., dbt_<user> for dev, staging, prod) controlled by profiles.yml or environment variable overrides in CI",
        "Maintain separate dbt projects per environment with identical model files",
        "Always run dbt directly against production — dev testing is handled by unit tests in Python",
      ],
      answer: 1,
      explanation:
        "dbt's `target` configuration in profiles.yml lets each developer use their own schema (dbt_alice, dbt_bob), while CI uses a staging schema and production deployments use the final schema. This prevents devs from overwriting each other's work and isolates production.",
    },
    {
      question:
        "What is 'slim CI' in dbt and why is it valuable for large projects?",
      options: [
        "A lightweight version of dbt with fewer dependencies for faster installation",
        "A CI strategy that only runs and tests models modified in the current PR (using `--select state:modified+`), dramatically reducing CI run time and cost",
        "A CI configuration that skips data tests and only checks SQL compilation",
        "An Airflow DAG pattern that deploys only changed dbt models to production",
      ],
      answer: 1,
      explanation:
        "In a large dbt project with 500+ models, running every model on every PR is slow and expensive. Slim CI compares the current PR against the production manifest (artifacts/manifest.json) and only runs models that changed, plus their downstream dependents (+). This can cut CI time from 60 minutes to 5 minutes.",
    },
    {
      question: "What is a blue-green deployment pattern in the context of data pipelines?",
      options: [
        "Using color-coded tags in git to indicate dev (blue) and prod (green) branches",
        "Maintaining two identical production environments where the new version is fully validated before traffic is switched, enabling instant rollback with no downtime",
        "A Terraform strategy for deploying infrastructure in two separate GCP projects",
        "A dbt model naming convention for distinguishing raw (blue) and transformed (green) layers",
      ],
      answer: 1,
      explanation:
        "Blue-green minimizes risk: green is current production, blue is the new version being prepared. Once blue is tested and validated, a DNS or load balancer switch routes traffic to it. If issues arise, you roll back instantly by switching back to green. In data engineering, this often means two parallel schemas or databases.",
    },
    {
      question:
        "At minimum, what should a CI pipeline for a dbt project include to be production-safe?",
      options: [
        "Only linting with sqlfluff and Python unit tests",
        "Full production dbt run on every PR to catch all errors before merge",
        "SQL compilation check (dbt compile), schema tests on changed models against a dev warehouse, and automated documentation generation",
        "A manual approval step by the data platform team lead",
      ],
      answer: 2,
      explanation:
        "Compilation catches SQL syntax errors early. Running schema tests (not_null, unique, etc.) on a development schema ensures data contracts are valid without touching production data. Documentation generation prevents docs drift. Many teams also add sqlfluff linting and dbt-checkpoint hooks for model configuration standards.",
    },
  ],

  "modern-data-architecture": [
    {
      question: "What key capabilities distinguish a lakehouse from a traditional data lake?",
      options: [
        "A lakehouse only stores structured data; a data lake stores all data types",
        "A lakehouse adds ACID transactions, schema enforcement, and BI-quality query performance on top of open-format object storage — providing warehouse capabilities without proprietary lock-in",
        "A lakehouse replaces the need for a separate data warehouse; a data lake does not",
        "A lakehouse uses proprietary storage formats optimized for analytics",
      ],
      answer: 1,
      explanation:
        "Traditional data lakes had the 'swamp' problem: no enforcement, inconsistent data, slow analytics. Lakehouses (Delta Lake, Apache Iceberg, Apache Hudi) bring ACID, schema evolution, time travel, and query performance to object storage, enabling warehousing and ML on the same data without copying it.",
    },
    {
      question: "What are the three layers of the medallion architecture?",
      options: [
        "Ingestion, Processing, and Serving",
        "Bronze (raw ingested data), Silver (cleaned and conformed), Gold (business-ready aggregates and metrics)",
        "Landing, Staging, and Production",
        "Operational, Analytical, and Archival",
      ],
      answer: 1,
      explanation:
        "Bronze is append-only raw data exactly as received from sources. Silver applies cleaning, deduplication, and schema normalization. Gold builds business-specific aggregates, denormalized tables, and metrics optimized for consumption by BI tools and data scientists.",
    },
    {
      question: "What is a data contract in a modern data platform?",
      options: [
        "A legal SLA agreement between a data vendor and the company",
        "A formal, machine-enforceable agreement between a data producer and consumers, specifying schema, quality expectations, SLOs, and change notification obligations",
        "A Kafka schema registry configuration for Avro serialization",
        "An IAM policy controlling who can read a specific dataset",
      ],
      answer: 1,
      explanation:
        "Data contracts (popularized by teams at LinkedIn, Uber) formalize the implicit agreement that has always existed: 'I publish this schema and these quality guarantees; you depend on them.' Tools like Soda, Great Expectations, and custom YAML specs make contracts machine-executable. They shift the cost of breaking changes to producers before they reach consumers.",
    },
    {
      question: "What is the core organizational principle of data mesh?",
      options: [
        "Centralizing all data infrastructure in a single platform team for efficiency and consistency",
        "Decentralizing data ownership to domain teams who are responsible for treating their data as a product, with a federated governance model",
        "Moving all data processing to a unified real-time streaming platform",
        "Automating data pipeline creation using AI-generated transformations",
      ],
      answer: 1,
      explanation:
        "Data mesh (Zhamak Dehghani) argues that centralized data teams become bottlenecks as organizations scale. Domain teams (e.g., Sales, Marketing, Logistics) own and publish their data as products with documented APIs, SLAs, and quality standards. A federated governance layer enforces global policies without creating a central chokepoint.",
    },
    {
      question:
        "In Lambda architecture, what problem does the speed layer solve?",
      options: [
        "It reprocesses historical data with the latest business logic for accuracy",
        "It provides low-latency, near-real-time views of recent data while the batch layer processes the full historical dataset at higher accuracy",
        "It manages the serving database that merges batch and streaming outputs",
        "It orchestrates the batch layer's scheduled re-computation jobs",
      ],
      answer: 1,
      explanation:
        "The batch layer produces accurate views but with high latency (hours). The speed layer sacrifices some accuracy for freshness, covering only the recent data that the batch layer hasn't processed yet. The serving layer merges both. The main critique of Lambda is maintaining two separate codebases for the same logic.",
    },
    {
      question: "What is the fundamental difference between Lambda and Kappa architecture?",
      options: [
        "Lambda uses streaming exclusively; Kappa uses batch exclusively",
        "Lambda maintains separate batch and speed layers; Kappa processes everything through a single streaming layer, reprocessing historical data by replaying event log topics",
        "Kappa requires Apache Kafka; Lambda works with any message broker",
        "Lambda is designed for cloud-native workloads; Kappa is for on-premise deployments",
      ],
      answer: 1,
      explanation:
        "Kappa (Jay Kreps, 2014) simplifies Lambda by eliminating the batch layer. All processing uses the same streaming code path. Historical reprocessing is done by replaying data from a long-retention Kafka topic. The tradeoff: you need a message broker that retains all history, and streaming systems may struggle with complex historical backfills.",
    },
  ],

  databricks: [
    {
      question: "What ACID guarantees does Delta Lake provide on top of Apache Spark?",
      options: [
        "Delta Lake provides only atomicity and consistency — not isolation or durability",
        "Delta Lake provides full ACID transactions via a transaction log (delta_log), enabling concurrent reads/writes, rollback, and time travel on object storage",
        "Delta Lake provides ACID guarantees only for streaming writes, not batch operations",
        "Delta Lake delegates ACID guarantees to the underlying cloud object storage",
      ],
      answer: 1,
      explanation:
        "Delta Lake's transaction log (_delta_log) records every commit as a JSON file. This log enables atomicity (all-or-nothing commits), isolation (snapshot isolation for concurrent readers/writers), and time travel (query any historical version). Object storage (S3, ADLS, GCS) is otherwise not ACID-compliant.",
    },
    {
      question: "What is Unity Catalog in Databricks?",
      options: [
        "A replacement for the Hive Metastore that only works with Delta tables",
        "Databricks' unified governance layer for data and AI assets — providing centralized access control, audit logging, lineage, and discovery across workspaces",
        "A UI tool for browsing Delta Lake transaction logs",
        "An automation framework for deploying notebooks to production",
      ],
      answer: 1,
      explanation:
        "Unity Catalog introduces a three-level namespace (catalog.schema.table) and centralizes permissions across all Databricks workspaces in an account. It tracks data lineage at the column level, provides row/column-level security, and supports non-Delta assets like ML models and dashboards.",
    },
    {
      question: "What does `OPTIMIZE` with `ZORDER BY` do in a Delta table?",
      options: [
        "It compresses Delta table files using Z-standard compression",
        "It compacts small files into larger Parquet files and co-locates related data using Z-order multi-dimensional clustering, improving query pruning for frequently filtered columns",
        "It rebuilds the Delta transaction log to reclaim disk space",
        "It reorders columns within each Parquet file for better compression ratios",
      ],
      answer: 1,
      explanation:
        "Delta small file accumulation degrades performance. OPTIMIZE compacts files (targeting ~1GB each). ZORDER BY rearranges data within compacted files so rows with similar values in the Z-ordered columns are co-located, improving data skipping (similar to Snowflake clustering) for equality and range filters on those columns.",
    },
    {
      question: "In Databricks Structured Streaming, what is a checkpoint used for?",
      options: [
        "Storing intermediate Spark shuffle data to prevent recomputation",
        "Recording stream progress (offsets, committed batches) so a failed stream can restart exactly where it left off without reprocessing or losing data",
        "Caching frequently accessed reference tables in memory on the driver",
        "Compressing streaming micro-batch output files before writing to Delta",
      ],
      answer: 1,
      explanation:
        "Checkpoints are written to a reliable storage location (usually cloud object storage) after each micro-batch. They track which Kafka offsets or file versions have been processed. On restart, Spark reads the checkpoint to resume from the last committed offset — this is what enables exactly-once semantics in Structured Streaming.",
    },
    {
      question: "What is the Photon engine in Databricks and what workloads benefit most from it?",
      options: [
        "Photon is an AI-powered query optimizer that rewrites SQL for better performance",
        "Photon is a native C++ vectorized execution engine that replaces Spark's JVM-based executor, providing significant speedups for SQL and DataFrame workloads on large scans, aggregations, and joins",
        "Photon is Databricks' proprietary streaming engine that replaces Structured Streaming",
        "Photon is a caching layer for frequently queried Delta tables, similar to Snowflake's result cache",
      ],
      answer: 1,
      explanation:
        "Spark's JVM execution has overhead per row. Photon processes data in vectorized batches at the C++ level with SIMD instructions, dramatically improving throughput for CPU-bound operations like scans, aggregations, and joins. It's transparent — the same PySpark/SQL code runs on Photon automatically when the engine is enabled.",
    },
  ],

  "system-design": [
    {
      question: "What is backpressure in a data streaming system and how is it handled?",
      options: [
        "Backpressure is when data arrives faster than consumers can process it; it's handled by either blocking producers, buffering in a queue, or dropping events based on the system's delivery guarantee requirements",
        "Backpressure is network latency caused by large message payloads; it's handled by compressing messages",
        "Backpressure occurs when a downstream database is too slow to serve reads; it's handled by adding read replicas",
        "Backpressure is a Kafka term for consumer lag; it's handled by increasing partition count",
      ],
      answer: 0,
      explanation:
        "Backpressure is a fundamental streaming challenge. Reactive Streams (used in Akka, Flink, Reactor) propagates signals upstream to slow producers. Kafka handles it via consumer lag — consumers pull at their own pace. Understanding whether to buffer, shed load, or slow producers depends on whether data loss is acceptable.",
    },
    {
      question:
        "In distributed data systems, what does 'exactly-once processing' actually guarantee?",
      options: [
        "Every event is guaranteed to be processed exactly once end-to-end, with no possibility of duplicates or loss under any failure",
        "Within a processing engine's internal state, each event contributes to state exactly once — but end-to-end exactly-once requires coordination with both the source and sink systems",
        "Events are deduplicated at the network layer before reaching the application",
        "Exactly-once means the system retries failed events until acknowledgment without any timeout",
      ],
      answer: 1,
      explanation:
        "True end-to-end exactly-once is very hard. Flink and Kafka Streams achieve 'effectively-once' via two-phase commit between source, processing state, and sink. If your sink doesn't support idempotent writes or transactions, you can only guarantee at-least-once. The practical answer is to design idempotent consumers.",
    },
    {
      question:
        "When designing a high-throughput event ingestion pipeline, what partitioning key strategy avoids hot partitions in Kafka?",
      options: [
        "Always use a random partition key to distribute load evenly",
        "Use the event's arrival timestamp as the partition key",
        "Choose a high-cardinality key that distributes events evenly AND preserves ordering guarantees only where needed (e.g., user_id for per-user ordering, random for global throughput)",
        "Use a single partition for all events to guarantee strict ordering",
      ],
      answer: 2,
      explanation:
        "A hot partition occurs when one partition key generates far more traffic than others (e.g., partitioning by country when 80% of events are from the US). High-cardinality keys (user_id, session_id) distribute load but also provide per-entity ordering. Use null/random keys only when you don't need any ordering guarantees.",
    },
    {
      question: "What is the CAP theorem and how does it apply to data engineering systems?",
      options: [
        "CAP states that any distributed system can simultaneously guarantee Consistency, Availability, and Partition tolerance",
        "CAP states that during a network partition, a distributed system must choose between Consistency (returning correct data) and Availability (returning some response) — it cannot guarantee both",
        "CAP applies only to OLTP databases and is not relevant to analytical data pipelines",
        "CAP means that columnar databases prioritize Compression, Aggregation, and Performance over row-level operations",
      ],
      answer: 1,
      explanation:
        "In a network partition, CP systems (e.g., HBase, ZooKeeper) return errors rather than potentially stale data. AP systems (e.g., Cassandra, DynamoDB) return potentially stale data rather than errors. Most data engineering sources (Kafka, object storage) make AP tradeoffs. Understanding this helps design appropriate retry and reconciliation strategies.",
    },
    {
      question:
        "What is a data pipeline's 'watermark' in the context of late-arriving data?",
      options: [
        "A digital signature embedded in data files to verify authenticity and lineage",
        "A threshold that defines how late data can arrive and still be processed in its correct time window — events arriving after the watermark are considered too late and may be dropped or handled separately",
        "A checkpoint file that marks which data files have been processed",
        "A data quality metric measuring the percentage of records passing validation checks",
      ],
      answer: 1,
      explanation:
        "Watermarks are critical for streaming window operations. A watermark of 'event_time - 10 minutes' means the system expects data up to 10 minutes late. When the watermark advances past a window's end time, that window is finalized. Events arriving after the watermark either trigger a late-data update or are dropped, depending on configuration.",
    },
    {
      question:
        "In designing a large-scale batch data pipeline, what is the key advantage of idempotent processing?",
      options: [
        "Idempotent pipelines run faster because they skip already-processed data",
        "Idempotent operations produce the same result whether run once or many times — enabling safe retries, backfills, and reruns without data corruption or duplication",
        "Idempotency ensures data is processed in strict chronological order",
        "Idempotent pipelines automatically detect and fix data quality issues",
      ],
      answer: 1,
      explanation:
        "Failures are inevitable. An idempotent pipeline (e.g., MERGE on primary key rather than INSERT) can be safely retried after any failure without side effects. This is the foundation of reliable data engineering: design your writes so that running the same job twice produces the same result as running it once.",
    },
  ],

  "ai-engineering": [
    {
      question: "What are embeddings in the context of AI engineering?",
      options: [
        "Compressed versions of large language models optimized for edge deployment",
        "Dense numerical vector representations of text (or other data) that capture semantic meaning — similar content produces vectors that are close together in high-dimensional space",
        "The weights of a neural network's final output layer",
        "Binary encodings of training data used to reduce storage costs",
      ],
      answer: 1,
      explanation:
        "Embeddings map discrete objects (words, sentences, documents, images) into continuous vector space. Semantic similarity becomes geometric proximity — 'cat' and 'dog' vectors are closer than 'cat' and 'database'. This enables semantic search, clustering, recommendations, and retrieval-augmented generation (RAG).",
    },
    {
      question: "What is Retrieval-Augmented Generation (RAG) and why is it used?",
      options: [
        "A technique to compress LLM context windows by removing redundant tokens",
        "An architecture where relevant documents are retrieved from a knowledge base and injected into the LLM's context at inference time, allowing the model to answer questions about private or up-to-date information without retraining",
        "A training technique that augments the base dataset with synthetically generated examples",
        "A method for generating structured data from unstructured documents using regular expressions",
      ],
      answer: 1,
      explanation:
        "LLMs have a knowledge cutoff and can't access private data. RAG solves both: retrieve the most relevant chunks from your vector database using semantic search, then pass them as context to the LLM. The LLM 'reads' these chunks and generates a grounded answer. This is cheaper and more controllable than fine-tuning.",
    },
    {
      question:
        "What is a vector database and how does it differ from a traditional database?",
      options: [
        "A vector database stores data in columnar format for fast analytical queries",
        "A vector database is optimized for storing embedding vectors and finding approximate nearest neighbors (ANN) at scale using index structures like HNSW or IVF — traditional databases are not designed for high-dimensional similarity search",
        "A vector database uses blockchain-style data structures for immutable audit trails",
        "A vector database is a graph database that stores relationships as mathematical vectors",
      ],
      answer: 1,
      explanation:
        "Traditional databases index exact values; vector databases index approximate similarity. Pinecone, Weaviate, Qdrant, and pgvector use ANN algorithms (HNSW, FAISS) to find the K nearest vectors to a query vector in milliseconds across millions of embeddings — exact nearest neighbor search at this scale would be too slow.",
    },
    {
      question: "What is the key tradeoff between fine-tuning an LLM vs. using prompt engineering / RAG?",
      options: [
        "Fine-tuning always produces better results and should be the default choice",
        "Fine-tuning encodes knowledge into model weights (expensive, static, requires retraining to update) while prompt engineering / RAG injects knowledge at inference time (flexible, updatable, no training cost, but limited by context window)",
        "RAG is only suitable for structured data; fine-tuning is needed for unstructured text",
        "Fine-tuning reduces inference cost; RAG increases it — so fine-tuning should be used at scale",
      ],
      answer: 1,
      explanation:
        "Fine-tune when you need the model to behave differently (tone, format, specialized domain reasoning). Use RAG when you need the model to know specific facts that change frequently. Most production systems combine both: a fine-tuned model for style and behavior, plus RAG for dynamic knowledge retrieval.",
    },
    {
      question:
        "When chunking documents for a RAG pipeline, what is the most important consideration?",
      options: [
        "Always use fixed-size chunks of exactly 512 tokens for compatibility with all embedding models",
        "Chunks should be semantically coherent units (a paragraph, a section) with enough context to be meaningful in isolation — too small loses context, too large dilutes the relevant signal in the embedding",
        "Chunk size doesn't matter — embedding models compress all chunks to the same fixed vector size",
        "Use character-level chunking to avoid tokenization inconsistencies",
      ],
      answer: 1,
      explanation:
        "Chunk quality directly determines RAG quality. A chunk with a single sentence lacks context; a chunk with 5,000 tokens contains so many topics that its embedding represents everything and nothing specifically. Semantic chunking (respecting paragraph/section boundaries) and chunk overlap (to preserve context at boundaries) are common strategies.",
    },
    {
      question:
        "What is the difference between token limit (context window) and model knowledge in an LLM?",
      options: [
        "They are the same thing — the context window stores the model's knowledge",
        "The context window is the maximum text the model can process in a single inference call (input + output tokens); model knowledge is what it learned during training and is baked into its weights — they are completely separate",
        "Token limits apply only to input; model knowledge determines output length",
        "The context window expands automatically when the model detects it needs more information",
      ],
      answer: 1,
      explanation:
        "Confusion between these two is common. A model with a 200K context window can process a 200K-token document in one call — but it only 'knows' facts up to its training cutoff. RAG bridges the gap by putting external knowledge into the context window at inference time, not into the model's weights.",
    },
  ],

  "open-table-formats": [
    {
      question: "What key capabilities do open table formats (Iceberg, Delta Lake, Hudi) add to object storage?",
      options: [
        "They add proprietary compression algorithms that reduce storage costs by 10x",
        "They enable ACID transactions, schema evolution, time travel (snapshot queries), and efficient metadata management on open-format files (Parquet/ORC) in object storage",
        "They replace Parquet with a more efficient binary format for analytical workloads",
        "They add real-time streaming capabilities to batch-only object storage systems",
      ],
      answer: 1,
      explanation:
        "Object storage (S3, GCS, ADLS) is just a file system — no transactions, no schema enforcement. Table formats add a metadata layer that tracks which files belong to the current table version, enabling ACID commits, rollback, concurrent reads/writes, and time travel without moving data to a traditional database.",
    },
    {
      question:
        "What is the main difference between Apache Iceberg and Delta Lake in terms of metadata architecture?",
      options: [
        "Iceberg uses a transaction log of JSON files; Delta Lake uses a hierarchical metadata tree with snapshot, manifest list, and manifest files",
        "Delta Lake uses a transaction log (_delta_log JSON files) per table; Iceberg uses a hierarchical metadata tree (metadata.json → manifest list → manifest files → data files), enabling more efficient metadata pruning at scale",
        "There is no practical difference — both formats are fully interoperable",
        "Iceberg stores metadata inside Parquet file footers; Delta Lake uses external JSON files",
      ],
      answer: 1,
      explanation:
        "Delta's transaction log lists all data file changes sequentially — at petabyte scale, scanning all log entries becomes slow. Iceberg's metadata tree lets query engines jump directly to the relevant manifest files for a partition or snapshot. This makes Iceberg more efficient for very large tables with complex partition schemes.",
    },
    {
      question:
        "What is the difference between Copy-on-Write (CoW) and Merge-on-Read (MoR) in Apache Hudi?",
      options: [
        "CoW rewrites entire Parquet files on each update (fast reads, slower writes); MoR writes delta log files alongside base files and merges on read (fast writes, slightly slower reads until compaction)",
        "CoW is for batch workloads; MoR is only for streaming workloads",
        "CoW provides better ACID guarantees; MoR sacrifices ACID for performance",
        "MoR compresses data more aggressively during writes; CoW decompresses on read",
      ],
      answer: 0,
      explanation:
        "CoW suits read-heavy workloads where updates are infrequent. Every update rewrites Parquet files, so reads are always clean. MoR suits high-frequency update workloads (CDC streams) — writes append to a delta log, which is merged during compaction. You get fast ingestion but reads must merge base + delta files until compaction runs.",
    },
    {
      question: "How does time travel work in Apache Iceberg?",
      options: [
        "Iceberg rewrites historical data files with a timestamp prefix enabling version queries",
        "Iceberg maintains a sequence of immutable snapshots; each commit creates a new snapshot pointing to the current set of data files. You query historical data by specifying a snapshot ID or timestamp",
        "Time travel requires enabling a separate audit log feature that is off by default",
        "Iceberg time travel restores data by reading from backup files stored in a separate bucket",
      ],
      answer: 1,
      explanation:
        "Every Iceberg commit produces a new snapshot (an immutable pointer to a set of data files). Old snapshots are retained until explicitly expired. `SELECT * FROM table FOR VERSION AS OF <snapshot_id>` reads the exact data files that were valid at that snapshot — no data is overwritten, making time travel cheap to implement.",
    },
    {
      question:
        "Why is schema evolution handled more robustly in Iceberg compared to raw Parquet files on object storage?",
      options: [
        "Iceberg converts all data to a universal schema automatically",
        "Iceberg assigns column IDs (not names) in its metadata, so renaming a column or reordering columns doesn't break existing readers — column identity is tracked independently of column position or name",
        "Iceberg validates schema changes against a schema registry before allowing commits",
        "Iceberg stores column names as SHA hashes, preventing any naming conflicts",
      ],
      answer: 1,
      explanation:
        "In Parquet, columns are identified by position. Rename a column and old readers reading positional data get wrong results. Iceberg uses stable column IDs in its metadata layer. Adding, renaming, or reordering columns only updates metadata — existing data files are valid as-is because the schema maps IDs to values, not positions.",
    },
    {
      question: "What is partition evolution in Apache Iceberg and why is it significant?",
      options: [
        "Partition evolution automatically repartitions data files for better performance",
        "Iceberg allows changing the partition scheme of a table at any point without rewriting existing data — new partitioning applies only to new writes, and queries transparently handle both the old and new partition layouts",
        "Partition evolution converts range partitions to hash partitions for better distribution",
        "It is a Hudi-specific feature that Iceberg does not support",
      ],
      answer: 1,
      explanation:
        "Traditional Hive-style partitioning is permanent — changing it requires rewriting all data. Iceberg stores partition specs per data file in metadata. You can change from partitioning by month to partitioning by day (for better pruning of recent data) and existing month-partitioned files remain valid. Queries scan both layouts transparently.",
    },
  ],

  "essential-skills": [
    {
      question: "In a Git workflow, what is the purpose of a feature branch and pull request process?",
      options: [
        "Feature branches are required by GitHub and have no technical benefit",
        "Feature branches isolate work-in-progress from the main branch; pull requests provide a review checkpoint, CI validation, and a merge audit trail before changes reach production",
        "Pull requests are only needed for open-source projects — internal teams should commit directly to main",
        "Feature branches are used exclusively for hotfixes; all feature development happens on main",
      ],
      answer: 1,
      explanation:
        "The PR workflow is the foundation of professional engineering. It enforces peer review (catching bugs and knowledge sharing), runs automated tests before merge, creates a documented history of why changes were made, and allows rollback to a known-good state. In data engineering, this applies equally to SQL, Python pipelines, and dbt models.",
    },
    {
      question:
        "When debugging a data pipeline that produces incorrect aggregates, what is the most systematic approach?",
      options: [
        "Immediately check the output table for data issues and work backwards",
        "Add logging everywhere and rerun the full pipeline",
        "Bisect the pipeline: validate input data at each transformation stage, isolate which step first produces incorrect values, then inspect that step's logic and intermediate outputs",
        "Ask a senior engineer to review the code for bugs",
      ],
      answer: 2,
      explanation:
        "Bisecting (binary search through pipeline stages) is the fastest debugging strategy. Check: is input correct? → Is this transformation correct? → Is the next correct? You converge on the bug in O(log n) steps rather than scanning everything. Materializing intermediate outputs as temp tables makes this easy.",
    },
    {
      question:
        "What is the difference between a SQL window function PARTITION BY and GROUP BY?",
      options: [
        "They are equivalent — PARTITION BY is just the window function syntax for GROUP BY",
        "GROUP BY collapses rows into one row per group; PARTITION BY in a window function computes an aggregate for each group but keeps all original rows intact in the result",
        "PARTITION BY is faster than GROUP BY for large datasets",
        "GROUP BY works on all column types; PARTITION BY only works on numeric columns",
      ],
      answer: 1,
      explanation:
        "This distinction is critical for interview questions. `GROUP BY customer_id` returns one row per customer. `PARTITION BY customer_id` in a window function (e.g., `SUM(revenue) OVER (PARTITION BY customer_id)`) adds a per-customer total on every row — you keep all rows while also seeing group-level aggregates.",
    },
    {
      question:
        "When communicating a data quality issue to a non-technical stakeholder, what is the most effective approach?",
      options: [
        "Provide the full SQL query that discovered the issue so they understand the technical root cause",
        "Describe the business impact first (e.g., 'Revenue in last week's report may be understated by ~5%'), then explain what caused it, and finish with your remediation plan and timeline",
        "Send the raw error log from the pipeline run and ask them to review",
        "Avoid disclosing issues until they are fully resolved to prevent unnecessary concern",
      ],
      answer: 1,
      explanation:
        "Stakeholders care about business impact, not technical details. Lead with what it means for them (revenue, customer count, SLA), then briefly explain root cause in plain language, and always close with a concrete fix + ETA. This builds trust, manages expectations, and focuses the conversation on resolution.",
    },
    {
      question:
        "What is the most important habit for making data pipelines maintainable over time?",
      options: [
        "Using the most performant implementation possible, even if complex",
        "Treating code as the primary documentation — variable names, SQL aliases, and structure should make the intent obvious; complement with comments for non-obvious decisions and README files for operational context",
        "Minimizing the number of pipeline steps to reduce failure points",
        "Writing comprehensive unit tests that cover 100% of code paths",
      ],
      answer: 1,
      explanation:
        "The person who reads your code 6 months later is often you. Self-documenting code (meaningful column aliases, descriptive CTE names like `daily_active_users` instead of `cte1`) reduces cognitive load. Comments should explain *why*, not *what*. Good documentation also makes onboarding new team members much faster.",
    },
  ],
};

async function main() {
  let total = 0;

  for (const [pathSlug, questions] of Object.entries(quizzes)) {
    const path = await prisma.learningPath.findUnique({
      where: { slug: pathSlug },
      select: { id: true, title: true },
    });

    if (!path) {
      console.warn(`⚠️  Path not found: ${pathSlug} — skipping`);
      continue;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await prisma.pathQuestion.upsert({
        where: {
          id: (
            await prisma.pathQuestion.findFirst({
              where: { pathId: path.id, order: i },
              select: { id: true },
            })
          )?.id ?? "nonexistent-id",
        },
        update: {
          question: q.question,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
        },
        create: {
          pathId: path.id,
          question: q.question,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
          order: i,
        },
      });
      total++;
    }

    console.log(`✅  ${path.title}: ${questions.length} questions`);
  }

  console.log(`\n🎉 Seeded ${total} quiz questions across ${Object.keys(quizzes).length} paths.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
