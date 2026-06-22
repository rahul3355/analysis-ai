"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { cn } from "@/lib/cn";
import { BookOpen, ChevronLeft, ExternalLink } from "lucide-react";
import { DOCS_INDEX } from "@/data/docs";
import { Logo } from "@/components/layout/Logo";
import schemaContextContent from "@/data/docs/schema-context-to-llm";
import dataSourceContent from "@/data/docs/data-source-decision-engine";

const CONTENTS: Record<string, string> = {
  "schema-context-to-llm": schemaContextContent,
  "data-source-decision-engine": dataSourceContent,
};

export default function DocsPage() {
  const [activeDoc, setActiveDoc] = useState<string>(DOCS_INDEX[0]?.id ?? "");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeEntry = DOCS_INDEX.find((d) => d.id === activeDoc);
  const content = activeDoc ? CONTENTS[activeDoc] : "";

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-canvas dark:bg-primary transition-colors duration-200">
      {/* Docs Sidebar */}
      <aside
        className={cn(
          "h-full flex flex-col bg-soft-stone/35 dark:bg-cohere-black/20 transition-all duration-200 select-none border-r border-hairline dark:border-white/10",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between p-lg border-b border-hairline dark:border-white/10">
          <div className="flex items-center gap-md">
            <Logo className="w-5 h-5 flex-shrink-0" />
            <span className="font-display text-sm font-semibold tracking-tight text-ink dark:text-on-dark">
              Docs
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex items-center justify-center w-5 h-5 rounded-sm text-slate dark:text-muted hover:bg-soft-stone/50 hover:text-ink dark:hover:bg-white/5 dark:hover:text-on-dark transition-all duration-150 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-sm" aria-label="Documentation topics">
          {DOCS_INDEX.map((entry) => {
            const isActive = activeDoc === entry.id;
            return (
              <button
                key={entry.id}
                onClick={() => setActiveDoc(entry.id)}
                className={cn(
                  "w-full flex items-start gap-md px-lg py-md text-left font-body text-sm transition-all duration-150 cursor-pointer border-l-2",
                  "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue",
                  isActive
                    ? "bg-soft-stone/60 text-ink dark:bg-white/10 dark:text-on-dark font-medium border-action-blue"
                    : "text-slate hover:bg-soft-stone/30 hover:text-ink dark:text-muted dark:hover:bg-white/5 dark:hover:text-on-dark border-transparent"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{entry.question}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-lg border-t border-hairline dark:border-white/10">
          <a
            href="/"
            className="flex items-center gap-md text-sm font-body text-slate dark:text-muted hover:text-ink dark:hover:text-on-dark transition-colors duration-150"
          >
            <ExternalLink className="w-4 h-4" />
            Back to App
          </a>
        </div>
      </aside>

      {/* Toggle button when sidebar is closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-4 left-4 z-10 flex items-center justify-center w-8 h-8 rounded-sm bg-canvas dark:bg-primary border border-hairline dark:border-white/10 text-slate dark:text-muted hover:text-ink dark:hover:text-on-dark shadow-sm transition-all duration-150 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
          aria-label="Open sidebar"
        >
          <BookOpen className="w-4 h-4" />
        </button>
      )}

      {/* Main Content */}
      <main className="flex-1 h-full flex flex-col min-w-0 overflow-hidden">
        {activeEntry && (
          <div className="px-lg md:px-xl py-lg border-b border-hairline dark:border-white/10">
            <h1 className="font-display text-lg font-semibold text-ink dark:text-on-dark">
              {activeEntry.question}
            </h1>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-lg md:px-xl py-xl">
            {content ? (
              <div className="prose-style">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSanitize]}
                >
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted font-body text-sm">
                Loading...
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
