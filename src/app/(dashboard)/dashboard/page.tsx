import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Target,
  TrendingUp,
  Calendar,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Code2,
  AlertTriangle,
  ChevronRight,
  Trophy,
  RefreshCw,
} from "lucide-react";

const DIFFICULTY_STYLES = {
  EASY:   "bg-green-950 text-green-400 border-green-800",
  MEDIUM: "bg-yellow-950 text-yellow-400 border-yellow-800",
  HARD:   "bg-red-950 text-red-400 border-red-800",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  // ── All data fetches in parallel ────────────────────────────────────────────
  const [
    profile,
    allPaths,
    completedModules,
    sqlAttempts,
    pythonAttempts,
    sqlTotal,
    pythonTotal,
    allSqlQuestions,
    allPythonQuestions,
    quizAttempts,
    quizTotal,
  ] = await Promise.all([
    // Profile
    prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        onboardingDone: true,
        targetCompanies: true,
        interviewDate: true,
        skillLevel: true,
        hoursPerDay: true,
      },
    }),

    // Learning paths
    prisma.learningPath.findMany({
      where: { isPublished: true },
      orderBy: { order: "asc" },
      include: {
        modules: { where: { isPublished: true }, select: { id: true } },
        userProgress: {
          where: { userId: session.user.id },
          select: { startedAt: true, completedAt: true },
        },
      },
    }),

    // Completed modules
    prisma.userModuleProgress.findMany({
      where: { userId: session.user.id },
      select: { moduleId: true },
    }),

    // SQL attempts with question tags for weak-area analysis
    prisma.userQuestionAttempt.findMany({
      where: { userId: session.user.id, question: { category: "SQL" } },
      include: {
        question: {
          select: { id: true, slug: true, title: true, tags: true, difficulty: true, order: true },
        },
      },
    }),

    // Python attempts
    prisma.userQuestionAttempt.findMany({
      where: { userId: session.user.id, question: { category: "PYTHON" } },
      include: {
        question: {
          select: { id: true, slug: true, title: true, tags: true, difficulty: true, order: true },
        },
      },
    }),

    // Total published SQL questions
    prisma.practiceQuestion.count({ where: { category: "SQL", isPublished: true } }),

    // Total published Python questions
    prisma.practiceQuestion.count({ where: { category: "PYTHON", isPublished: true } }),

    // All SQL questions for "next question" suggestion
    prisma.practiceQuestion.findMany({
      where: { category: "SQL", isPublished: true },
      orderBy: [{ difficulty: "asc" }, { order: "asc" }],
      select: { id: true, slug: true, title: true, difficulty: true },
    }),

    // All Python questions for "next question" suggestion
    prisma.practiceQuestion.findMany({
      where: { category: "PYTHON", isPublished: true },
      orderBy: [{ difficulty: "asc" }, { order: "asc" }],
      select: { id: true, slug: true, title: true, difficulty: true },
    }),

    // Path quiz attempts
    prisma.userPathQuestionAttempt.findMany({
      where: { userId: session.user.id },
      select: { isCorrect: true },
    }),

    // Total path questions
    prisma.pathQuestion.count(),
  ]);

  if (!profile?.onboardingDone) redirect("/onboarding");

  // ── Learning progress ───────────────────────────────────────────────────────
  const completedModuleIds = new Set(completedModules.map((m) => m.moduleId));
  const totalModules = allPaths.reduce((sum, p) => sum + p.modules.length, 0);
  const totalCompleted = completedModuleIds.size;

  const inProgressPaths = allPaths.filter(
    (p) =>
      p.userProgress.length > 0 &&
      !p.userProgress[0]?.completedAt &&
      p.modules.some((m) => completedModuleIds.has(m.id))
  );
  const notStartedPaths = allPaths
    .filter((p) => p.userProgress.length === 0)
    .slice(0, 3);

  // ── Practice stats ──────────────────────────────────────────────────────────
  const sqlSolved   = sqlAttempts.filter((a) => a.status === "SOLVED").length;
  const sqlAttempted = sqlAttempts.filter((a) => a.status === "ATTEMPTED").length;
  const pythonSolved   = pythonAttempts.filter((a) => a.status === "SOLVED").length;
  const pythonAttempted = pythonAttempts.filter((a) => a.status === "ATTEMPTED").length;
  const totalProblemsSolved = sqlSolved + pythonSolved;

  // ── Weak area analysis (tags from ATTEMPTED questions) ──────────────────────
  const tagCounts = new Map<string, number>();
  [...sqlAttempts, ...pythonAttempts]
    .filter((a) => a.status === "ATTEMPTED")
    .forEach((a) => {
      a.question.tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      });
    });
  const weakTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // ── "Needs retry" — ATTEMPTED questions to revisit ─────────────────────────
  const sqlRetry = sqlAttempts
    .filter((a) => a.status === "ATTEMPTED")
    .sort((a, b) => a.question.order - b.question.order)[0]?.question ?? null;
  const pythonRetry = pythonAttempts
    .filter((a) => a.status === "ATTEMPTED")
    .sort((a, b) => a.question.order - b.question.order)[0]?.question ?? null;

  // ── "Next unsolved" — first question not yet attempted ──────────────────────
  const solvedSqlIds = new Set(sqlAttempts.filter((a) => a.status === "SOLVED").map((a) => a.question.id));
  const allAttemptedSqlIds = new Set(sqlAttempts.map((a) => a.question.id));
  const nextSql = allSqlQuestions.find((q) => !solvedSqlIds.has(q.id)) ?? null;
  const nextSqlIsRetry = nextSql ? allAttemptedSqlIds.has(nextSql.id) : false;

  const solvedPythonIds = new Set(pythonAttempts.filter((a) => a.status === "SOLVED").map((a) => a.question.id));
  const allAttemptedPythonIds = new Set(pythonAttempts.map((a) => a.question.id));
  const nextPython = allPythonQuestions.find((q) => !solvedPythonIds.has(q.id)) ?? null;
  const nextPythonIsRetry = nextPython ? allAttemptedPythonIds.has(nextPython.id) : false;

  // ── Quiz stats ──────────────────────────────────────────────────────────────
  const quizAnswered = quizAttempts.length;
  const quizCorrect  = quizAttempts.filter((a) => a.isCorrect).length;
  const quizPct = quizAnswered > 0 ? Math.round((quizCorrect / quizAnswered) * 100) : null;

  // ── Misc ────────────────────────────────────────────────────────────────────
  const daysUntilInterview = profile.interviewDate
    ? Math.ceil((profile.interviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const hasPracticeActivity = totalProblemsSolved > 0 || sqlAttempted > 0 || pythonAttempted > 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {firstName}!</h1>
        <p className="text-slate-400 mt-1">
          Continue your data engineering interview prep journey.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Problems Solved</CardTitle>
            <Brain className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProblemsSolved}</div>
            <p className="text-xs text-slate-500">
              {totalProblemsSolved === 0
                ? "Start with SQL or Python practice"
                : `${sqlSolved} SQL · ${pythonSolved} Python`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Quiz Score</CardTitle>
            <Trophy className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {quizPct !== null ? `${quizPct}%` : "—"}
            </div>
            <p className="text-xs text-slate-500">
              {quizAnswered > 0
                ? `${quizCorrect}/${quizAnswered} questions correct`
                : "Take the knowledge checks in Learn"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Skill Level</CardTitle>
            <Target className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {profile.skillLevel.toLowerCase()}
            </div>
            <p className="text-xs text-slate-500">{profile.hoursPerDay} hrs/day commitment</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Interview Date</CardTitle>
            <Calendar className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            {daysUntilInterview !== null ? (
              <>
                <div className={`text-2xl font-bold ${daysUntilInterview <= 14 ? "text-red-400" : daysUntilInterview <= 30 ? "text-yellow-400" : ""}`}>
                  {daysUntilInterview > 0 ? `${daysUntilInterview} days` : "Today!"}
                </div>
                <p className="text-xs text-slate-500">
                  {profile.interviewDate!.toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">Not set</div>
                <p className="text-xs text-slate-500">Set your target date in settings</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Target Companies */}
      {profile.targetCompanies.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle>Target Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profile.targetCompanies.map((company) => (
                <Badge key={company} className="bg-indigo-950 text-indigo-300 border-indigo-800">
                  {company}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Practice Progress ──────────────────────────────────────────────── */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5 text-indigo-400" />
            Practice Progress
          </CardTitle>
          <Link
            href="/practice"
            className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            All problems
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* SQL + Python bars */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* SQL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Link href="/practice/sql" className="font-medium hover:text-indigo-300 transition-colors">
                  SQL Practice
                </Link>
                <span className="text-slate-500 text-xs">{sqlSolved} / {sqlTotal} solved</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${sqlTotal > 0 ? (sqlSolved / sqlTotal) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                  {sqlSolved} solved
                </span>
                {sqlAttempted > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 inline-block" />
                    {sqlAttempted} need practice
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600 inline-block" />
                  {sqlTotal - sqlSolved - sqlAttempted} not started
                </span>
              </div>
            </div>

            {/* Python */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <Link href="/practice/python" className="font-medium hover:text-indigo-300 transition-colors">
                  Python Practice
                </Link>
                <span className="text-slate-500 text-xs">{pythonSolved} / {pythonTotal} solved</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${pythonTotal > 0 ? (pythonSolved / pythonTotal) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                  {pythonSolved} solved
                </span>
                {pythonAttempted > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 inline-block" />
                    {pythonAttempted} need practice
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-600 inline-block" />
                  {pythonTotal - pythonSolved - pythonAttempted} not started
                </span>
              </div>
            </div>
          </div>

          {/* Weak Areas */}
          {weakTags.length > 0 && (
            <div className="rounded-lg border border-yellow-900/30 bg-yellow-950/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                Focus areas — topics that need more practice
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {weakTags.map(([tag, count]) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-yellow-950/40 border border-yellow-800/40 text-yellow-300"
                  >
                    {tag}
                    <span className="text-yellow-600 font-mono">{count}×</span>
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Questions you marked &quot;Need Practice&quot; — revisit these first.
              </p>
            </div>
          )}

          {/* Next Question Recommendations */}
          {(nextSql || nextPython) && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                {(sqlAttempted > 0 || pythonAttempted > 0) ? "Retry these next" : "Pick up where you left off"}
              </p>
              {nextSql && (
                <Link
                  href={`/practice/sql/${nextSql.slug}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 hover:border-indigo-700/50 hover:bg-slate-800/50 transition-all group"
                >
                  {nextSqlIsRetry
                    ? <RefreshCw className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-indigo-300 transition-colors truncate">
                      {nextSql.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">SQL</p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${DIFFICULTY_STYLES[nextSql.difficulty]}`}>
                    {nextSql.difficulty.charAt(0) + nextSql.difficulty.slice(1).toLowerCase()}
                  </Badge>
                </Link>
              )}
              {nextPython && (
                <Link
                  href={`/practice/python/${nextPython.slug}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 hover:border-indigo-700/50 hover:bg-slate-800/50 transition-all group"
                >
                  {nextPythonIsRetry
                    ? <RefreshCw className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                    : <ChevronRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-indigo-300 transition-colors truncate">
                      {nextPython.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Python</p>
                  </div>
                  <Badge className={`text-xs flex-shrink-0 ${DIFFICULTY_STYLES[nextPython.difficulty]}`}>
                    {nextPython.difficulty.charAt(0) + nextPython.difficulty.slice(1).toLowerCase()}
                  </Badge>
                </Link>
              )}
            </div>
          )}

          {/* All done state */}
          {!nextSql && !nextPython && hasPracticeActivity && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>You&apos;ve attempted every problem — impressive! Keep marking them Solved.</span>
            </div>
          )}

          {/* Empty state */}
          {!hasPracticeActivity && (
            <p className="text-sm text-slate-500">
              No practice attempts yet.{" "}
              <Link href="/practice/sql" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                Start with SQL
              </Link>
              {" "}or{" "}
              <Link href="/practice/python" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2">
                Python practice
              </Link>.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Learning Progress ──────────────────────────────────────────────── */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            Learning Progress
          </CardTitle>
          <Link
            href="/learn"
            className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall stats */}
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-2xl font-bold text-indigo-400">{totalCompleted}</span>
              <span className="text-slate-500 ml-1">/ {totalModules} articles read</span>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all"
                  style={{ width: `${totalModules > 0 ? (totalCompleted / totalModules) * 100 : 0}%` }}
                />
              </div>
            </div>
            <span className="text-slate-500 text-xs">
              {totalModules > 0 ? Math.round((totalCompleted / totalModules) * 100) : 0}%
            </span>
          </div>

          {/* Quiz progress bar */}
          {quizAnswered > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-2xl font-bold text-indigo-400">{quizCorrect}</span>
                <span className="text-slate-500 ml-1">/ {quizTotal} quiz answers correct</span>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all"
                    style={{ width: `${quizTotal > 0 ? (quizCorrect / quizTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <span className="text-slate-500 text-xs">{quizPct}%</span>
            </div>
          )}

          {/* In-progress paths */}
          {inProgressPaths.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Continue where you left off</p>
              {inProgressPaths.slice(0, 2).map((path) => {
                const completed = path.modules.filter((m) => completedModuleIds.has(m.id)).length;
                const total = path.modules.length;
                const pct = Math.round((completed / total) * 100);
                return (
                  <Link
                    key={path.id}
                    href={`/learn/${path.slug}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 hover:border-indigo-700/50 hover:bg-slate-800/50 transition-all group"
                  >
                    <span className="text-xl">{path.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium group-hover:text-indigo-300 transition-colors truncate">
                        {path.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">{completed}/{total}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}

          {/* Suggested paths for new users */}
          {totalCompleted === 0 && notStartedPaths.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Suggested starting points</p>
              {notStartedPaths.map((path) => (
                <Link
                  key={path.id}
                  href={`/learn/${path.slug}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-800 hover:border-indigo-700/50 hover:bg-slate-800/50 transition-all group"
                >
                  <span className="text-xl">{path.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium group-hover:text-indigo-300 transition-colors truncate">
                      {path.title}
                    </p>
                    <p className="text-xs text-slate-500">{path.modules.length} articles</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {totalCompleted > 0 && inProgressPaths.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>All started paths are complete! Explore more learning paths.</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
