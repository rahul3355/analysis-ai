"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/cn";
import { Check, FileText, Database, GitMerge, Ban } from "lucide-react";
import goldenData from "@/data/golden.json";

interface GoldenItem {
  id: string;
  category: string;
  question: string;
  ground_truth: string;
}

const items = (goldenData as { tests: GoldenItem[] }).tests;

const CATEGORIES = [
  { key: "all", label: "All", icon: null },
  { key: "document", label: "Document", icon: FileText, color: "text-action-blue" },
  { key: "bigquery", label: "BigQuery", icon: Database, color: "text-deep-green" },
  { key: "hybrid", label: "Hybrid", icon: GitMerge, color: "text-form-focus" },
  { key: "out_of_scope", label: "Out of Scope", icon: Ban, color: "text-coral" },
] as const;

const categoryDot: Record<string, string> = {
  document: "bg-action-blue",
  bigquery: "bg-deep-green",
  hybrid: "bg-form-focus",
  out_of_scope: "bg-coral",
};

export default function GoldenPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((item) => item.category === activeCategory);
  }, [activeCategory]);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // silently fail if clipboard unavailable
    }
  }, []);

  const handleViewChange = () => {
    router.push("/");
  };

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: items.length };
    for (const item of items) {
      result[item.category] = (result[item.category] || 0) + 1;
    }
    return result;
  }, []);

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-canvas dark:bg-primary transition-colors duration-200">
      <Sidebar currentView="chat" onViewChange={handleViewChange} />

      <main className="flex-1 h-full flex flex-col min-w-0 bg-canvas dark:bg-primary overflow-hidden">
        <div className="px-lg md:px-xl py-lg">
          <h1 className="font-display text-xl font-semibold text-ink dark:text-on-dark">
            Golden Dataset
          </h1>
          <p className="font-body text-sm text-muted mt-0.5">
            {items.length} evaluation cases across 4 categories &mdash; click any case to copy the question
          </p>
        </div>

        <div className="px-lg md:px-xl py-md flex flex-wrap items-center gap-sm">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-md py-[6px] rounded-pill text-sm font-body transition-all duration-150 cursor-pointer",
                  "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue",
                  isActive
                    ? "bg-ink text-on-primary dark:bg-on-dark dark:text-primary"
                    : "bg-soft-stone/50 text-slate hover:bg-soft-stone dark:bg-white/5 dark:text-muted dark:hover:bg-white/10"
                )}
                aria-pressed={isActive}
              >
                {Icon && <Icon className={cn("w-3.5 h-3.5", isActive ? "" : cat.color)} />}
                {cat.label}
                <span className="ml-0.5 text-xs opacity-70">({counts[cat.key]})</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-lg md:px-xl py-md space-y-0.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted gap-1">
              <p className="font-body text-sm">No matching cases</p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => copyToClipboard(item.question, item.id)}
                className="group flex items-start gap-md px-md py-sm rounded-sm cursor-pointer transition-all duration-150 hover:bg-soft-stone/40 dark:hover:bg-white/5 active:bg-soft-stone/60 dark:active:bg-white/10"
              >
                <span className={cn("w-2 h-2 rounded-full shrink-0 mt-[7px]", categoryDot[item.category] || "bg-muted")} />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-ink dark:text-on-dark leading-relaxed">
                    {item.question}
                    {copiedId === item.id ? (
                      <Check className="inline-block ml-1.5 w-3.5 h-3.5 text-deep-green -mt-0.5 align-middle" />
                    ) : (
                      <span className="inline-block ml-1.5 w-3.5 h-3.5 text-muted/0 group-hover:text-muted/40 transition-all duration-150 align-middle text-[11px] leading-none select-none">
                        copy
                      </span>
                    )}
                  </p>
                  <p className="font-body text-sm text-muted leading-relaxed mt-0.5">
                    {item.ground_truth}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-lg md:px-xl py-sm">
          <p className="font-body text-[11px] text-muted/50">
            {filtered.length} of {items.length}
          </p>
        </div>
      </main>
    </div>
  );
}
