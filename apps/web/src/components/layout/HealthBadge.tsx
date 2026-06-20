"use client";

import { cn } from "@/lib/cn";
import type { HealthData } from "@/hooks/useHealth";

interface HealthBadgeProps {
  data: HealthData;
}

function formatUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

export function HealthBadge({ data }: HealthBadgeProps) {
  return (
    <div className="fixed top-md right-lg z-40 select-none">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-sm py-[5px] rounded-pill",
          "bg-soft-stone/50 dark:bg-white/5"
        )}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-deep-green flex-shrink-0" />
        <span className="font-body text-[11px] leading-none text-ink/70 dark:text-on-dark/70">
          Active
        </span>
        <span className="font-mono text-[9px] text-muted dark:text-muted/60 uppercase tracking-wider">
          {formatUptime(data.uptime)}
        </span>
      </div>
    </div>
  );
}
