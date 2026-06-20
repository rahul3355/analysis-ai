"use client";

import { cn } from "@/lib/cn";
import { type StreamStage } from "@/lib/sse";

export interface StageInfo {
  key: string;
  label: string;
}

const PIPELINE_STAGES: StageInfo[] = [
  { key: "classifying", label: "Analyzing question" },
  { key: "searching_docs", label: "Searching documents" },
  { key: "querying_bq", label: "Querying database" },
  { key: "generating", label: "Generating answer" },
];

export interface PipelineStatusProps {
  activeStage: StreamStage;
  completedStages: Set<StreamStage>;
  message?: string;
}

function StageIcon({
  isActive,
  isComplete,
  isError,
}: {
  isActive: boolean;
  isComplete: boolean;
  isError: boolean;
}) {
  if (isError) {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-coral/10 dark:bg-coral/20 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-2 h-2 text-coral"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M6 2L10 10H2L6 2Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (isComplete) {
    return (
      <span className="w-3.5 h-3.5 rounded-full bg-deep-green/10 dark:bg-deep-green/20 flex items-center justify-center flex-shrink-0">
        <svg
          className="w-2 h-2 text-deep-green dark:text-deep-green"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M2 6L5 9L10 3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (isActive) {
    return (
      <span className="w-3.5 h-3.5 rounded-full border-2 border-action-blue dark:border-action-blue flex items-center justify-center flex-shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-action-blue dark:bg-action-blue animate-ping" />
      </span>
    );
  }
  return (
    <span className="w-3.5 h-3.5 rounded-full bg-hairline/50 dark:bg-white/10 flex-shrink-0" />
  );
}

export function PipelineStatus({
  activeStage,
  completedStages,
  message,
}: PipelineStatusProps) {
  const isError = activeStage === "error";

  if (isError) {
    return (
      <div className="flex flex-col gap-1.5 py-sm px-sm rounded-sm bg-coral/5 dark:bg-coral/10 border border-coral/20 dark:border-coral/30">
        {PIPELINE_STAGES.map((stage) => {
          const isComplete = completedStages.has(stage.key as StreamStage);
          return (
            <div
              key={stage.key}
              className={cn(
                "flex items-center gap-2 font-body text-[11px] leading-none transition-all duration-150",
                isComplete && "text-slate/40 dark:text-muted/30",
                !isComplete && "text-coral/60 dark:text-coral/50"
              )}
            >
              <StageIcon
                isActive={false}
                isComplete={isComplete}
                isError={!isComplete}
              />
              <span>{stage.label}</span>
            </div>
          );
        })}
        {message && (
          <div className="flex items-center gap-2 mt-1 text-coral dark:text-coral font-body text-[11px]">
            <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-coral" />
            </span>
            <span>{message}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 py-sm px-sm rounded-sm bg-soft-stone/30 dark:bg-white/[0.03] border border-hairline/30 dark:border-white/5">
      {PIPELINE_STAGES.map((stage) => {
        const isActive = stage.key === activeStage;
        const isComplete = completedStages.has(stage.key as StreamStage);
        const isPending = !isActive && !isComplete;

        return (
          <div
            key={stage.key}
            className={cn(
              "flex items-center gap-2 font-body text-[11px] leading-none transition-all duration-150",
              isActive && "text-ink dark:text-on-dark font-medium",
              isComplete && "text-deep-green/70 dark:text-deep-green/60",
              isPending && "text-slate/40 dark:text-muted/30"
            )}
          >
            <StageIcon
              isActive={isActive}
              isComplete={isComplete}
              isError={false}
            />
            <span>{stage.label}</span>
            {isActive && (
              <span className="text-[10px] text-action-blue dark:text-action-blue animate-pulse">
                {message || "..."}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
