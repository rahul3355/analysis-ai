import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { InputBar } from "../InputBar";

describe("InputBar", () => {
  it("renders correctly with placeholder text and a submit button", () => {
    render(<InputBar onSend={vi.fn()} isLoading={false} />);

    expect(screen.getByPlaceholderText("Ask a question about documents or database...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send message" })).toBeInTheDocument();
  });

  it("updates text value when typed into", () => {
    render(<InputBar onSend={vi.fn()} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Ask a question about documents or database...") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "Hello world" } });
    expect(textarea.value).toBe("Hello world");
  });

  it("calls onSend and clears value when submit button is clicked", () => {
    const mockOnSend = vi.fn();
    render(<InputBar onSend={mockOnSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Ask a question about documents or database...") as HTMLTextAreaElement;
    const sendButton = screen.getByRole("button", { name: "Send message" });

    // Send button starts disabled
    expect(sendButton).toBeDisabled();

    // Type text
    fireEvent.change(textarea, { target: { value: "My test question" } });
    expect(sendButton).not.toBeDisabled();

    // Click send
    fireEvent.click(sendButton);
    expect(mockOnSend).toHaveBeenCalledWith("My test question");
    expect(textarea.value).toBe("");
  });

  it("calls onSend when Enter key is pressed without Shift", () => {
    const mockOnSend = vi.fn();
    render(<InputBar onSend={mockOnSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Ask a question about documents or database...") as HTMLTextAreaElement;

    // Type text
    fireEvent.change(textarea, { target: { value: "Enter test" } });

    // Press Enter
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(mockOnSend).toHaveBeenCalledWith("Enter test");
    expect(textarea.value).toBe("");
  });

  it("does NOT call onSend when Enter is pressed with Shift key", () => {
    const mockOnSend = vi.fn();
    render(<InputBar onSend={mockOnSend} isLoading={false} />);
    const textarea = screen.getByPlaceholderText("Ask a question about documents or database...") as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: "Shift enter test" } });

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(mockOnSend).not.toHaveBeenCalled();
    expect(textarea.value).toBe("Shift enter test");
  });

  it("disables textarea and button when loading", () => {
    render(<InputBar onSend={vi.fn()} isLoading={true} />);
    const textarea = screen.getByPlaceholderText("Ask a question about documents or database...") as HTMLTextAreaElement;
    const sendButton = screen.getByRole("button", { name: "Send message" });

    expect(textarea).toBeDisabled();
    expect(sendButton).toBeDisabled();
  });
});
