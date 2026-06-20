import { NextRequest, NextResponse } from "next/server";
import { getDocument } from "@/server/services/documentService";
import { getDownloadUrl } from "@/server/clients/storageClient";

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

  if (doc.status !== "ready") {
    return NextResponse.json(
      { code: "VALIDATION_ERROR", message: "Document is not ready yet" },
      { status: 400 }
    );
  }

  try {
    const signedUrl = await getDownloadUrl(id, doc.fileName);
    return NextResponse.json({ url: signedUrl });
  } catch {
    return NextResponse.json(
      { code: "DOCUMENT_UPLOAD_FAILED", message: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
