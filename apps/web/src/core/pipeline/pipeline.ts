import { embed } from "@/server/clients/embeddingClient";
import { rerank } from "@/server/clients/rerankClient";
import type { RerankDoc } from "@/server/clients/rerankClient";
import { searchChunks } from "@/server/services/vectorService";
import type { SearchResult } from "@/server/services/vectorService";

export interface PipelineInput {
  message: string;
  documentIds: string[];
  queryEmbedding?: number[];
}

export interface RerankedChunk extends SearchResult {
  rerankerScore: number;
}

export interface RagPipelineResult {
  context: string;
  chunks: RerankedChunk[];
}

export async function executeRagPipeline(input: PipelineInput): Promise<RagPipelineResult> {
  const { message, documentIds, queryEmbedding: precomputedEmbedding } = input;

  let queryEmbedding: number[];
  if (precomputedEmbedding) {
    queryEmbedding = precomputedEmbedding;
  } else {
    console.time("rag:embed");
    const [embedded] = await embed([message]);
    queryEmbedding = embedded;
    console.timeEnd("rag:embed");
  }

  const filter =
    documentIds.length > 0
      ? { documentId: { "$in": documentIds } }
      : undefined;

  console.time("rag:search");
  const candidates = await searchChunks(queryEmbedding, {
    topK: 40,
    filter,
  });
  console.timeEnd("rag:search");

  if (candidates.length === 0) {
    return { context: "", chunks: [] };
  }

  const rerankDocs: RerankDoc[] = candidates.map((c) => ({
    id: c.id,
    text: c.metadata.chunkText,
  }));

  let topChunks;
  try {
    console.time("rag:rerank");
    const reranked = await rerank(message, rerankDocs, 3);
    console.timeEnd("rag:rerank");
    const slicedReranked = reranked.slice(0, 3);
    topChunks = slicedReranked.map((r) => ({
      ...candidates[r.index],
      rerankerScore: r.relevance_score,
    }));
  } catch (err) {
    console.warn("[pipeline] Reranker failed, falling back to raw vector search scores:", err);
    topChunks = candidates.slice(0, 3).map((c) => ({
      ...c,
      rerankerScore: c.score,
    }));
  }

  const context = topChunks
    .map((c, i) => {
      const meta = c.metadata;
      const score = c.rerankerScore;
      return `[${i + 1}] Document: "${meta.documentName}" (score: ${score.toFixed(2)})\n    ${meta.chunkText}`;
    })
    .join("\n\n");

  return { context, chunks: topChunks };
}
