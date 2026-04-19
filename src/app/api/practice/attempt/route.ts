import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QuestionStatus } from "@prisma/client";

// POST /api/practice/attempt — mark a practice question as solved/attempted/skipped
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questionId, status } = await req.json();

  if (!questionId || !status) {
    return NextResponse.json({ error: "questionId and status are required" }, { status: 400 });
  }

  if (!["SOLVED", "ATTEMPTED", "SKIPPED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await prisma.userQuestionAttempt.upsert({
    where: { userId_questionId: { userId: session.user.id, questionId } },
    create: { userId: session.user.id, questionId, status: status as QuestionStatus },
    update: { status: status as QuestionStatus },
  });

  return NextResponse.json({ success: true });
}
