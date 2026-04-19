import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Tag, CheckCircle2, MinusCircle } from "lucide-react";
import { ProblemClient } from "./problem-client";

const DIFFICULTY_STYLES = {
  EASY:   "bg-green-950 text-green-400 border-green-800",
  MEDIUM: "bg-yellow-950 text-yellow-400 border-yellow-800",
  HARD:   "bg-red-950 text-red-400 border-red-800",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SQLProblemPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Fetch this question + all SQL questions for prev/next navigation
  const [question, allQuestions] = await Promise.all([
    prisma.practiceQuestion.findUnique({
      where: { slug, isPublished: true, category: "SQL" },
    }),
    prisma.practiceQuestion.findMany({
      where: { category: "SQL", isPublished: true },
      orderBy: [{ difficulty: "asc" }, { order: "asc" }],
      select: { id: true, slug: true, difficulty: true },
    }),
  ]);

  if (!question) notFound();

  const currentIndex = allQuestions.findIndex((q) => q.id === question.id);
  const prevSlug = currentIndex > 0 ? allQuestions[currentIndex - 1].slug : null;
  const nextSlug = currentIndex < allQuestions.length - 1 ? allQuestions[currentIndex + 1].slug : null;

  // User's attempt status
  const attempt = await prisma.userQuestionAttempt.findUnique({
    where: { userId_questionId: { userId: session.user.id, questionId: question.id } },
    select: { status: true },
  });

  const questionNumber = currentIndex + 1;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/practice/sql"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        SQL Problems
      </Link>

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-600">#{questionNumber}</span>
            <h1 className="text-xl font-bold">{question.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {attempt?.status === "SOLVED" && (
              <Badge className="bg-green-950 text-green-400 border-green-800 gap-1">
                <CheckCircle2 className="h-3 w-3" /> Solved
              </Badge>
            )}
            {attempt?.status === "ATTEMPTED" && (
              <Badge className="bg-yellow-950 text-yellow-400 border-yellow-800 gap-1">
                <MinusCircle className="h-3 w-3" /> Needs Practice
              </Badge>
            )}
            <Badge className={`text-xs ${DIFFICULTY_STYLES[question.difficulty]}`}>
              {question.difficulty.charAt(0) + question.difficulty.slice(1).toLowerCase()}
            </Badge>
          </div>
        </div>

        {/* Tags */}
        {question.tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Tag className="h-3.5 w-3.5 text-slate-600" />
            {question.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Schema / Context */}
      {question.context && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
          <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50">
            <span className="text-xs font-medium text-slate-400">Schema</span>
          </div>
          <div className="p-4">
            <pre className="text-xs text-slate-300 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {question.context
                .replace(/```sql\n/g, "")
                .replace(/```\n?/g, "")
                .replace(/\*\*Tables available:\*\*/g, "")
                .trim()}
            </pre>
          </div>
        </div>
      )}

      {/* Problem description */}
      <div className="prose prose-invert prose-sm max-w-none">
        <div className="p-4 rounded-lg border border-slate-800 bg-slate-900/50">
          <p className="text-sm font-medium text-slate-300 mb-3">Problem</p>
          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {question.description
              .replace(/\*\*(.*?)\*\*/g, "$1")  // strip bold markers for plain display
            }
          </div>
        </div>
      </div>

      {/* Interactive client section */}
      <ProblemClient
        questionId={question.id}
        hints={question.hints}
        solution={question.solution}
        explanation={question.explanation}
        initialStatus={attempt?.status ?? null}
        prevSlug={prevSlug}
        nextSlug={nextSlug}
      />
    </div>
  );
}
