"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import type { Message } from "@analysis-ai/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

export interface MessageThreadProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent?: ReactNode;
}

export function MessageThread({
  messages,
  isLoading,
  streamingContent,
}: MessageThreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(messages.length);
  const lastContentLength = useRef(0);

  const isNearBottom = () => {
    const el = containerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  };

  const scrollToBottom = useCallback(() => {
    if (isNearBottom()) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      scrollToBottom();
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (isLoading) {
      scrollToBottom();
    }
  }, [isLoading, scrollToBottom]);

  const lastAssistantContent =
    messages.length > 0 && messages[messages.length - 1].role === "assistant"
      ? messages[messages.length - 1].content
      : "";

  useEffect(() => {
    if (lastAssistantContent && lastAssistantContent.length !== lastContentLength.current) {
      scrollToBottom();
      lastContentLength.current = lastAssistantContent.length;
    }
  }, [lastAssistantContent, scrollToBottom]);

  const hasStreamingContent = !!streamingContent;

  useEffect(() => {
    if (hasStreamingContent) {
      scrollToBottom();
    }
  }, [hasStreamingContent, scrollToBottom]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-md md:p-xl flex flex-col gap-sm items-center scrollbar-thin scrollbar-thumb-hairline"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
        />
      ))}

      {isLoading && streamingContent ? (
        streamingContent
      ) : isLoading ? (
        <div className="w-full max-w-2xl px-md md:px-0 py-sm flex justify-start">
          <div className="min-w-0 max-w-[85%] text-left">
            <div className="py-xs">
              <TypingIndicator />
            </div>
          </div>
        </div>
      ) : null}

      <div ref={bottomRef} className="h-[2px] flex-shrink-0" />
    </div>
  );
}
