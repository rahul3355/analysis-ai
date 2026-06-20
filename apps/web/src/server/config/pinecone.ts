import { Pinecone } from "@pinecone-database/pinecone";

let cachedClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) throw new Error("PINECONE_API_KEY is not set");
  cachedClient = new Pinecone({ apiKey });
  return cachedClient;
}

export function getIndexConfig() {
  const host = process.env.PINECONE_INDEX_HOST;
  const indexName = process.env.PINECONE_INDEX_NAME || "analysis-ai";
  if (!host) throw new Error("PINECONE_INDEX_HOST is not set");
  return { host, indexName };
}
