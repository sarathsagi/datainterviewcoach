import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // ── 1. Create 3 new learning paths ────────────────────────────────────────
  const beginner = await db.learningPath.create({
    data: {
      slug: 'data-modeling-beginner',
      title: 'Data Modeling — Beginner',
      description: 'Core data modeling concepts: entities, relationships, normalization, physical design, and common pitfalls. Build a solid foundation before tackling warehouses and FAANG-level exercises.',
      icon: '🧱',
      category: 'DATA_MODELING',
      level: 'BEGINNER',
      order: 1,
      isPublished: true,
    },
  });

  const intermediate = await db.learningPath.create({
    data: {
      slug: 'data-modeling-intermediate',
      title: 'Data Modeling — Intermediate',
      description: 'Adjust your thinking for the data warehouse and data lake: Kimball dimensional modeling, star schemas, slowly changing dimensions, and real-world case studies.',
      icon: '🏗️',
      category: 'DATA_MODELING',
      level: 'INTERMEDIATE',
      order: 2,
      isPublished: true,
    },
  });

  const advanced = await db.learningPath.create({
    data: {
      slug: 'data-modeling-advanced',
      title: 'Data Modeling — Advanced (FAANG)',
      description: 'FAANG-level data modeling exercises with real business domains. Apply the full framework: entities, grain definition, SCD identification, and complex analytical SQL.',
      icon: '🎯',
      category: 'DATA_MODELING',
      level: 'ADVANCED',
      order: 3,
      isPublished: true,
    },
  });

  console.log('✅ Created 3 new paths:', beginner.id, intermediate.id, advanced.id);

  // ── 2. Get old data-modeling path and its modules ────────────────────────
  const oldPath = await db.learningPath.findUnique({
    where: { slug: 'data-modeling' },
    include: { modules: { orderBy: { order: 'asc' } } },
  });

  if (!oldPath) throw new Error('Old data-modeling path not found');

  // ── 3. Move modules 1-5 (order 1-5) to beginner path ─────────────────────
  const beginnerSlugs = [
    'logical-data-modeling',
    'physical-data-modeling',
    'normalization-denormalization',
    'nosql-big-data-modeling',
    'common-data-modeling-pitfalls',
  ];

  for (const slug of beginnerSlugs) {
    const mod = oldPath.modules.find(m => m.slug === slug);
    if (mod) {
      await db.learningModule.update({
        where: { id: mod.id },
        data: { pathId: beginner.id },
      });
      console.log('  → moved to beginner:', slug);
    }
  }

  // ── 4. Move modules 6-10 (order 6-10) to intermediate path ───────────────
  const intermediateSlugs = [
    'data-warehousing-modeling',
    'data-modeling-case-studies',
    'scd-introduction',
    'scd-types',
    'scd-implementation',
  ];

  for (const slug of intermediateSlugs) {
    const mod = oldPath.modules.find(m => m.slug === slug);
    if (mod) {
      await db.learningModule.update({
        where: { id: mod.id },
        data: { pathId: intermediate.id },
      });
      console.log('  → moved to intermediate:', slug);
    }
  }

  // ── 5. Unpublish the old data-modeling path ────────────────────────────────
  await db.learningPath.update({
    where: { slug: 'data-modeling' },
    data: { isPublished: false },
  });
  console.log('✅ Unpublished old data-modeling path');

  // ── 6. Create Advanced path placeholder modules ────────────────────────────
  const advModules = [
    {
      slug: 'faang-data-modeling-framework',
      title: 'The FAANG Data Modeling Framework',
      description: 'A 4-step framework to tackle any data modeling interview question: entities → fact grain → dimensions → SCDs.',
      order: 1,
    },
    {
      slug: 'faang-healthcare-analytics',
      title: 'FAANG Exercise: Healthcare Analytics',
      description: 'Model physician device usage across clinical sites. Define a multi-key fact grain, implement SCD2 for site assignments, and write analytical SQL.',
      order: 2,
    },
    {
      slug: 'faang-food-delivery-platform',
      title: 'FAANG Exercise: Food Delivery Platform',
      description: 'Model a food delivery marketplace with orders, driver assignments, and zone-based analytics. Track driver zone changes with SCD2.',
      order: 3,
    },
    {
      slug: 'faang-fintech-payments',
      title: 'FAANG Exercise: FinTech Payments Platform',
      description: 'Model a payment processing platform with auth/capture/refund lifecycle events, merchant category changes, and chargeback analytics.',
      order: 4,
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
        readTimeMinutes: 20,
        order: m.order,
        isPublished: false, // will publish after content is seeded
      },
    });
    console.log('  → created advanced module:', m.slug);
  }

  console.log('\n✅ Migration complete!');
  console.log('  Beginner path id:', beginner.id);
  console.log('  Intermediate path id:', intermediate.id);
  console.log('  Advanced path id:', advanced.id);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
