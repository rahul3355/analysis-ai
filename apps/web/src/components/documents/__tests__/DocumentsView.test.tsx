import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { DocumentsView } from "../DocumentsView";
import type { DocumentItem } from "@analysis-ai/types";

const MOCK_DOCS: DocumentItem[] = [
  {
    documentId: "doc-1",
    fileName: "standard_vendor_terms.pdf",
    fileSize: 2202009,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    status: "ready",
    progress: 100,
  },
  {
    documentId: "doc-2",
    fileName: "sales_report_q1.docx",
    fileSize: 524288,
    uploadedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: "processing",
    progress: 65,
  },
];

describe("DocumentsView", () => {
  it("renders with provided documents", () => {
    render(
      <DocumentsView
        documents={MOCK_DOCS}
        onUpload={async () => {}}
        onDelete={() => {}}
        isLoading={false}
      />
    );

    expect(screen.getByText("standard_vendor_terms.pdf")).toBeInTheDocument();
    expect(screen.getByText("sales_report_q1.docx")).toBeInTheDocument();
  });

  it("calls onDelete when delete button is clicked", () => {
    const handleDelete = vi.fn();
    render(
      <DocumentsView
        documents={MOCK_DOCS}
        onUpload={async () => {}}
        onDelete={handleDelete}
        isLoading={false}
      />
    );

    expect(screen.getByText("standard_vendor_terms.pdf")).toBeInTheDocument();

    const deleteButton = screen.getByRole("button", { name: /Delete standard_vendor_terms.pdf/ });
    fireEvent.click(deleteButton);

    expect(handleDelete).toHaveBeenCalledWith("doc-1");
  });

  it("calls onUpload when files are selected", async () => {
    const handleUpload = vi.fn().mockResolvedValue({});
    render(
      <DocumentsView
        documents={MOCK_DOCS}
        onUpload={handleUpload}
        onDelete={() => {}}
        isLoading={false}
      />
    );

    const file = new File(["content"], "new_contract.pdf", { type: "application/pdf" });
    const input = document.getElementById("file-upload-input") as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(handleUpload).toHaveBeenCalledTimes(1);
    expect(handleUpload).toHaveBeenCalledWith(file);
  });
});

