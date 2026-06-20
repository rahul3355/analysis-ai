"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";

export interface InputBarProps {
  onSend: (text: string) => void;
  isLoading: boolean;
}

export function InputBar({ onSend, isLoading }: InputBarProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea height up to 5 lines
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to calculate scrollHeight accurately
    textarea.style.height = "auto";
    const newHeight = Math.min(textarea.scrollHeight, 140); // cap around 5 lines (approx 140px)
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    // Focus back on textarea after sending
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-md md:p-lg bg-canvas dark:bg-primary flex justify-center items-end">
      <div className="w-full max-w-2xl flex items-end gap-sm bg-soft-stone/40 dark:bg-white/5 rounded-md p-xs relative transition-all duration-200 focus-within:ring-2 focus-within:ring-form-focus/20">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about documents or database..."
          rows={1}
          disabled={isLoading}
          className={cn(
            "flex-1 bg-transparent border-0 outline-hidden py-xs px-sm resize-none",
            "font-body text-sm text-ink dark:text-on-dark placeholder:text-muted dark:placeholder:text-slate",
            "min-h-[36px] max-h-[140px] focus:ring-0 focus:outline-hidden",
            "disabled:opacity-50"
          )}
          aria-label="Ask a question"
        />

        <button
          onClick={handleSend}
          disabled={!value.trim() || isLoading}
          className={cn(
            "w-9 h-9 rounded-full bg-primary text-on-primary dark:bg-on-dark dark:text-primary flex items-center justify-center transition-all duration-150 flex-shrink-0 cursor-pointer",
            "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue",
            "hover:opacity-90 active:scale-95 disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed"
          )}
          aria-label="Send message"
        >
          <ArrowUp className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
