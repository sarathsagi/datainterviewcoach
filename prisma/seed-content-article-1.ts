import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const content = readFileSync(
    join(__dirname, "content/logical-data-modeling.md"),
    "utf-8"
  );

  const updated = await prisma.learningModule.updateMany({
    where: { slug: "logical-data-modeling" },
    data: {
      content,
      readTimeMinutes: 12,
      description:
        "Understand where logical modeling fits in the design process, how to derive a model from requirements step by step, and the key decisions that separate strong candidates from weak ones.",
    },
  });

  console.log(`✅  Updated ${updated.count} module(s): Logical Data Modeling`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
