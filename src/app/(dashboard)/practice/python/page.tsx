import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Circle, MinusCircle, ArrowLeft, Tag } from "lucide-react";

const DIFFICULTY_STYLES = {
  EASY:   "bg-green-950 text-green-400 border-green-800",
  MEDIUM: "bg-yellow-950 text-yellow-400 border-yellow-800",
  HARD:   "bg-red-950 text-red-400 border-red-800",
};

const STATUS_ICON = {
  SOLVED:   <CheckCircle2 className="h-4 w-4 text-green-400" />,
  ATTEMPTED: <MinusCircle className="h-4 w-4 text-yellow-400" />,
  SKIPPED:  <MinusCircle className="h-4 w-4 text-slate-600" />,
};

export default async function PythonPracticePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const questions = await prisma.practiceQuestion.findMany({
    where: { category: "PYTHON", isPublished: true },
    orderBy: [{ difficulty: "asc" }, { order: "asc" }],
  });

  const attempts = await prisma.userQuestionAttempt.findMany({
    where: {
      userId: session.user.id,
      question: { category: "PYTHON" },
    },
    select: { questionId: true, status: true },
  });
  const attemptMap = new Map(attempts.map((a) => [a.questionId, a.status]));

  const solved    = attempts.filter((a) => a.status === "SOLVED").length;
  const attempted = attempts.filter((a) => a.status === "ATTEMPTED").length;

  const groups = ["EASY", "MEDIUM", "HARD"] as const;
  const grouped = Object.fromEntries(
    groups.map((d) => [d, questions.filter((q) => q.difficulty === d)])
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/practice"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Practice Home
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Python Practice</h1>
          <p className="text-slate-400 mt-1 text-sm">
            25 problems covering data manipulation, decorators, generators, concurrency, and production-ready patterns.
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-slate-300">{solved} solved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MinusCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-slate-300">{attempted} attempted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Circle className="h-4 w-4 text-slate-600" />
            <span className="text-slate-300">{questions.length - solved - attempted} not started</span>
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Overall progress</span>
          <span>{questions.length > 0 ? Math.round((solved / questions.length) * 100) : 0}% solved</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-600 rounded-full transition-all"
            style={{ width: `${questions.length > 0 ? (solved / questions.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Question groups */}
      {groups.map((difficulty) => {
        const qs = grouped[difficulty];
        if (!qs || qs.length === 0) return null;
        const groupSolved = qs.filter((q) => attemptMap.get(q.id) === "SOLVED").length;

        return (
          <section key={difficulty} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs ${DIFFICULTY_STYLES[difficulty]}`}>
                  {difficulty.charAt(0) + difficulty.slice(1).toLowerCase()}
                </Badge>
                <span className="text-sm text-slate-500">{qs.length} problems</span>
              </div>
              <span className="text-xs text-slate-500">{groupSolved}/{qs.length} solved</span>
            </div>

            <div className="space-y-2">
              {qs.map((q) => {
                const status = attemptMap.get(q.id);
                const globalIndex = questions.findIndex((x) => x.id === q.id) + 1;

                return (
                  <Link key={q.id} href={`/practice/python/${q.slug}`}>
                    <Card className={`border transition-colors group hover:border-indigo-700/50 hover:bg-slate-900 ${
                      status === "SOLVED" ? "border-green-900/40 bg-green-950/10" : "border-slate-800 bg-slate-900/50"
                    }`}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* Status icon */}
                          <div className="flex-shrink-0">
                            {status ? STATUS_ICON[status] : <Circle className="h-4 w-4 text-slate-700" />}
                          </div>

                          {/* Number */}
                          <span className="text-xs text-slate-600 font-mono w-6 flex-shrink-0">
                            {String(globalIndex).padStart(2, "0")}
                          </span>

                          {/* Title */}
                          <span className={`flex-1 text-sm font-medium group-hover:text-indigo-300 transition-colors ${
                            status === "SOLVED" ? "text-slate-400 line-through" : "text-white"
                          }`}>
                            {q.title}
                          </span>

                          {/* Tags */}
                          <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                            {q.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Difficulty */}
                          <Badge className={`text-xs flex-shrink-0 ${DIFFICULTY_STYLES[q.difficulty]}`}>
                            {q.difficulty.charAt(0) + q.difficulty.slice(1).toLowerCase()}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
