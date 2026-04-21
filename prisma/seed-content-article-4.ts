import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const content = readFileSync(
    join(__dirname, "content/nosql-big-data-modeling.md"),
    "utf-8"
  );

  const updated = await prisma.learningModule.updateMany({
    where: { slug: "nosql-big-data-modeling" },
    data: {
      content,
      readTimeMinutes: 14,
      description:
        "Understand the four NoSQL data model types — document, key-value, wide-column, and graph — when to use each, how to design for access patterns, and how DynamoDB single-table design works.",
    },
  });

  console.log(
    `✅  Updated ${updated.count} module(s): NoSQL & Big Data Modeling`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
