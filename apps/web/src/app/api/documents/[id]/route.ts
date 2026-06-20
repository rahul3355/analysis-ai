import { NextRequest, NextResponse } from "next/server";
import {
  getDocument,
  deleteDocumentWithStorage,
} from "@/server/services/documentService";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = getDocument(id);

  if (!doc) {
    return NextResponse.json(
      { code: "DOCUMENT_NOT_FOUND", message: `Document ${id} not found` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    documentId: doc.documentId,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
    status: doc.status,
    progress: doc.progress,
    chunkCount: doc.chunkCount,
    uploadedAt: doc.uploadedAt,
    storageUrl: doc.storageUrl,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = getDocument(id);

  if (!doc) {
    return NextResponse.json(
      { code: "DOCUMENT_NOT_FOUND", message: `Document ${id} not found` },
      { status: 404 }
    );
  }

  await deleteDocumentWithStorage(id);

  return NextResponse.json({ success: true });
}
