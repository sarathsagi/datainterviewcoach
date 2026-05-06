import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePageSession } from "@/lib/auth/require-page-session";
import { Fragment } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, Clock, ArrowRight, Lock } from "lucide-react";

// ─── Track definitions ────────────────────────────────────────────────────────
// Display metadata for every `ContentCategory` enum value the schema supports.
// We render a track for every category that has ≥1 published path — so adding
// a new enum value only requires a single entry below, not a page rewrite.
//
// Order matters: the array order is the on-page order. Group "core skills"
// first, then specializations, then meta/tools so beginners see the right
// progression and advanced users find their specialty.
const TRACK_META: { category: string; title: string; icon: string; description: string }[] = [
  // ── 1. The "start here" foundational track. Beginners read this first;
  //       experienced users skim. Everything else assumes this content. ──
  {
    category: "DATA_ENGINEERING_FUNDAMENTALS",
    title: "Data Engineering Fundamentals",
    icon: "🎓",
    description:
      "Start here. The mental models every DE interview probes — file formats, OLTP vs OLAP, batch vs streaming, idempotency, and the distributed-systems primer that makes every later track click.",
  },
  // ── 2. Day-one technical skills. SQL and Python are themselves
  //       "fundamentals," but each is big enough to warrant its own track. ──
  {
    category: "ESSENTIAL_SKILLS",
    title: "SQL & Python for Interviews",
    icon: "🔧",
    description:
      "The two languages every DE interview leans on. SQL deep dive (joins, windows, optimization) plus Python for DE (data structures, generators, async, pandas/PySpark).",
  },
  // ── 3+. Specialty tracks, ordered roughly by how foundational they are. ──
  {
    category: "DATA_MODELING",
    title: "Data Modeling",
    icon: "📐",
    description:
      "Master dimensional modeling from first principles to FAANG-level exercises.",
  },
  {
    category: "DATA_ARCHITECTURE",
    title: "Data Architecture",
    icon: "🏛️",
    description:
      "Lakehouses, medallion architecture, batch vs streaming, and the patterns that scale.",
  },
  {
    category: "SYSTEM_DESIGN",
    title: "Data Engineering System Design",
    icon: "🏗️",
    description:
      "From ELT fundamentals and tool deep-dives to complete end-to-end system designs.",
  },
  {
    category: "STREAMING",
    title: "Streaming Systems",
    icon: "⚡",
    description:
      "Kafka, Flink, watermarks, exactly-once semantics — the streaming concepts interviewers actually probe.",
  },
  {
    category: "CDC",
    title: "Change Data Capture",
    icon: "🔄",
    description:
      "Log-based CDC, ordering guarantees, schema evolution — patterns that show up in every modern pipeline.",
  },
  {
    category: "ORCHESTRATION",
    title: "Orchestration",
    icon: "🎼",
    description:
      "Airflow, dbt, and the orchestration patterns that make the difference between a brittle and a bulletproof pipeline.",
  },
  {
    category: "OPEN_TABLE_FORMATS",
    title: "Open Table Formats",
    icon: "📦",
    description:
      "Iceberg, Delta, and Hudi — the formats powering the modern lakehouse and the trade-offs between them.",
  },
  {
    category: "SNOWFLAKE",
    title: "Snowflake",
    icon: "❄️",
    description:
      "Snowflake-specific architecture, performance tuning, and cost patterns.",
  },
  {
    category: "DATABRICKS",
    title: "Databricks",
    icon: "🔥",
    description:
      "Databricks lakehouse architecture, Photon, Unity Catalog, and platform-specific interview material.",
  },
  {
    category: "GCP",
    title: "GCP Data Engineering",
    icon: "☁️",
    description:
      "BigQuery, Dataflow, Pub/Sub, and the GCP-native patterns asked in Google interviews.",
  },
  {
    category: "AI_ENGINEERING",
    title: "AI Engineering",
    icon: "🤖",
    description:
      "Vector stores, RAG pipelines, and the AI-engineering concepts that increasingly appear in DE loops.",
  },
  {
    category: "CI_CD",
    title: "CI/CD for Data",
    icon: "🚦",
    description:
      "Pipeline testing, data quality gates, and the deployment patterns that separate junior from senior engineers.",
  },
  // ── Last. Career, communication, and cross-cutting content that
  //       doesn't fit a technical specialty. ──
  {
    category: "MISC",
    title: "Misc Data Engineering",
    icon: "🎯",
    description:
      "Behavioral interviews, resume + portfolio, salary negotiation, and the cross-cutting career skills that decide whether you get the offer.",
  },
];

// Level display order
const LEVEL_ORDER: Record<string, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
};

const LEVEL_BADGE: Record<string, string> = {
  BEGINNER:     "bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 border border-green-300 dark:border-green-800",
  INTERMEDIATE: "bg-amber-50 dark:bg-yellow-950 text-amber-600 dark:text-yellow-400 border border-amber-300 dark:border-yellow-800",
  ADVANCED:     "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800",
};

const LEVEL_PROGRESS_COLOR: Record<string, string> = {
  BEGINNER:     "bg-green-500",
  INTERMEDIATE: "bg-yellow-500",
  ADVANCED:     "bg-red-500",
};

const LEVEL_CARD_ACCENT: Record<string, string> = {
  BEGINNER:     "hover:border-green-700/60",
  INTERMEDIATE: "hover:border-yellow-700/60",
  ADVANCED:     "hover:border-red-700/60",
};

// Strip "Category — " prefix for compact card titles
function shortTitle(title: string): string {
  const parts = title.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : title;
}

export default async function LearnPage() {
  const { session } = await requirePageSession();

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingDone: true },
  });
  if (!profile?.onboardingDone) redirect("/onboarding");

  // Fetch all published paths with modules + user progress
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

  // Completed module IDs for this user
  const completedModules = await prisma.userModuleProgress.findMany({
    where: { userId: session.user.id },
    select: { moduleId: true },
  });
  const completedIds = new Set(completedModules.map((m) => m.moduleId));

  // Overall stats
  const totalModules = paths.reduce((s, p) => s + p.modules.length, 0);
  const totalCompleted = completedIds.size;
  const totalMinutes = paths.reduce(
    (s, p) => s + p.modules.reduce((m, mod) => m + mod.readTimeMinutes, 0),
    0
  );
  const completedMinutes = paths.reduce(
    (s, p) =>
      s +
      p.modules
        .filter((m) => completedIds.has(m.id))
        .reduce((m, mod) => m + mod.readTimeMinutes, 0),
    0
  );

  // Group paths by category
  const pathsByCategory: Record<string, typeof paths> = {};
  for (const path of paths) {
    if (!pathsByCategory[path.category]) pathsByCategory[path.category] = [];
    pathsByCategory[path.category].push(path);
  }
  // Sort each group by level order
  for (const cat of Object.keys(pathsByCategory)) {
    pathsByCategory[cat].sort(
      (a, b) => (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99)
    );
  }

  const overallPct =
    totalModules > 0 ? Math.round((totalCompleted / totalModules) * 100) : 0;

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <div>
        <h1 className="text-3xl font-bold">Learning Paths</h1>
        <p className="text-muted-foreground mt-1">
          Tracks across every concept your interviews will probe — fundamentals,
          architecture, streaming, the major cloud platforms, and the patterns
          unique to senior loops. Read, track progress, and arrive ready.
        </p>
      </div>

      {/* ── Overall Progress ── */}
      <Card className="border-border bg-muted/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand">
                {totalCompleted}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Articles Read</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-brand">
                {totalModules}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Total Articles</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-brand">
                {Math.round(completedMinutes / 60)}h
              </div>
              <div className="text-xs text-muted-foreground mt-1">Time Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-brand">
                {Math.round(totalMinutes / 60)}h
              </div>
              <div className="text-xs text-muted-foreground mt-1">Total Content</div>
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Overall progress</span>
            <span>{overallPct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Tracks ── */}
      {TRACK_META.map((track) => {
        const trackPaths = pathsByCategory[track.category] ?? [];
        if (trackPaths.length === 0) return null;

        // Track-level stats
        const trackCompleted = trackPaths.reduce(
          (s, p) => s + p.modules.filter((m) => completedIds.has(m.id)).length,
          0
        );
        const trackTotal = trackPaths.reduce(
          (s, p) => s + p.modules.length,
          0
        );
        const trackPct =
          trackTotal > 0 ? Math.round((trackCompleted / trackTotal) * 100) : 0;

        return (
          <div key={track.category} className="space-y-4">
            {/* Track header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{track.icon}</span>
                <div>
                  <h2 className="text-xl font-semibold">{track.title}</h2>
                  <p className="text-sm text-muted-foreground">{track.description}</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                <span>{trackCompleted}/{trackTotal} articles</span>
                <span>·</span>
                <span>{trackPct}% complete</span>
              </div>
            </div>

            {/* Path cards — horizontal track with arrows between them */}
            <div className="flex flex-col md:flex-row md:items-stretch gap-2">
              {trackPaths.map((path, idx) => {
                const completedInPath = path.modules.filter((m) =>
                  completedIds.has(m.id)
                ).length;
                const totalInPath = path.modules.length;
                const pct =
                  totalInPath > 0
                    ? Math.round((completedInPath / totalInPath) * 100)
                    : 0;
                const totalMins = path.modules.reduce(
                  (s, m) => s + m.readTimeMinutes,
                  0
                );
                const isStarted = path.userProgress.length > 0;
                const isCompleted = !!path.userProgress[0]?.completedAt;
                // "Suggested" dim — previous tier has 0% complete (not a hard lock)
                const prevTierPct =
                  idx > 0
                    ? (() => {
                        const prev = pathsByCategory[track.category][idx - 1];
                        const prevDone = prev.modules.filter((m) =>
                          completedIds.has(m.id)
                        ).length;
                        return prev.modules.length > 0
                          ? prevDone / prev.modules.length
                          : 1;
                      })()
                    : 1;
                const isLocked = idx > 0 && prevTierPct === 0;

                const cardContent = (
                  <Card
                    className={`
                      border-border bg-muted/50 transition-all h-full
                      ${isLocked ? "opacity-60" : `group ${LEVEL_CARD_ACCENT[path.level]}`}
                      ${isCompleted ? "border-green-800/40" : ""}
                    `}
                  >
                    <CardContent className="pt-5 pb-5 space-y-3">
                      {/* Badge + icons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${LEVEL_BADGE[path.level]}`}>
                          {path.level.charAt(0) +
                            path.level.slice(1).toLowerCase()}
                        </Badge>
                        {isCompleted && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        )}
                        {isLocked && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />
                        )}
                      </div>

                      {/* Title */}
                      <h3
                        className={`font-semibold text-sm leading-snug ${
                          isLocked
                            ? "text-muted-foreground"
                            : "text-foreground group-hover:text-brand/80 transition-colors"
                        }`}
                      >
                        {shortTitle(path.title)}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {path.description}
                      </p>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {totalInPath} articles
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          ~{Math.round(totalMins / 60)}h
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isCompleted
                                ? "bg-green-500"
                                : LEVEL_PROGRESS_COLOR[path.level]
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs">
                          {isCompleted && (
                            <span className="text-green-600 dark:text-green-400">Completed ✓</span>
                          )}
                          {!isCompleted && isStarted && (
                            <span className="text-muted-foreground">
                              {completedInPath}/{totalInPath} done · {pct}%
                            </span>
                          )}
                          {!isStarted && !isLocked && (
                            <span className="text-muted-foreground/60">Not started</span>
                          )}
                          {isLocked && (
                            <span className="text-muted-foreground/60">
                              Suggested: start with the previous tier
                            </span>
                          )}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );

                return (
                  <Fragment key={path.id}>
                    {/* Arrow between cards (desktop only) */}
                    {idx > 0 && (
                      <div className="hidden md:flex items-center justify-center flex-shrink-0 text-muted-foreground">
                        <ArrowRight className="h-5 w-5" />
                      </div>
                    )}

                    {/* Card — always clickable, locked just dims as a hint */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/learn/${path.slug}`} className="block h-full">
                        {cardContent}
                      </Link>
                    </div>
                  </Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
