import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
const prisma = new PrismaClient();
async function main() {
  const content = readFileSync(join(__dirname, "content/clickstream-pipeline-design.md"), "utf-8");
  const updated = await prisma.learningModule.updateMany({
    where: { slug: "clickstream-pipeline-design" },
    data: { content, readTimeMinutes: 15, description: "End-to-end design for a high-volume clickstream pipeline: event collection API, Kafka partitioning strategy, dual-path stream processing, Bronze/Silver/Gold storage tiers, real-time aggregates, and failure handling at 200K events/sec." },
  });
  console.log(`✅  Updated ${updated.count} module(s): Clickstream Pipeline Design`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
