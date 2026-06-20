export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  pageNumber?: number;
  embedding?: Embedding;
}

export interface Embedding {
  vector: number[];
  model: string;
  dimensions: number;
}

export interface VectorSearchResult {
  chunk: DocumentChunk;
  score: number;
}

export type QueryIntent = "document" | "bigquery" | "both" | "none";

export interface BigQueryResult {
  rows: Record<string, unknown>[];
  schema: { name: string; type: string }[];
  rowCount: number;
  executedQuery: string;
  latencyMs: number;
}
