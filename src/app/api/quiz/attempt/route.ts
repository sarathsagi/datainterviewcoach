import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cardId, known } = await req.json();
  if (!cardId || typeof known !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.userFlashCardAttempt.upsert({
    where: { userId_cardId: { userId: session.user.id, cardId } },
    update: { known },
    create: { userId: session.user.id, cardId, known },
  });

  return NextResponse.json({ ok: true });
}
