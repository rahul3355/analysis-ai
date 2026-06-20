export interface Citation {
  id: string;
  sourceId: string;
  label: string;
  excerpt: string;
  documentName?: string;
  pageNumber?: number;
  relevanceScore?: number;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  verificationStatus?: "verified" | "unverified" | "hallucinated";
  type: "document" | "bigquery";
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: Citation[];
}
