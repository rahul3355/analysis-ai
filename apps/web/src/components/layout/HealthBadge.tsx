"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { HealthData, ServiceChecks } from "@/hooks/useHealth";

interface HealthBadgeProps {
  data: HealthData;
}

const checkLabels: Record<keyof ServiceChecks, string> = {
  pinecone: "Vector DB",
  r2: "File Storage",
  bigquery: "BigQuery",
  openrouter: "LLM Gateway",
};

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

export function HealthBadge({ data }: HealthBadgeProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-md right-lg z-40 select-none">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 px-sm py-[5px] rounded-pill transition-all duration-150 cursor-pointer",
          "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue",
          "bg-soft-stone/50 hover:bg-soft-stone/70 dark:bg-white/5 dark:hover:bg-white/10"
        )}
        aria-expanded={open}
        aria-label="System status — active"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-deep-green flex-shrink-0" />
        <span className="font-body text-[11px] leading-none text-ink/70 dark:text-on-dark/70">
          Active
        </span>
        <span className="font-mono text-[9px] text-muted dark:text-muted/60 uppercase tracking-wider">
          {formatUptime(data.uptime)}
        </span>
        <ChevronDown
          className={cn("w-3 h-3 text-muted transition-transform duration-150", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 p-sm rounded-sm bg-canvas dark:bg-cohere-black animate-fade-in shadow-sm">
          {(Object.keys(checkLabels) as Array<keyof ServiceChecks>).map((key) => {
            const status = data.checks[key];
            return (
              <div key={key} className="flex items-center gap-1.5 py-[3px]">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    status === "ok" ? "bg-deep-green" : status === "degraded" ? "bg-warm-yellow" : "bg-coral"
                  )}
                />
                <span className="font-body text-[10px] text-ink/60 dark:text-on-dark/60 flex-1">
                  {checkLabels[key]}
                </span>
                {status === "ok" && <Check className="w-2.5 h-2.5 text-deep-green" aria-hidden="true" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
