import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
const prisma = new PrismaClient();
async function main() {
  const content = readFileSync(join(__dirname, "content/cdc-pipeline-design.md"), "utf-8");
  const updated = await prisma.learningModule.updateMany({
    where: { slug: "cdc-pipeline-design" },
    data: { content, readTimeMinutes: 14, description: "Design a CDC pipeline from PostgreSQL to a lakehouse using Debezium and Kafka: log-based vs query-based CDC, replication slot risks, MERGE patterns for Silver reconstruction, PII masking, schema evolution handling, and failure recovery." },
  });
  console.log(`✅  Updated ${updated.count} module(s): CDC Pipeline Design`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
