"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Question {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  userAnswer?: number | null; // prior attempt
}

interface PathQuizProps {
  questions: Question[];
}

type QuizState = "idle" | "taking" | "submitted";

export function PathQuiz({ questions }: PathQuizProps) {
  // initialise selections from prior attempts (if any)
  const [selections, setSelections] = useState<Record<string, number | null>>(
    () =>
      Object.fromEntries(
        questions.map((q) => [q.id, q.userAnswer ?? null])
      )
  );
  const [results, setResults] = useState<Record<string, boolean> | null>(
    // if all questions have a prior answer, pre-populate results
    () => {
      const hasPriorAttempt = questions.every((q) => q.userAnswer != null);
      if (!hasPriorAttempt) return null;
      return Object.fromEntries(
        questions.map((q) => [q.id, q.userAnswer === q.answer])
      );
    }
  );
  const [quizState, setQuizState] = useState<QuizState>(
    () => (questions.every((q) => q.userAnswer != null) ? "submitted" : "idle")
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allAnswered = questions.every((q) => selections[q.id] != null);
  const score = results
    ? Object.values(results).filter(Boolean).length
    : null;

  function select(questionId: string, optionIndex: number) {
    if (quizState === "submitted") return;
    setQuizState("taking");
    setSelections((prev) => ({ ...prev, [questionId]: optionIndex }));
  }

  async function submitQuiz() {
    setIsSubmitting(true);
    const answers = questions.map((q) => ({
      questionId: q.id,
      selected: selections[q.id] as number,
    }));

    const res = await fetch("/api/learn/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });

    const data = await res.json();
    const resultMap: Record<string, boolean> = {};
    for (const r of data.results) {
      resultMap[r.questionId] = r.isCorrect;
    }
    setResults(resultMap);
    setQuizState("submitted");
    setIsSubmitting(false);
  }

  function retake() {
    setSelections(Object.fromEntries(questions.map((q) => [q.id, null])));
    setResults(null);
    setQuizState("idle");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Knowledge Check</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {questions.length} questions · Test what you learned
          </p>
        </div>
        {quizState === "submitted" && score !== null && (
          <div className="flex items-center gap-2">
            <Trophy
              className={`h-5 w-5 ${score === questions.length ? "text-yellow-400" : "text-slate-500"}`}
            />
            <span
              className={`text-sm font-semibold ${
                score === questions.length
                  ? "text-yellow-400"
                  : score >= questions.length * 0.7
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {score} / {questions.length} correct
            </span>
          </div>
        )}
      </div>

      {/* Score banner */}
      {quizState === "submitted" && score !== null && (
        <div
          className={`rounded-lg p-4 border text-sm ${
            score === questions.length
              ? "bg-yellow-950/20 border-yellow-800/40 text-yellow-300"
              : score >= questions.length * 0.7
              ? "bg-green-950/20 border-green-800/40 text-green-300"
              : "bg-red-950/20 border-red-800/40 text-red-300"
          }`}
        >
          {score === questions.length
            ? "🏆 Perfect score! You've mastered this topic."
            : score >= questions.length * 0.7
            ? `✅ Good work! Review the ${questions.length - score} question${questions.length - score !== 1 ? "s" : ""} you missed.`
            : `📖 Keep studying — re-read the articles and try again.`}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-5">
        {questions.map((q, qi) => {
          const selected = selections[q.id];
          const isSubmitted = quizState === "submitted";
          const isCorrect = results?.[q.id];

          return (
            <div
              key={q.id}
              className={`rounded-lg border p-4 space-y-3 ${
                isSubmitted
                  ? isCorrect
                    ? "border-green-800/50 bg-green-950/10"
                    : "border-red-800/50 bg-red-950/10"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              {/* Question text */}
              <div className="flex items-start gap-2">
                <span className="text-xs font-mono text-slate-600 flex-shrink-0 mt-0.5">
                  Q{qi + 1}
                </span>
                <p className="text-sm font-medium text-white leading-snug">
                  {q.question}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2 ml-5">
                {q.options.map((option, oi) => {
                  const isSelected = selected === oi;
                  const isAnswer = q.answer === oi;

                  let optionClass =
                    "w-full text-left px-3 py-2.5 rounded-md text-sm border transition-colors ";

                  if (!isSubmitted) {
                    optionClass += isSelected
                      ? "border-indigo-600 bg-indigo-950/40 text-white"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500 hover:text-white";
                  } else {
                    if (isAnswer) {
                      optionClass +=
                        "border-green-700 bg-green-950/30 text-green-300";
                    } else if (isSelected && !isAnswer) {
                      optionClass +=
                        "border-red-700 bg-red-950/30 text-red-300";
                    } else {
                      optionClass +=
                        "border-slate-800 bg-slate-900/30 text-slate-500";
                    }
                  }

                  return (
                    <button
                      key={oi}
                      className={optionClass}
                      onClick={() => select(q.id, oi)}
                      disabled={isSubmitted}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs flex-shrink-0 mt-0.5 opacity-60">
                          {String.fromCharCode(65 + oi)}.
                        </span>
                        <span>{option}</span>
                        {isSubmitted && isAnswer && (
                          <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 ml-auto mt-0.5" />
                        )}
                        {isSubmitted && isSelected && !isAnswer && (
                          <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 ml-auto mt-0.5" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation (shown after submit) */}
              {isSubmitted && (
                <div className="ml-5 p-3 rounded-md bg-slate-900 border border-slate-700">
                  <p className="text-xs font-medium text-indigo-400 mb-1">
                    {isCorrect ? "✓ Correct" : "✗ Incorrect"} — Why?
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {quizState !== "submitted" && (
          <Button
            onClick={submitQuiz}
            disabled={!allAnswered || isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40"
          >
            {isSubmitting ? "Scoring…" : `Submit Quiz (${Object.values(selections).filter((v) => v != null).length}/${questions.length} answered)`}
          </Button>
        )}
        {quizState === "submitted" && (
          <Button
            variant="outline"
            onClick={retake}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retake Quiz
          </Button>
        )}
      </div>
    </div>
  );
}
