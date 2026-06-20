"use client";

import { useState, useEffect } from "react";
import { Loader2, Clock, Snowflake } from "lucide-react";
import { cn } from "@/lib/cn";
import type { HealthData, HealthState, ServiceChecks } from "@/hooks/useHealth";

interface StartingOverlayProps {
  state: HealthState;
  data: HealthData | null;
}

const checkLabels: Record<keyof ServiceChecks, string> = {
  pinecone: "Vector DB",
  openrouter: "LLM Gateway",
};

export function StartingOverlay({ state, data }: StartingOverlayProps) {
  const [remaining, setRemaining] = useState(() => data?.estimatedReadySec ?? 0);
  const [prevData, setPrevData] = useState(data);

  // Render-time state adjustment (React docs pattern) — syncs remaining to new
  // data without calling setState inside an effect (avoids cascading renders).
  if (data !== prevData) {
    setPrevData(data);
    setRemaining(data?.estimatedReadySec ?? 0);
  }

  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const asleep = state === "inactive" || state === "checking";
  const heading = asleep ? "Waking server" : "Starting services";
  const subtext = asleep
    ? "Render free services sleep after 15 min idle and take ~30s to wake."
    : "Connecting to data sources before the app is ready.";
  const Icon = asleep ? Snowflake : Loader2;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Top status bar */}
      <div className="flex items-center justify-between px-lg md:px-xl h-9 bg-soft-stone/80 dark:bg-cohere-black/40 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-warm-yellow flex-shrink-0 animate-pulse" />
          <span className="font-body text-[11px] leading-none text-ink/70 dark:text-on-dark/70 truncate">
            {asleep ? "Server waking from sleep" : (data?.message ?? "Starting services")}
          </span>
          {!asleep && remaining > 0 && (
            <span className="font-mono text-[10px] text-muted dark:text-muted/60 tabular-nums">
              ~{remaining}s
            </span>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
          <Clock className="w-3 h-3 text-muted dark:text-muted/60" aria-hidden="true" />
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted dark:text-muted/50">
            Render free tier
          </span>
        </div>
      </div>

      {/* Greyed overlay + centered card */}
      <div className="flex-1 flex items-center justify-center bg-canvas/70 dark:bg-primary/70 backdrop-blur-sm p-xl">
        <div className="w-full max-w-sm p-xl rounded-lg bg-canvas dark:bg-cohere-black shadow-sm text-center">
          <Icon
            className={cn("w-6 h-6 mx-auto text-warm-yellow", !asleep && "animate-spin")}
            aria-hidden="true"
          />
          <h2 className="mt-md font-display text-base font-semibold text-ink dark:text-on-dark">
            {heading}
          </h2>
          <p className="mt-1 font-body text-xs text-muted dark:text-muted/70 leading-relaxed">
            {subtext}
          </p>

          {/* ETA timer */}
          {!asleep && (
            <div className="mt-lg">
              <div className="font-mono text-3xl tabular-nums text-ink dark:text-on-dark">
                {remaining}
                <span className="text-base text-muted dark:text-muted/60 ml-0.5">s</span>
              </div>
              <div className="mt-sm h-1 rounded-full overflow-hidden bg-soft-stone dark:bg-white/10">
                <div className="h-full bg-gradient-progress animate-shimmer" />
              </div>
            </div>
          )}

          {/* Service checks (only once server is responding) */}
          {!asleep && data && (
            <div className="mt-lg space-y-1 text-left">
              {(Object.keys(checkLabels) as Array<keyof ServiceChecks>).map((key) => {
                const status = data.checks[key];
                const ready = status === "ok";
                return (
                  <div key={key} className="flex items-center gap-2 py-[2px]">
                    {ready ? (
                      <span className="w-2 h-2 rounded-full bg-deep-green flex-shrink-0" />
                    ) : (
                      <Loader2 className="w-2.5 h-2.5 text-muted animate-spin flex-shrink-0" aria-hidden="true" />
                    )}
                    <span className={cn("font-body text-[11px] flex-1", ready ? "text-ink/60 dark:text-on-dark/60" : "text-muted dark:text-muted/70")}>
                      {checkLabels[key]}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted dark:text-muted/50">
                      {ready ? "ready" : "connecting"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
