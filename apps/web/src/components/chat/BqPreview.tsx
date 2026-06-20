"use client";

import { useState } from "react";
import { Database, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StreamBqResultEvent } from "@/lib/sse";

export interface BqPreviewProps {
  data: StreamBqResultEvent;
}

export function BqPreview({ data }: BqPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-sm mb-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 w-full px-2.5 py-2 rounded-xs text-left",
          "bg-pale-blue/60 dark:bg-dark-navy/30",
          "border-l-2 border-action-blue/40 dark:border-action-blue/30",
          "cursor-pointer transition-colors select-none",
          "hover:bg-pale-blue dark:hover:bg-dark-navy/40",
          "focus:outline-hidden focus-visible:ring-1 focus-visible:ring-focus-blue"
        )}
        aria-expanded={isOpen}
      >
        <Database className="w-3 h-3 text-action-blue/70 dark:text-action-blue/60 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium text-ink dark:text-on-dark leading-tight">
            Database Query
          </div>
          <div className="text-[10px] text-slate/60 dark:text-muted/60 mt-0.5">
            {data.rowCount} row{data.rowCount !== 1 ? "s" : ""} returned
            {data.latencyMs ? ` in ${data.latencyMs}ms` : ""}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-3 h-3 text-slate/40 dark:text-muted/40 flex-shrink-0 transition-transform duration-150",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="mt-1 ml-1 px-2.5 py-2 rounded-xs bg-canvas dark:bg-primary border border-hairline/30 dark:border-white/5 animate-fade-in">
          <div className="text-[9px] font-mono uppercase tracking-wider text-action-blue dark:text-action-blue/70 mb-1">
            SQL Query
          </div>
          <pre className="font-mono text-[10px] text-ink/80 dark:text-on-dark/70 whitespace-pre-wrap break-all leading-relaxed">
            {data.sql}
          </pre>

          {data.previewRows && data.previewRows.length > 0 && (
            <>
              <div className="text-[9px] font-mono uppercase tracking-wider text-slate/50 dark:text-muted/50 mt-2 mb-1">
                Preview ({data.previewRows.length} rows)
              </div>
              <div className="flex flex-col gap-1">
                {data.previewRows.map((row, i) => (
                  <div
                    key={i}
                    className="text-[10px] font-mono text-body-muted dark:text-muted leading-relaxed bg-canvas dark:bg-white/[0.02] px-1.5 py-1 rounded-xs"
                  >
                    {Object.entries(row)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ")}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
