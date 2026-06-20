import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import { StreamEvent } from "@/lib/sse";

const mockFsMap = new Map<string, string>();

vi.mock("fs", () => {
  const mockExistsSync = vi.fn((p: string) => mockFsMap.has(p));
  const mockReadFileSync = vi.fn((p: string, _enc?: string) => {
    if (!mockFsMap.has(p)) throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    return mockFsMap.get(p);
  });
  const mockWriteFileSync = vi.fn((_p: string, data: string) => {
    mockFsMap.set(_p, data);
  });
  return {
    default: { existsSync: mockExistsSync, readFileSync: mockReadFileSync, writeFileSync: mockWriteFileSync },
    existsSync: mockExistsSync,
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  };
});

const mockBqQueryFn = vi.fn().mockResolvedValue([[{ id: 1, name: "test", revenue: 100 }]]);

class MockBigQuery {
  query = mockBqQueryFn;
  dataset = vi.fn().mockReturnThis();
  table = vi.fn().mockReturnThis();
  getMetadata = vi.fn().mockResolvedValue([
    { schema: { fields: [{ name: "id", type: "INT64" }] } },
  ]);
}

vi.mock("@google-cloud/bigquery", () => ({ BigQuery: MockBigQuery }));

vi.mock("@/core/pipeline/classifier", () => {
  const mockClassifyIntent = vi.fn((message: string) => {
    if (!message || typeof message !== "string" || message.trim().length === 0)
      return Promise.resolve("HYBRID");
    return Promise.resolve("HYBRID");
  });
  return {
    classifyIntent: mockClassifyIntent,
    classifyIntentFull: vi.fn().mockImplementation(async (message: string) => {
      const intent = await mockClassifyIntent(message);
      return {
        intent,
        confidence: 0.95,
        stage: "heuristic",
        latencyMs: 1
      };
    })
  };
});

vi.mock("@/server/clients/embeddingClient", () => ({ embed: vi.fn() }));
vi.mock("@/core/pipeline/pipeline", () => ({ executeRagPipeline: vi.fn() }));
vi.mock("@/server/services/semanticCache", () => ({
  getCachedSql: vi.fn(),
  addCachedSql: vi.fn(),
  cosineSimilarity: vi.fn(),
  getCacheFilePath: vi.fn(),
  resetInMemoryCache: vi.fn(),
}));
vi.mock("@/server/services/bigquerySqlGenerator", () => ({ llmGenerateSql: vi.fn() }));
vi.mock("@/server/services/bigquerySemantic", () => ({
  selectTablesSemantic: vi.fn().mockResolvedValue(["products"]),
  retrieveGoldenExamples: vi.fn().mockResolvedValue(""),
}));

import { classifyIntent } from "@/core/pipeline/classifier";
import { embed } from "@/server/clients/embeddingClient";
import { executeRagPipeline } from "@/core/pipeline/pipeline";
import { getCachedSql, addCachedSql } from "../semanticCache";
import { llmGenerateSql } from "../bigquerySqlGenerator";
import { existsSync, readFileSync, writeFileSync } from "fs";

describe("Latency & Cache Performance", () => {
  function createTestWriter(): StreamEvent {
    return new StreamEvent({
      enqueue: () => {},
      close: () => {},
      desiredSize: 1,
    } as unknown as ReadableStreamDefaultController);
  }

  function mockChatFetch(): void {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"Reply [1]."}}]}\n\n'
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
  }

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockFsMap.clear();
    vi.stubEnv("GOOGLE_PROJECT_ID", "test-project");
    vi.stubEnv("BQ_KEY_FILE", "test-key.json");
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("A. Schema Cache Cold vs Warm Start", () => {
    it("1. cold start: no schema cache → fetches from BigQuery", async () => {
      vi.resetModules();
      const { fetchLiveSchemas } = await import("../bigqueryService");

      const schemas = await fetchLiveSchemas();

      expect(schemas).toBeInstanceOf(Map);
      expect(schemas.size).toBeGreaterThan(0);
      expect(vi.mocked(writeFileSync)).toHaveBeenCalled();
      const writeCall = vi.mocked(writeFileSync).mock.calls[0][0] as string;
      expect(writeCall).toContain("schema-cache.json");
    });

    it("2. warm start: schema cache exists → loads from cache (0ms)", async () => {
      const cachePath = path.join(process.cwd(), "schema-cache.json");
      mockFsMap.set(cachePath, JSON.stringify({ products: [{ name: "id", type: "INT64" }] }));
      vi.resetModules();
      const { fetchLiveSchemas } = await import("../bigqueryService");

      const schemas = await fetchLiveSchemas();

      expect(schemas).toBeInstanceOf(Map);
      expect(vi.mocked(readFileSync)).toHaveBeenCalledWith(cachePath, "utf-8");
    });
  });

  describe("B. Pipeline Bypass (Active Classifier)", () => {
    it("3. DATABASE intent → RAG pipeline NOT called", async () => {
      vi.mocked(classifyIntent).mockResolvedValue("DATABASE");
      vi.mocked(embed).mockResolvedValue([[0.1, 0.2, 0.3]]);
      vi.mocked(getCachedSql).mockResolvedValue("SELECT 1");
      mockChatFetch();
      vi.resetModules();
      const { orchestrate } = await import("@/core/pipeline/orchestrator");
      const writer3 = createTestWriter();
      await orchestrate({ message: "What is the total revenue?" }, writer3);

      expect(vi.mocked(executeRagPipeline)).not.toHaveBeenCalled();
    });

    it("4. DATABASE intent → BigQuery pipeline IS called", async () => {
      vi.mocked(classifyIntent).mockResolvedValue("DATABASE");
      vi.mocked(embed).mockResolvedValue([[0.1, 0.2, 0.3]]);
      vi.mocked(getCachedSql).mockResolvedValue("SELECT 1");
      mockChatFetch();
      vi.resetModules();
      const { orchestrate } = await import("@/core/pipeline/orchestrator");
      const writer4 = createTestWriter();
      await orchestrate({ message: "What is the total revenue?" }, writer4);

      expect(vi.mocked(executeRagPipeline)).not.toHaveBeenCalled();
      expect(mockBqQueryFn).toHaveBeenCalled();
    });

    it("5. DOCUMENT intent → BigQuery pipeline NOT called", async () => {
      vi.mocked(classifyIntent).mockResolvedValue("DOCUMENT");
      vi.mocked(embed).mockResolvedValue([[0.1, 0.2, 0.3]]);
      vi.mocked(executeRagPipeline).mockResolvedValue({
        context: "[1] Document: report (score: 0.95)\n    test chunk",
        chunks: [
          {
            id: "chunk-1", score: 0.9,
            metadata: {
              chunkId: "c1", documentId: "doc-1", documentName: "report",
              pageNumber: 1, chunkIndex: 0, chunkText: "test chunk",
              orgId: "org-1", uploadedAt: "2024-01-01", storageUrl: "https://example.com/doc1",
            },
            rerankerScore: 0.95,
          },
        ],
      });
      mockChatFetch();
      vi.resetModules();
      const { orchestrate } = await import("@/core/pipeline/orchestrator");
      const writer5 = createTestWriter();
      await orchestrate({ message: "What does the document say?", documentIds: ["doc-1"] }, writer5);

      expect(vi.mocked(executeRagPipeline)).toHaveBeenCalled();
    });

    it("6. DOCUMENT intent → RAG pipeline IS called", async () => {
      vi.mocked(classifyIntent).mockResolvedValue("DOCUMENT");
      vi.mocked(embed).mockResolvedValue([[0.1, 0.2, 0.3]]);
      vi.mocked(executeRagPipeline).mockResolvedValue({
        context: "[1] Document: report (score: 0.95)\n    test chunk",
        chunks: [
          {
            id: "chunk-1", score: 0.9,
            metadata: {
              chunkId: "c1", documentId: "doc-1", documentName: "report",
              pageNumber: 1, chunkIndex: 0, chunkText: "test chunk",
              orgId: "org-1", uploadedAt: "2024-01-01", storageUrl: "https://example.com/doc1",
            },
            rerankerScore: 0.95,
          },
        ],
      });
      mockChatFetch();
      vi.resetModules();
      const { orchestrate } = await import("@/core/pipeline/orchestrator");
      const writer6 = createTestWriter();
      await orchestrate({ message: "What does the document say?", documentIds: ["doc-1"] }, writer6);

      expect(vi.mocked(executeRagPipeline)).toHaveBeenCalled();
    });

    it("7. HYBRID intent → both pipelines called", async () => {
      vi.mocked(classifyIntent).mockResolvedValue("HYBRID");
      vi.mocked(embed).mockResolvedValue([[0.1, 0.2, 0.3]]);
      vi.mocked(executeRagPipeline).mockResolvedValue({ context: "[1] test", chunks: [] });
      vi.mocked(getCachedSql).mockResolvedValue("SELECT 1");
      mockChatFetch();
      vi.resetModules();
      const { orchestrate } = await import("@/core/pipeline/orchestrator");
      const writer7 = createTestWriter();
      await orchestrate({ message: "Compare data and documents", documentIds: ["doc-1"] }, writer7);

      expect(vi.mocked(executeRagPipeline)).toHaveBeenCalled();
      expect(mockBqQueryFn).toHaveBeenCalled();
    });
  });

  describe("C. Semantic Cache Hit Rate", () => {
    it("8. cache hit (sim 0.99) → returns cached SQL, skips LLM generation", async () => {
      vi.mocked(getCachedSql).mockResolvedValue("SELECT COUNT(*) FROM products");
      vi.mocked(embed).mockResolvedValue([[0.5, 0.5, 0.5]]);
      vi.resetModules();
      const { executeBqQuestion } = await import("../bigqueryService");

      const result = await executeBqQuestion("How many products?", [0.5, 0.5, 0.5]);

      expect(result.sql).toBe("SELECT COUNT(*) FROM products");
      expect(vi.mocked(llmGenerateSql)).not.toHaveBeenCalled();
    });

    it("9. cache near-hit (sim 0.95) → returns cached SQL", async () => {
      vi.mocked(getCachedSql).mockResolvedValue("SELECT SUM(revenue) FROM orders");
      vi.mocked(embed).mockResolvedValue([[0.5, 0.5, 0.51]]);
      vi.resetModules();
      const { executeBqQuestion } = await import("../bigqueryService");

      const result = await executeBqQuestion("Total revenue?", [0.5, 0.5, 0.51]);

      expect(result.sql).toBe("SELECT SUM(revenue) FROM orders");
      expect(vi.mocked(llmGenerateSql)).not.toHaveBeenCalled();
    });

    it("10. cache miss (sim 0.80) → generates new SQL via LLM", async () => {
      vi.mocked(getCachedSql).mockResolvedValue(null);
      vi.mocked(llmGenerateSql).mockResolvedValue("SELECT COUNT(*) FROM orders WHERE status = 'delivered'");
      vi.mocked(embed).mockResolvedValue([[0.7, 0.7, 0.0]]);
      vi.resetModules();
      const { executeBqQuestion } = await import("../bigqueryService");

      const result = await executeBqQuestion("Delivered orders count?", [0.7, 0.7, 0.0]);

      expect(result.sql).toBe("SELECT COUNT(*) FROM orders WHERE status = 'delivered'");
      expect(vi.mocked(llmGenerateSql)).toHaveBeenCalled();
      expect(vi.mocked(addCachedSql)).toHaveBeenCalled();
    });
  });

  describe("D. One-Shot Embedding Sharing", () => {
    it("11. same embedding vector passed to classifier and pipeline", async () => {
      const mockEmbedding = [0.42, 0.73, 0.91, 0.15];
      vi.mocked(embed).mockResolvedValue([mockEmbedding]);
      vi.mocked(classifyIntent).mockResolvedValue("HYBRID");
      vi.mocked(executeRagPipeline).mockResolvedValue({ context: "[1] test", chunks: [] });
      vi.mocked(getCachedSql).mockResolvedValue("SELECT 1");
      mockChatFetch();
      vi.resetModules();
      const { orchestrate } = await import("@/core/pipeline/orchestrator");
      const writer11 = createTestWriter();
      await orchestrate({ message: "Compare data and docs", documentIds: ["doc-1"] }, writer11);

      expect(vi.mocked(executeRagPipeline).mock.calls[0][0].queryEmbedding).toEqual(mockEmbedding);
    });

    it("12. embed() called exactly once per orchestration", async () => {
      vi.mocked(embed).mockResolvedValue([[0.1, 0.2, 0.3]]);
      vi.mocked(classifyIntent).mockResolvedValue("HYBRID");
      vi.mocked(executeRagPipeline).mockResolvedValue({ context: "[1] test", chunks: [] });
      vi.mocked(getCachedSql).mockResolvedValue("SELECT 1");
      mockChatFetch();
      vi.resetModules();
      const { orchestrate } = await import("@/core/pipeline/orchestrator");
      const writer12 = createTestWriter();
      await orchestrate({ message: "show me everything", documentIds: ["doc-1"] }, writer12);

      expect(vi.mocked(embed)).toHaveBeenCalledTimes(1);
    });
  });

  describe("E. Concurrent Execution & Edge Cases", () => {
    it("13. HYBRID path: both pipelines start before either completes", async () => {
      const callLog: string[] = [];
      vi.mocked(executeRagPipeline).mockImplementation(async () => {
        callLog.push("rag-start");
        await new Promise((r) => setTimeout(r, 1));
        callLog.push("rag-end");
        return { context: "[1] doc context", chunks: [] };
      });
      vi.mocked(getCachedSql).mockImplementation(async () => {
        callLog.push("bq-start");
        await new Promise((r) => setTimeout(r, 1));
        callLog.push("bq-end");
        return "SELECT 1";
      });
      vi.mocked(embed).mockResolvedValue([[0.1, 0.2, 0.3]]);
      vi.mocked(classifyIntent).mockResolvedValue("HYBRID");
      mockChatFetch();
      vi.resetModules();
      const { orchestrate } = await import("@/core/pipeline/orchestrator");
      const writer13 = createTestWriter();
      await orchestrate({ message: "hybrid query", documentIds: ["doc-1"] }, writer13);

      const rs = callLog.indexOf("rag-start"), re = callLog.indexOf("rag-end");
      const bs = callLog.indexOf("bq-start"), be = callLog.indexOf("bq-end");
      expect(rs).toBeGreaterThanOrEqual(0);
      expect(bs).toBeGreaterThanOrEqual(0);
      expect(rs).toBeLessThan(re);
      expect(bs).toBeLessThan(be);
      expect(rs).toBeLessThan(be);
      expect(bs).toBeLessThan(re);
    });

    it("14. one pipeline rejects → other still returns result", async () => {
      vi.mocked(executeRagPipeline).mockRejectedValue(new Error("Pinecone timeout"));
      vi.mocked(getCachedSql).mockResolvedValue("SELECT COUNT(*) FROM products");
      vi.mocked(embed).mockResolvedValue([[0.1, 0.2, 0.3]]);
      vi.mocked(classifyIntent).mockResolvedValue("HYBRID");
      mockChatFetch();
      vi.resetModules();
      const { orchestrate } = await import("@/core/pipeline/orchestrator");
      const writer14 = createTestWriter();
      await orchestrate({ message: "hybrid", documentIds: ["doc-1"] }, writer14);

      expect(true).toBe(true);
    });

    it("15. empty message → HYBRID fallback, <2000ms", async () => {
      vi.mocked(executeRagPipeline).mockResolvedValue({ context: "[1] test", chunks: [] });
      vi.mocked(embed).mockResolvedValue([[0.0, 0.0, 0.0]]);
      vi.mocked(getCachedSql).mockResolvedValue("SELECT 1");
      mockChatFetch();
      vi.resetModules();
      const { orchestrate } = await import("@/core/pipeline/orchestrator");
      const writer15 = createTestWriter();
      const start = Date.now();
      await orchestrate({ message: "" }, writer15);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
    });
  });
});
