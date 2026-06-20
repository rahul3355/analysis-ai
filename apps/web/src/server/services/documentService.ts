import { getUniqueId } from "@/lib/id";
import { chunkText } from "@/core/document/chunker";
import { embed } from "@/server/clients/embeddingClient";
import { parsePdf } from "@/server/parsers/pdfParser";
import { parseDocx } from "@/server/parsers/docxParser";
import { upsertChunks, deleteDocumentChunks } from "@/server/services/vectorService";
import { uploadFile, deleteFile } from "@/server/clients/storageClient";
import type { ChunkMetadata } from "@/server/services/vectorService";
import {
  getRecord,
  getAllRecords,
  setRecord,
  deleteRecord,
  type StoreRecord,
} from "@/server/services/persistedStore";
import fs from "fs";
import os from "os";
import path from "path";

export interface UploadResult {
  documentId: string;
  status: "ready" | "error";
  chunkCount: number;
  storageUrl: string;
}

export type DocumentRecord = StoreRecord;

export function getDocument(documentId: string): DocumentRecord | undefined {
  return getRecord(documentId);
}

export function getAllDocuments(): DocumentRecord[] {
  return getAllRecords();
}

export function deleteDocument(documentId: string): boolean {
  return deleteRecord(documentId);
}

export async function processDocumentUpload(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const documentId = getUniqueId("doc");

  const record: DocumentRecord = {
    documentId,
    fileName,
    fileSize: fileBuffer.length,
    status: "processing",
    progress: 0,
    chunkCount: 0,
    uploadedAt: new Date().toISOString(),
    storageUrl: "",
  };
  setRecord(record);

  try {
    const safeName = fileName.replace(/[/\\]/g, "_");
    const dataBuf = new Uint8Array(fileBuffer);

    // Run R2 upload and PDF parsing in parallel
    const [storageUrl, parseResult] = await Promise.all([
      uploadFile(fileBuffer, documentId, safeName, mimeType),
      (() => {
        if (ext === "pdf" || mimeType === "application/pdf") {
          return parsePdf(dataBuf);
        }
        // DOCX still needs a temp file (mammoth reads from disk)
        const tempDir = process.env.NODE_ENV === "test" ? "." : os.tmpdir();
        const tempPath = path.join(tempDir, `${documentId}-${safeName}`);
        try {
          fs.writeFileSync(tempPath, fileBuffer);
          return parseDocx(tempPath);
        } finally {
          try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch { /* ignore cleanup */ }
        }
      })(),
    ]);

    record.storageUrl = storageUrl;
    record.progress = 40;
    setRecord(record);

    const textChunks = chunkText(parseResult.text);
    if (textChunks.length === 0) {
      throw new Error("No text could be extracted from the document");
    }
    const chunkTexts = textChunks.map((c) => c.text);

    record.progress = 50;
    setRecord(record);

    let embeddings: number[][];
    try {
      embeddings = await embed(chunkTexts);
    } catch (err) {
      console.error(`[${documentId}] Embedding generation failed:`, err);
      throw new Error("Embedding generation failed");
    }

    record.progress = 70;
    setRecord(record);

    const now = new Date().toISOString();
    const vectorChunks = textChunks.map((chunk, i) => ({
      id: `${documentId}-${chunk.index}`,
      values: embeddings[i],
      metadata: {
        chunkId: `${documentId}-${chunk.index}`,
        documentId,
        documentName: fileName,
        pageNumber: Math.floor((chunk.index * 512) / 3000) + 1,
        chunkIndex: chunk.index,
        chunkText: chunk.text,
        orgId: "default",
        uploadedAt: now,
        storageUrl: record.storageUrl,
      } satisfies ChunkMetadata,
    }));

    try {
      await upsertChunks(vectorChunks);
    } catch (err) {
      console.error(`[${documentId}] Pinecone upsert failed:`, err);
      throw new Error("Vector storage failed");
    }

    record.status = "ready";
    record.progress = 100;
    record.chunkCount = textChunks.length;
    setRecord(record);

    console.log(`[${documentId}] Document "${fileName}" processed: ${parseResult.text.length} chars → ${textChunks.length} chunks → ${embeddings.length} vectors upserted to Pinecone`);

    return {
      documentId,
      status: "ready",
      chunkCount: textChunks.length,
      storageUrl: record.storageUrl,
    };
  } catch (err) {
    record.status = "error";
    record.progress = 0;
    setRecord(record);
    if (record.storageUrl) {
      deleteFile(documentId, fileName.replace(/[/\\]/g, "_")).catch(() => {});
    }
    throw err;
  }
}

export async function deleteDocumentWithStorage(documentId: string): Promise<void> {
  const doc = getRecord(documentId);
  if (!doc) return;

  let hasError = false;

  try {
    await deleteDocumentChunks(documentId);
  } catch (err) {
    console.error(`[${documentId}] Failed to delete from Pinecone:`, err);
    hasError = true;
  }

  try {
    await deleteFile(documentId, doc.fileName);
  } catch (err) {
    console.error(`[${documentId}] Failed to delete from R2:`, err);
    hasError = true;
  }

  deleteRecord(documentId);

  if (hasError) {
    console.warn(
      `[${documentId}] Document deleted from persistent store but some external deletions failed`
    );
  }
}
