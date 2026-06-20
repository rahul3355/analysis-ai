"use client";

import { Document } from "@analysis-ai/types";
import { FileText, Trash2, Loader2, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { cn } from "@/lib/cn";
import { triggerDownload } from "@/lib/download";

export interface DocumentListProps {
  documents: Document[];
  onDelete: (id: string) => void;
}

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }).format(date);
  };

  const getStatusBadge = (status: Document["status"]) => {
    const baseClass = "inline-flex items-center gap-xs px-sm py-[3px] rounded-full text-xs font-medium";
    switch (status) {
      case "uploading":
        return (
          <span className={cn(baseClass, "bg-slate/10 text-slate dark:bg-white/5 dark:text-muted")}>
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Uploading
          </span>
        );
      case "processing":
        return (
          <span className={cn(baseClass, "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400")}>
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" /> Processing
          </span>
        );
      case "ready":
        return (
          <span className={cn(baseClass, "bg-pale-green text-deep-green dark:bg-pale-green/10 dark:text-pale-green")}>
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Ready
          </span>
        );
      case "error":
        return (
          <span className={cn(baseClass, "bg-red-50 text-error dark:bg-red-950/10 dark:text-red-400")}>
            <AlertCircle className="w-3 h-3" aria-hidden="true" /> Error
          </span>
        );
    }
  };

  if (documents.length === 0) {
    return (
      <div className="w-full max-w-3xl text-center py-xl select-none mt-lg">
        <p className="font-body text-sm text-body-muted dark:text-muted">No documents uploaded yet.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mt-lg flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-body text-sm">
          <thead>
            <tr className="border-b border-hairline/40 dark:border-slate/10 font-mono text-[10px] uppercase tracking-wider text-slate dark:text-muted select-none">
              <th className="p-md font-semibold pl-0">Name</th>
              <th className="p-md font-semibold">Date</th>
              <th className="p-md font-semibold">Size</th>
              <th className="p-md font-semibold">Status</th>
              <th className="p-md font-semibold text-right pr-0">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/30 dark:divide-slate/5">
            {documents.map((doc) => {
              const showProgress = doc.status === "uploading" || doc.status === "processing";
              return (
                <tr key={doc.id} className="hover:bg-soft-stone/10 dark:hover:bg-white/1 transition-colors duration-150">
                  <td className="p-md pl-0 font-medium text-ink dark:text-on-dark max-w-[240px] truncate">
                    <div className="flex items-center gap-sm">
                      <FileText className="w-5 h-5 text-slate flex-shrink-0" aria-hidden="true" />
                      <button
                        onClick={() => triggerDownload(doc.id, doc.name)}
                        className="truncate text-left hover:text-action-blue transition-colors duration-150 cursor-pointer bg-transparent border-none p-0 font-inherit"
                        title={`Download ${doc.name}`}
                      >
                        {doc.name}
                      </button>
                      <button
                        onClick={() => triggerDownload(doc.id, doc.name)}
                        className={cn(
                          "p-xs rounded-xs text-slate hover:text-action-blue hover:bg-action-blue/10 dark:hover:bg-action-blue/20 transition-all duration-150 cursor-pointer inline-flex items-center justify-center",
                          "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
                        )}
                        aria-label={`Download ${doc.name}`}
                      >
                        <Download className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                    {showProgress && (
                      <div className="w-full bg-hairline/30 dark:bg-white/5 h-[3px] rounded-full mt-xs overflow-hidden select-none">
                        <div
                          className="bg-gradient-progress animate-shimmer h-full rounded-full transition-all duration-200"
                          style={{ width: `${doc.progress}%` }}
                          aria-valuenow={doc.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          role="progressbar"
                        />
                      </div>
                    )}
                  </td>
                  <td className="p-md text-body-muted dark:text-muted whitespace-nowrap">{formatDate(doc.uploadDate)}</td>
                  <td className="p-md text-body-muted dark:text-muted whitespace-nowrap font-mono text-xs">{formatSize(doc.size)}</td>
                  <td className="p-md whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                  <td className="p-md pr-0 text-right whitespace-nowrap">
                    <button
                      onClick={() => onDelete(doc.id)}
                      className={cn(
                        "p-sm rounded-xs text-slate hover:text-error hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-150 cursor-pointer inline-flex items-center justify-center",
                        "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue"
                      )}
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
