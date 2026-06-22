"use client";

import { useState, DragEvent } from "react";
import type { DocumentItem } from "@analysis-ai/types";
import { Document } from "@analysis-ai/types";
import { UploadZone } from "./UploadZone";
import { DocumentList } from "./DocumentList";
import { UploadCloud, ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";

const ALLOWED_EXTENSIONS = ["pdf", "docx"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface DocumentsViewProps {
  documents: DocumentItem[];
  onUpload: (file: File) => Promise<unknown>;
  onDelete: (documentId: string) => void;
  isLoading: boolean;
}

function mapDocumentItem(item: DocumentItem): Document {
  return {
    id: item.documentId,
    name: item.fileName,
    size: item.fileSize,
    uploadDate: new Date(item.uploadedAt),
    status: item.status,
    progress: item.progress,
    storageUrl: item.storageUrl,
  };
}

export function DocumentsView({ documents, onUpload, onDelete, isLoading }: DocumentsViewProps) {
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);

  const handleFilesSelected = (files: File[]) => {
    setIsGlobalDragging(false);
    files.forEach((file) => {
      onUpload(file).catch((err) => console.error("Upload failed:", err));
    });
  };

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) return null;
    if (file.size > MAX_SIZE_BYTES) return null;
    return ext;
  };

  const handleGlobalDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types?.includes("Files")) {
      setIsGlobalDragging(true);
    }
  };

  const handleGlobalDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGlobalDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsGlobalDragging(false);
  };

  const handleGlobalDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsGlobalDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((f) => validateFile(f) !== null);
    if (validFiles.length > 0) {
      handleFilesSelected(validFiles);
    }
  };

  const mappedDocuments = documents.map(mapDocumentItem);

  return (
    <div
      className="flex-1 flex flex-col h-full overflow-hidden bg-canvas dark:bg-primary transition-colors duration-200 relative"
      onDragEnter={handleGlobalDragEnter}
      onDragOver={handleGlobalDragOver}
      onDragLeave={handleGlobalDragLeave}
      onDrop={handleGlobalDrop}
    >
      <div className="flex-1 overflow-y-auto p-md md:p-xl flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <UploadZone
            onFilesSelected={handleFilesSelected}
            isLoading={isLoading}
            onDragEnd={() => setIsGlobalDragging(false)}
          />
          {mappedDocuments.length > 0 && (
            <DocumentList documents={mappedDocuments} onDelete={onDelete} />
          )}
        </div>

        <div className="flex justify-center mt-auto pt-lg">
          <a
            href="/golden?tab=data"
            className={cn(
              "inline-flex items-center gap-sm px-xl py-sm rounded-md border-2 border-action-blue/70",
              "bg-white dark:bg-transparent",
              "hover:border-action-blue hover:bg-pale-blue/30 dark:hover:bg-action-blue/10 hover:shadow-md",
              "transition-all duration-200 cursor-pointer select-none",
              "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
            )}
          >
            <ExternalLink className="w-4 h-4 text-action-blue" aria-hidden="true" />
            <span className="font-body text-sm font-medium text-action-blue">View Documents</span>
          </a>
        </div>
      </div>

      {/* Global drag-and-drop overlay */}
      {isGlobalDragging && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-md bg-canvas/85 dark:bg-primary/85 backdrop-blur-sm pointer-events-none"
        >
          <div className="w-20 h-20 rounded-full bg-action-blue/15 dark:bg-action-blue/20 flex items-center justify-center text-action-blue animate-bounce">
            <UploadCloud className="w-10 h-10" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-semibold text-ink dark:text-on-dark">
            Drop files anywhere
          </p>
          <p className="font-body text-sm text-body-muted dark:text-muted">
            PDF and DOCX up to 10MB
          </p>
          <div className={cn(
            "flex gap-md font-mono text-[10px] uppercase tracking-wider text-muted select-none mt-sm",
            "px-md py-xs rounded-pill border border-hairline/40 dark:border-slate/10 bg-soft-stone/20 dark:bg-white/[0.03]"
          )}>
            <span className="flex items-center gap-xxs">
              <span className="w-2 h-2 rounded-full bg-red-500/80" /> PDF
            </span>
            <span className="flex items-center gap-xxs">
              <span className="w-2 h-2 rounded-full bg-blue-500/80" /> DOCX
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
