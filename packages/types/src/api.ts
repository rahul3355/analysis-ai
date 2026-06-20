import { Citation } from "./message";

export interface ChatRequest {
  message: string;
  documentIds?: string[];
  conversationId?: string;
}

export interface ChatResponse {
  reply: string;
  citations: Citation[];
}

export interface CitationDTO {
  id: string;
  sourceId: string;
  label: string;
  excerpt: string;
  relevanceScore?: number;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  verificationStatus?: "verified" | "unverified" | "hallucinated";
  type: "document" | "bigquery";
}

export interface SourceContextDTO {
  sourcesQueried: {
    documents: boolean;
    bigQuery: boolean;
  };
  documents: string[];
  bigQueryTables: string[];
}

export interface UploadResponse {
  documentId: string;
  status: "accepted";
  estimatedProcessingSeconds: number;
}

export interface DocumentItem {
  documentId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  status: "uploading" | "processing" | "ready" | "error";
  progress: number;
  chunkCount?: number;
  storageUrl?: string;
}

export interface ApiError {
  code: "VALIDATION_ERROR" | "BQ_ERROR" | "LLM_ERROR" | "DOCUMENT_NOT_FOUND" | "DOCUMENT_UPLOAD_FAILED";
  message: string;
  details?: unknown;
}

export interface DocumentListResponse {
  documents: DocumentItem[];
}

export interface DocumentStatusResponse {
  documentId: string;
  status: "uploading" | "processing" | "ready" | "error";
  chunkCount: number;
}
