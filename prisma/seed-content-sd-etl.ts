import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

async function main() {
  // ── Beginner path: add 5 ELT foundation articles (orders 1-5)
  //    then reorder existing tool articles to 6-11
  const beginnerPath = await db.learningPath.findUnique({
    where: { slug: 'system-design-beginner' },
  });
  if (!beginnerPath) throw new Error('system-design-beginner not found');

  // Reorder existing tool deep-dive articles to make room (push to 6-11)
  const toolOrder: Record<string, number> = {
    'data-formats-schema-mgmt':  6,
    'kafka-deep-dive':           7,
    'spark-deep-dive':           8,
    'airflow-deep-dive':         9,
    'dbt-deep-dive':             10,
    'stream-processing-flink':   11,
  };
  for (const [slug, order] of Object.entries(toolOrder)) {
    await db.learningModule.updateMany({
      where: { pathId: beginnerPath.id, slug },
      data: { order },
    });
    console.log(`  reordered ${slug} → ${order}`);
  }

  // New foundation articles (orders 1-5)
  const beginnerArticles = [
    {
      slug: 'elt-fundamentals',
      title: 'ELT Fundamentals & the Medallion Architecture',
      description: 'ELT vs ETL, the modern data pipeline model, and the Bronze/Silver/Gold layered architecture that underpins every production data platform.',
      file: 'elt-fundamentals.md',
      readTime: 12,
      order: 1,
    },
    {
      slug: 'data-sources-and-destinations',
      title: 'Data Sources & Destinations',
      description: 'The four source types (OLTP databases, event streams, REST APIs, files) and where data lands — warehouses, lakes, operational stores. Classification drives every ingestion decision.',
      file: 'data-sources-and-destinations.md',
      readTime: 15,
      order: 2,
    },
    {
      slug: 'data-extraction-approaches',
      title: 'Data Extraction Approaches',
      description: 'Full vs incremental extraction, CDC (WAL-based), real-time Kafka consumption, high-volume parallel extraction, semi-structured data, and critical-data quality validation.',
      file: 'data-extraction-approaches.md',
      readTime: 18,
      order: 3,
    },
    {
      slug: 'data-transformation-approaches',
      title: 'Data Transformation Approaches',
      description: 'Batch and real-time transformation patterns: deduplication, cleansing, enrichment, type casting, Spark vs SQL/dbt, and how to test transformation logic.',
      file: 'data-transformation-approaches.md',
      readTime: 18,
      order: 4,
    },
    {
      slug: 'data-loading-strategies',
      title: 'Data Loading Strategies',
      description: 'Bulk COPY, MERGE/upsert, dynamic partition overwrite, streaming inserts, Delta Lake ACID loading, and why idempotency is the most important property of any load operation.',
      file: 'data-loading-strategies.md',
      readTime: 18,
      order: 5,
    },
  ];

  for (const article of beginnerArticles) {
    const content = fs.readFileSync(
      path.join(__dirname, 'content', article.file),
      'utf-8'
    );
    await db.learningModule.upsert({
      where: { pathId_slug: { pathId: beginnerPath.id, slug: article.slug } },
      update: { title: article.title, description: article.description, content, readTimeMinutes: article.readTime, order: article.order, isPublished: true },
      create: { pathId: beginnerPath.id, slug: article.slug, title: article.title, description: article.description, content, readTimeMinutes: article.readTime, order: article.order, isPublished: true },
    });
    console.log(`✅ Beginner: ${article.slug}`);
  }

  // ── Intermediate path: add 3 pipeline engineering articles (orders 6-8)
  const intermediatePath = await db.learningPath.findUnique({
    where: { slug: 'system-design-intermediate' },
  });
  if (!intermediatePath) throw new Error('system-design-intermediate not found');

  const intermediateArticles = [
    {
      slug: 'pipeline-performance-optimization',
      title: 'Pipeline Performance Optimization',
      description: 'The four-layer optimization hierarchy: read less data, move less data, avoid repeated work, tune execution. Partition pruning, broadcast joins, skew fixes, shuffle tuning, and incremental loads.',
      file: 'pipeline-performance-optimization.md',
      readTime: 20,
      order: 6,
    },
    {
      slug: 'scaling-etl-pipelines',
      title: 'Scaling ETL Pipelines',
      description: 'Scaling for volume (partition everything), velocity (Kafka/Flink parallelism, backpressure, Lambda architecture), and variety (schema evolution, configuration-driven sources). Auto-scaling on Kubernetes.',
      file: 'scaling-etl-pipelines.md',
      readTime: 20,
      order: 7,
    },
    {
      slug: 'fault-tolerant-pipelines',
      title: 'Making Your Pipeline Fault-Tolerant',
      description: 'The three properties of fault-tolerant pipelines: idempotency, at-least-once/exactly-once semantics, and observability. Retries with backoff, dead letter queues, checkpointing, and schema change protection.',
      file: 'fault-tolerant-pipelines.md',
      readTime: 20,
      order: 8,
    },
  ];

  for (const article of intermediateArticles) {
    const content = fs.readFileSync(
      path.join(__dirname, 'content', article.file),
      'utf-8'
    );
    await db.learningModule.upsert({
      where: { pathId_slug: { pathId: intermediatePath.id, slug: article.slug } },
      update: { title: article.title, description: article.description, content, readTimeMinutes: article.readTime, order: article.order, isPublished: true },
      create: { pathId: intermediatePath.id, slug: article.slug, title: article.title, description: article.description, content, readTimeMinutes: article.readTime, order: article.order, isPublished: true },
    });
    console.log(`✅ Intermediate: ${article.slug}`);
  }

  console.log('\n✅ All ETL articles seeded!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
