import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { UploadZone } from "../UploadZone";

describe("UploadZone", () => {
  it("renders correctly with instructions and file formats list", () => {
    render(<UploadZone onFilesSelected={vi.fn()} />);

    expect(screen.getByText(/Drop files here/)).toBeInTheDocument();
    expect(screen.getByText(/PDF and DOCX up to 10MB/)).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("DOCX")).toBeInTheDocument();
  });

  it("handles browser file input selection and filters invalid files", () => {
    const mockOnFilesSelected = vi.fn();
    render(<UploadZone onFilesSelected={mockOnFilesSelected} />);

    // Get input element
    const input = document.getElementById("file-upload-input") as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // Mock file upload event
    const validFile = new File(["valid content"], "contract.pdf", { type: "application/pdf" });
    const invalidFile = new File(["invalid content"], "photo.png", { type: "image/png" });

    fireEvent.change(input, {
      target: { files: [validFile, invalidFile] },
    });

    // Valid file should be passed, invalid file should be filtered out
    expect(mockOnFilesSelected).toHaveBeenCalledWith([validFile]);
  });

  it("handles files drop and filters invalid extensions", () => {
    const mockOnFilesSelected = vi.fn();
    render(<UploadZone onFilesSelected={mockOnFilesSelected} />);
    const dropZone = screen.getByRole("button", { name: "Upload PDF or DOCX files" });

    const docxFile = new File(["docx content"], "terms.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    const txtFile = new File(["txt content"], "notes.txt", { type: "text/plain" });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [docxFile, txtFile],
      },
    });

    expect(mockOnFilesSelected).toHaveBeenCalledWith([docxFile]);
  });

  it("rejects files exceeding 10MB size limit", () => {
    const mockOnFilesSelected = vi.fn();
    render(<UploadZone onFilesSelected={mockOnFilesSelected} />);
    const dropZone = screen.getByRole("button", { name: "Upload PDF or DOCX files" });

    const oversizedFile = new File(["x".repeat(11 * 1024 * 1024)], "large.pdf", { type: "application/pdf" });
    const validFile = new File(["valid"], "small.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [oversizedFile, validFile],
      },
    });

    expect(mockOnFilesSelected).toHaveBeenCalledWith([validFile]);
  });

  it("shows error banner for invalid files", () => {
    const mockOnFilesSelected = vi.fn();
    render(<UploadZone onFilesSelected={mockOnFilesSelected} />);
    const dropZone = screen.getByRole("button", { name: "Upload PDF or DOCX files" });

    const invalidFile = new File(["bad"], "image.png", { type: "image/png" });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [invalidFile],
      },
    });

    expect(screen.getByText(/not supported/)).toBeInTheDocument();
    expect(mockOnFilesSelected).not.toHaveBeenCalled();
  });
});
