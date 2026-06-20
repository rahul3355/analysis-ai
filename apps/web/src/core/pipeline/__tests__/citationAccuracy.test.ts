import { describe, it, expect } from "vitest";
import { verifyCitations } from "../verification";
import type { SearchResult } from "@/server/services/vectorService";

function ch(id: number, docId: string, text: string): SearchResult {
  return {
    id: `c-${id}`,
    score: 0.9,
    metadata: {
      chunkId: `c-${id}`,
      documentId: docId,
      documentName: `Doc ${docId}`,
      chunkText: text,
      chunkIndex: id,
      pageNumber: 1,
      orgId: "default",
      uploadedAt: new Date().toISOString(),
      storageUrl: "",
    },
  };
}

describe("Citation Accuracy — verifyCitations()", () => {
  it("no markers present → no_citations_needed", () => {
    const r = verifyCitations("JD Sports has 472 stores.", [ch(0, "d1", "stores")]);
    expect(r.verdict).toBe("no_citations_needed");
    expect(r.citations).toHaveLength(0);
    expect(r.failedCount).toBe(0);
  });

  it("removes OOB citation [99] — hallucination guard", () => {
    // Source text must overlap with reply to pass term check for [1]
    const r = verifyCitations("source [1] and [99] fake", [ch(0, "d1", "source test fake")]);
    expect(r.failedCount).toBe(1);
    expect(r.citations).toHaveLength(1);
    expect(r.citations[0].sourceId).toBe("d1");
    expect(r.reply).not.toContain("[99]");
    expect(r.reply).toContain("[1]");
  });

  it("removes OOB citation [0] — invalid zero index", () => {
    const r = verifyCitations("claim [0] invalid", [ch(0, "d1", "test")]);
    expect(r.failedCount).toBe(1);
    expect(r.citations).toHaveLength(0);
    expect(r.reply).not.toContain("[0]");
  });

  it("removes citation with low term overlap (< 40%) against source", () => {
    const r = verifyCitations("weather rainy cold today [1]", [ch(0, "d1", "quick brown fox jumps lazy dog")]);
    expect(r.failedCount).toBe(1);
    expect(r.citations).toHaveLength(0);
    expect(r.reply).not.toContain("[1]");
  });

  it("preserves citation with sufficient term overlap (>= 40%)", () => {
    const r = verifyCitations("Nike revenue Q3 GBP million [1]", [ch(0, "d1", "Nike revenue Q3 generated GBP million")]);
    expect(r.failedCount).toBe(0);
    expect(r.citations).toHaveLength(1);
    expect(r.citations[0].sourceId).toBe("d1");
  });

  it("strips all citation markers when chunks array is empty", () => {
    const r = verifyCitations("hello [1] world [2]", []);
    expect(r.failedCount).toBe(2);
    expect(r.citations).toHaveLength(0);
    expect(r.reply).toBe("hello  world ");
  });

  it("handles empty reply string gracefully", () => {
    const r = verifyCitations("", [ch(0, "d1", "test")]);
    expect(r.reply).toBe("");
    expect(r.citations).toHaveLength(0);
    expect(r.verdict).toBe("no_citations_needed");
  });

  it("verdict = low_confidence when failure rate > 25%", () => {
    // Source chunks include digits that appear in reply to pass overlap
    const cs = [
      ch(0, "d1", "store count 1 2 3 999 1000"),
      ch(1, "d2", "store budget 1 2 3 999 1000"),
      ch(2, "d3", "budget count 1 2 3 999 1000"),
    ];
    const r = verifyCitations("store count budget [1] [2] [3] [999] [1000]", cs);
    expect(r.totalCount).toBe(5);
    expect(r.failedCount).toBe(2);
    expect(r.verdict).toBe("low_confidence");
  });

  it("verdict = verified when failure rate <= 25%", () => {
    const cs = [
      ch(0, "d1", "store count 1 2 3 999"),
      ch(1, "d2", "store budget 1 2 3 999"),
      ch(2, "d3", "budget count 1 2 3 999"),
    ];
    const r = verifyCitations("store count budget [1] [2] [3] [999]", cs);
    expect(r.totalCount).toBe(4);
    expect(r.failedCount).toBe(1);
    expect(r.verdict).toBe("verified");
  });
});
