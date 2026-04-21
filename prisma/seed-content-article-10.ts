import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function main() {
  const content = readFileSync(
    join(__dirname, "content/scd-implementation.md"),
    "utf-8"
  );

  const updated = await prisma.learningModule.updateMany({
    where: { slug: "scd-implementation" },
    data: {
      content,
      readTimeMinutes: 15,
      description:
        "Production-ready SCD implementation: complete Type 2 DDL and three-phase ETL logic, mixing Type 1 and Type 2 per attribute, Type 3 and Type 6 patterns, dbt snapshots, and warehouse-specific considerations for Snowflake, BigQuery, Redshift, and Delta Lake.",
    },
  });

  console.log(
    `✅  Updated ${updated.count} module(s): Implementing SCDs in a Data Warehouse`
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
