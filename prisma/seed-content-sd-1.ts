import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";
const prisma = new PrismaClient();
async function main() {
  const content = readFileSync(join(__dirname, "content/system-design-framework.md"), "utf-8");
  const updated = await prisma.learningModule.updateMany({
    where: { slug: "system-design-framework" },
    data: { content, readTimeMinutes: 13, description: "A five-step framework for data engineering system design interviews: requirements gathering, scale estimation, data flow mapping, layer-by-layer design, and failure handling — with a decision map for justifying every technology choice." },
  });
  console.log(`✅  Updated ${updated.count} module(s): System Design Framework`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
