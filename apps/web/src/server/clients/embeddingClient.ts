import { getOpenRouterConfig, EMBEDDING_MODEL } from "@/server/config/openrouter";

const BATCH_SIZE = 20;
const MAX_CONCURRENCY = 1;

async function embedWithRetry(texts: string[], attempt = 1): Promise<number[][]> {
  const { apiKey, baseUrl } = getOpenRouterConfig();
  const model = EMBEDDING_MODEL;

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, input: texts }),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`OpenRouter embedding request failed: ${message}`);
  }

  if (response.status === 429 && attempt <= 3) {
    const jitter = Math.random() * 1000;
    const delay = 1000 * Math.pow(2, attempt - 1) + jitter;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return embedWithRetry(texts, attempt + 1);
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `OpenRouter embedding request failed (${response.status}): ${errorBody}`
    );
  }

  const data = (await response.json()) as {
    data: { embedding: number[] }[];
  };

  if (data.data.length !== texts.length) {
    throw new Error(
      `Embedding response length mismatch: expected ${texts.length}, got ${data.data.length}`
    );
  }

  return data.data.map((item) => item.embedding);
}

async function runConcurrent<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker(): Promise<void> {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array(Math.min(concurrency, tasks.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const batches: string[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    batches.push(texts.slice(i, i + BATCH_SIZE));
  }

  const tasks = batches.map((batch) => () => embedWithRetry(batch));
  const results = await runConcurrent(tasks, MAX_CONCURRENCY);

  return results.flat();
}
