import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
const prisma = new PrismaClient();
async function main() {
  const content = readFileSync(join(__dirname, "content/batch-processing-design.md"), "utf-8");
  const updated = await prisma.learningModule.updateMany({
    where: { slug: "batch-processing-design" },
    data: { content, readTimeMinutes: 15, description: "Design a production-grade daily batch pipeline: incremental extraction with late-data handling, idempotency patterns (partition overwrite, MERGE, truncate-reload), Airflow DAG structure with catchup, data quality checks, and backfill recovery procedures." },
  });
  console.log(`✅  Updated ${updated.count} module(s): Batch Processing Design`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
