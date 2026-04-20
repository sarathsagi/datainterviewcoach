/**
 * migrate-learn-paths.ts
 *
 * Consolidates 13 learning paths → 3:
 *   1. Data Modeling            (data-modeling)  — existing + SCD modules merged in
 *   2. Data Engineering System Design (system-design) — unchanged
 *   3. Misc Data Engineering    (misc-data-engineering) — best articles from CDC,
 *      Open Table Formats, Modern Data Architecture, Essential Skills
 *
 * All other paths are unpublished (data is preserved).
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Starting learning path consolidation...\n");

  // ── 1. Rename Data Modeling Fundamentals ─────────────────────────────────
  await prisma.learningPath.update({
    where: { slug: "data-modeling" },
    data: {
      title: "Data Modeling",
      description:
        "Master the data modeling concepts that appear in every data engineering interview — dimensional modeling, normalization, SCD types, fact & dimension tables, and real-world schema design.",
      order: 1,
    },
  });
  console.log("✅  Renamed → Data Modeling");

  // ── 2. System Design stays, just reorder ────────────────────────────────
  await prisma.learningPath.update({
    where: { slug: "system-design" },
    data: { order: 2 },
  });
  console.log("✅  Kept    → Data Engineering System Design");

  // ── 3. Rename Essential Skills → Misc Data Engineering ───────────────────
  await prisma.learningPath.update({
    where: { slug: "essential-skills" },
    data: {
      title: "Misc Data Engineering",
      slug: "misc-data-engineering",
      description:
        "Essential data engineering concepts for interviews — change data capture, open table formats, modern architecture patterns, and core engineering fundamentals.",
      icon: "🛠️",
      order: 3,
    },
  });
  console.log("✅  Renamed → Misc Data Engineering\n");

  // ── 4. Get path IDs we need ───────────────────────────────────────────────
  const [dataModelingPath, miscPath] = await Promise.all([
    prisma.learningPath.findUnique({ where: { slug: "data-modeling" } }),
    prisma.learningPath.findUnique({ where: { slug: "misc-data-engineering" } }),
  ]);

  if (!dataModelingPath || !miscPath) {
    throw new Error("Could not find required paths — check slugs");
  }

  // ── 5. Move SCD modules → Data Modeling ──────────────────────────────────
  const scdModules = await prisma.learningModule.findMany({
    where: {
      pathId: (await prisma.learningPath.findUnique({ where: { slug: "slowly-changing-dimensions" } }))!.id,
      title: { in: ["Introduction to SCDs", "Exploring SCD Types", "Implementing SCDs in a Data Warehouse"] },
    },
    select: { id: true, title: true },
  });

  // Append after existing 7 data-modeling modules
  const existingDMCount = await prisma.learningModule.count({
    where: { pathId: dataModelingPath.id },
  });

  for (let i = 0; i < scdModules.length; i++) {
    await prisma.learningModule.update({
      where: { id: scdModules[i].id },
      data: { pathId: dataModelingPath.id, order: existingDMCount + i + 1 },
    });
    console.log(`  ↪ Moved SCD module: ${scdModules[i].title}`);
  }
  console.log("✅  SCD modules merged into Data Modeling\n");

  // ── 6. Move best articles → Misc Data Engineering ────────────────────────

  // CDC: intro + overview articles only
  const cdcPath = await prisma.learningPath.findUnique({ where: { slug: "change-data-capture" } });
  const cdcModules = await prisma.learningModule.findMany({
    where: {
      pathId: cdcPath!.id,
      title: {
        in: [
          "Mastering CDC: A Comprehensive Guide",
          "Introduction to Change Data Capture",
        ],
      },
    },
    select: { id: true, title: true },
  });

  // Open Table Formats: all 4 articles
  const otfPath = await prisma.learningPath.findUnique({ where: { slug: "open-table-formats" } });
  const otfModules = await prisma.learningModule.findMany({
    where: { pathId: otfPath!.id },
    select: { id: true, title: true },
  });

  // Modern Data Architecture: 2 most relevant articles
  const mdaPath = await prisma.learningPath.findUnique({ where: { slug: "modern-data-architecture" } });
  const mdaModules = await prisma.learningModule.findMany({
    where: {
      pathId: mdaPath!.id,
      title: {
        in: [
          "Medallion Architecture: Layers of a Lakehouse",
          "Data Warehouse vs Data Lake vs Lakehouse",
          "Data Observability: Why It's Essential",
        ],
      },
    },
    select: { id: true, title: true },
  });

  // Unpublish irrelevant existing misc modules
  await prisma.learningModule.updateMany({
    where: {
      pathId: miscPath.id,
      title: {
        in: [
          "Master Git Commands: A Hands-On Tutorial",
          "Databricks vs Snowflake: Which Platform Fits?",
          "Data Engineering Data Modeling for Interviews",
        ],
      },
    },
    data: { isPublished: false },
  });
  console.log("  ✖ Unpublished irrelevant Misc modules (Git, Databricks vs Snowflake, DM for Interviews)");

  // Count existing published misc modules to calculate order offset
  const existingMiscCount = await prisma.learningModule.count({
    where: { pathId: miscPath.id, isPublished: true },
  });

  const modulesToMove = [...cdcModules, ...otfModules, ...mdaModules];
  for (let i = 0; i < modulesToMove.length; i++) {
    await prisma.learningModule.update({
      where: { id: modulesToMove[i].id },
      data: { pathId: miscPath.id, order: existingMiscCount + i + 1 },
    });
    console.log(`  ↪ Moved to Misc: ${modulesToMove[i].title}`);
  }
  console.log("✅  Articles merged into Misc Data Engineering\n");

  // ── 7. Unpublish all other paths ─────────────────────────────────────────
  const keepSlugs = ["data-modeling", "system-design", "misc-data-engineering"];
  const result = await prisma.learningPath.updateMany({
    where: { slug: { notIn: keepSlugs } },
    data: { isPublished: false },
  });
  console.log(`✅  Unpublished ${result.count} other learning paths\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const published = await prisma.learningPath.findMany({
    where: { isPublished: true },
    include: { modules: { where: { isPublished: true }, select: { title: true } } },
    orderBy: { order: "asc" },
  });

  console.log("📚 Final published paths:");
  for (const p of published) {
    console.log(`\n  ${p.order}. ${p.title} [${p.slug}] — ${p.modules.length} articles`);
    p.modules.forEach((m) => console.log(`       • ${m.title}`));
  }

  console.log("\n🎉 Done!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
