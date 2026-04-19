import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, ChevronRight, Zap } from "lucide-react";

const TOPIC_ICONS: Record<string, string> = {
  "data-modeling":    "🗂️",
  "sql":              "🔍",
  "streaming-cdc":    "⚡",
  "data-architecture":"🏗️",
  "open-table-formats":"📦",
  "cloud-warehousing":"☁️",
  "python":           "🐍",
  "system-design":    "📐",
};

export default async function QuizPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Get all decks grouped by topic slug
  const allCards = await prisma.flashCard.findMany({
    where: { isPublished: true },
    select: { id: true, topic: true, topicSlug: true },
    orderBy: { order: "asc" },
  });

  // Unique decks (preserve order of first appearance)
  const deckMap = new Map<string, { topic: string; topicSlug: string; total: number }>();
  for (const card of allCards) {
    if (!deckMap.has(card.topicSlug)) {
      deckMap.set(card.topicSlug, { topic: card.topic, topicSlug: card.topicSlug, total: 0 });
    }
    deckMap.get(card.topicSlug)!.total++;
  }
  const decks = [...deckMap.values()];

  // User's attempt stats per deck
  const attempts = await prisma.userFlashCardAttempt.findMany({
    where: { userId: session.user.id },
    include: { card: { select: { topicSlug: true } } },
  });

  const deckStats = new Map<string, { seen: number; known: number }>();
  for (const a of attempts) {
    const slug = a.card.topicSlug;
    if (!deckStats.has(slug)) deckStats.set(slug, { seen: 0, known: 0 });
    const s = deckStats.get(slug)!;
    s.seen++;
    if (a.known) s.known++;
  }

  const totalCards   = allCards.length;
  const totalSeen    = attempts.length;
  const totalKnown   = attempts.filter((a) => a.known).length;
  const overallPct   = totalSeen > 0 ? Math.round((totalKnown / totalSeen) * 100) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-bold">Quiz Mode</h1>
        </div>
        <p className="text-slate-400">
          Flashcard-style rapid review — flip cards, recall the answer, rate your confidence.
        </p>
      </div>

      {/* Overall stats */}
      {totalSeen > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-center">
            <div className="text-2xl font-bold text-indigo-400">{totalSeen}</div>
            <div className="text-xs text-slate-500 mt-0.5">Cards reviewed</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{totalKnown}</div>
            <div className="text-xs text-slate-500 mt-0.5">Marked "Got It"</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-center">
            <div className="text-2xl font-bold">{overallPct}%</div>
            <div className="text-xs text-slate-500 mt-0.5">Overall mastery</div>
          </div>
        </div>
      )}

      {/* Deck grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
          Choose a deck to study
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {decks.map((deck) => {
            const stats = deckStats.get(deck.topicSlug);
            const seen  = stats?.seen ?? 0;
            const known = stats?.known ?? 0;
            const pct   = seen > 0 ? Math.round((known / deck.total) * 100) : 0;
            const isComplete = seen === deck.total && seen > 0;
            const hasStarted = seen > 0;

            return (
              <Link key={deck.topicSlug} href={`/quiz/${deck.topicSlug}`}>
                <Card className={`border transition-colors group cursor-pointer hover:border-indigo-700/50 hover:bg-slate-900 ${
                  isComplete ? "border-green-900/40 bg-green-950/10" : "border-slate-800 bg-slate-900/50"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {TOPIC_ICONS[deck.topicSlug] ?? "📋"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium group-hover:text-indigo-300 transition-colors">
                            {deck.topic}
                          </p>
                          <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{deck.total} cards</p>

                        {/* Mastery bar */}
                        {hasStarted ? (
                          <div className="mt-2 space-y-1">
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isComplete ? "bg-green-500" : "bg-indigo-600"}`}
                                style={{ width: `${(known / deck.total) * 100}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className={isComplete ? "text-green-400" : "text-slate-500"}>
                                {isComplete ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 inline" /> Complete
                                  </span>
                                ) : (
                                  `${known}/${deck.total} mastered · ${pct}%`
                                )}
                              </span>
                              {!isComplete && seen < deck.total && (
                                <span className="text-slate-600">{deck.total - seen} unseen</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1 text-xs text-slate-600">
                            <Circle className="h-3 w-3" />
                            Not started
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-5 space-y-3">
        <h3 className="text-sm font-medium text-slate-400">How Quiz Mode works</h3>
        <div className="grid sm:grid-cols-3 gap-4 text-sm text-slate-500">
          <div className="flex gap-2.5">
            <span className="text-indigo-400 font-bold flex-shrink-0">1.</span>
            <span>Click a card to flip it and see the full explanation</span>
          </div>
          <div className="flex gap-2.5">
            <span className="text-indigo-400 font-bold flex-shrink-0">2.</span>
            <span>Rate yourself — <span className="text-green-400">Got It</span> or <span className="text-yellow-400">Review Again</span></span>
          </div>
          <div className="flex gap-2.5">
            <span className="text-indigo-400 font-bold flex-shrink-0">3.</span>
            <span>At the end, restart with only the cards you need to practice</span>
          </div>
        </div>
      </div>
    </div>
  );
}
