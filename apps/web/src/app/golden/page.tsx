"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { cn } from "@/lib/cn";
import {
  Check, FileText, Database, GitMerge, Ban, Download, BookOpen,
  Brain, Search, Route, Workflow, ArrowRight, ArrowDown, Table2,
  Layers
} from "lucide-react";
import goldenData from "@/data/golden.json";
import { BQ_TABLE_SCHEMAS } from "@/server/config/bigquery";
import type { TableSchema } from "@/server/config/bigquery";

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

const TABS = [
  { key: "qa", label: "Questions & Answers", icon: BookOpen },
  { key: "data", label: "Data", icon: Database },
  { key: "impl", label: "Implementation", icon: Workflow },
] as const;

const DOCS = [
  { name: "FY2027 Annual Sales Plan", file: "fy2027_annual_sales_plan.pdf" },
  { name: "Nike Framework Agreement 2026", file: "nike_framework_agreement_2026.pdf" },
  { name: "Back to School 2026 Campaign Brief", file: "back_to_school_2026_campaign_brief.pdf" },
  { name: "Q3 2026 Regional Performance Review", file: "q3_2026_regional_performance_review.pdf" },
  { name: "Running Footwear Category Deep Dive H1 2026", file: "running_footwear_category_deep_dive_h1_2026.pdf" },
];

const TABLES: Array<TableSchema & { color: string; icon: typeof Table2 }> = [
  { ...BQ_TABLE_SCHEMAS[0], color: "bg-action-blue", icon: Table2 },
  { ...BQ_TABLE_SCHEMAS[1], color: "bg-deep-green", icon: Table2 },
  { ...BQ_TABLE_SCHEMAS[2], color: "bg-form-focus", icon: Table2 },
  { ...BQ_TABLE_SCHEMAS[3], color: "bg-coral", icon: Table2 },
  { ...BQ_TABLE_SCHEMAS[4], color: "bg-warm-yellow", icon: Table2 },
  { ...BQ_TABLE_SCHEMAS[5], color: "bg-muted", icon: Table2 },
];

const IMPL_STEPS = [
  {
    icon: Search,
    label: "Intent Classification",
    detail: "User question is classified into DOCUMENT, DATABASE, HYBRID, or UNKNOWN using an LLM classifier. This determines which data sources to query.",
  },
  {
    icon: Layers,
    label: "Document Retrieval (RAG)",
    detail: "For DOCUMENT or HYBRID intents, the question is embedded and searched against vectorised document chunks in Pinecone. Results are re-ranked by relevance score.",
  },
  {
    icon: Database,
    label: "BigQuery Query Generation",
    detail: "For DATABASE or HYBRID intents, an LLM generates a SQL query from the natural language question using the schema definition. The query is validated and executed against BigQuery.",
  },
  {
    icon: Route,
    label: "Context Assembly",
    detail: "Retrieved document chunks and/or BigQuery results are combined into a single context block with source indices for citation tracking.",
  },
  {
    icon: Brain,
    label: "Answer Generation",
    detail: "The context is fed as system prompt to an LLM (OpenRouter) which generates the final answer with inline citations like [1], [2]. Citations point back to document excerpts or the BigQuery SQL query.",
  },
];

export default function GoldenPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("qa");
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
        <div className="px-lg md:px-xl py-lg flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink dark:text-on-dark">
              Golden Dataset
            </h1>
            <p className="font-body text-sm text-muted mt-0.5">
              {items.length} evaluation cases across 4 categories
            </p>
          </div>
        </div>

        <div className="px-lg md:px-xl pb-md flex gap-1.5 border-b border-hairline dark:border-white/10">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-md py-[7px] rounded-sm text-sm font-body transition-all duration-150 cursor-pointer -mb-px",
                  "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue",
                  isActive
                    ? "bg-soft-stone/50 text-ink dark:bg-white/10 dark:text-on-dark font-medium"
                    : "text-slate hover:text-ink dark:text-muted dark:hover:text-on-dark"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Q&A Tab ── */}
        {activeTab === "qa" && (
          <>
            <div className="px-lg md:px-xl py-md flex flex-wrap items-center gap-sm border-b border-hairline dark:border-white/10">
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
          </>
        )}

        {/* ── Data Tab ── */}
        {activeTab === "data" && (
          <div className="flex-1 overflow-y-auto px-lg md:px-xl py-md space-y-xl">
            {/* Source Documents */}
            <section>
              <h2 className="font-display text-base font-semibold text-ink dark:text-on-dark mb-md flex items-center gap-2">
                <FileText className="w-4 h-4 text-action-blue" />
                Source Documents
              </h2>

              <div className="space-y-1">
                {DOCS.map((doc) => (
                  <a
                    key={doc.file}
                    href={`/mock-docs/${doc.file}`}
                    download
                    className="group flex items-center gap-md px-md py-sm rounded-sm transition-all duration-150 hover:bg-soft-stone/40 dark:hover:bg-white/5 active:bg-soft-stone/60 dark:active:bg-white/10"
                  >
                    <FileText className="w-4 h-4 text-muted shrink-0" />
                    <span className="flex-1 font-body text-sm text-ink dark:text-on-dark">{doc.name}</span>
                    <Download className="w-3.5 h-3.5 text-muted/0 group-hover:text-muted/60 transition-all duration-150 shrink-0" />
                  </a>
                ))}
              </div>
            </section>

            {/* BigQuery Schema */}
            <section>
              <h2 className="font-display text-base font-semibold text-ink dark:text-on-dark mb-md flex items-center gap-2">
                <Database className="w-4 h-4 text-deep-green" />
                BigQuery Schema
              </h2>
              <p className="font-body text-sm text-muted mb-md">
                Dataset <span className="font-mono text-xs bg-soft-stone/50 dark:bg-white/10 px-1.5 py-0.5 rounded-sm">jd_sports</span>
              </p>



              {/* Table Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {TABLES.map((table) => {
                  return (
                    <div
                      key={table.table}
                      className="rounded-sm border border-hairline dark:border-white/10 bg-canvas dark:bg-primary transition-all duration-150"
                    >
                      <div className="flex items-center gap-md px-md py-sm">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", table.color)} />
                        <span className="font-mono text-sm font-medium text-ink dark:text-on-dark">{table.table}</span>
                        <span className="text-muted text-xs font-body ml-1">{table.columns.length} columns</span>
                      </div>

                      <div className="px-md pb-sm space-y-0.5 animate-fade-in">
                          <div className="grid grid-cols-[1fr_auto] gap-x-md gap-y-0.5 pt-1">
                            {table.columns.map((col) => (
                              <div key={col.name} className="col-span-2 flex items-baseline gap-2 py-[2px]">
                                <span className="font-mono text-[12px] text-ink dark:text-on-dark">{col.name}</span>
                                <span className="font-mono text-[10px] text-muted/60">{col.type}</span>
                                <span className="font-body text-[11px] text-muted ml-auto text-right truncate">{col.description}</span>
                              </div>
                            ))}
                          </div>
                          {table.joins.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-hairline dark:border-white/10 space-y-0.5">
                              <span className="font-body text-[10px] text-muted uppercase tracking-wider">Joins</span>
                              {table.joins.map((join, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-[11px] font-body text-muted">
                                  <ArrowRight className="w-2.5 h-2.5 text-action-blue shrink-0" />
                                  <span className="font-mono">{table.table}.{join.via}</span>
                                  <span className="text-muted/50">→</span>
                                  <span className="font-mono">{join.to}.{join.via}</span>
                                  <span className="text-muted/40">({join.type})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* ── Implementation Tab ── */}
        {activeTab === "impl" && (
          <div className="flex-1 overflow-y-auto px-lg md:px-xl py-md space-y-xl">
            {/* Pipeline Flow */}
            <section>
              <h2 className="font-display text-base font-semibold text-ink dark:text-on-dark mb-md flex items-center gap-2">
                <Route className="w-4 h-4 text-form-focus" />
                Answer Pipeline
              </h2>
              <p className="font-body text-sm text-muted mb-md">
                How a user question flows through the system to produce a grounded answer with citations.
              </p>
              <div className="space-y-0">
                {IMPL_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex gap-md group">
                      <div className="flex flex-col items-center w-6 shrink-0">
                        <div className="w-6 h-6 rounded-full bg-soft-stone/50 dark:bg-white/10 flex items-center justify-center transition-colors duration-150 group-hover:bg-soft-stone dark:group-hover:bg-white/20">
                          <Icon className="w-3 h-3 text-muted" />
                        </div>
                        {i < IMPL_STEPS.length - 1 && (
                          <div className="w-px flex-1 bg-hairline dark:bg-white/10 my-1" />
                        )}
                      </div>
                      <div className={cn("pb-lg", i === IMPL_STEPS.length - 1 && "pb-0")}>
                        <h3 className="font-body text-sm font-medium text-ink dark:text-on-dark">{step.label}</h3>
                        <p className="font-body text-sm text-muted mt-0.5 leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Artifacts */}
            <section>
              <h2 className="font-display text-base font-semibold text-ink dark:text-on-dark mb-md flex items-center gap-2">
                <Layers className="w-4 h-4 text-coral" />
                Key Artifacts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                {[
                  { title: "Intent Classifier", file: "core/pipeline/classifier.ts", desc: "LLM-based intent classifier that routes questions to DOCUMENT, DATABASE, HYBRID, or UNKNOWN paths." },
                  { title: "Orchestrator", file: "core/pipeline/orchestrator.ts", desc: "Central orchestration logic: coordinates RAG retrieval, BigQuery execution, context assembly, and answer generation with citations." },
                  { title: "Document Pipeline (RAG)", file: "core/pipeline/pipeline.ts", desc: "Embeds the query, searches Pinecone vector store, re-ranks results, and builds document context." },
                  { title: "BigQuery SQL Generator", file: "server/services/bigquerySqlGenerator.ts", desc: "LLM generates SQL from natural language using the schema definition, validates syntax, and executes against BigQuery." },
                  { title: "Schema Definition", file: "server/config/bigquery.ts", desc: "Canonical schema with 6 tables, column types, allowed values, and relationship definitions used by the SQL generator." },
                  { title: "Chat Service (LLM)", file: "server/services/chatService.ts", desc: "Streams the assembled context + user question to OpenRouter LLM and returns the generated answer with citations." },
                ].map((artifact) => (
                  <div key={artifact.file} className="rounded-sm border border-hairline dark:border-white/10 p-md transition-all duration-150 hover:bg-soft-stone/20 dark:hover:bg-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3.5 h-3.5 text-muted shrink-0" />
                      <h3 className="font-body text-sm font-medium text-ink dark:text-on-dark">{artifact.title}</h3>
                    </div>
                    <p className="font-body text-sm text-muted leading-relaxed mb-1">{artifact.desc}</p>
                    <code className="font-mono text-[11px] text-muted/60">{artifact.file}</code>
                  </div>
                ))}
              </div>
            </section>

            {/* Data Flow Summary */}
            <section>
              <h2 className="font-display text-base font-semibold text-ink dark:text-on-dark mb-md flex items-center gap-2">
                <ArrowDown className="w-4 h-4 text-deep-green" />
                Data Flow
              </h2>
              <div className="rounded-sm border border-hairline dark:border-white/10 p-md font-mono text-[12px] leading-relaxed text-ink dark:text-on-dark whitespace-pre-wrap">
                <span className="text-action-blue">User Question</span>{"\n"}
                {"  "}│{"\n"}
                {"  "}├─<span className="text-muted"> Intent Classifier</span>{"\n"}
                {"  "}│  ├─ DOCUMENT  → <span className="text-muted">Embed query → Pinecone search → Rerank → Document chunks</span>{"\n"}
                {"  "}│  ├─ DATABASE  → <span className="text-muted">LLM SQL gen → Validate → Execute BQ → Query results</span>{"\n"}
                {"  "}│  ├─ HYBRID    → <span className="text-muted">Both paths in parallel</span>{"\n"}
                {"  "}│  └─ UNKNOWN   → <span className="text-muted">"No relevant data found"</span>{"\n"}
                {"  "}│{"\n"}
                {"  "}└─<span className="text-muted"> Context Assembly → LLM Answer Generation → Citations</span>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
