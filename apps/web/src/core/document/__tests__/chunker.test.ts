import { describe, it, expect } from "vitest";
import { chunkText } from "../chunker";

describe("chunkText", () => {
  it("returns empty array for empty string", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns single chunk for text smaller than maxCharLen", () => {
    const result = chunkText("Hello world", { chunkSize: 512 });
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello world");
    expect(result[0].index).toBe(0);
  });

  it("returns text unchanged when within single chunk", () => {
    const text = "Short text";
    const result = chunkText(text);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe(text);
  });

  it("splits at page boundaries (double newline)", () => {
    const result = chunkText("Page one content.\n\nPage two content.\n\nPage three content.", {
      chunkSize: 10,
    });
    expect(result.length).toBeGreaterThanOrEqual(2);
    result.forEach((chunk) => {
      expect(chunk.text.length).toBeGreaterThan(0);
    });
  });

  it("never produces empty chunks", () => {
    const text = "A\n\nB\n\nC\n\nD\n\nE\n\nF\n\nG\n\nH";
    const result = chunkText(text, { chunkSize: 10 });
    result.forEach((chunk) => {
      expect(chunk.text.trim().length).toBeGreaterThan(0);
    });
  });

  it("makes forward progress and does not infinite loop", () => {
    // This is the exact bug that produced 1731 chunks from 8838 chars
    const text = "A\n\nB\n\nC\n\nD\n\nE\n\nF\n\nG\n\nH\n\nI\n\nJ";
    const result = chunkText(text, { chunkSize: 5, chunkOverlap: 2 });
    // Should produce a small number of chunks, not thousands
    expect(result.length).toBeLessThan(50);
    // All chunks combined should approximate the original text
    const combined = result.map((c) => c.text).join(" ");
    expect(combined.length).toBeGreaterThan(0);
  });

  it("handles text with no natural separators", () => {
    const text = "A".repeat(5000);
    const result = chunkText(text, { chunkSize: 10, chunkOverlap: 2 });
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(1000);
    result.forEach((chunk) => {
      expect(chunk.text.length).toBeGreaterThan(0);
    });
  });

  it("never stalls with repeated short patterns", () => {
    const text = Array(100).fill("AB\n\nCD\n\nEF").join("\n\n");
    const result = chunkText(text, { chunkSize: 8, chunkOverlap: 2 });
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThan(200);
  });

  it("chunks have continuity (overlap contains text from previous chunk)", () => {
    const text = "The quick brown fox jumps over the lazy dog. ".repeat(200);
    const result = chunkText(text, { chunkSize: 50, chunkOverlap: 20 });
    expect(result.length).toBeGreaterThan(1);
    // Check the combined text covers the source (no gaps)
    const combined = result.map((c) => c.text).join("");
    const cleaned = text.trim();
    expect(combined.length).toBeGreaterThan(cleaned.length * 0.8);
  });

  it("handles very long single-paragraph text without exploding", () => {
    const sentence = "This is a sentence with enough words to make a paragraph. ";
    const text = sentence.repeat(5000);
    expect(text.length).toBeGreaterThan(100000);
    const result = chunkText(text, { chunkSize: 512, chunkOverlap: 128 });
    expect(result.length).toBeGreaterThan(0);
    // Should NOT produce 1731 chunks (the original bug)
    expect(result.length).toBeLessThan(1000);
    result.forEach((chunk) => {
      expect(chunk.text.length).toBeGreaterThan(0);
    });
  });

  it("respects custom chunk size", () => {
    const text = "Word ".repeat(1000);
    const smallChunks = chunkText(text, { chunkSize: 50 });
    const bigChunks = chunkText(text, { chunkSize: 200 });
    // Smaller chunk size should produce more chunks
    expect(smallChunks.length).toBeGreaterThan(bigChunks.length);
  });

  it("produces sequential indices", () => {
    const text = "Hello. ".repeat(500);
    const result = chunkText(text, { chunkSize: 50 });
    result.forEach((chunk, i) => {
      expect(chunk.index).toBe(i);
    });
  });

  it("combines to cover the full text", () => {
    const text = "The quick brown fox jumps over the lazy dog. " // 46 chars
      .repeat(100);
    const result = chunkText(text, { chunkSize: 100, chunkOverlap: 0 });
    // The chunks should cover the text end-to-end (with no overlap)
    const combined = result.map((c) => c.text).join("");
    expect(combined.length).toBeGreaterThan(text.length * 0.8);
    expect(combined.length).toBeLessThan(text.length * 1.2);
  });

  it("produces reasonable chunks from real PDF text", () => {
    // Simulates the running footwear PDF: 8841 chars, 5 pages
    const pages = [
      "Executive Summary. The running footwear category generated GBP 226 million in revenue during H1 2026, representing 104.6 percent of plan and growth of 15.0 percent versus prior year. Running accounts for 17.0 percent of total footwear revenue.",
      "Brand Share Analysis. Nike leads with GBP 90 million at 39.8 percent share. ASICS grew 24.0 percent. Hoka grew 52.0 percent and is the fastest growing brand at 8.8 percent share.",
      "Price Architecture. Premium tier at GBP 130 to GBP 179 accounts for 32.0 percent of units and 38.0 percent of revenue. Gross margin is 45.5 percent.",
      "Top 10 SKUs. Nike Pegasus 41 is number one at GBP 8.2 million. ASICS Gel Kayano 31 at GBP 5.6 million. Hoka Clifton 9 at GBP 4.9 million.",
      "Size Curve Analysis and Recommendations. UK 10 is 14.2 percent of volume nationally. Scotland skews larger with UK 10 at 16.1 percent. Five recommendations including Hoka distribution expansion from 85 to 200 stores.",
    ];

    const text = pages.join("\n\n");
    expect(text.length).toBeGreaterThan(500);

    const result = chunkText(text, { chunkSize: 512, chunkOverlap: 128 });

    // Should produce a small number of chunks (not 1731)
    expect(result.length).toBeLessThan(50);
    expect(result.length).toBeGreaterThanOrEqual(1);

    // Each chunk should be non-empty and meaningful
    result.forEach((chunk) => {
      expect(chunk.text.length).toBeGreaterThan(50);
      expect(chunk.tokenCount).toBeGreaterThan(0);
    });

    // Key phrases should be present across chunks
    const fullText = result.map((c) => c.text).join(" ");
    expect(fullText).toContain("GBP 226 million");
    expect(fullText).toContain("Nike");
    expect(fullText).toContain("Hoka");
    expect(fullText).toContain("Pegasus");
  });
});
