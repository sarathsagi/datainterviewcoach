import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const content = readFileSync(
    join(__dirname, "content/physical-data-modeling.md"),
    "utf-8"
  );

  const updated = await prisma.learningModule.updateMany({
    where: { slug: "physical-data-modeling" },
    data: {
      content,
      readTimeMinutes: 14,
      description:
        "Translate a logical model into production-ready DDL. Learn surrogate key choices, precise data types, index design, constraints, and partitioning strategies for both OLTP and warehouse systems.",
    },
  });

  console.log(`✅  Updated ${updated.count} module(s): Physical Data Modeling`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
