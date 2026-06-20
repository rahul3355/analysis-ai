import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { rerank } from "@/server/clients/rerankClient";

describe("Rerank Client Integration Test with NVIDIA Llama Nemotron Rerank VL 1B V2", () => {
  beforeAll(() => {
    // Manually load OPENROUTER_API_KEY from .env.local if not already in process.env
    if (!process.env.OPENROUTER_API_KEY) {
      const envPath = path.resolve(__dirname, "../../.env.local");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf8");
        const match = content.match(/OPENROUTER_API_KEY\s*=\s*(.*)/);
        if (match && match[1]) {
          process.env.OPENROUTER_API_KEY = match[1].trim().replace(/['"]/g, "");
        }
      }
    }
  });

  it("should successfully send a query to the NVIDIA model on OpenRouter and receive reranked results", async () => {
    const query = "What is the capital of France?";
    const documents = [
      { id: "doc1", text: "London is the capital of the United Kingdom." },
      { id: "doc2", text: "Paris is the capital of France." },
      { id: "doc3", text: "Berlin is the capital of Germany." }
    ];

    const results = await rerank(query, documents, 2);

    console.log("Rerank results from actual client:", results);

    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty("index");
    expect(results[0]).toHaveProperty("relevance_score");

    // The Paris document (index 1) should be scored higher than the London/Berlin documents
    // since query is about France.
    const topResult = results[0];
    expect(topResult.index).toBe(1);
  });
});
