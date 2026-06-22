"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { UploadCloud, FileText, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const ALLOWED_EXTENSIONS = ["pdf", "docx"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface FileError {
  fileName: string;
  message: string;
}

export interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  isLoading?: boolean;
  onDragEnd?: () => void;
}

export function UploadZone({ onFilesSelected, isLoading = false, onDragEnd }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileErrors, setFileErrors] = useState<FileError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return `"${file.name}" is not supported. Only PDF and DOCX files are allowed.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `"${file.name}" (${sizeMB}MB) exceeds the 10MB limit.`;
    }
    return null;
  };

  const addErrors = (errors: FileError[]) => {
    setFileErrors((prev) => [...prev, ...errors]);
    setTimeout(() => {
      setFileErrors((prev) => prev.filter((e) => !errors.includes(e)));
    }, 6000);
  };

  const dismissError = (error: FileError) => {
    setFileErrors((prev) => prev.filter((e) => e !== error));
  };

  const processFiles = (files: File[]) => {
    const errors: FileError[] = [];
    const valid: File[] = [];
    for (const file of files) {
      const msg = validateFile(file);
      if (msg) {
        errors.push({ fileName: file.name, message: msg });
      } else {
        valid.push(file);
      }
    }
    if (errors.length) addErrors(errors);
    if (valid.length) onFilesSelected(valid);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    onDragEnd?.();
    if (isLoading) return;
    processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isLoading || !e.target.files) return;
    processFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const triggerFileSelect = () => {
    if (!isLoading) fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-3xl">
      {fileErrors.length > 0 && (
        <div className="mb-md space-y-xs">
          {fileErrors.map((err) => (
            <div
              key={`${err.fileName}-${err.message}`}
              className="flex items-start gap-sm px-sm py-xs rounded-xs bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300 text-xs font-body"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-[1px]" aria-hidden="true" />
              <span className="flex-1">{err.message}</span>
              <button
                onClick={() => dismissError(err)}
                className="flex-shrink-0 p-[1px] rounded-xs hover:bg-red-100 dark:hover:bg-red-800/30 transition-colors cursor-pointer"
                aria-label="Dismiss error"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onClick={triggerFileSelect}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            triggerFileSelect();
          }
        }}
        className={cn(
          "w-full border-2 border-dashed rounded-md px-xl py-section text-center flex flex-col items-center justify-center select-none",
          "transition-all duration-200 ease-in-out",
          "focus:outline-hidden focus-visible:ring-2 focus-visible:ring-focus-blue focus-visible:border-focus-blue",
          isLoading && "opacity-50 cursor-not-allowed",
          !isLoading && "cursor-pointer",
          isDragOver
            ? "border-action-blue bg-pale-blue/40 dark:bg-action-blue/15 scale-[1.01] shadow-sm"
            : "border-action-blue/70 hover:border-action-blue hover:bg-pale-blue/30 dark:hover:bg-action-blue/10 hover:shadow-md"
        )}
        aria-label="Upload PDF or DOCX files"
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.docx"
          multiple
          disabled={isLoading}
          className="hidden"
          id="file-upload-input"
          aria-hidden="true"
        />

        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center mb-md transition-all duration-200",
            isDragOver
              ? "bg-action-blue/15 dark:bg-action-blue/20 text-action-blue scale-110"
              : "bg-soft-stone/40 dark:bg-white/5 text-slate dark:text-muted"
          )}
        >
          <UploadCloud className="w-6 h-6" aria-hidden="true" />
        </div>

        <div className="flex flex-col gap-xs max-w-[360px] mb-lg">
          <p className="font-body text-sm font-semibold text-ink dark:text-on-dark">
            {isDragOver ? "Drop files here" : "Drop files here, or click to browse"}
          </p>
          <p className="font-body text-xs text-body-muted dark:text-muted">
            PDF and DOCX up to 10MB
          </p>
        </div>

        <div className="flex gap-md font-mono text-[10px] uppercase tracking-wider text-muted select-none">
          <span className="flex items-center gap-xxs">
            <FileText className="w-3 h-3 text-red-500/80" aria-hidden="true" /> PDF
          </span>
          <span className="flex items-center gap-xxs">
            <FileText className="w-3 h-3 text-blue-500/80" aria-hidden="true" /> DOCX
          </span>
        </div>
      </div>
    </div>
  );
}
