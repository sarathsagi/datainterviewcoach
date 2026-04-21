import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const content = readFileSync(
    join(__dirname, "content/normalization-denormalization.md"),
    "utf-8"
  );

  const updated = await prisma.learningModule.updateMany({
    where: { slug: "normalization-denormalization" },
    data: {
      content,
      readTimeMinutes: 13,
      description:
        "Master 1NF, 2NF, 3NF, and BCNF with worked examples. Understand the anomalies normalization prevents, how to spot transitive and partial dependencies, and when to intentionally denormalize for performance.",
    },
  });

  console.log(
    `✅  Updated ${updated.count} module(s): Normalization & Denormalization`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
