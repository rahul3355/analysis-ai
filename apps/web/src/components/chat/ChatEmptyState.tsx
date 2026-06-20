"use client";

import { useState, useEffect } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { EXAMPLE_PROMPTS } from "@/constants/prompts";
export interface ChatEmptyStateProps {
  onSend: (text: string) => void;
}

export function ChatEmptyState({ onSend }: ChatEmptyStateProps) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const check = () => setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-lg md:p-xxl bg-canvas dark:bg-primary select-none">
      {/* Container - Resolved max-w-lg collision by using arbitrary max-w-[480px] */}
      <div className="w-full max-w-[480px] text-center flex flex-col items-center gap-lg">
        <iframe src={"/agent-query.html?theme=" + theme} className="w-full max-w-[420px] h-[220px] border-0 pointer-events-none" title="System diagram" />
        <div className="flex flex-col gap-sm">
          <h3 className="font-display text-2xl font-bold tracking-tight bg-gradient-to-r from-deep-green via-action-blue to-coral dark:from-pale-green dark:via-pale-blue dark:to-coral-soft bg-clip-text text-transparent">
            What would you like to know?
          </h3>
          <p className="font-body text-sm text-body-muted dark:text-muted max-w-[360px] mx-auto leading-relaxed">
            Ask about your documents or business data.
          </p>
        </div>

        {/* Example Prompt Chips */}
        <div className="flex flex-col gap-xs w-full mt-md">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted mb-xxs">
            Suggested Queries
          </span>
          <div className="flex flex-col gap-xs">
            {EXAMPLE_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => onSend(prompt)}
                className={cn(
                  "w-full p-md bg-soft-stone/30 dark:bg-white/5 rounded-sm font-body text-xs text-ink dark:text-on-dark text-left transition-all duration-150 flex items-center justify-between cursor-pointer",
                  "hover:bg-soft-stone/60 dark:hover:bg-white/10",
                  "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
                )}
              >
                <span>{prompt}</span>
                <Send className="w-3 h-3 text-slate opacity-40 hover:opacity-100" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
