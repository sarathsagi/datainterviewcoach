/**
 * seed-all.ts — orchestrator for the full content pipeline.
 *
 * Runs every seed script in dependency order. Idempotent — every script
 * uses upsert with deterministic IDs, so re-running this is safe.
 *
 * Order matters because:
 *   1. Base seeds (paths, modules, problems, mock questions) must exist
 *      before wireup scripts can find rows by slug.
 *   2. Content wireup overwrites mediumUrl-only modules with inline
 *      content from disk — needs the modules to exist first.
 *   3. Tag backfills (companyTags, etc.) match by slug — need rows.
 *
 * Run with:
 *   npx tsx prisma/seed-all.ts
 *
 * Or pick subsets with env flags:
 *   SEED_LEARN=1 npx tsx prisma/seed-all.ts          # only learn paths
 *   SEED_PRACTICE=1 npx tsx prisma/seed-all.ts       # only practice problems
 *   SEED_MOCK=1 npx tsx prisma/seed-all.ts           # only mock questions
 *   SEED_QUIZ=1 npx tsx prisma/seed-all.ts           # only quiz pool
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const PRISMA_DIR = __dirname;

interface Step {
  name: string;
  file: string;
  /** Which env flag enables this step. Always run if no flags set. */
  group: "learn" | "practice" | "mock" | "quiz" | "wireup";
}

// Order matters — wireup steps run AFTER the seeds they patch.
const STEPS: Step[] = [
  // ── Base seeds ────────────────────────────────────────────────────────
  { name: "Core paths + practice + mock (legacy seed.ts)", file: "seed.ts", group: "learn" },
  { name: "Streaming Systems learning path", file: "seed-learn-streaming.ts", group: "learn" },
  { name: "Orchestration learning path", file: "seed-learn-orchestration.ts", group: "learn" },
  { name: "FAANG Case Studies path (NEW)", file: "seed-learn-faang.ts", group: "learn" },
  // Fundamentals path is split across 3 files because the 12 modules
  // exceed a single-agent context. Part 1 creates the path; parts 2+3
  // add modules. Order matters — part 1 must run first.
  { name: "Fundamentals path + modules 1-4 (NEW)", file: "seed-learn-fundamentals-1.ts", group: "learn" },
  { name: "Fundamentals modules 5-8 (NEW)", file: "seed-learn-fundamentals-2.ts", group: "learn" },
  { name: "Fundamentals modules 9-12 (NEW)", file: "seed-learn-fundamentals-3.ts", group: "learn" },
  { name: "SQL learning path (NEW)", file: "seed-learn-sql.ts", group: "learn" },
  { name: "Python learning path (NEW)", file: "seed-learn-python.ts", group: "learn" },
  { name: "Behavioral path (NEW)", file: "seed-learn-behavioral.ts", group: "learn" },
  { name: "Resume + Negotiation path (NEW)", file: "seed-learn-career.ts", group: "learn" },

  // Practice seeds
  { name: "SQL practice problems", file: "seed-sql.ts", group: "practice" },
  { name: "SQL advanced problems", file: "seed-sql-advanced.ts", group: "practice" },
  { name: "SQL warehouse problems", file: "seed-sql-warehouse.ts", group: "practice" },
  { name: "Python practice problems", file: "seed-python.ts", group: "practice" },
  { name: "Python async problems", file: "seed-python-async.ts", group: "practice" },
  { name: "Python FAANG problems", file: "seed-python-faang.ts", group: "practice" },
  { name: "Python pyspark problems", file: "seed-python-pyspark.ts", group: "practice" },
  { name: "Algorithms problems", file: "seed-algorithms.ts", group: "practice" },

  // Mock + quiz pools
  { name: "Mock interview questions (legacy v1)", file: "seed-mock-questions.ts", group: "mock" },
  { name: "Mock v2 — Python (NEW)", file: "seed-mock-questions-v2-python.ts", group: "mock" },
  { name: "Mock v2 — SQL (NEW)", file: "seed-mock-questions-v2-sql.ts", group: "mock" },
  { name: "Mock v2 — Data Modeling (NEW)", file: "seed-mock-questions-v2-data-modeling.ts", group: "mock" },
  { name: "Mock v2 — System Design (NEW)", file: "seed-mock-questions-v2-system-design.ts", group: "mock" },
  { name: "Mock behavioral questions", file: "seed-mock-behavioral.ts", group: "mock" },
  { name: "Quiz Mode question pool", file: "seed-quiz-mode.ts", group: "quiz" },
  { name: "Flashcards v2", file: "seed-flashcards-v2.ts", group: "quiz" },

  // ── Wireup (must run AFTER base seeds) ────────────────────────────────
  { name: "Wire on-disk markdown into modules", file: "seed-learn-content-wireup.ts", group: "wireup" },
  { name: "Backfill practice companyTags", file: "seed-practice-company-tags.ts", group: "wireup" },
  { name: "Backfill practice testCases (demo set)", file: "seed-practice-test-cases.ts", group: "wireup" },
  { name: "Backfill testCases — SQL (42)", file: "seed-practice-test-cases-sql.ts", group: "wireup" },
  { name: "Backfill testCases — SQL advanced (6)", file: "seed-practice-test-cases-sql-advanced.ts", group: "wireup" },
  { name: "Backfill testCases — SQL warehouse (10)", file: "seed-practice-test-cases-sql-warehouse.ts", group: "wireup" },
  { name: "Backfill testCases — Python (25)", file: "seed-practice-test-cases-python.ts", group: "wireup" },
  { name: "Backfill testCases — Python async (3)", file: "seed-practice-test-cases-python-async.ts", group: "wireup" },
  { name: "Backfill testCases — Python FAANG (6)", file: "seed-practice-test-cases-python-faang.ts", group: "wireup" },
  { name: "Backfill testCases — Python PySpark (3)", file: "seed-practice-test-cases-python-pyspark.ts", group: "wireup" },
  { name: "Backfill testCases — Algorithms (40)", file: "seed-practice-test-cases-algorithms.ts", group: "wireup" },
];

function shouldRun(step: Step): boolean {
  // If no SEED_* flags set, run everything. Otherwise, run only matching groups.
  const flags = ["SEED_LEARN", "SEED_PRACTICE", "SEED_MOCK", "SEED_QUIZ", "SEED_WIREUP"];
  const anyFlag = flags.some((f) => process.env[f] === "1");
  if (!anyFlag) return true;
  const flagFor = `SEED_${step.group.toUpperCase()}`;
  return process.env[flagFor] === "1";
}

async function main() {
  const startedAt = Date.now();
  let ran = 0;
  let skipped = 0;
  let missing = 0;

  for (const step of STEPS) {
    if (!shouldRun(step)) {
      skipped++;
      continue;
    }

    const path = join(PRISMA_DIR, step.file);
    if (!existsSync(path)) {
      console.warn(`  ⚠  ${step.name} — ${step.file} not found, skipping`);
      missing++;
      continue;
    }

    console.log(`\n──────────────────────────────────────────────`);
    console.log(`▶ ${step.name}`);
    console.log(`──────────────────────────────────────────────`);
    try {
      execSync(`npx tsx ${path}`, { stdio: "inherit" });
      ran++;
    } catch (err) {
      console.error(`✗ ${step.name} failed:`, err);
      process.exit(1);
    }
  }

  const dur = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\n══════════════════════════════════════════════`);
  console.log(`Done in ${dur}s · ${ran} ran · ${skipped} skipped · ${missing} missing`);
  console.log(`══════════════════════════════════════════════`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
