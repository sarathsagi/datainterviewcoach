import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
const prisma = new PrismaClient();
async function main() {
  const content = readFileSync(join(__dirname, "content/api-ingestion-pipeline-design.md"), "utf-8");
  const updated = await prisma.learningModule.updateMany({
    where: { slug: "api-ingestion-pipeline-design" },
    data: { content, readTimeMinutes: 14, description: "Design a multi-source API ingestion pipeline covering the three hard problems: pagination patterns, rate limiting, and retry logic — plus incremental state management, PII handling, schema drift detection, and a unified Gold layer across Salesforce, HubSpot, and Stripe." },
  });
  console.log(`✅  Updated ${updated.count} module(s): API Ingestion Pipeline Design`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
