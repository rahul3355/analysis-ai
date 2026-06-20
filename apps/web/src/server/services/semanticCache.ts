import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";

export interface CacheEntry {
  question: string;
  embedding: number[];
  sql: string;
}

let inMemoryCache: CacheEntry[] | null = null;

export function getCacheFilePath(): string {
  const candidates = [
    join(process.cwd(), "src/server/config/sql-cache.json"),
    join(process.cwd(), "apps/web/src/server/config/sql-cache.json"),
    join(process.cwd(), "../apps/web/src/server/config/sql-cache.json"),
  ];
  for (const p of candidates) {
    const dir = dirname(p);
    if (existsSync(dir)) {
      return p;
    }
  }
  return join(process.cwd(), "sql-cache.json");
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function loadCache(): Promise<CacheEntry[]> {
  if (inMemoryCache) return inMemoryCache;
  const filePath = getCacheFilePath();
  if (!existsSync(filePath)) {
    inMemoryCache = [];
    return inMemoryCache;
  }
  try {
    const data = readFileSync(filePath, "utf-8");
    inMemoryCache = JSON.parse(data) as CacheEntry[];
    if (!Array.isArray(inMemoryCache)) {
      inMemoryCache = [];
    }
  } catch (err) {
    console.error("[semanticCache] Failed to load cache:", err);
    inMemoryCache = [];
  }
  return inMemoryCache;
}

async function saveCache(cache: CacheEntry[]): Promise<void> {
  const filePath = getCacheFilePath();
  try {
    writeFileSync(filePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch (err) {
    console.error("[semanticCache] Failed to save cache:", err);
  }
}

export async function getCachedSql(embedding: number[]): Promise<string | null> {
  const cache = await loadCache();
  let maxSimilarity = -1;
  let bestSql: string | null = null;
  for (const entry of cache) {
    const similarity = cosineSimilarity(embedding, entry.embedding);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      bestSql = entry.sql;
    }
  }
  if (maxSimilarity >= 0.95) {
    return bestSql;
  }
  return null;
}

export async function addCachedSql(question: string, embedding: number[], sql: string): Promise<void> {
  const cache = await loadCache();
  cache.push({ question, embedding, sql });
  await saveCache(cache);
}

export function resetInMemoryCache(): void {
  inMemoryCache = null;
}
