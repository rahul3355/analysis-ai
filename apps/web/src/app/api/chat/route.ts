import { NextRequest, NextResponse } from "next/server";
import { orchestrate } from "@/core/pipeline/orchestrator";
import type { ChatRequest, ApiError } from "@analysis-ai/types";
import { getUniqueId } from "@/lib/id";
import { StreamEvent } from "@/lib/sse";

export const maxDuration = 120;
const MAX_MESSAGE_LENGTH = 10000;

function apiError(
  code: ApiError["code"],
  message: string,
  status: number
): NextResponse<ApiError> {
  return NextResponse.json({ code, message }, { status });
}

export async function POST(request: NextRequest) {
  const requestId = getUniqueId("req");
  const startTime = Date.now();

  try {
    let body: ChatRequest;
    try {
      body = await request.json();
    } catch {
      return apiError(
        "VALIDATION_ERROR",
        "Request body must be valid JSON",
        400
      );
    }

    const { message, documentIds } = body;

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return apiError("VALIDATION_ERROR", "Message is required", 400);
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return apiError(
        "VALIDATION_ERROR",
        `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
        400
      );
    }

    if (
      documentIds !== undefined &&
      (!Array.isArray(documentIds) ||
        !documentIds.every((id) => typeof id === "string"))
    ) {
      return apiError(
        "VALIDATION_ERROR",
        "documentIds must be an array of strings",
        400
      );
    }

    const stream = new ReadableStream({
      async start(controller) {
        const writer = new StreamEvent(controller);
        try {
          await orchestrate(
            { message, documentIds },
            writer,
            request.signal
          );
        } catch (err) {
          if (!writer.closed) {
            const raw =
              err instanceof Error ? err.message : "An unexpected error occurred";
            const userMsg = raw.toLowerCase().includes("image input")
              ? "This question requires image analysis, which the current AI model doesn't support. Please try a text-based question."
              : raw;
            console.error(`[${requestId}] Stream error (${Date.now() - startTime}ms):`, raw);
            writer.error(userMsg);
            writer.done();
          }
        }
      },
    });

    console.log(`[${requestId}] Streaming response (${Date.now() - startTime}ms setup)`);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[${requestId}] Unhandled error (${elapsed}ms):`, error);
    return apiError(
      "LLM_ERROR",
      "An unexpected error occurred. Please try again.",
      500
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Chat API is running. Use POST to send messages.",
  });
}
