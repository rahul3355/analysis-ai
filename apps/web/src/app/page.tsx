"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Sidebar } from "@/components/layout/Sidebar";
import { useDocuments } from "@/hooks/useDocuments";

const ChatView = dynamic(
  () => import("@/components/chat/ChatView").then((mod) => mod.ChatView),
  { loading: () => <div className="flex-1 bg-canvas dark:bg-primary" /> }
);

const DocumentsView = dynamic(
  () => import("@/components/documents/DocumentsView").then((mod) => mod.DocumentsView),
  { loading: () => <div className="flex-1 bg-canvas dark:bg-primary" /> }
);

export default function Home() {
  const [view, setView] = useState<"chat" | "documents">("chat");
  const { documents, upload, deleteDoc, isLoading } = useDocuments();

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-canvas dark:bg-primary transition-colors duration-200">
      <Sidebar currentView={view} onViewChange={setView} />

      <main className="flex-1 h-full flex flex-col min-w-0 bg-canvas dark:bg-primary overflow-hidden">
        {view === "chat" ? (
          <ChatView documents={documents} />
        ) : (
          <DocumentsView
            documents={documents}
            onUpload={upload}
            onDelete={deleteDoc}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}
