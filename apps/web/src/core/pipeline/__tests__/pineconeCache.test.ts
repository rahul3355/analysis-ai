import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/services/vectorService", () => ({
  searchChunks: vi.fn(),
  upsertChunks: vi.fn(),
}));

import { searchChunks, upsertChunks } from "@/server/services/vectorService";
import { getCachedPineconeIntent, setCachedPineconeIntent } from "@/server/services/intentCacheService";

describe("Pinecone Semantic Cache Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCachedPineconeIntent", () => {
    it("returns intent on score >= 0.95", async () => {
      vi.mocked(searchChunks).mockResolvedValue([
        {
          id: "cache-123",
          score: 0.97,
          metadata: {
            chunkId: "cache-123",
            documentId: "intent-cache",
            documentName: "Intent Semantic Cache",
            pageNumber: 1,
            chunkIndex: 0,
            chunkText: "What was our revenue?",
            orgId: "system",
            uploadedAt: new Date().toISOString(),
            storageUrl: "",
            intent: "DATABASE",
            cachedAt: new Date().toISOString(),
          } as any,
        },
      ]);

      const result = await getCachedPineconeIntent([0.1, 0.2]);
      expect(result).toBe("DATABASE");
      expect(searchChunks).toHaveBeenCalledWith([0.1, 0.2], {
        topK: 1,
        namespace: "intent-routing-cache",
      });
    });

    it("returns null on score < 0.95", async () => {
      vi.mocked(searchChunks).mockResolvedValue([
        {
          id: "cache-123",
          score: 0.91,
          metadata: {
            chunkId: "cache-123",
            documentId: "intent-cache",
            documentName: "Intent Semantic Cache",
            pageNumber: 1,
            chunkIndex: 0,
            chunkText: "What was our revenue?",
            orgId: "system",
            uploadedAt: new Date().toISOString(),
            storageUrl: "",
            intent: "DATABASE",
            cachedAt: new Date().toISOString(),
          } as any,
        },
      ]);

      const result = await getCachedPineconeIntent([0.1, 0.2]);
      expect(result).toBeNull();
    });

    it("returns null on empty matches", async () => {
      vi.mocked(searchChunks).mockResolvedValue([]);
      const result = await getCachedPineconeIntent([0.1, 0.2]);
      expect(result).toBeNull();
    });
  });

  describe("setCachedPineconeIntent", () => {
    it("upserts chunks to Pinecone", async () => {
      vi.mocked(upsertChunks).mockResolvedValue(undefined);

      await setCachedPineconeIntent([0.1, 0.2], "Test query", "DOCUMENT");

      expect(upsertChunks).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(upsertChunks).mock.calls[0];
      const chunks = callArgs[0];
      const namespace = callArgs[1];

      expect(namespace).toBe("intent-routing-cache");
      expect(chunks).toHaveLength(1);
      expect(chunks[0].values).toEqual([0.1, 0.2]);
      expect(chunks[0].metadata.intent).toBe("DOCUMENT");
      expect(chunks[0].metadata.chunkText).toBe("Test query");
    });
  });
});
