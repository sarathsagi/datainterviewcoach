import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const db = new PrismaClient();

const ADVANCED_PATH_SLUG = 'data-modeling-advanced';

const articles = [
  {
    slug: 'faang-data-modeling-framework',
    title: 'The FAANG Data Modeling Framework',
    description: 'A 4-step framework to tackle any data modeling interview question: entities → fact grain → dimensions → SCDs.',
    file: 'faang-data-modeling-framework.md',
    readTime: 12,
    order: 1,
  },
  {
    slug: 'faang-healthcare-analytics',
    title: 'FAANG Exercise: Healthcare Analytics',
    description: 'Model physician device usage across clinical sites. Define a multi-key fact grain, implement SCD2 for site assignments, and write analytical SQL.',
    file: 'faang-healthcare-analytics.md',
    readTime: 25,
    order: 2,
  },
  {
    slug: 'faang-food-delivery-platform',
    title: 'FAANG Exercise: Food Delivery Platform',
    description: 'Model a food delivery marketplace with orders, driver assignments, and zone-based analytics. Track driver zone changes with SCD2.',
    file: 'faang-food-delivery-platform.md',
    readTime: 25,
    order: 3,
  },
  {
    slug: 'faang-fintech-payments',
    title: 'FAANG Exercise: FinTech Payments Platform',
    description: 'Model a payment processing platform with auth/capture/refund lifecycle events, merchant category changes, and chargeback analytics.',
    file: 'faang-fintech-payments.md',
    readTime: 25,
    order: 4,
  },
];

async function main() {
  // Get the advanced path
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

    // Upsert the module
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

  console.log('\n✅ All advanced articles seeded!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
