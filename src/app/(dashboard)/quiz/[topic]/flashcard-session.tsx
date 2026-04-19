"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Card {
  id: string;
  front: string;
  back: string;
  initialKnown: boolean | null;
}

interface FlashcardSessionProps {
  topic: string;
  cards: Card[];
}

type CardResult = "known" | "review" | null;

export function FlashcardSession({ topic, cards: initialCards }: FlashcardSessionProps) {
  // Session queue — defaults to cards marked for review first, then unknowns, then known
  const [queue, setQueue] = useState<Card[]>(() => {
    const review = initialCards.filter((c) => c.initialKnown === false);
    const unseen = initialCards.filter((c) => c.initialKnown === null);
    const known  = initialCards.filter((c) => c.initialKnown === true);
    return [...review, ...unseen, ...known];
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped]       = useState(false);
  const [results, setResults]           = useState<Record<string, CardResult>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionDone, setSessionDone]   = useState(false);

  const currentCard = queue[currentIndex] ?? null;
  const totalCards  = queue.length;
  const reviewed    = Object.keys(results).length;
  const knownCount  = Object.values(results).filter((r) => r === "known").length;
  const reviewCount = Object.values(results).filter((r) => r === "review").length;

  const flip = useCallback(() => {
    if (!isSubmitting) setIsFlipped((f) => !f);
  }, [isSubmitting]);

  async function rate(cardId: string, known: boolean) {
    setIsSubmitting(true);
    const result: CardResult = known ? "known" : "review";
    setResults((prev) => ({ ...prev, [cardId]: result }));

    await fetch("/api/quiz/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, known }),
    });

    setIsSubmitting(false);

    // Advance to next card
    if (currentIndex + 1 >= totalCards) {
      setSessionDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
  }

  function goBack() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setIsFlipped(false);
    }
  }

  function goForward() {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
  }

  function restart() {
    // Put "review again" cards first for the next round
    const reviewCards = queue.filter((c) => results[c.id] === "review");
    const knownCards  = queue.filter((c) => results[c.id] === "known");
    const newQueue    = [...reviewCards, ...knownCards];
    setQueue(newQueue);
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults({});
    setSessionDone(false);
  }

  // ── Session complete screen ────────────────────────────────────────────────
  if (sessionDone) {
    const pct = totalCards > 0 ? Math.round((knownCount / totalCards) * 100) : 0;
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-8">
        <div className="text-5xl">
          {pct === 100 ? "🏆" : pct >= 70 ? "✅" : "📖"}
        </div>
        <div>
          <h2 className="text-2xl font-bold">Session Complete!</h2>
          <p className="text-slate-400 mt-1">{topic}</p>
        </div>

        {/* Score */}
        <div className="flex items-center justify-center gap-8 text-sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{knownCount}</div>
            <div className="text-slate-500 mt-0.5">Got it</div>
          </div>
          <div className="text-slate-700 text-2xl font-light">/</div>
          <div className="text-center">
            <div className="text-3xl font-bold">{totalCards}</div>
            <div className="text-slate-500 mt-0.5">Total cards</div>
          </div>
          {reviewCount > 0 && (
            <>
              <div className="text-slate-700 text-2xl font-light">·</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{reviewCount}</div>
                <div className="text-slate-500 mt-0.5">Need review</div>
              </div>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct === 100 ? "bg-yellow-400" : "bg-green-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-slate-400 text-sm">{pct}% mastery</p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {reviewCount > 0 && (
            <Button
              onClick={restart}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Review {reviewCount} card{reviewCount !== 1 ? "s" : ""} again
            </Button>
          )}
          <Button
            variant="outline"
            onClick={restart}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Full restart
          </Button>
          <Link href="/quiz">
            <Button variant="ghost" className="text-slate-400 hover:text-white gap-2">
              All decks
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!currentCard) return null;

  const cardResult = results[currentCard.id] ?? null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{topic}</span>
          <span>{reviewed} / {totalCards} reviewed</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
          {queue.map((c, i) => {
            const r = results[c.id];
            const isCurrent = i === currentIndex;
            return (
              <div
                key={c.id}
                className={`flex-1 rounded-full transition-colors ${
                  r === "known"
                    ? "bg-green-500"
                    : r === "review"
                    ? "bg-yellow-500"
                    : isCurrent
                    ? "bg-indigo-500"
                    : "bg-slate-700"
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Card */}
      <div
        className="relative cursor-pointer select-none"
        style={{ perspective: "1200px", minHeight: "320px" }}
        onClick={flip}
      >
        <div
          className="relative w-full"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            minHeight: "320px",
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 rounded-2xl border border-slate-700 bg-slate-900 flex flex-col items-center justify-center p-8 text-center"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-6">
              {topic}
            </div>
            <p className="text-xl font-semibold text-white leading-relaxed">
              {currentCard.front}
            </p>
            <p className="text-sm text-slate-500 mt-8">Click to reveal answer</p>
          </div>

          {/* Back face */}
          <div
            className="absolute inset-0 rounded-2xl border border-indigo-800/60 bg-slate-900 flex flex-col p-8"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="text-xs font-medium text-indigo-400 uppercase tracking-widest mb-4">
              Answer
            </div>
            <p className="text-base text-slate-200 leading-relaxed flex-1">
              {currentCard.back}
            </p>

            {/* Rating buttons */}
            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-800" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm text-slate-400 mr-1">How well did you know this?</p>
              <Button
                size="sm"
                className={`gap-1.5 flex-1 ${
                  cardResult === "review"
                    ? "bg-yellow-700 hover:bg-yellow-600"
                    : "bg-slate-800 hover:bg-yellow-900/60 border border-slate-700"
                } text-white`}
                onClick={() => rate(currentCard.id, false)}
                disabled={isSubmitting}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Review Again
              </Button>
              <Button
                size="sm"
                className={`gap-1.5 flex-1 ${
                  cardResult === "known"
                    ? "bg-green-700 hover:bg-green-600"
                    : "bg-slate-800 hover:bg-green-900/60 border border-slate-700"
                } text-white`}
                onClick={() => rate(currentCard.id, true)}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Got It
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          disabled={currentIndex === 0}
          className="text-slate-500 hover:text-white gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        <span className="text-sm text-slate-500 tabular-nums">
          {currentIndex + 1} of {totalCards}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={goForward}
          disabled={currentIndex >= totalCards - 1}
          className="text-slate-500 hover:text-white gap-1"
        >
          Skip
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Hint */}
      {!isFlipped && (
        <p className="text-center text-xs text-slate-600">
          {currentIndex === 0 && reviewed === 0
            ? "Tip: Read the question, try to recall the answer, then click the card to flip it."
            : ""}
        </p>
      )}
    </div>
  );
}
