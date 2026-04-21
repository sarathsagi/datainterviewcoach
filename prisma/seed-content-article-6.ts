import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const content = readFileSync(
    join(__dirname, "content/data-warehousing-modeling.md"),
    "utf-8"
  );

  const updated = await prisma.learningModule.updateMany({
    where: { slug: "data-warehousing-modeling" },
    data: {
      content,
      readTimeMinutes: 15,
      description:
        "Master dimensional modeling for analytics: star vs snowflake schema, fact and dimension table design, the three fact table types, conformed dimensions, additive vs semi-additive measures, and how these patterns map to Snowflake, BigQuery, and Redshift.",
    },
  });

  console.log(
    `✅  Updated ${updated.count} module(s): Data Warehousing & Analytics Modeling`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
