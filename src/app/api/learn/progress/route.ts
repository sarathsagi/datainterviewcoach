import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/learn/progress — mark a module as complete or incomplete
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { moduleId, pathId, completed } = await req.json();

  if (!moduleId || !pathId) {
    return NextResponse.json({ error: "moduleId and pathId are required" }, { status: 400 });
  }

  // Ensure user has a path progress record
  await prisma.userPathProgress.upsert({
    where: { userId_pathId: { userId: session.user.id, pathId } },
    create: { userId: session.user.id, pathId },
    update: {},
  });

  if (completed) {
    // Mark module complete
    await prisma.userModuleProgress.upsert({
      where: { userId_moduleId: { userId: session.user.id, moduleId } },
      create: { userId: session.user.id, moduleId },
      update: { completedAt: new Date() },
    });
  } else {
    // Mark module incomplete — delete the record
    await prisma.userModuleProgress.deleteMany({
      where: { userId: session.user.id, moduleId },
    });
  }

  // Check if all modules in the path are complete
  const path = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: {
      modules: { where: { isPublished: true }, select: { id: true } },
    },
  });

  if (path) {
    const completedCount = await prisma.userModuleProgress.count({
      where: {
        userId: session.user.id,
        moduleId: { in: path.modules.map((m) => m.id) },
      },
    });

    if (completedCount === path.modules.length) {
      await prisma.userPathProgress.update({
        where: { userId_pathId: { userId: session.user.id, pathId } },
        data: { completedAt: new Date() },
      });
    } else {
      // If unchecking, clear path completion
      await prisma.userPathProgress.update({
        where: { userId_pathId: { userId: session.user.id, pathId } },
        data: { completedAt: null },
      });
    }
  }

  return NextResponse.json({ success: true });
}
