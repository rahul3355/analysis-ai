"use client";

import type { DocumentItem } from "@analysis-ai/types";
import { FileText } from "lucide-react";

export interface DocumentSelectorProps {
  documents: DocumentItem[];
  hasReadyDocs: boolean;
}

export function DocumentSelector({ documents, hasReadyDocs }: DocumentSelectorProps) {
  const readyDocuments = documents.filter((d) => d.status === "ready");

  if (!hasReadyDocs) {
    return (
      <div className="px-md md:px-lg bg-canvas dark:bg-primary flex-shrink-0">
        <div className="flex items-center gap-sm overflow-x-auto py-sm">
          <span className="text-xs text-muted dark:text-muted font-body whitespace-nowrap">
            No documents available for context
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-md md:px-lg bg-canvas dark:bg-primary flex-shrink-0">
      <div className="flex items-center gap-sm overflow-x-auto py-sm">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate dark:text-muted whitespace-nowrap flex-shrink-0">
          Searching:
        </span>
        {readyDocuments.map((doc) => (
          <span
            key={doc.documentId}
            className="inline-flex items-center gap-xs px-sm py-[3px] rounded-pill text-xs font-body whitespace-nowrap select-none bg-action-blue/10 text-action-blue dark:bg-action-blue/20 dark:text-blue-300 border border-action-blue/30"
            title={doc.fileName}
          >
            <FileText className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            <span className="max-w-[140px] truncate">{doc.fileName}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

