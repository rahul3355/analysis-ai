import { searchChunks, upsertChunks, getPineconeClient, getIndexConfig } from "./vectorService";
import { getUniqueId } from "@/lib/id";
import { type IntentCategory } from "@/core/pipeline/classifier";

export interface CacheMetadata {
  chunkId: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  chunkText: string;
  orgId: string;
  uploadedAt: string;
  storageUrl: string;
  intent: "DATABASE" | "DOCUMENT" | "HYBRID" | "UNKNOWN";
  cachedAt: string;
}

export async function getCachedPineconeIntent(
  queryEmbedding: number[]
): Promise<{ intent: IntentCategory; id: string; score: number } | null> {
  try {
    const matches = await searchChunks(queryEmbedding, {
      topK: 1,
      namespace: "intent-routing-cache",
    });

    if (matches.length === 0) return null;

    const topMatch = matches[0];
    if (topMatch.score >= 0.95) {
      const metadata = topMatch.metadata as unknown as CacheMetadata;
      if (metadata && metadata.intent) {
        return { intent: metadata.intent as IntentCategory, id: topMatch.id, score: topMatch.score };
      }
    }
    return null;
  } catch (err) {
    console.error("[Cache] Failed to query Pinecone semantic cache:", err);
    return null;
  }
}

export async function deleteCachedPineconeIntent(id: string): Promise<void> {
  try {
    const pc = getPineconeClient();
    const { host, indexName } = getIndexConfig();
    const index = pc.index({ name: indexName, host });
    await index.namespace("intent-routing-cache").deleteOne({ id });
    console.log(`[Cache] Deleted poisoned entry: ${id}`);
  } catch (err) {
    console.error("[Cache] Failed to delete cached intent:", err);
  }
}

export async function setCachedPineconeIntent(
  queryEmbedding: number[],
  message: string,
  intent: IntentCategory
): Promise<void> {
  try {
    const cacheId = getUniqueId("cache");
    const isoString = new Date().toISOString();

    const metadata: CacheMetadata = {
      chunkId: cacheId,
      documentId: "intent-cache",
      documentName: "Intent Semantic Cache",
      pageNumber: 1,
      chunkIndex: 0,
      chunkText: message,
      orgId: "system",
      uploadedAt: isoString,
      storageUrl: "",
      intent,
      cachedAt: isoString,
    };

    await upsertChunks(
      [{ id: cacheId, values: queryEmbedding, metadata: metadata as any }],
      "intent-routing-cache"
    );
  } catch (err) {
    console.error("[Cache] Failed to write to Pinecone semantic cache:", err);
  }
}
