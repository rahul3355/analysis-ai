import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/server/clients/embeddingClient", () => ({
  embed: vi.fn().mockResolvedValue([[Math.random(), Math.random(), Math.random(), Math.random()]]),
}));

import { classifyIntent } from "../classifier";
import { classifyByHeuristics } from "../classifierHeuristics";
import { clearClassificationCache } from "../classifierCache";

describe("classifyIntent — heuristic routing", () => {
  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test-key");
    clearClassificationCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("routes sell-through to DOCUMENT", () => {
    const r = classifyByHeuristics("What is the running footwear category's full-price sell-through rate?");
    expect(r?.intent).toBe("DOCUMENT");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("routes top-3 products to DATABASE", () => {
    const r = classifyByHeuristics("What were our top 3 products by revenue?");
    expect(r?.intent).toBe("DATABASE");
    expect(r?.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("routes hybrid to HYBRID", () => {
    const r = classifyByHeuristics("Hoka grew 52% year on year according to the running deep dive. What was Hoka's revenue?");
    expect(r?.intent).toBe("HYBRID");
  });

  it("routes weather to UNKNOWN", () => {
    const r = classifyByHeuristics("What is the weather in London today?");
    expect(r?.intent).toBe("UNKNOWN");
  });

  it("returns HYBRID for empty message without fetch call", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    expect(await classifyIntent("")).toBe("HYBRID");
    expect(await classifyIntent("   ")).toBe("HYBRID");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
