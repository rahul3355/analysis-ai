import { getOpenRouterConfig, RERANKING_MODEL } from "@/server/config/openrouter";

export interface RerankDoc {
  id: string;
  text: string;
}

export interface RerankResult {
  index: number;
  relevance_score: number;
}

async function rerankWithRetry(
  query: string,
  documents: RerankDoc[],
  topK: number,
  attempt = 1
): Promise<RerankResult[]> {
  const { apiKey, baseUrl } = getOpenRouterConfig();
  const model = RERANKING_MODEL;
  const safeK = Math.min(topK, documents.length);

  try {
    const response = await fetch(`${baseUrl}/rerank`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        query,
        documents: documents.map((d) => ({ id: d.id, text: d.text })),
        top_k: safeK,
      }),
    });

    if (response.status === 429 && attempt <= 3) {
      const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return rerankWithRetry(query, documents, topK, attempt + 1);
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `OpenRouter rerank request failed (${response.status}): ${errorBody}`
      );
    }

    const data = (await response.json()) as {
      results: RerankResult[];
    };

    if (!Array.isArray(data.results) || data.results.length === 0) {
      throw new Error("Rerank response returned empty results array");
    }

    return data.results.sort((a, b) => b.relevance_score - a.relevance_score);
  } catch (err) {
    throw err;
  }
}

export async function rerank(
  query: string,
  documents: RerankDoc[],
  topK: number
): Promise<RerankResult[]> {
  if (documents.length === 0) return [];
  return rerankWithRetry(query, documents, topK);
}
