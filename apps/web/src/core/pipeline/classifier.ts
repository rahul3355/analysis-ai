import { getOpenRouterConfig } from "@/server/config/openrouter";
import { classifyByHeuristics, type HeuristicIntent } from "./classifierHeuristics";
import { getCachedPineconeIntent, setCachedPineconeIntent, deleteCachedPineconeIntent } from "@/server/services/intentCacheService";
import { embed } from "@/server/clients/embeddingClient";

export type IntentCategory = "DATABASE" | "DOCUMENT" | "HYBRID" | "UNKNOWN";

export interface ClassificationResult {
  intent: IntentCategory;
  confidence: number;
  stage: "cache" | "heuristic" | "llm" | "fallback";
  latencyMs: number;
}

const LLM_MAX_TOKENS = 4000;
const LLM_TIMEOUT_MS = 8000;

function extractLabel(text: string): string | null {
  const upper = text.toUpperCase();
  const labels = ["DATABASE", "DOCUMENT", "HYBRID", "UNKNOWN"];
  for (const label of labels) {
    if (upper.includes(label)) return label;
  }
  return null;
}

export async function classifyIntentFull(message: string, queryEmbedding?: number[]): Promise<ClassificationResult> {
  const start = performance.now();

  if (!message || message.trim().length === 0) {
    return { intent: "HYBRID", confidence: 1.0, stage: "heuristic", latencyMs: perfDiff(start) };
  }

  const heuristic = classifyByHeuristics(message);

  const embedding = queryEmbedding || (await embed([message]))[0];

  const pineconeCached = await getCachedPineconeIntent(embedding);
  if (pineconeCached) {
    if (heuristic && pineconeCached.intent === heuristic.intent) {
      return { intent: pineconeCached.intent, confidence: 0.95, stage: "cache", latencyMs: perfDiff(start) };
    }
    await deleteCachedPineconeIntent(pineconeCached.id);
  }

  if (heuristic) {
    if (heuristic.confidence >= 0.85 && heuristic.intent !== "UNKNOWN") {
      const cat = heuristic.intent as IntentCategory;
      await setCachedPineconeIntent(embedding, message, cat);
      return { intent: cat, confidence: heuristic.confidence, stage: "heuristic", latencyMs: perfDiff(start) };
    }
    if (heuristic.intent === "UNKNOWN" && heuristic.confidence >= 0.85) {
      return { intent: "UNKNOWN", confidence: heuristic.confidence, stage: "heuristic", latencyMs: perfDiff(start) };
    }
  }

  try {
    const config = getOpenRouterConfig();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    const systemPrompt = `You are a query intent classifier for a retail BI assistant. Classify the user's question into one of four categories:

DATABASE: Asks for structured data aggregation — counts, sums, averages, top-N rankings, breakdowns by region/channel/category/brand. Can be answered with SQL queries over transactional tables.
Examples: "What were our top 3 products by revenue?" "How many customers by region?" "Average order value" "Orders by channel" "Low stock at Glasgow"

DOCUMENT: Asks for pre-computed analytical metrics, contractual terms, plan figures, campaign details, or store-level facts from business reports. These are numbers an analyst wrote down, not raw data aggregations.
Examples: "What is the running footwear category's full-price sell-through rate?" "What is Hoka's year-on-year growth rate?" "How many JD stores stock Hoka?" "What is the minimum annual purchase commitment?" "What is the media budget for BTS?"

HYBRID: Cross-references a document claim with database data — asks for both a document fact AND a data computation, often using "according to" + "compare" / "track" / "how does".
Examples: "Hoka grew 52% according to the deep dive. What was Hoka's revenue and how many Clifton 9 were sold?" "Nike generated GBP 544M in Q3. How does this track against rebate thresholds?"

UNKNOWN: Out of scope, non-business, or too ambiguous to answer from available data. No relevant data exists.
Examples: "What is the weather in London?" "Tell me a joke" "Who is the CEO of JD Sports?"

Respond with ONLY the category label.`;

    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "HTTP-Referer": "http://localhost:3000",
        "X-OpenRouter-Title": "Analysis AI Intent Classifier",
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.0,
        max_tokens: LLM_MAX_TOKENS,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[classifier] LLM returned status ${response.status}.`);
      return fallbackResult(heuristic, start);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content || "";
    const label = extractLabel(rawContent);

    if (label) {
      const cat = label as IntentCategory;
      await setCachedPineconeIntent(embedding, message, cat);
      return { intent: cat, confidence: 0.85, stage: "llm", latencyMs: perfDiff(start) };
    }

    console.warn(`[classifier] LLM returned unparsable: "${rawContent.slice(0, 100)}"`);
    return fallbackResult(heuristic, start);
  } catch (error: any) {
    if (error?.name === "AbortError") {
      console.warn(`[classifier] LLM timed out after ${LLM_TIMEOUT_MS}ms`);
    } else {
      console.error("[classifier] LLM failed:", error?.message || error);
    }
    return fallbackResult(heuristic, start);
  }
}

function fallbackResult(heuristic: any, start: number): ClassificationResult {
  if (heuristic && heuristic.confidence >= 0.5) {
    return {
      intent: heuristic.intent === "UNKNOWN" ? "HYBRID" : heuristic.intent as IntentCategory,
      confidence: heuristic.confidence * 0.8,
      stage: "fallback",
      latencyMs: perfDiff(start),
    };
  }
  return { intent: "HYBRID", confidence: 0.5, stage: "fallback", latencyMs: perfDiff(start) };
}

export async function classifyIntent(message: string): Promise<"DATABASE" | "DOCUMENT" | "HYBRID"> {
  const result = await classifyIntentFull(message);
  if (result.intent === "UNKNOWN") return "HYBRID";
  return result.intent as "DATABASE" | "DOCUMENT" | "HYBRID";
}

function perfDiff(start: number): number {
  return Math.round((performance.now() - start) * 100) / 100;
}
