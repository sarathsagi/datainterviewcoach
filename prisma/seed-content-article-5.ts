import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const content = readFileSync(
    join(__dirname, "content/common-data-modeling-pitfalls.md"),
    "utf-8"
  );

  const updated = await prisma.learningModule.updateMany({
    where: { slug: "common-data-modeling-pitfalls" },
    data: {
      content,
      readTimeMinutes: 13,
      description:
        "Recognize and avoid the schema design mistakes that appear in real production systems: EAV anti-pattern, lists in columns, stringly-typed data, missing audit columns, soft vs hard deletes, and premature optimization.",
    },
  });

  console.log(
    `✅  Updated ${updated.count} module(s): Common Data Modeling Pitfalls`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
