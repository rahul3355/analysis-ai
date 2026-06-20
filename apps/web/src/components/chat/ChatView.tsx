"use client";

import { useState, useRef } from "react";
import type { Message } from "@analysis-ai/types";
import type { DocumentItem } from "@analysis-ai/types";
import { MessageThread } from "./MessageThread";
import { InputBar } from "./InputBar";
import { ChatEmptyState } from "./ChatEmptyState";
import { PipelineStatus } from "./PipelineStatus";
import { SourceCards } from "./SourceCards";
import { BqPreview } from "./BqPreview";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { getUniqueId } from "@/lib/id";
import {
  type StreamStage,
  type StreamSourcesEvent,
  type StreamBqResultEvent,
  type StreamCitationsEvent,
} from "@/lib/sse";

const STREAM_TIMEOUT_MS = 120000;

export interface ChatViewProps {
  documents: DocumentItem[];
}

function parseSseEvent(
  chunk: string
): { event: string; data: unknown } | null {
  const lines = chunk.split("\n");
  let eventType = "message";
  let dataStr = "";

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      eventType = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      dataStr = line.slice(6);
    }
  }

  if (!dataStr) return null;
  try {
    return { event: eventType, data: JSON.parse(dataStr) };
  } catch {
    return null;
  }
}

export function ChatView({ documents }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [pipelineStage, setPipelineStage] = useState<StreamStage>("classifying");
  const [completedStages, setCompletedStages] = useState<Set<StreamStage>>(
    new Set()
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [activeSources, setActiveSources] =
    useState<StreamSourcesEvent | null>(null);
  const [activeBqResult, setActiveBqResult] =
    useState<StreamBqResultEvent | null>(null);

  const stageRef = useRef<StreamStage>("classifying");

  const readyDocIds = documents
    .filter((d) => d.status === "ready")
    .map((d) => d.documentId);
  const hasReadyDocs = readyDocIds.length > 0;

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
    setPipelineStage("classifying");
    setCompletedStages(new Set());
    setStatusMessage("");
    setActiveSources(null);
    setActiveBqResult(null);
    stageRef.current = "classifying";
  };

  const handleSend = async (text: string) => {
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    const userMsg: Message = {
      id: getUniqueId("u"),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const initialStage: StreamStage = "classifying";
    stageRef.current = initialStage;
    setPipelineStage(initialStage);
    setCompletedStages(new Set());
    setStatusMessage("Analyzing your question...");
    setActiveSources(null);
    setActiveBqResult(null);

    const assistantId = getUniqueId("a");

    const markCompleted = (stage: string) => {
      setCompletedStages((prev) => {
        const next = new Set(prev);
        next.add(stage as StreamStage);
        return next;
      });
    };

    try {
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ]);

      const timeoutId = setTimeout(
        () => abortController.abort(),
        STREAM_TIMEOUT_MS
      );

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          documentIds: hasReadyDocs ? readyDocIds : undefined,
        }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedContent = "";
      let finalCitations: StreamCitationsEvent["citations"] | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          const parsed = parseSseEvent(block);
          if (!parsed) continue;

          switch (parsed.event) {
            case "status": {
              const d = parsed.data as {
                stage: StreamStage;
                message: string;
              };
              if (d.stage !== stageRef.current) {
                markCompleted(stageRef.current);
              }
              stageRef.current = d.stage;
              setPipelineStage(d.stage);
              setStatusMessage(d.message);
              break;
            }
            case "sources": {
              const d = parsed.data as StreamSourcesEvent;
              setActiveSources(d);
              markCompleted("searching_docs");
              break;
            }
            case "bq_result": {
              const d = parsed.data as StreamBqResultEvent;
              setActiveBqResult(d);
              markCompleted("querying_bq");
              break;
            }
            case "text_delta": {
              const d = parsed.data as { delta: string };
              if (!d.delta) break;
              accumulatedContent += d.delta;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: accumulatedContent }
                    : m
                )
              );
              break;
            }
            case "citations": {
              const d = parsed.data as StreamCitationsEvent;
              finalCitations = d.citations;
              break;
            }
            case "error": {
              const d = parsed.data as { message: string };
              throw new Error(d.message);
            }
            case "done": {
              markCompleted("generating");
              setPipelineStage("complete");
              setStatusMessage("");
              break;
            }
          }
        }
      }

      if (finalCitations) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: accumulatedContent || m.content,
                  citations: finalCitations,
                }
              : m
          )
        );
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Request was cancelled or timed out." }
              : m
          )
        );
        setPipelineStage("error");
      } else {
        const msg =
          error instanceof Error ? error.message : "An unexpected error occurred";
        console.error("Chat API call failed:", msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Sorry, I encountered an error processing your request.",
                }
              : m
          )
        );
        setPipelineStage("error");
        setStatusMessage("");
      }
    } finally {
      if (abortRef.current === abortController) {
        setIsLoading(false);
        abortRef.current = null;
      }
    }
  };

  const renderStreamingContent = () => {
    if (!isLoading) return null;

    return (
      <div className="w-full max-w-2xl px-md md:px-0 py-sm flex justify-start">
        <div className="min-w-0 max-w-[85%] w-full text-left">
          <PipelineStatus
            activeStage={pipelineStage}
            completedStages={completedStages}
            message={statusMessage}
          />
          {activeSources && <SourceCards data={activeSources} />}
          {activeBqResult && <BqPreview data={activeBqResult} />}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-canvas dark:bg-primary transition-colors duration-200">
      {messages.length > 0 && (
        <div className="px-md md:px-lg py-[10px] flex items-center justify-end bg-canvas dark:bg-primary select-none flex-shrink-0">
          <button
            onClick={handleClear}
            className={cn(
              "flex items-center gap-xs px-sm py-[6px] rounded-xs font-body text-xs text-slate dark:text-muted transition-all duration-150 cursor-pointer",
              "hover:bg-soft-stone/30 dark:hover:bg-white/5 hover:text-ink dark:hover:text-on-dark",
              "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
            )}
            aria-label="Clear chat thread"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear Chat</span>
          </button>
        </div>
      )}

      {messages.length === 0 ? (
        <ChatEmptyState onSend={handleSend} />
      ) : (
        <MessageThread
          messages={messages}
          isLoading={isLoading}
          streamingContent={renderStreamingContent()}
        />
      )}

      <InputBar onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
