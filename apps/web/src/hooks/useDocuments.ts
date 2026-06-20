"use client";
import { useState, useEffect, useCallback } from "react";
import type { DocumentItem } from "@analysis-ai/types";

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const getDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        return data.documents || [];
      }
    } catch {
      // If API unavailable, return empty
    }
    return [] as DocumentItem[];
  }, []);

  useEffect(() => {
    let cancelled = false;
    getDocuments()
      .then((data) => {
        if (!cancelled) setDocuments(data);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getDocuments]);

  const upload = useCallback(
    async (file: File) => {
      // Optimistic entry
      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticDoc: DocumentItem = {
        documentId: optimisticId,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
        status: "processing",
        progress: 0,
      };
      setDocuments((prev) => [optimisticDoc, ...prev]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          let detail = "Upload failed";
          try {
            const body = await res.json();
            if (body?.message) detail = body.message;
          } catch { /* ignore parse error */ }
          throw new Error(detail);
        }
        
        // Replace optimistic entry with real data
        const docs = await getDocuments();
        setDocuments(docs);
      } catch (err) {
        // Mark optimistic entry as error
        setDocuments((prev) =>
          prev.map((d) =>
            d.documentId === optimisticId
              ? { ...d, status: "error", progress: 0 }
              : d
          )
        );
        throw err;
      }
    },
    [getDocuments]
  );

  const deleteDoc = useCallback(async (documentId: string) => {
    try {
      await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.documentId !== documentId));
    } catch {
      // If delete fails, refresh the list
      const docs = await getDocuments();
      setDocuments(docs);
    }
  }, [getDocuments]);

  return { documents, upload, deleteDoc, isLoading, refresh: getDocuments };
}

