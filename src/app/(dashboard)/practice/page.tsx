import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArrowRight, Code2, Database } from "lucide-react";

export default async function PracticePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingDone: true },
  });
  if (!profile?.onboardingDone) redirect("/onboarding");

  const [sqlTotal, pythonTotal, sqlAttempts, pythonAttempts] = await Promise.all([
    prisma.practiceQuestion.count({ where: { category: "SQL", isPublished: true } }),
    prisma.practiceQuestion.count({ where: { category: "PYTHON", isPublished: true } }),
    prisma.userQuestionAttempt.findMany({
      where: { userId: session.user.id, question: { category: "SQL" } },
      select: { status: true },
    }),
    prisma.userQuestionAttempt.findMany({
      where: { userId: session.user.id, question: { category: "PYTHON" } },
      select: { status: true },
    }),
  ]);

  const sqlSolved    = sqlAttempts.filter((a) => a.status === "SOLVED").length;
  const pythonSolved = pythonAttempts.filter((a) => a.status === "SOLVED").length;

  const tracks = [
    {
      id:          "sql",
      href:        "/practice/sql",
      icon:        Database,
      label:       "SQL",
      title:       "SQL Practice",
      description: "Window functions, CTEs, aggregations, SCD patterns, and warehouse-specific optimisations — the queries that appear in every data engineering interview.",
      topics:      ["Aggregation & Grouping", "Window Functions", "CTEs & Subqueries", "JOIN Patterns", "Warehouse SQL"],
      total:       sqlTotal,
      solved:      sqlSolved,
      accent:      "indigo",
    },
    {
      id:          "python",
      href:        "/practice/python",
      icon:        Code2,
      label:       "Python",
      title:       "Python Practice",
      description: "Generators, decorators, pandas patterns, ETL building blocks, and the coding patterns that appear in take-home assessments.",
      topics:      ["Data Manipulation", "ETL Patterns", "Generators & Iterators", "Decorators", "Schema Validation"],
      total:       pythonTotal,
      solved:      pythonSolved,
      accent:      "violet",
    },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-10">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Practice</h1>
        <p className="text-base text-white/40 mt-1">
          Write real queries and code. Prove you can apply what you know.
        </p>
      </div>

      {/* SQL / Python — primary split */}
      <div className="grid md:grid-cols-2 gap-5">
        {tracks.map((track) => {
          const Icon  = track.icon;
          const pct   = track.total > 0 ? Math.round((track.solved / track.total) * 100) : 0;
          const isViolet = track.accent === "violet";

          return (
            <Link key={track.id} href={track.href} className="group block">
              <div className={`h-full rounded-2xl border p-7 transition-all duration-150 ${
                isViolet
                  ? "border-violet-500/30 bg-violet-500/[0.04] hover:border-violet-500/50 hover:bg-violet-500/[0.07]"
                  : "border-indigo-500/30 bg-indigo-500/[0.04] hover:border-indigo-500/50 hover:bg-indigo-500/[0.07]"
              }`}>

                {/* Icon + arrow */}
                <div className="flex items-start justify-between mb-5">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${
                    isViolet
                      ? "bg-violet-600/15 border-violet-500/25"
                      : "bg-indigo-600/15 border-indigo-500/25"
                  }`}>
                    <Icon className={`h-6 w-6 ${isViolet ? "text-violet-400" : "text-indigo-400"}`} />
                  </div>
                  <ArrowRight className={`h-5 w-5 mt-1 transition-transform group-hover:translate-x-0.5 ${
                    isViolet ? "text-violet-500/50 group-hover:text-violet-400" : "text-indigo-500/50 group-hover:text-indigo-400"
                  }`} />
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold mb-2 group-hover:text-white transition-colors">
                  {track.title}
                </h2>

                {/* Description */}
                <p className="text-sm text-white/40 leading-relaxed mb-5">
                  {track.description}
                </p>

                {/* Topics */}
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {track.topics.map((t) => (
                    <span
                      key={t}
                      className={`text-xs px-2.5 py-0.5 rounded-full border ${
                        isViolet
                          ? "bg-violet-500/10 border-violet-500/20 text-violet-300/70"
                          : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300/70"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-white/30">
                    <span>{track.solved} of {track.total} solved</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isViolet ? "bg-violet-500" : "bg-indigo-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

              </div>
            </Link>
          );
        })}
      </div>

      {/* How to practice */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-6">
        <h3 className="text-base font-semibold mb-4">How to practice effectively</h3>
        <ol className="space-y-2.5">
          {[
            "Read the problem carefully — identify what it's really asking before writing a single line.",
            "Write your answer first, before revealing any hints or the solution.",
            "Reveal hints one at a time if stuck — don't jump straight to the solution.",
            "After reviewing the solution, mark it Solved or Need Practice and revisit the latter before your interview.",
            "For hard problems, explain your reasoning out loud — interviewers care more about your thought process than perfect syntax.",
          ].map((tip, i) => (
            <li key={i} className="flex gap-3 text-sm text-white/40">
              <span className="text-indigo-400 font-semibold shrink-0">{i + 1}.</span>
              {tip}
            </li>
          ))}
        </ol>
      </div>

    </div>
  );
}
