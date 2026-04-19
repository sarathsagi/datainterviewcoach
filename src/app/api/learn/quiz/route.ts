import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const answers: { questionId: string; selected: number }[] = body.answers;

  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Fetch the correct answers for the submitted question IDs
  const questions = await prisma.pathQuestion.findMany({
    where: { id: { in: answers.map((a) => a.questionId) } },
    select: { id: true, answer: true },
  });

  const correctMap = new Map(questions.map((q) => [q.id, q.answer]));

  const results: { questionId: string; isCorrect: boolean }[] = [];

  for (const { questionId, selected } of answers) {
    const correctAnswer = correctMap.get(questionId);
    if (correctAnswer === undefined) continue;

    const isCorrect = selected === correctAnswer;
    results.push({ questionId, isCorrect });

    await prisma.userPathQuestionAttempt.upsert({
      where: { userId_questionId: { userId: session.user.id, questionId } },
      update: { selected, isCorrect },
      create: { userId: session.user.id, questionId, selected, isCorrect },
    });
  }

  return NextResponse.json({ results });
}
