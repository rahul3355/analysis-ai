"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { HealthState } from "@/hooks/useHealth";

interface StartingOverlayProps {
  state: HealthState;
}

export function StartingOverlay({ state }: StartingOverlayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Top status bar */}
      <div className="flex items-center px-lg md:px-xl h-9 bg-soft-stone/80 dark:bg-cohere-black/40 backdrop-blur-md flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-warm-yellow flex-shrink-0 animate-pulse" />
        <span className="ml-2 font-body text-[11px] leading-none text-ink/70 dark:text-on-dark/70">
          {state === "checking" ? "Connecting to server..." : "Server waking from sleep"}
        </span>
      </div>

      {/* Greyed overlay + centered card */}
      <div className="flex-1 flex items-center justify-center bg-canvas/70 dark:bg-primary/70 backdrop-blur-sm p-xl">
        <div className="w-full max-w-sm p-xl rounded-lg bg-canvas dark:bg-cohere-black shadow-sm text-center">
          <Loader2 className="w-6 h-6 mx-auto text-warm-yellow animate-spin" aria-hidden="true" />
          <h2 className="mt-md font-display text-base font-semibold text-ink dark:text-on-dark">
            Waking server
          </h2>
          <p className="mt-1 font-body text-xs text-muted dark:text-muted/70 leading-relaxed">
            Render free services sleep after 15 min idle and take ~30s to wake.
          </p>

          <div className="mt-lg">
            <div className="font-mono text-3xl tabular-nums text-ink dark:text-on-dark">
              {elapsed}
              <span className="text-base text-muted dark:text-muted/60 ml-0.5">s</span>
            </div>
            <div className="mt-sm h-1 rounded-full overflow-hidden bg-soft-stone dark:bg-white/10">
              <div className="h-full bg-gradient-progress animate-shimmer" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
