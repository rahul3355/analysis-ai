"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type SystemState = "active" | "starting" | "inactive" | "checking";

interface ServiceChecks {
  pinecone: string;
  r2: string;
  bigquery: string;
  openrouter: string;
}

interface HealthData {
  status: "active" | "starting" | "inactive";
  message: string;
  uptime: number;
  estimatedReadySec: number;
  checks: ServiceChecks;
}

export function SystemStatus() {
  const [state, setState] = useState<SystemState>("checking");
  const [message, setMessage] = useState("Checking connection...");
  const [uptime, setUptime] = useState(0);
  const [estimatedReadySec, setEstimatedReadySec] = useState(0);
  const [checks, setChecks] = useState<ServiceChecks | null>(null);
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = async () => {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("Health check failed");
      const data: HealthData = await res.json();

      setState(data.status);
      setMessage(data.message);
      setUptime(data.uptime);
      setEstimatedReadySec(data.estimatedReadySec);
      setChecks(data.checks);

      if (data.status === "starting") {
        setState("starting");
      } else {
        setState("active");
      }
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
    } catch {
      setState("inactive");
      setMessage("Unable to reach server");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { checkHealth(); }, 0);

    intervalRef.current = setInterval(checkHealth, 5000);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const stateColors: Record<SystemState, string> = {
    active: "bg-deep-green",
    starting: "bg-warm-yellow",
    inactive: "bg-coral",
    checking: "bg-muted",
  };

  const stateBg: Record<SystemState, string> = {
    active: "bg-deep-green/10 dark:bg-deep-green/20",
    starting: "bg-warm-yellow/10 dark:bg-warm-yellow/20",
    inactive: "bg-coral/10 dark:bg-coral/20",
    checking: "bg-soft-stone/40 dark:bg-white/5",
  };

  const checkLabels: Record<keyof ServiceChecks, string> = {
    pinecone: "Vector DB",
    r2: "File Storage",
    bigquery: "BigQuery",
    openrouter: "LLM Gateway",
  };

  return (
    <div className={cn("border-b transition-all duration-300", stateBg[state])}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-md md:px-lg py-[6px] cursor-pointer transition-colors duration-150 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              stateColors[state],
              state === "starting" && "animate-pulse"
            )}
          />
          <span className="font-body text-[11px] leading-none text-ink/70 dark:text-on-dark/70">
            {message}
          </span>
          {state === "starting" && (
            <span className="font-body text-[10px] text-muted dark:text-muted tracking-wide">
              ~{Math.max(1, estimatedReadySec - uptime)}s
            </span>
          )}
          {state === "active" && uptime > 0 && (
            <span className="font-mono text-[9px] text-muted dark:text-muted/60 uppercase tracking-wider">
              {uptime < 60 ? `${uptime}s` : `${Math.floor(uptime / 60)}m ${uptime % 60}s`}
            </span>
          )}
        </div>
        <svg
          className={cn(
            "w-3 h-3 text-muted dark:text-muted/60 transition-transform duration-150",
            expanded && "rotate-180"
          )}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && checks && (
        <div className="px-md md:px-lg pb-[6px] grid grid-cols-1 md:grid-cols-2 gap-x-lg gap-y-[3px] animate-fade-in">
          {(Object.keys(checks) as Array<keyof ServiceChecks>).map((key) => {
            const status = checks[key];
            const label = checkLabels[key];
            return (
              <div key={key} className="flex items-center gap-2 py-[2px]">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    status === "ok" ? "bg-deep-green" : status === "degraded" ? "bg-warm-yellow" : "bg-coral"
                  )}
                />
                <span className="font-body text-[10px] text-ink/60 dark:text-on-dark/60">{label}</span>
                <span className="font-mono text-[9px] text-muted dark:text-muted/50 uppercase ml-auto">
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
