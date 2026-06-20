"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StreamSourcesEvent } from "@/lib/sse";

export interface SourceCardsProps {
  data: StreamSourcesEvent;
}

export function SourceCards({ data }: SourceCardsProps) {
  if (!data.sources || data.sources.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mt-sm mb-xs">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate/60 dark:text-muted/50">
        Found in documents ({data.sources.length})
      </div>
      {data.sources.map((source) => (
        <div
          key={source.id}
          className={cn(
            "flex items-start gap-2 px-2.5 py-2 rounded-xs",
            "bg-pale-green/60 dark:bg-deep-green/10",
            "border-l-2 border-deep-green/40 dark:border-deep-green/40"
          )}
        >
          <FileText className="w-3 h-3 text-slate/50 dark:text-muted/50 flex-shrink-0 mt-[2px]" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium text-ink dark:text-on-dark leading-tight">
                {source.documentName}
              </span>
              {source.relevanceScore !== undefined && (
                <span className="text-[9px] font-mono text-slate/50 dark:text-muted/50">
                  {(source.relevanceScore * 100).toFixed(0)}% match
                </span>
              )}
              {source.pageNumber !== undefined && (
                <span className="text-[9px] font-mono text-slate/40 dark:text-muted/40">
                  p.{source.pageNumber}
                </span>
              )}
            </div>
            <p className="text-[11px] text-body-muted dark:text-muted leading-relaxed mt-0.5 line-clamp-2">
              {'\u201C'}{source.excerpt}{'\u201D'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
