import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import { ModuleCheckbox } from "./module-checkbox";

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-950 text-green-400 border-green-800",
  INTERMEDIATE: "bg-yellow-950 text-yellow-400 border-yellow-800",
  ADVANCED: "bg-red-950 text-red-400 border-red-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  DATA_MODELING: "Data Modeling",
  CDC: "Change Data Capture",
  GCP: "Google Cloud Platform",
  SNOWFLAKE: "Snowflake",
  DATABRICKS: "Databricks",
  CI_CD: "CI/CD",
  DATA_ARCHITECTURE: "Data Architecture",
  SYSTEM_DESIGN: "System Design",
  AI_ENGINEERING: "AI Engineering",
  OPEN_TABLE_FORMATS: "Open Table Formats",
  ESSENTIAL_SKILLS: "Essential Skills",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function LearnPathPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const path = await prisma.learningPath.findUnique({
    where: { slug, isPublished: true },
    include: {
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!path) notFound();

  // Get user's completed modules for this path
  const completedModules = await prisma.userModuleProgress.findMany({
    where: {
      userId: session.user.id,
      moduleId: { in: path.modules.map((m) => m.id) },
    },
    select: { moduleId: true },
  });
  const completedModuleIds = new Set(completedModules.map((m) => m.moduleId));

  const completedCount = completedModuleIds.size;
  const totalCount = path.modules.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalMins = path.modules.reduce((s, m) => s + m.readTimeMinutes, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All Learning Paths
      </Link>

      {/* Path Header */}
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-4xl">{path.icon}</span>
          <div>
            <h1 className="text-2xl font-bold">{path.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={`text-xs ${LEVEL_COLORS[path.level]}`}>
                {path.level.charAt(0) + path.level.slice(1).toLowerCase()}
              </Badge>
              <span className="text-sm text-slate-500">
                {CATEGORY_LABELS[path.category]}
              </span>
            </div>
          </div>
        </div>
        <p className="text-slate-400 leading-relaxed">{path.description}</p>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span>{totalCount} articles</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>~{Math.round(totalMins / 60)}h total read time</span>
          </div>
          {completedCount > 0 && (
            <div className="flex items-center gap-1.5 text-indigo-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{completedCount}/{totalCount} completed</span>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPct === 100 ? "bg-green-500" : "bg-indigo-600"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
          Articles in this path
        </h2>
        {path.modules.map((module, index) => {
          const isCompleted = completedModuleIds.has(module.id);

          return (
            <Card
              key={module.id}
              className={`border transition-colors ${
                isCompleted
                  ? "border-green-900/50 bg-green-950/10"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <CardContent className="py-4 px-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <ModuleCheckbox
                    moduleId={module.id}
                    pathId={path.id}
                    initialCompleted={isCompleted}
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-slate-600 font-mono flex-shrink-0">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <p
                          className={`text-sm font-medium leading-snug ${
                            isCompleted ? "text-slate-400 line-through" : "text-white"
                          }`}
                        >
                          {module.title}
                        </p>
                      </div>
                      {module.mediumUrl && (
                        <a
                          href={module.mediumUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                          title="Read on Medium"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>

                    {module.description && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed ml-6">
                        {module.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 ml-6 text-xs text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{module.readTimeMinutes} min read</span>
                      </div>
                      {isCompleted && (
                        <span className="text-green-500 font-medium">✓ Read</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion message */}
      {progressPct === 100 && (
        <Card className="border-green-800/50 bg-green-950/20">
          <CardContent className="py-5 text-center">
            <div className="text-2xl mb-2">🎉</div>
            <p className="text-green-400 font-medium">Path Complete!</p>
            <p className="text-sm text-slate-400 mt-1">
              You&apos;ve read all {totalCount} articles in this path.
            </p>
            <Link
              href="/learn"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 mt-3 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Explore more paths
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
