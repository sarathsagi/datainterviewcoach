import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const content = readFileSync(
    join(__dirname, "content/scd-introduction.md"),
    "utf-8"
  );

  const updated = await prisma.learningModule.updateMany({
    where: { slug: "scd-introduction" },
    data: {
      content,
      readTimeMinutes: 8,
      description:
        "Understand why Slowly Changing Dimensions exist, the problem of dimension attributes changing over time, how overwriting history silently corrupts analytics, and a preview of the five SCD types.",
    },
  });

  console.log(`✅  Updated ${updated.count} module(s): Introduction to SCDs`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
