import { getOpenRouterConfig } from "@/server/config/openrouter";

const MAX_MESSAGE_LENGTH = 10000;
const MAX_RETRIES = 3;

export interface ChatServiceResponse {
  reply: string;
}

export class ServiceError extends Error {
  code: string;
  statusCode: number;
  retryAfter?: number;
  details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode: number,
    options?: { retryAfter?: number; details?: unknown }
  ) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.statusCode = statusCode;
    this.retryAfter = options?.retryAfter;
    this.details = options?.details;
  }
}

export function sanitizeMessage(message: string): string {
  let sanitized = message.trim();
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.slice(0, MAX_MESSAGE_LENGTH);
  }
  return sanitized;
}

export async function processChatWithMessages(
  extraMessages: Array<{ role: "system" | "user"; content: string }>
): Promise<ChatServiceResponse> {
  const config = getOpenRouterConfig();
  const startTime = Date.now();

  const messages: Array<{ role: string; content: string }> = [...extraMessages];

  const totalChars = messages.reduce((s, m) => s + m.content.length, 0);
  console.log("[chatService] === LLM INPUT ===");
  console.log(`[chatService] total chars: ${totalChars}, message count: ${messages.length}`);
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const preview = m.content.length > 300 ? m.content.slice(0, 300) + "..." : m.content;
    console.log(`[chatService] msg[${i}] role="${m.role}" ${m.content.length}B: ${preview}`);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-OpenRouter-Title": "Analysis AI",
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.1,
          max_tokens: 16000,
        }),
      });

      const elapsed = Date.now() - startTime;
      const responseText = await response.text();

      console.log("[chatService] Status:", response.status, `(${elapsed}ms)`);

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 10000);
        console.log(`[chatService] Rate limited, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if ((response.status === 502 || response.status === 503) && attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 10000);
        console.log(`[chatService] Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        throw new ServiceError("LLM_ERROR", "OpenRouter authentication failed. Check your API key.", 502);
      }

      if (response.status === 402) {
        throw new ServiceError("LLM_ERROR", "OpenRouter account has insufficient credits", 402);
      }

      if (!response.ok) {
        throw new ServiceError(
          "LLM_ERROR",
          `OpenRouter API error: ${responseText.slice(0, 300)}`,
          502,
          { details: responseText.slice(0, 500) }
        );
      }

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new ServiceError("LLM_ERROR", "OpenRouter returned invalid JSON", 502);
      }

      const choices = data?.choices;
      if (!Array.isArray(choices) || choices.length === 0) {
        throw new ServiceError("LLM_ERROR", "OpenRouter returned empty choices", 502);
      }
      const reply = choices[0]?.message as Record<string, unknown> | undefined;
      const content = reply?.content as string | undefined;

      if (!content || content.trim().length === 0) {
        throw new ServiceError("LLM_ERROR", "OpenRouter returned an empty response", 502);
      }

      console.log("[chatService] Success", content.length, "chars", `(${elapsed}ms)`);
      return { reply: content.trim() };
    } catch (error: unknown) {
      if (error instanceof ServiceError) throw error;

      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 5000);
        console.log(`[chatService] Error, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES}): ${error instanceof Error ? error.message : String(error)}`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw new ServiceError(
        "LLM_ERROR",
        `OpenRouter request failed after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
        502
      );
    }
  }

  throw new ServiceError(
    "LLM_ERROR",
    `OpenRouter request failed after ${MAX_RETRIES} attempts`,
    502
  );
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  signal?: AbortSignal;
}

export async function processChatWithMessagesStream(
  extraMessages: Array<{ role: "system" | "user"; content: string }>,
  callbacks: StreamCallbacks
): Promise<string> {
  const config = getOpenRouterConfig();
  const MAX_STREAM_RETRIES = 2;
  const STREAM_TIMEOUT_MS = 120000;

  let completeText = "";
  let lastError = "";

  for (let attempt = 1; attempt <= MAX_STREAM_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), STREAM_TIMEOUT_MS);

      const combinedSignal = callbacks.signal
        ? combineAbortSignals(callbacks.signal, controller.signal)
        : controller.signal;

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-OpenRouter-Title": "Analysis AI",
        },
        body: JSON.stringify({
          model: config.model,
          messages: extraMessages,
          temperature: 0.1,
          max_tokens: 16000,
          stream: true,
        }),
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429 && attempt < MAX_STREAM_RETRIES) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if ((response.status === 502 || response.status === 503) && attempt < MAX_STREAM_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        throw new ServiceError("LLM_ERROR", "OpenRouter authentication failed. Check your API key.", 502);
      }

      if (response.status === 402) {
        throw new ServiceError("LLM_ERROR", "OpenRouter account has insufficient credits", 402);
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new ServiceError("LLM_ERROR", `OpenRouter API error: ${text.slice(0, 300)}`, 502);
      }

      if (!response.body) {
        throw new ServiceError("LLM_ERROR", "OpenRouter returned no response body for streaming", 502);
      }

      completeText = "";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (callbacks.signal?.aborted) {
          reader.cancel();
          throw new ServiceError("LLM_ERROR", "Request cancelled", 499);
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;

          const jsonStr = trimmed.slice(5).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const chunk = JSON.parse(jsonStr) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const content = chunk?.choices?.[0]?.delta?.content;
            if (content) {
              callbacks.onToken(content);
              completeText += content;
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }

      const trimmed = completeText.trim();
      if (!trimmed) {
        throw new ServiceError("LLM_ERROR", "OpenRouter returned an empty streaming response", 502);
      }

      console.log(`[chatService] Streamed ${completeText.length} chars successfully`);
      return trimmed;
    } catch (error: unknown) {
      if (error instanceof ServiceError) {
        if (error.statusCode === 499) throw error;
        if (attempt >= MAX_STREAM_RETRIES) throw error;
      }

      if (attempt >= MAX_STREAM_RETRIES) {
        throw new ServiceError(
          "LLM_ERROR",
          `OpenRouter streaming request failed after ${MAX_STREAM_RETRIES} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
          502
        );
      }

      lastError = error instanceof Error ? error.message : String(error);
      const delay = Math.min(1000 * Math.pow(2, attempt - 1) + Math.random() * 500, 5000);
      console.log(`[chatService] Stream attempt ${attempt} failed, retrying in ${delay}ms: ${lastError}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new ServiceError(
    "LLM_ERROR",
    `OpenRouter streaming request failed after ${MAX_STREAM_RETRIES} attempts`,
    502
  );
}

function combineAbortSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}


