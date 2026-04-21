"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
}

let mermaidLoaded = false;

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);
  const id = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;

        if (!mermaidLoaded) {
          mermaid.initialize({
            startOnLoad: false,
            theme: "dark",
            themeVariables: {
              background: "transparent",
              primaryColor: "#312e81",
              primaryTextColor: "#e0e7ff",
              primaryBorderColor: "#4f46e5",
              lineColor: "#6366f1",
              secondaryColor: "#1e1b4b",
              tertiaryColor: "#111116",
              edgeLabelBackground: "#111116",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
              fontSize: "14px",
            },
          });
          mermaidLoaded = true;
        }

        const { svg } = await mermaid.render(id.current, chart);
        setSvg(svg);
      } catch {
        setError(true);
      }
    }

    render();
  }, [chart]);

  if (error) {
    return (
      <pre className="text-xs text-red-400 bg-white/[0.03] border border-red-500/20 rounded-xl p-4 overflow-x-auto">
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="h-32 rounded-xl bg-white/[0.03] border border-white/[0.08] animate-pulse" />
    );
  }

  return (
    <div
      ref={ref}
      className="my-6 flex justify-center overflow-x-auto rounded-xl bg-white/[0.02] border border-white/[0.07] p-6"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
