import { getPineconeClient, getIndexConfig } from "@/server/config/pinecone";

export interface ChunkMetadata {
  [key: string]: string | number | boolean | Array<string>;
  chunkId: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  chunkIndex: number;
  chunkText: string;
  orgId: string;
  uploadedAt: string;
  storageUrl: string;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: ChunkMetadata;
}

export interface SearchOptions {
  topK?: number;
  filter?: Record<string, unknown>;
  namespace?: string;
}

const BATCH_SIZE = 100;

export async function upsertChunks(
  chunks: { id: string; values: number[]; metadata: ChunkMetadata }[],
  namespace?: string
): Promise<void> {
  if (chunks.length === 0) return;

  const pc = getPineconeClient();
  const { host, indexName } = getIndexConfig();
  const index = pc.index({ name: indexName, host });

  const target = namespace ? index.namespace(namespace) : index;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    await target.upsert({
      records: batch.map((c) => ({
        id: c.id,
        values: c.values,
        metadata: c.metadata as Record<string, string | number | boolean | string[]>,
      })),
    });
  }
}

export async function searchChunks(
  queryEmbedding: number[],
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const { topK = 20, filter, namespace } = options;
  const pc = getPineconeClient();
  const { host, indexName } = getIndexConfig();

  const index = pc.index({ name: indexName, host });

  const target = namespace ? index.namespace(namespace) : index;

  const result = await target.query({
    vector: queryEmbedding,
    topK,
    filter: filter as object,
    includeMetadata: true,
  });

  return (result.matches ?? []).map((match) => ({
    id: match.id,
    score: match.score ?? 0,
    metadata: match.metadata as unknown as ChunkMetadata,
  }));
}

export async function deleteDocumentChunks(
  documentId: string,
  namespace?: string
): Promise<void> {
  const pc = getPineconeClient();
  const { host, indexName } = getIndexConfig();
  const index = pc.index({ name: indexName, host });

  const target = namespace ? index.namespace(namespace) : index;

  await target.deleteMany({
    filter: { documentId: { "$eq": documentId } },
  });
}

export async function getIndexStats(namespace?: string): Promise<{ totalVectorCount: number; namespaces: Record<string, { vectorCount: number }> }> {
  const pc = getPineconeClient();
  const { host, indexName } = getIndexConfig();
  const index = pc.index({ name: indexName, host });
  const stats = await index.describeIndexStats();
  return {
    totalVectorCount: stats.totalRecordCount ?? 0,
    namespaces: Object.fromEntries(
      Object.entries(stats.namespaces ?? {}).map(([k, v]) => [k, { vectorCount: v.recordCount ?? 0 }])
    ),
  };
}

export async function deleteAllChunks(namespace?: string): Promise<void> {
  const pc = getPineconeClient();
  const { host, indexName } = getIndexConfig();
  const index = pc.index({ name: indexName, host });

  const target = namespace ? index.namespace(namespace) : index;

  await target.deleteAll();
}

export { getPineconeClient, getIndexConfig };
