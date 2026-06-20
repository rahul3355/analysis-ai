"use client";

import { cn } from "@/lib/cn";

export function HealthBadge() {
  return (
    <div className="fixed top-md left-lg z-40 select-none pointer-events-none">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-sm py-[5px] rounded-pill",
          "bg-soft-stone/50 dark:bg-white/5"
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-deep-green flex-shrink-0" />
        <span className="font-body text-[11px] leading-none text-ink/70 dark:text-on-dark/70">
          System Active
        </span>
      </div>
    </div>
  );
}
