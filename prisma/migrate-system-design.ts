import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // ── 1. Create 3 new learning paths ────────────────────────────────────────
  const beginner = await db.learningPath.create({
    data: {
      slug: 'system-design-beginner',
      title: 'System Design — Building Blocks',
      description: 'Master the core data engineering tools before designing systems: data formats, Kafka, Spark, Airflow, dbt, and Flink. Know what each piece does and why.',
      icon: '🧱',
      category: 'SYSTEM_DESIGN',
      level: 'BEGINNER',
      order: 1,
      isPublished: true,
    },
  });

  const intermediate = await db.learningPath.create({
    data: {
      slug: 'system-design-intermediate',
      title: 'System Design — Pipeline Patterns',
      description: 'Apply the 5-step interview framework to real pipeline architectures: clickstream ingestion, CDC from OLTP, multi-source API pipelines, and daily batch processing.',
      icon: '🏗️',
      category: 'SYSTEM_DESIGN',
      level: 'INTERMEDIATE',
      order: 2,
      isPublished: true,
    },
  });

  const advanced = await db.learningPath.create({
    data: {
      slug: 'system-design-advanced',
      title: 'System Design — FAANG Exercises',
      description: 'End-to-end system design exercises at FAANG scale. Design fraud detection, ride-sharing analytics, and social media pipelines — with full architecture diagrams, technology choices, and tradeoff analysis.',
      icon: '🎯',
      category: 'SYSTEM_DESIGN',
      level: 'ADVANCED',
      order: 3,
      isPublished: true,
    },
  });

  console.log('✅ Created 3 new paths');
  console.log('  Beginner:', beginner.id);
  console.log('  Intermediate:', intermediate.id);
  console.log('  Advanced:', advanced.id);

  // ── 2. Get old system-design path ─────────────────────────────────────────
  const oldPath = await db.learningPath.findUnique({
    where: { slug: 'system-design' },
    include: { modules: { orderBy: { order: 'asc' } } },
  });

  if (!oldPath) throw new Error('Old system-design path not found');

  // ── 3. Move building block articles → beginner ────────────────────────────
  const beginnerSlugs = [
    'data-formats-schema-mgmt',
    'kafka-deep-dive',
    'spark-deep-dive',
    'airflow-deep-dive',
    'dbt-deep-dive',
    'stream-processing-flink',
  ];
  const beginnerOrder: Record<string, number> = {
    'data-formats-schema-mgmt': 1,
    'kafka-deep-dive': 2,
    'spark-deep-dive': 3,
    'airflow-deep-dive': 4,
    'dbt-deep-dive': 5,
    'stream-processing-flink': 6,
  };

  for (const slug of beginnerSlugs) {
    const mod = oldPath.modules.find(m => m.slug === slug);
    if (mod) {
      await db.learningModule.update({
        where: { id: mod.id },
        data: { pathId: beginner.id, order: beginnerOrder[slug] },
      });
      console.log('  → moved to beginner:', slug);
    }
  }

  // ── 4. Move design pattern articles → intermediate ─────────────────────────
  const intermediateSlugs = [
    'system-design-framework',
    'clickstream-pipeline-design',
    'cdc-pipeline-design',
    'api-ingestion-pipeline-design',
    'batch-processing-design',
  ];
  const intermediateOrder: Record<string, number> = {
    'system-design-framework': 1,
    'clickstream-pipeline-design': 2,
    'cdc-pipeline-design': 3,
    'api-ingestion-pipeline-design': 4,
    'batch-processing-design': 5,
  };

  for (const slug of intermediateSlugs) {
    const mod = oldPath.modules.find(m => m.slug === slug);
    if (mod) {
      await db.learningModule.update({
        where: { id: mod.id },
        data: { pathId: intermediate.id, order: intermediateOrder[slug] },
      });
      console.log('  → moved to intermediate:', slug);
    }
  }

  // ── 5. Unpublish old path ──────────────────────────────────────────────────
  await db.learningPath.update({
    where: { slug: 'system-design' },
    data: { isPublished: false },
  });
  console.log('✅ Unpublished old system-design path');

  // ── 6. Create Advanced placeholder modules ────────────────────────────────
  const advModules = [
    {
      slug: 'faang-fraud-detection-system',
      title: 'FAANG Exercise: Real-Time Fraud Detection',
      description: 'Design a fraud detection platform at Stripe/PayPal scale — 50K transactions/sec with sub-100ms scoring, stateful feature computation, and a cold-path ML training pipeline.',
      order: 1,
    },
    {
      slug: 'faang-ride-sharing-analytics',
      title: 'FAANG Exercise: Ride-Sharing Analytics Platform',
      description: 'Design the full analytics platform for an Uber/Lyft-style app — real-time driver location processing, surge pricing computation, and a batch warehouse for business reporting.',
      order: 2,
    },
    {
      slug: 'faang-social-media-pipeline',
      title: 'FAANG Exercise: Social Media Engagement Pipeline',
      description: 'Design a Meta/Twitter-scale engagement tracking system — 500K events/sec ingestion, real-time content ranking signals, and a batch pipeline for feed relevance modeling.',
      order: 3,
    },
  ];

  for (const m of advModules) {
    await db.learningModule.create({
      data: {
        pathId: advanced.id,
        slug: m.slug,
        title: m.title,
        description: m.description,
        content: '',
        readTimeMinutes: 30,
        order: m.order,
        isPublished: false,
      },
    });
    console.log('  → created advanced module:', m.slug);
  }

  console.log('\n✅ Migration complete!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
