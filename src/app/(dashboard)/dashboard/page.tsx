import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, TrendingUp, Calendar, BookOpen, ArrowRight, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  // Check onboarding — redirect if not done
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: {
      onboardingDone: true,
      targetCompanies: true,
      interviewDate: true,
      skillLevel: true,
      hoursPerDay: true,
      strengths: true,
      weaknesses: true,
    },
  });

  if (!profile?.onboardingDone) {
    redirect("/onboarding");
  }

  // Fetch learning progress for dashboard
  const allPaths = await prisma.learningPath.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      modules: { where: { isPublished: true }, select: { id: true } },
      userProgress: {
        where: { userId: session.user.id },
        select: { startedAt: true, completedAt: true },
      },
    },
  });

  const completedModules = await prisma.userModuleProgress.findMany({
    where: { userId: session.user.id },
    select: { moduleId: true },
  });
  const completedModuleIds = new Set(completedModules.map((m) => m.moduleId));

  const totalModules = allPaths.reduce((sum, p) => sum + p.modules.length, 0);
  const totalCompleted = completedModuleIds.size;

  // In-progress paths (started but not completed)
  const inProgressPaths = allPaths.filter(
    (p) =>
      p.userProgress.length > 0 &&
      !p.userProgress[0]?.completedAt &&
      p.modules.some((m) => completedModuleIds.has(m.id))
  );

  // Suggested paths (not started yet, up to 3)
  const notStartedPaths = allPaths
    .filter((p) => p.userProgress.length === 0)
    .slice(0, 3);

  const daysUntilInterview = profile.interviewDate
    ? Math.ceil(
        (profile.interviewDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;

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
            <CardTitle className="text-sm font-medium text-slate-400">
              Current Streak
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0 days</div>
            <p className="text-xs text-slate-500">Start practicing to build your streak</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Problems Solved
            </CardTitle>
            <Brain className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-slate-500">Across all topics</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Skill Level
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-slate-400">
              Interview Date
            </CardTitle>
            <Calendar className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            {daysUntilInterview !== null ? (
              <>
                <div className="text-2xl font-bold">{daysUntilInterview} days</div>
                <p className="text-xs text-slate-500">
                  {profile.interviewDate!.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
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
                <Badge
                  key={company}
                  className="bg-indigo-950 text-indigo-300 border-indigo-800"
                >
                  {company}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Progress */}
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
                  style={{
                    width: `${totalModules > 0 ? (totalCompleted / totalModules) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-slate-500 text-xs">
              {totalModules > 0 ? Math.round((totalCompleted / totalModules) * 100) : 0}%
            </span>
          </div>

          {/* In-progress paths */}
          {inProgressPaths.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Continue where you left off</p>
              {inProgressPaths.slice(0, 2).map((path) => {
                const completed = path.modules.filter((m) =>
                  completedModuleIds.has(m.id)
                ).length;
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
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {completed}/{total}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 transition-colors flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}

          {/* Suggested paths */}
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
