import type { Citation } from "@analysis-ai/types";
import type { SearchResult } from "@/server/services/vectorService";
import { getUniqueId } from "@/lib/id";

export interface VerifiedResult {
  reply: string;
  citations: Citation[];
  verdict: "verified" | "low_confidence" | "no_citations_needed";
  failedCount: number;
  totalCount: number;
}

const HALLUCINATION_RATE_MAX = 0.25;
const MIN_TERM_OVERLAP = 0.4;

const STOP_WORDS = new Set([
  "the", "this", "that", "and", "are", "for", "not", "but", "had",
  "has", "was", "were", "with", "from", "they", "you", "its",
  "what", "which", "their", "them", "been", "have", "will", "would",
  "could", "should", "about", "than", "into", "also", "very", "just",
  "over", "such", "each", "only", "more", "some", "these", "those",
  "when", "where", "how", "does", "did", "can", "may", "then",
  "total", "amount", "value", "data", "report", "sales", "cost",
  "percent", "quarter", "annual", "year", "month", "price", "rate",
]);

function extractKeyTerms(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[\[\](){}"",.!?;:']/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 || /\d+/.test(w))
      .filter((w) => !STOP_WORDS.has(w))
  );
}

function computeTermOverlap(claimTerms: Set<string>, sourceTerms: Set<string>): number {
  if (claimTerms.size === 0) return 0;
  let found = 0;
  for (const term of claimTerms) {
    if (sourceTerms.has(term)) found++;
  }
  return found / claimTerms.size;
}

function extractClaimAroundCitation(fullText: string, matchIndex: number, markerLength: number): string {
  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(fullText.length, matchIndex + markerLength + 60);
  return fullText.slice(start, end);
}

export function verifyCitations(
  reply: string,
  docChunks: SearchResult[]
): VerifiedResult {
  const regex = /\[(\d+)\]/g;
  const citations: Citation[] = [];
  const markersToRemove: Array<{ full: string; index: number }> = [];
  let verifiedReply = reply;
  let failedCount = 0;
  let totalCount = 0;

  const allMatches: Array<{ full: string; index: number; idx: number; matchIndex: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(reply)) !== null) {
    allMatches.push({
      full: match[0],
      index: match.index,
      idx: parseInt(match[1], 10),
      matchIndex: match.index,
    });
  }

  totalCount = allMatches.length;

  if (totalCount === 0) {
    return { reply, citations: [], verdict: "no_citations_needed", failedCount: 0, totalCount: 0 };
  }

  const sourceTermCache = new Map<number, Set<string>>();
  for (const m of allMatches) {
    const chunkIdx = m.idx - 1;
    if (chunkIdx >= 0 && chunkIdx < docChunks.length && !sourceTermCache.has(m.idx)) {
      sourceTermCache.set(m.idx, extractKeyTerms(docChunks[chunkIdx].metadata.chunkText));
    }
  }

  for (const { full, index, idx, matchIndex } of allMatches) {
    const chunkIdx = idx - 1;

    if (chunkIdx < 0 || chunkIdx >= docChunks.length) {
      markersToRemove.push({ full, index });
      failedCount++;
      continue;
    }

    const claimText = extractClaimAroundCitation(reply, matchIndex, full.length);
    const claimTerms = extractKeyTerms(claimText);
    const sourceTerms = sourceTermCache.get(idx) ?? new Set();
    const overlap = computeTermOverlap(claimTerms, sourceTerms);

    if (overlap < MIN_TERM_OVERLAP && claimTerms.size > 0) {
      markersToRemove.push({ full, index });
      failedCount++;
    } else {
      const chunk = docChunks[chunkIdx];
      const excerpt = chunk.metadata.chunkText;
      citations.push({
        id: getUniqueId("c"),
        sourceId: chunk.metadata.documentId,
        label: `${chunk.metadata.documentName}${
          chunk.metadata.pageNumber ? ` (Page ${chunk.metadata.pageNumber})` : ""
        }`,
        excerpt: excerpt.length > 200 ? excerpt.slice(0, 200) + "..." : excerpt,
        documentName: chunk.metadata.documentName,
        pageNumber: chunk.metadata.pageNumber,
        relevanceScore: chunk.score,
        type: "document",
      });
    }
  }

  if (markersToRemove.length > 0) {
    markersToRemove.sort((a, b) => b.index - a.index);
    for (const { full, index: pos } of markersToRemove) {
      verifiedReply = verifiedReply.slice(0, pos) + verifiedReply.slice(pos + full.length);
    }
  }

  const hallucinationRate = totalCount > 0 ? failedCount / totalCount : 0;
  const verdict = hallucinationRate > HALLUCINATION_RATE_MAX ? "low_confidence" : "verified";

  return { reply: verifiedReply, citations, verdict, failedCount, totalCount };
}
