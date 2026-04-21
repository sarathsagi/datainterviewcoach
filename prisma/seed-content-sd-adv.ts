import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

const ADVANCED_PATH_SLUG = 'system-design-advanced';

const articles = [
  {
    slug: 'faang-fraud-detection-system',
    title: 'FAANG Exercise: Real-Time Fraud Detection',
    description: 'Design a fraud detection platform at Stripe/PayPal scale — 50K transactions/sec with sub-100ms scoring, stateful feature computation, and a cold-path ML training pipeline.',
    file: 'faang-fraud-detection-system.md',
    readTime: 30,
    order: 1,
  },
  {
    slug: 'faang-ride-sharing-analytics',
    title: 'FAANG Exercise: Ride-Sharing Analytics Platform',
    description: 'Design the full analytics platform for an Uber/Lyft-style app — real-time driver location processing, surge pricing computation, and a batch warehouse for business reporting.',
    file: 'faang-ride-sharing-analytics.md',
    readTime: 30,
    order: 2,
  },
  {
    slug: 'faang-social-media-pipeline',
    title: 'FAANG Exercise: Social Media Engagement Pipeline',
    description: 'Design a Meta/Twitter-scale engagement tracking system — 500K events/sec ingestion, real-time content ranking signals, and a batch pipeline for feed relevance modeling.',
    file: 'faang-social-media-pipeline.md',
    readTime: 30,
    order: 3,
  },
];

async function main() {
  const advPath = await db.learningPath.findUnique({
    where: { slug: ADVANCED_PATH_SLUG },
  });

  if (!advPath) throw new Error(`Path not found: ${ADVANCED_PATH_SLUG}`);
  console.log('Found advanced path:', advPath.id);

  for (const article of articles) {
    const content = fs.readFileSync(
      path.join(__dirname, 'content', article.file),
      'utf-8'
    );

    await db.learningModule.upsert({
      where: { pathId_slug: { pathId: advPath.id, slug: article.slug } },
      update: {
        title: article.title,
        description: article.description,
        content,
        readTimeMinutes: article.readTime,
        order: article.order,
        isPublished: true,
      },
      create: {
        pathId: advPath.id,
        slug: article.slug,
        title: article.title,
        description: article.description,
        content,
        readTimeMinutes: article.readTime,
        order: article.order,
        isPublished: true,
      },
    });

    console.log(`✅ Seeded: ${article.slug}`);
  }

  console.log('\n✅ All system design advanced articles seeded!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
