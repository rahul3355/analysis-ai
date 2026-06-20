import { cosineSimilarity } from "@/server/services/semanticCache";

export interface ClassificationCacheEntry {
  normalized: string;
  embedding: number[];
  intent: "DATABASE" | "DOCUMENT" | "HYBRID";
  expiresAt: number;
}

const cache = new Map<string, ClassificationCacheEntry>();
const MAX_ENTRIES = 1000;
const DEFAULT_TTL_MS = 3600000;

function normalize(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCachedClassification(
  message: string,
  embedding?: number[]
): "DATABASE" | "DOCUMENT" | "HYBRID" | null {
  const norm = normalize(message);
  const now = Date.now();

  const exact = cache.get(norm);
  if (exact && now < exact.expiresAt) return exact.intent;

  if (embedding && embedding.length > 0) {
    let bestSim = 0;
    let bestIntent: "DATABASE" | "DOCUMENT" | "HYBRID" | null = null;

    for (const [, entry] of cache) {
      if (now >= entry.expiresAt) continue;
      if (entry.embedding.length === 0) continue;
      const sim = cosineSimilarity(embedding, entry.embedding);
      if (sim > bestSim) {
        bestSim = sim;
        bestIntent = entry.intent;
      }
    }

    if (bestSim >= 0.92 && bestIntent) return bestIntent;
  }

  return null;
}

export function setCachedClassification(
  message: string,
  embedding: number[],
  intent: "DATABASE" | "DOCUMENT" | "HYBRID",
  ttlMs: number = DEFAULT_TTL_MS
): void {
  if (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  const norm = normalize(message);
  cache.set(norm, {
    normalized: norm,
    embedding,
    intent,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearClassificationCache(): void {
  cache.clear();
}

export function getClassificationCacheSize(): number {
  return cache.size;
}
