import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const content = readFileSync(
    join(__dirname, "content/scd-types.md"),
    "utf-8"
  );

  const updated = await prisma.learningModule.updateMany({
    where: { slug: "scd-types" },
    data: {
      content,
      readTimeMinutes: 14,
      description:
        "Deep dive into SCD Types 0, 1, 2, 3, 4, and 6 — how each works, the exact table state after changes, when to use each, and a decision flowchart for choosing the right type.",
    },
  });

  console.log(`✅  Updated ${updated.count} module(s): Exploring SCD Types`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
