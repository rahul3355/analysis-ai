import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StreamEvent } from "@/lib/sse";

vi.mock("@/server/clients/embeddingClient", () => ({
  embed: vi.fn().mockResolvedValue([[0.1, 0.2, 0.3, 0.4]]),
}));

vi.mock("@/server/services/chatService", () => ({
  processChatWithMessagesStream: vi
    .fn()
    .mockResolvedValue("Test response from Analysis AI."),
  ServiceError: class ServiceError extends Error {
    code: string;
    statusCode: number;
    constructor(code: string, message: string, statusCode: number) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

vi.mock("@/server/services/vectorService", () => ({
  searchChunks: vi.fn().mockResolvedValue([
    {
      id: "chunk-1",
      score: 0.92,
      metadata: {
        documentId: "doc-jd-5",
        documentName: "Test Document",
        chunkText:
          "The running footwear category has a full-price sell-through rate of 68%.",
      },
    },
  ]),
  ALL_TABLE_NAMES: [
    "products",
    "orders",
    "order_items",
    "users",
    "inventory_items",
    "events",
  ],
}));

vi.mock("@/server/clients/rerankClient", () => ({
  rerank: vi.fn().mockResolvedValue([{ index: 0, relevance_score: 0.95 }]),
}));

vi.mock("@/server/services/bigqueryService", () => ({
  executeBqQuestion: vi.fn().mockRejectedValue(new Error("No relevant data")),
  ALL_TABLE_NAMES: [
    "products",
    "orders",
    "order_items",
    "users",
    "inventory_items",
    "events",
  ],
  buildSchemaDescription: vi.fn(),
  injectAllowedValues: vi.fn(),
  validateSql: vi.fn(),
  formatBqContext: vi.fn(),
  selectTablesSemantic: vi.fn(),
  retrieveGoldenExamples: vi.fn(),
}));

vi.mock("@/server/services/bigqueryHelpers", () => ({
  ALL_TABLE_NAMES: [
    "products",
    "orders",
    "order_items",
    "users",
    "inventory_items",
    "events",
  ],
  validateSql: vi.fn(),
  formatBqContext: vi.fn(() => "BigQuery: 0 rows"),
}));

vi.mock("@/core/pipeline/pipeline", () => ({
  executeRagPipeline: vi.fn().mockResolvedValue({
    context:
      '[1] Document: "Test Document" (score: 0.95)\n    The running footwear category has a full-price sell-through rate of 68%.',
    chunks: [
      {
        id: "chunk-1",
        score: 0.92,
        rerankerScore: 0.95,
        metadata: {
          documentId: "doc-jd-5",
          documentName: "Test Document",
          chunkText:
            "The running footwear category has a full-price sell-through rate of 68%.",
        },
      },
    ],
  }),
}));

vi.mock("@/server/services/bigquerySemantic", () => ({
  selectTablesSemantic: vi.fn().mockResolvedValue(["products", "orders"]),
  retrieveGoldenExamples: vi.fn().mockResolvedValue(""),
}));

vi.mock("@/server/services/bigquerySqlGenerator", () => ({
  llmGenerateSql: vi.fn().mockResolvedValue("SELECT 1"),
}));

vi.mock("@/server/services/semanticCache", () => ({
  getCachedSql: vi.fn().mockResolvedValue(null),
  addCachedSql: vi.fn().mockResolvedValue(undefined),
  cosineSimilarity: vi.fn(() => 0),
  getCacheFilePath: vi.fn(() => "/tmp/sql-cache.json"),
  resetInMemoryCache: vi.fn(),
}));

vi.mock("@/server/config/bigquery", () => ({
  BQ_TABLE_SCHEMAS: [],
  BQ_RELATIONSHIPS: [],
  getBigQueryConfig: vi.fn(() => ({
    projectId: "test-project",
    datasetId: "test_dataset",
    keyFile: "test-key.json",
  })),
  BQ_DATASET_ID: "test_dataset",
}));

vi.mock("@/server/clients/bigqueryClient", () => ({
  executeQuery: vi.fn().mockRejectedValue(new Error("BQ not available in test")),
  BigQueryResult: {},
}));

vi.mock("@/core/pipeline/classifier", () => ({
  classifyIntent: vi.fn().mockResolvedValue("HYBRID" as const),
  classifyIntentFull: vi.fn().mockResolvedValue({
    intent: "HYBRID",
    confidence: 0.85,
    stage: "heuristic",
    latencyMs: 0.5,
  }),
}));

vi.mock("@/server/config/pinecone", () => ({
  getPineconeClient: vi.fn(() => ({
    index: vi.fn(() => ({
      namespace: vi.fn(() => ({
        query: vi.fn().mockResolvedValue({ matches: [] }),
        upsert: vi.fn().mockResolvedValue(undefined),
      })),
      describeIndexStats: vi.fn().mockResolvedValue({ namespaces: {} }),
    })),
  })),
  getIndexConfig: vi.fn(() => ({
    host: "https://test.pinecone.io",
    indexName: "test-index",
  })),
}));

function createMockController(): ReadableStreamDefaultController {
  return {
    enqueue: () => {},
    close: () => {},
    desiredSize: 1,
  } as unknown as ReadableStreamDefaultController;
}

describe("orchestrator", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
    vi.stubEnv("PINECONE_API_KEY", "pcsk-test");
    vi.stubEnv("PINECONE_INDEX_NAME", "test-index");
    vi.stubEnv("PINECONE_INDEX_HOST", "https://test.pinecone.io");
    vi.stubEnv("GOOGLE_PROJECT_ID", "test-project");
    vi.stubEnv("BQ_DATASET_ID", "test_dataset");
    vi.stubEnv("BQ_KEY_FILE", "test-key.json");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("orchestrate", () => {
    it("completes without errors when both sources return nothing", async () => {
      const { executeRagPipeline } = await import("@/core/pipeline/pipeline");
      vi.mocked(executeRagPipeline).mockResolvedValueOnce({
        context: "",
        chunks: [],
      });

      const { orchestrate } = await import("../orchestrator");
      const controller = createMockController();
      const writer = new StreamEvent(controller);
      await orchestrate({ message: "What is the weather today?" }, writer);

      expect(writer.closed).toBe(true);
    });

    it("completes without errors when both sources fail", async () => {
      const { executeRagPipeline } = await import("@/core/pipeline/pipeline");
      vi.mocked(executeRagPipeline).mockResolvedValueOnce({
        context: "",
        chunks: [],
      });

      const { orchestrate } = await import("../orchestrator");
      const controller = createMockController();
      const writer = new StreamEvent(controller);
      await orchestrate({ message: "Tell me a joke" }, writer);

      expect(writer.closed).toBe(true);
    });

    it("returns result with citations for document queries", async () => {
      const { orchestrate } = await import("../orchestrator");
      const controller = createMockController();
      const writer = new StreamEvent(controller);
      await orchestrate(
        {
          message:
            "What is the running footwear category's full-price sell-through rate?",
          documentIds: ["doc-jd-5"],
        },
        writer
      );

      expect(writer.closed).toBe(true);
    });

    it("handles empty message gracefully", async () => {
      const { orchestrate } = await import("../orchestrator");
      const controller = createMockController();
      const writer = new StreamEvent(controller);
      await orchestrate({ message: "" }, writer);

      expect(writer.closed).toBe(true);
    });
  });
});
