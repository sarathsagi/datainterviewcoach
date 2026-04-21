import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const content = readFileSync(
    join(__dirname, "content/data-modeling-case-studies.md"),
    "utf-8"
  );

  const updated = await prisma.learningModule.updateMany({
    where: { slug: "data-modeling-case-studies" },
    data: {
      content,
      readTimeMinutes: 16,
      description:
        "Apply data modeling concepts to three real-world interview scenarios: a ride-sharing platform, a SaaS subscription system, and a content streaming service — each with clarifying questions, ERD, key design decisions, and a warehouse extension.",
    },
  });

  console.log(
    `✅  Updated ${updated.count} module(s): Real-World Case Studies`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
