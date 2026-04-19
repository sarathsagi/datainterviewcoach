import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArrowLeft } from "lucide-react";
import { FlashcardSession } from "./flashcard-session";

interface PageProps {
  params: Promise<{ topic: string }>;
}

export default async function QuizTopicPage({ params }: PageProps) {
  const { topic } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [cards, attempts] = await Promise.all([
    prisma.flashCard.findMany({
      where: { topicSlug: topic, isPublished: true },
      orderBy: { order: "asc" },
    }),
    prisma.userFlashCardAttempt.findMany({
      where: {
        userId: session.user.id,
        card: { topicSlug: topic },
      },
      select: { cardId: true, known: true },
    }),
  ]);

  if (cards.length === 0) notFound();

  const attemptMap = new Map(attempts.map((a) => [a.cardId, a.known]));

  const topicLabel = cards[0].topic;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/quiz"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All Decks
      </Link>

      <FlashcardSession
        topic={topicLabel}
        cards={cards.map((c) => ({
          id: c.id,
          front: c.front,
          back: c.back,
          initialKnown: attemptMap.has(c.id) ? (attemptMap.get(c.id) ?? null) : null,
        }))}
      />
    </div>
  );
}
