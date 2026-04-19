import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, Database, CheckCircle2, Clock, ArrowRight, TrendingUp } from "lucide-react";

export default async function PracticePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingDone: true },
  });
  if (!profile?.onboardingDone) redirect("/onboarding");

  // Counts per category
  const [sqlTotal, pythonTotal, sqlAttempts, pythonAttempts] = await Promise.all([
    prisma.practiceQuestion.count({ where: { category: "SQL", isPublished: true } }),
    prisma.practiceQuestion.count({ where: { category: "PYTHON", isPublished: true } }),
    prisma.userQuestionAttempt.findMany({
      where: {
        userId: session.user.id,
        question: { category: "SQL" },
      },
      select: { status: true },
    }),
    prisma.userQuestionAttempt.findMany({
      where: {
        userId: session.user.id,
        question: { category: "PYTHON" },
      },
      select: { status: true },
    }),
  ]);

  const sqlSolved = sqlAttempts.filter((a) => a.status === "SOLVED").length;
  const pythonSolved = pythonAttempts.filter((a) => a.status === "SOLVED").length;
  const totalSolved = sqlSolved + pythonSolved;
  const totalQuestions = sqlTotal + pythonTotal;

  const categories = [
    {
      id: "sql",
      title: "SQL Practice",
      description:
        "Master the queries that appear in every data engineering interview — window functions, CTEs, aggregations, SCD patterns, and warehouse-specific optimizations.",
      icon: Database,
      color: "indigo",
      href: "/practice/sql",
      total: sqlTotal,
      solved: sqlSolved,
      topics: ["Aggregation & Grouping", "Window Functions", "CTEs & Subqueries", "JOIN Patterns", "Data Warehouse SQL"],
      comingSoon: false,
    },
    {
      id: "python",
      title: "Python Practice",
      description:
        "Data engineering Python — generators, decorators, pandas patterns, ETL building blocks, and the coding patterns that show up in take-home assessments.",
      icon: Code2,
      color: "violet",
      href: "/practice/python",
      total: pythonTotal,
      solved: pythonSolved,
      topics: ["Data Manipulation", "ETL Patterns", "Generators & Iterators", "Decorators", "Schema Validation"],
      comingSoon: pythonTotal === 0,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Practice</h1>
        <p className="text-slate-400 mt-1">
          Write real queries and code. Read concepts, then prove you can apply them.
        </p>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="pt-5 text-center">
            <div className="text-3xl font-bold text-indigo-400">{totalSolved}</div>
            <div className="text-xs text-slate-500 mt-1">Problems Solved</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="pt-5 text-center">
            <div className="text-3xl font-bold text-indigo-400">{totalQuestions}</div>
            <div className="text-xs text-slate-500 mt-1">Total Problems</div>
          </CardContent>
        </Card>
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="pt-5 text-center">
            <div className="text-3xl font-bold text-indigo-400">
              {totalQuestions > 0 ? Math.round((totalSolved / totalQuestions) * 100) : 0}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Completion</div>
          </CardContent>
        </Card>
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const pct = cat.total > 0 ? Math.round((cat.solved / cat.total) * 100) : 0;

          return (
            <div key={cat.id} className="relative">
              {cat.comingSoon && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
                  <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-sm px-4 py-2">
                    Coming in Phase 2
                  </Badge>
                </div>
              )}
              <Link href={cat.href} className={cat.comingSoon ? "pointer-events-none" : ""}>
                <Card className="border-slate-800 bg-slate-900/50 hover:border-indigo-700/50 hover:bg-slate-900 transition-all h-full group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-indigo-950/60 border border-indigo-900/40">
                          <Icon className="h-6 w-6 text-indigo-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg group-hover:text-indigo-300 transition-colors">
                            {cat.title}
                          </CardTitle>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {cat.solved} / {cat.total} solved
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-slate-600 group-hover:text-indigo-400 transition-colors mt-1" />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-400 leading-relaxed">{cat.description}</p>

                    {/* Topics */}
                    <div className="flex flex-wrap gap-1.5">
                      {cat.topics.map((t) => (
                        <span
                          key={t}
                          className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                        <span>Progress</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            How to Use Practice Effectively
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-2">
              <span className="text-indigo-400 font-bold flex-shrink-0">1.</span>
              <span>Read the problem and schema carefully — identify what the question is really asking.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 font-bold flex-shrink-0">2.</span>
              <span>Write your answer in the scratch pad <em>before</em> revealing hints or the solution.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 font-bold flex-shrink-0">3.</span>
              <span>Reveal hints one at a time if stuck — don&apos;t jump straight to the solution.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 font-bold flex-shrink-0">4.</span>
              <span>After seeing the solution, mark it as <span className="text-green-400">Solved</span> or <span className="text-yellow-400">Need Practice</span> — revisit the latter before your interview.</span>
            </li>
            <li className="flex gap-2">
              <span className="text-indigo-400 font-bold flex-shrink-0">5.</span>
              <span>For Hard problems, focus on explaining your reasoning out loud — interviewers care more about your thought process than perfect syntax.</span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
