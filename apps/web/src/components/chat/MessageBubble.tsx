"use client";

import type { Message } from "@analysis-ai/types";
import { SourcesBlock } from "./SourcesBlock";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { cn } from "@/lib/cn";

export interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "w-full max-w-2xl px-md md:px-0 py-sm animate-fade-in",
        isUser ? "flex justify-end" : "flex justify-start"
      )}
    >
      <div className={cn("min-w-0 max-w-[85%]", isUser ? "text-right" : "text-left")}>

        <div
          className={cn(
            "font-body text-sm leading-relaxed",
            isUser
              ? "p-md rounded-md bg-soft-stone/50 text-ink dark:bg-white/5 dark:text-on-dark rounded-tr-none inline-block text-left"
              : "text-ink dark:text-on-dark py-xs"
          )}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : message.content ? (
            <MarkdownRenderer content={message.content} />
          ) : null}
        </div>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-xs">
            <SourcesBlock citations={message.citations} />
          </div>
        )}
      </div>
    </div>
  );
}
