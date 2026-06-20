export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
export const OPENROUTER_MODEL = "deepseek/deepseek-v4-flash";

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS) || 1536;
export const RERANKING_MODEL = process.env.RERANKING_MODEL || "nvidia/llama-nemotron-rerank-vl-1b-v2:free";

export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Create a .env.local file in frontend/ with:\n" +
        "OPENROUTER_API_KEY=sk-or-v1-..."
    );
  }
  return { apiKey, baseUrl: OPENROUTER_BASE_URL, model: OPENROUTER_MODEL };
}
