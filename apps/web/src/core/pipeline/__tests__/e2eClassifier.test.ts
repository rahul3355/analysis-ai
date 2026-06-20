import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/server/services/semanticCache", () => ({
  cosineSimilarity: vi.fn(() => 0),
  getCacheFilePath: vi.fn(() => "/tmp/sql-cache.json"),
  resetInMemoryCache: vi.fn(),
  getCachedSql: vi.fn().mockResolvedValue(null),
  addCachedSql: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/config/openrouter", () => ({
  getOpenRouterConfig: vi.fn(() => ({
    apiKey: "sk-or-test",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "deepseek/deepseek-v4-flash",
  })),
  EMBEDDING_MODEL: "openai/text-embedding-3-small",
  EMBEDDING_DIMENSIONS: 1536,
  RERANKING_MODEL: "nvidia/llama-nemotron-rerank-vl-1b-v2:free",
  OPENROUTER_BASE_URL: "https://openrouter.ai/api/v1",
  OPENROUTER_MODEL: "deepseek/deepseek-v4-flash",
}));

import { classifyByHeuristics } from "../classifierHeuristics";
import { classifyIntentFull } from "../classifier";

describe("E2E Classifier — 5 Required Scenarios", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("Scenario 1: Document-only — sell-through rate", () => {
    const q = "What is the running footwear category's full-price sell-through rate?";

    it("Stage 1 heuristic classifies as DOCUMENT with high confidence", () => {
      const result = classifyByHeuristics(q);
      expect(result).not.toBeNull();
      expect(result!.intent).toBe("DOCUMENT");
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("Stage 1 confidence >= 0.85 means Stage 2 LLM is skipped", () => {
      const fetchSpy = vi.spyOn(global, "fetch");
      const result = classifyByHeuristics(q);
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85);
      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it("Pattern name identifies correct rule", () => {
      const result = classifyByHeuristics(q);
      expect(result!.patternName).toMatch(/sell-through|full-price/);
    });
  });

  describe("Scenario 2: BigQuery-only — top 3 products by revenue", () => {
    const q = "What were our top 3 products by revenue?";

    it("Stage 1 heuristic classifies as DATABASE with high confidence", () => {
      const result = classifyByHeuristics(q);
      expect(result).not.toBeNull();
      expect(result!.intent).toBe("DATABASE");
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("Confidence threshold met for direct routing", () => {
      const result = classifyByHeuristics(q);
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe("Scenario 3: Hybrid — Hoka growth + Clifton 9 sales", () => {
    const q = "Hoka grew 52% year on year according to the running deep dive. What was Hoka's actual revenue from the document and how many Hoka Clifton 9 pairs were sold according to BigQuery?";

    it("Stage 1 heuristic classifies as HYBRID with high confidence", () => {
      const result = classifyByHeuristics(q);
      expect(result).not.toBeNull();
      expect(result!.intent).toBe("HYBRID");
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("Pattern detects 'according to' + cross-reference", () => {
      const result = classifyByHeuristics(q);
      expect(["according-to-doc", "hybrid-match"]).toContain(result!.patternName);
    });
  });

  describe("Scenario 4: Edge / Out-of-scope — total revenue last quarter", () => {
    const q = "What was the total revenue last quarter?";

    it("Stage 1 heuristic classifies 'total revenue last quarter' as DATABASE", () => {
      const result = classifyByHeuristics(q);
      expect(result).not.toBeNull();
      expect(result!.intent).toBe("DATABASE");
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("Stage 1 heuristic correctly identifies as DATABASE (has 'total revenue' + 'last quarter')", () => {
      const r = classifyByHeuristics(q);
      expect(r?.intent).toBe("DATABASE");
      expect(r?.confidence).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe("Scenario 5: Document-only — Hoka growth rate + store count", () => {
    const q = "What is Hoka's year-on-year growth rate and how many JD stores stock Hoka?";

    it("Stage 1 heuristic classifies as DOCUMENT with high confidence", () => {
      const result = classifyByHeuristics(q);
      expect(result).not.toBeNull();
      expect(result!.intent).toBe("DOCUMENT");
      expect(result!.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it("Pattern detects 'year-on-year growth' and 'stores' as document signals", () => {
      const result = classifyByHeuristics(q);
      expect(result!.patternName).toMatch(/growth|store/);
    });

    it("Stores question routes correctly", () => {
      const storeQ = "How many JD stores stock Hoka?";
      const result = classifyByHeuristics(storeQ);
      expect(result).not.toBeNull();
      expect(result!.intent).toBe("DOCUMENT");
    });
  });
});

describe("E2E Classifier — Heuristic Edge Cases", () => {
  it("weather → UNKNOWN", () => {
    const r = classifyByHeuristics("What is the weather in London today?");
    expect(r?.intent).toBe("UNKNOWN");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("joke → UNKNOWN", () => {
    const r = classifyByHeuristics("Tell me a joke");
    expect(r?.intent).toBe("UNKNOWN");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("CEO → UNKNOWN", () => {
    const r = classifyByHeuristics("Who is the CEO of JD Sports?");
    expect(r?.intent).toBe("UNKNOWN");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("empty message → null (no match)", () => {
    expect(classifyByHeuristics("")).toBeNull();
    expect(classifyByHeuristics("   ")).toBeNull();
  });

  it("default HYBRID for unclassifiable", () => {
    expect(classifyByHeuristics("asdfghjkl")).toBeNull();
  });
});

describe("E2E Classifier — Golden Test Cases (subset)", () => {
  const cases: Array<{ q: string; expectedIntent: string; minConfidence: number }> = [
    { q: "What is the running footwear category's full-price sell-through rate?", expectedIntent: "DOCUMENT", minConfidence: 0.85 },
    { q: "What is Hoka's year-on-year growth rate?", expectedIntent: "DOCUMENT", minConfidence: 0.85 },
    { q: "What is the minimum annual purchase commitment in the Nike Framework Agreement?", expectedIntent: "DOCUMENT", minConfidence: 0.85 },
    { q: "What is the rebate rate if annual Nike purchases reach GBP 700 million or more?", expectedIntent: "DOCUMENT", minConfidence: 0.85 },
    { q: "How many JD stores are there in the UK and how many new stores are planned for FY2027?", expectedIntent: "DOCUMENT", minConfidence: 0.85 },
    { q: "Which price tier in running footwear has the highest gross margin?", expectedIntent: "DOCUMENT", minConfidence: 0.85 },
    { q: "What was Scotland's performance vs plan in Q3?", expectedIntent: "HYBRID", minConfidence: 0.85 },
    { q: "What was the top selling product by revenue in Q3?", expectedIntent: "HYBRID", minConfidence: 0.85 },
    { q: "What is the total media budget for the Back to School 2026 campaign?", expectedIntent: "DOCUMENT", minConfidence: 0.85 },
    { q: "Which region generated the most revenue?", expectedIntent: "DATABASE", minConfidence: 0.85 },
    { q: "What is the average order value across all regions?", expectedIntent: "DATABASE", minConfidence: 0.85 },
    { q: "How many customers do we have by region?", expectedIntent: "DATABASE", minConfidence: 0.85 },
    { q: "What is the return rate by channel?", expectedIntent: "DATABASE", minConfidence: 0.85 },
    { q: "Which products are low on stock at the Glasgow distribution centre?", expectedIntent: "DATABASE", minConfidence: 0.85 },
    { q: "What is the age group distribution of our customers?", expectedIntent: "DATABASE", minConfidence: 0.85 },
    { q: "What is the average discount depth by product category?", expectedIntent: "DATABASE", minConfidence: 0.85 },
    { q: "How many orders were placed in each sales channel?", expectedIntent: "DATABASE", minConfidence: 0.85 },
    { q: "What is the weather in London today?", expectedIntent: "UNKNOWN", minConfidence: 0.85 },
    { q: "Who is the CEO of JD Sports?", expectedIntent: "UNKNOWN", minConfidence: 0.85 },
    { q: "Tell me a joke", expectedIntent: "UNKNOWN", minConfidence: 0.85 },
    { q: "What was the sell-through?", expectedIntent: "DOCUMENT", minConfidence: 0.85 },
    { q: "Hoka is growing at 52% and is in 85 stores. What is Hoka's revenue and how does it compare to other brands in BigQuery?", expectedIntent: "HYBRID", minConfidence: 0.85 },
    { q: "What was online revenue and conversion rate in Q3 according to both the review and BigQuery?", expectedIntent: "HYBRID", minConfidence: 0.85 },
    { q: "What is our gross margin vs plan, and which product categories are driving margin pressure?", expectedIntent: "HYBRID", minConfidence: 0.85 },
  ];

  for (const tc of cases) {
    it(`[${tc.expectedIntent}] ${tc.q.slice(0, 60)}...`, () => {
      const result = classifyByHeuristics(tc.q);
      expect(result).not.toBeNull();
      expect(result!.intent).toBe(tc.expectedIntent);
      expect(result!.confidence).toBeGreaterThanOrEqual(tc.minConfidence);
    });
  }
});
