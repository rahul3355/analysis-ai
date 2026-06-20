import { NextRequest, NextResponse } from "next/server";
import {
  processDocumentUpload,
  getAllDocuments,
} from "@/server/services/documentService";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { code: "VALIDATION_ERROR", message: "No file provided" },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: `Unsupported file type: ${file.type}. Only PDF and DOCX are allowed.`,
        },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "File size exceeds 10 MB limit",
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let timerId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => reject(new Error("Document processing timed out after 120 seconds")), 120000);
    });
    const uploadPromise = processDocumentUpload(buffer, file.name, file.type);
    uploadPromise.catch((err) => console.error("Pipeline still running after timeout:", err));
    timeoutPromise.catch(() => {});
    let result;
    try {
      result = await Promise.race([uploadPromise, timeoutPromise]);
    } finally {
      clearTimeout(timerId);
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Document processing failed";
    return NextResponse.json(
      { code: "DOCUMENT_UPLOAD_FAILED", message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const docs = getAllDocuments();
  return NextResponse.json({ documents: docs });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all");

  if (all === "true") {
    try {
      const { deleteAllChunks } = await import("@/server/services/vectorService");
      await deleteAllChunks();
      return NextResponse.json({ status: "ok", message: "All Pinecone vectors deleted" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      return NextResponse.json({ code: "DELETE_FAILED", message }, { status: 500 });
    }
  }

  return NextResponse.json({ code: "BAD_REQUEST", message: "Use DELETE /api/documents?all=true" }, { status: 400 });
}
