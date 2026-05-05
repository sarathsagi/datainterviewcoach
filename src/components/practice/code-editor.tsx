"use client";

/**
 * CodeEditor — textarea-shaped wrapper with syntax highlighting.
 *
 * Built on react-simple-code-editor + Prism. The component renders a real
 * textarea underneath (so selection, paste, IME, screen readers all work),
 * and a Prism-highlighted <pre> overlay rendered to match exactly. The
 * library does the alignment math — we just provide language-specific
 * highlighting via Prism.
 *
 * Why not Monaco / CodeMirror:
 *   - Monaco is ~500 KB, more editor than we need for a practice problem.
 *   - CodeMirror 6 is ~80 KB but adds line numbers, gutter, autocomplete —
 *     worth it eventually but overkill for v1.
 *   - This stack is ~13 KB total and degrades gracefully (textarea remains
 *     functional even if Prism somehow fails to load).
 *
 * Languages supported: sql, python. Adding more is one Prism import +
 * a key in LANGUAGE_GRAMMAR.
 */

import { useMemo } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
// Prism core has no language grammars by default — import each one we use.
// Each import registers itself onto Prism.languages.<name>.
import "prismjs/components/prism-sql";
import "prismjs/components/prism-python";

export type CodeLanguage = "sql" | "python";

interface Props {
  value: string;
  onChange: (next: string) => void;
  language: CodeLanguage;
  placeholder?: string;
  disabled?: boolean;
  /** Min height in px — editor grows with content. */
  minHeight?: number;
}

/**
 * Map our language identifier to the Prism grammar object. Prism imports
 * register themselves globally; we just look them up by key here.
 */
const LANGUAGE_GRAMMAR: Record<CodeLanguage, Prism.Grammar> = {
  sql: Prism.languages.sql,
  python: Prism.languages.python,
};

export function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  disabled,
  minHeight = 200,
}: Props) {
  // Memoize the highlight function — react-simple-code-editor calls it on
  // every keystroke, so we want to avoid re-creating it. The grammar
  // lookup is constant per `language`.
  const highlight = useMemo(() => {
    const grammar = LANGUAGE_GRAMMAR[language];
    return (code: string) => Prism.highlight(code, grammar, language);
  }, [language]);

  return (
    <div
      className={`rounded-md border border-border bg-muted/30 font-mono text-sm leading-relaxed overflow-hidden focus-within:ring-2 focus-within:ring-brand/30 ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      }`}
    >
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={highlight}
        padding={12}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        // The editor renders a `textarea` and `pre` stacked. We force them
        // to share font + line-height via the `style` so highlighting
        // aligns perfectly with the cursor position.
        style={{
          minHeight,
          fontFamily:
            'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: 13,
          lineHeight: 1.6,
        }}
        textareaClassName="practice-code-editor-textarea"
        preClassName="practice-code-editor-pre"
      />
    </div>
  );
}
