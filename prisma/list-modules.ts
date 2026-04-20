import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const paths = await prisma.learningPath.findMany({
    where: { isPublished: true },
    include: {
      modules: {
        where: { isPublished: true },
        select: { slug: true, title: true, order: true },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  });

  for (const path of paths) {
    console.log(`\n=== ${path.title} [${path.slug}] ===`);
    path.modules.forEach((m) =>
      console.log(`  ${m.order}. [${m.slug}] ${m.title}`)
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
