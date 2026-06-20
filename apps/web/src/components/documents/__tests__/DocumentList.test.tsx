import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DocumentList } from "../DocumentList";
import { Document } from "@analysis-ai/types";

const mockDocuments: Document[] = [
  { id: "1", name: "contract.pdf", size: 102400, uploadDate: new Date("2025-05-15"), status: "ready", progress: 100 },
  { id: "2", name: "draft.docx", size: 51200, uploadDate: new Date("2025-05-16"), status: "processing", progress: 60 },
];

describe("DocumentList", () => {
  it("renders empty state message when list is empty", () => {
    render(<DocumentList documents={[]} onDelete={() => {}} />);
    expect(screen.getByText("No documents uploaded yet.")).toBeInTheDocument();
  });

  it("renders document rows with sizes, status badges, progress bars, and trigger deletes", () => {
    const handleDelete = vi.fn();
    render(<DocumentList documents={mockDocuments} onDelete={handleDelete} />);
    expect(screen.getByText("contract.pdf")).toBeInTheDocument();
    expect(screen.getByText("draft.docx")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.getByText("Processing")).toBeInTheDocument();
    const deleteButtons = screen.getAllByRole("button");
    fireEvent.click(deleteButtons[0]);
    expect(handleDelete).toHaveBeenCalledWith("1");
  });
});
