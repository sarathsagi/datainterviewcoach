import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArrowLeft, ArrowRight, Clock, BookOpen } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { MarkReadButton } from "./mark-read-button";

interface PageProps {
  params: Promise<{ slug: string; module: string }>;
}

export default async function ModulePage({ params }: PageProps) {
  const { slug: pathSlug, module: moduleSlug } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Load the path + all its modules for prev/next nav
  const path = await prisma.learningPath.findUnique({
    where: { slug: pathSlug, isPublished: true },
    include: {
      modules: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: { id: true, slug: true, title: true, order: true },
      },
    },
  });
  if (!path) notFound();

  // Load the full module content
  const module = await prisma.learningModule.findFirst({
    where: { pathId: path.id, slug: moduleSlug, isPublished: true },
  });
  if (!module) notFound();

  // User progress for this module
  const progress = await prisma.userModuleProgress.findFirst({
    where: { userId: session.user.id, moduleId: module.id },
  });

  // Prev / Next
  const currentIdx = path.modules.findIndex((m) => m.id === module.id);
  const prevModule  = currentIdx > 0 ? path.modules[currentIdx - 1] : null;
  const nextModule  = currentIdx < path.modules.length - 1 ? path.modules[currentIdx + 1] : null;

  return (
    <div className="max-w-3xl mx-auto">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-white/40 mb-8">
        <Link href="/learn" className="hover:text-white transition-colors">Learn</Link>
        <span>/</span>
        <Link href={`/learn/${pathSlug}`} className="hover:text-white transition-colors">{path.title}</Link>
        <span>/</span>
        <span className="text-white/70 truncate">{module.title}</span>
      </div>

      {/* Article header */}
      <div className="mb-10 space-y-4">
        <div className="flex items-center gap-3 text-xs text-white/30">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {path.title}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {module.readTimeMinutes} min read
          </span>
          <span>·</span>
          <span>Article {currentIdx + 1} of {path.modules.length}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{module.title}</h1>
        {module.description && (
          <p className="text-base text-white/50 leading-relaxed">{module.description}</p>
        )}
      </div>

      {/* Article content */}
      {module.content ? (
        <MarkdownRenderer content={module.content} />
      ) : (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-10 text-center text-white/30">
          <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Content coming soon.</p>
        </div>
      )}

      {/* Mark as read + navigation */}
      <div className="mt-14 pt-8 border-t border-white/[0.07] space-y-6">
        <div className="flex justify-center">
          <MarkReadButton
            moduleId={module.id}
            pathId={path.id}
            initialCompleted={!!progress}
          />
        </div>

        {/* Prev / Next */}
        <div className="flex items-center justify-between gap-4">
          {prevModule ? (
            <Link
              href={`/learn/${pathSlug}/${prevModule.slug}`}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors group max-w-[45%]"
            >
              <ArrowLeft className="h-4 w-4 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
              <div className="text-left">
                <div className="text-xs text-white/25 mb-0.5">Previous</div>
                <div className="truncate">{prevModule.title}</div>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {nextModule ? (
            <Link
              href={`/learn/${pathSlug}/${nextModule.slug}`}
              className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors group max-w-[45%] text-right ml-auto"
            >
              <div className="text-right">
                <div className="text-xs text-white/25 mb-0.5">Next</div>
                <div className="truncate">{nextModule.title}</div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <Link
              href={`/learn/${pathSlug}`}
              className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors ml-auto"
            >
              Back to path
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

    </div>
  );
}
