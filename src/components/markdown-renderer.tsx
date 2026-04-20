"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert prose-slate max-w-none
      prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-white
      prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-0
      prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-white prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-2
      prose-h3:text-base prose-h3:mt-6 prose-h3:mb-2 prose-h3:text-white/90
      prose-p:text-white/70 prose-p:leading-7 prose-p:my-4
      prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:text-indigo-300
      prose-strong:text-white prose-strong:font-semibold
      prose-code:text-indigo-300 prose-code:bg-white/[0.07] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-white/[0.05] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl prose-pre:p-5 prose-pre:overflow-x-auto
      prose-pre:code:bg-transparent prose-pre:code:p-0 prose-pre:code:text-sm prose-pre:code:text-white/80
      prose-ul:text-white/70 prose-ul:my-4 prose-ul:space-y-1
      prose-ol:text-white/70 prose-ol:my-4 prose-ol:space-y-1
      prose-li:my-0.5 prose-li:leading-7
      prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-500/[0.06] prose-blockquote:rounded-r-lg prose-blockquote:px-5 prose-blockquote:py-1 prose-blockquote:text-white/60 prose-blockquote:not-italic
      prose-table:text-sm prose-table:w-full
      prose-thead:border-b prose-thead:border-white/20
      prose-th:text-white prose-th:font-semibold prose-th:pb-3 prose-th:text-left
      prose-td:text-white/60 prose-td:py-2.5 prose-td:border-b prose-td:border-white/[0.06]
      prose-hr:border-white/10 prose-hr:my-10
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
