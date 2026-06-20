"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/cn";

export interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const parts = content.split(/(\[\d+\])/g);

  return (
    <>
      {parts.map((part, index) => {
        const citationMatch = part.match(/^\[(\d+)\]$/);
        if (citationMatch) {
          return (
            <span
              key={index}
              className={cn(
                "mx-[2px] px-xs py-[1px] text-[10px] font-mono font-semibold rounded-xs align-super select-none",
                "bg-hairline text-ink/75",
                "dark:bg-white/10 dark:text-on-dark/75"
              )}
              title="Referenced source below"
            >
              {part}
            </span>
          );
        }
        if (!part) return null;

        return (
          <ReactMarkdown
            key={index}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              p: ({ children }) => (
                <span className="whitespace-pre-wrap">{children}</span>
              ),
            }}
          >
            {part}
          </ReactMarkdown>
        );
      })}
    </>
  );
}
