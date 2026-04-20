import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, Clock, ChevronRight } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  DATA_MODELING:    "Data Modeling",
  SYSTEM_DESIGN:    "System Design",
  ESSENTIAL_SKILLS: "Misc",
  // legacy (unpublished paths — kept for safety)
  CDC:              "Change Data Capture",
  GCP:              "Google Cloud Platform",
  SNOWFLAKE:        "Snowflake",
  DATABRICKS:       "Databricks",
  CI_CD:            "CI/CD",
  DATA_ARCHITECTURE:"Data Architecture",
  AI_ENGINEERING:   "AI Engineering",
  OPEN_TABLE_FORMATS:"Open Table Formats",
};

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-950 text-green-400 border-green-800",
  INTERMEDIATE: "bg-yellow-950 text-yellow-400 border-yellow-800",
  ADVANCED: "bg-red-950 text-red-400 border-red-800",
};

export default async function LearnPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingDone: true },
  });
  if (!profile?.onboardingDone) redirect("/onboarding");

  // Fetch all published paths with module counts and user progress
  const paths = await prisma.learningPath.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      modules: {
        where: { isPublished: true },
        select: { id: true, readTimeMinutes: true },
      },
      userProgress: {
        where: { userId: session.user.id },
        select: { startedAt: true, completedAt: true },
      },
    },
  });

  // Get all completed modules for this user
  const completedModules = await prisma.userModuleProgress.findMany({
    where: { userId: session.user.id },
    select: { moduleId: true },
  });
  const completedModuleIds = new Set(completedModules.map((m) => m.moduleId));

  const totalModules = paths.reduce((sum, p) => sum + p.modules.length, 0);
  const totalCompleted = completedModuleIds.size;
  const totalMinutes = paths.reduce(
    (sum, p) => sum + p.modules.reduce((s, m) => s + m.readTimeMinutes, 0),
    0
  );
  const completedMinutes = paths.reduce(
    (sum, p) =>
      sum +
      p.modules
        .filter((m) => completedModuleIds.has(m.id))
        .reduce((s, m) => s + m.readTimeMinutes, 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Learning Paths</h1>
        <p className="text-slate-400 mt-1">
          Structured study guides based on real-world data engineering topics. Read each article,
          track your progress, and build deep expertise.
        </p>
      </div>

      {/* Overall Progress */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400">{totalCompleted}</div>
              <div className="text-xs text-slate-500 mt-1">Articles Read</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400">{totalModules}</div>
              <div className="text-xs text-slate-500 mt-1">Total Articles</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400">
                {Math.round(completedMinutes / 60)}h
              </div>
              <div className="text-xs text-slate-500 mt-1">Time Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400">
                {Math.round(totalMinutes / 60)}h
              </div>
              <div className="text-xs text-slate-500 mt-1">Total Content</div>
            </div>
          </div>
          {/* Overall progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Overall progress</span>
              <span>
                {totalModules > 0 ? Math.round((totalCompleted / totalModules) * 100) : 0}%
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{
                  width: `${totalModules > 0 ? (totalCompleted / totalModules) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Paths Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paths.map((path) => {
          const completedInPath = path.modules.filter((m) =>
            completedModuleIds.has(m.id)
          ).length;
          const totalInPath = path.modules.length;
          const progressPct =
            totalInPath > 0 ? Math.round((completedInPath / totalInPath) * 100) : 0;
          const totalMins = path.modules.reduce((s, m) => s + m.readTimeMinutes, 0);
          const isStarted = path.userProgress.length > 0;
          const isCompleted = path.userProgress[0]?.completedAt != null;

          return (
            <Link key={path.id} href={`/learn/${path.slug}`} className="block group">
              <Card className="border-slate-800 bg-slate-900/50 hover:border-indigo-700/50 hover:bg-slate-900 transition-all h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-2xl flex-shrink-0">{path.icon}</span>
                      <div className="min-w-0">
                        <CardTitle className="text-base leading-tight group-hover:text-indigo-300 transition-colors">
                          {path.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge className={`text-xs ${LEVEL_COLORS[path.level]}`}>
                            {path.level.charAt(0) + path.level.slice(1).toLowerCase()}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {CATEGORY_LABELS[path.category]}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5 group-hover:text-indigo-400 transition-colors" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                    {path.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{totalInPath} articles</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>~{Math.round(totalMins / 60)}h read time</span>
                    </div>
                    {isStarted && (
                      <span className="text-indigo-400 font-medium">
                        {completedInPath}/{totalInPath} done
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCompleted ? "bg-green-500" : "bg-indigo-600"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    {isStarted && !isCompleted && (
                      <p className="text-xs text-slate-500 mt-1">{progressPct}% complete</p>
                    )}
                    {!isStarted && (
                      <p className="text-xs text-slate-600 mt-1">Not started</p>
                    )}
                    {isCompleted && (
                      <p className="text-xs text-green-400 mt-1">Completed ✓</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
