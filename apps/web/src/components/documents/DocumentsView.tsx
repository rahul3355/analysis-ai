"use client";

import { useState, DragEvent } from "react";
import type { DocumentItem } from "@analysis-ai/types";
import { Document } from "@analysis-ai/types";
import { UploadZone } from "./UploadZone";
import { DocumentList } from "./DocumentList";
import { FileText, Download, X, UploadCloud } from "lucide-react";
import { cn } from "@/lib/cn";
import { triggerDownload } from "@/lib/download";

const ALLOWED_EXTENSIONS = ["pdf", "docx"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const CORE_DOC_IDS = new Set(["doc-jd-1", "doc-jd-2", "doc-jd-3", "doc-jd-4", "doc-jd-5"]);

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

function formatSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function DocumentsView({ documents, onUpload, onDelete, isLoading }: DocumentsViewProps) {
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [showCoreDocs, setShowCoreDocs] = useState(false);

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

  const coreDocs = documents.filter((d) => CORE_DOC_IDS.has(d.documentId)).map(mapDocumentItem);
  const nonCoreDocs = documents.filter((d) => !CORE_DOC_IDS.has(d.documentId)).map(mapDocumentItem);

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
          {nonCoreDocs.length > 0 && (
            <DocumentList documents={nonCoreDocs} onDelete={onDelete} />
          )}
        </div>

        <div className="flex justify-center mt-auto pt-lg">
          <button
            onClick={() => setShowCoreDocs(true)}
            className={cn(
              "flex items-center gap-sm px-xl py-sm rounded-md border-2 border-action-blue/70",
              "bg-white dark:bg-transparent",
              "hover:border-action-blue hover:bg-pale-blue/30 dark:hover:bg-action-blue/10 hover:shadow-md",
              "transition-all duration-200 cursor-pointer select-none",
              "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
            )}
          >
            <FileText className="w-4 h-4 text-action-blue" aria-hidden="true" />
            <span className="font-body text-sm font-medium text-action-blue">View Documents</span>
          </button>
        </div>
      </div>

      {/* Core docs modal */}
      {showCoreDocs && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCoreDocs(false)}
        >
          <div
            className="bg-canvas dark:bg-primary rounded-md shadow-lg border border-hairline/40 dark:border-slate/10 w-full max-w-lg mx-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-xl pt-lg pb-sm">
              <h2 className="font-display text-lg font-semibold text-ink dark:text-on-dark">Core Documents</h2>
              <button
                onClick={() => setShowCoreDocs(false)}
                className="p-xs rounded-xs text-slate hover:text-ink dark:hover:text-on-dark hover:bg-soft-stone/20 dark:hover:bg-white/5 transition-all duration-150 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-xl pb-lg space-y-sm">
              {coreDocs.length === 0 ? (
                <p className="font-body text-sm text-body-muted dark:text-muted py-md text-center">No core documents loaded.</p>
              ) : (
                coreDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-sm px-md py-sm rounded-xs border border-hairline/40 dark:border-slate/10 bg-soft-stone/10 dark:bg-white/[0.02]"
                  >
                    <FileText className="w-4 h-4 text-slate flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate text-sm text-ink dark:text-on-dark">{doc.name}</span>
                    <span className="text-[10px] font-mono text-muted flex-shrink-0">{formatSize(doc.size)}</span>
                    <button
                      onClick={() => triggerDownload(doc.id, doc.name)}
                      className={cn(
                        "p-xs rounded-xs text-slate hover:text-action-blue hover:bg-action-blue/10 dark:hover:bg-action-blue/20 transition-all duration-150 cursor-pointer inline-flex items-center justify-center flex-shrink-0",
                        "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
                      )}
                      aria-label={`Download ${doc.name}`}
                    >
                      <Download className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
