import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";
import { ChatView } from "../ChatView";
import type { DocumentItem } from "@analysis-ai/types";

const EMPTY_DOCS: DocumentItem[] = [];

function createSseResponse(text = "This is a real AI response."): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('event: status\ndata: {"stage":"generating","message":"Generating answer..."}\n\n'));
      controller.enqueue(encoder.encode(`event: text_delta\ndata: {"delta":"${text}"}\n\n`));
      controller.enqueue(encoder.encode('event: citations\ndata: {"citations":[]}\n\n'));
      controller.enqueue(encoder.encode('event: status\ndata: {"stage":"complete","message":"Done"}\n\n'));
      controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

function createMockFetch() {
  return vi.spyOn(global, "fetch").mockResolvedValue(createSseResponse());
}

function createDeferredResponse() {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });
  return {
    promise,
    resolve: () => resolve(createSseResponse()),
  };
}

describe("ChatView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders empty state when no messages", () => {
    render(<ChatView documents={EMPTY_DOCS} />);
    expect(screen.getByText("What would you like to know?")).toBeInTheDocument();
  });

  it("sends a message and displays response", async () => {
    createMockFetch();
    render(<ChatView documents={EMPTY_DOCS} />);

    const input = screen.getByRole("textbox", { name: "Ask a question" });
    fireEvent.change(input, { target: { value: "What is the meaning of life?" } });

    const sendButton = screen.getByRole("button", { name: "Send message" });
    fireEvent.click(sendButton);

    expect(screen.getByText("What is the meaning of life?")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("This is a real AI response.")).toBeInTheDocument();
    });
  });

  it("shows error message when API call fails", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() => Promise.reject(new Error("Network error")));
    render(<ChatView documents={EMPTY_DOCS} />);

    const input = screen.getByRole("textbox", { name: "Ask a question" });
    fireEvent.change(input, { target: { value: "Hoka running sell-through" } });

    const sendButton = screen.getByRole("button", { name: "Send message" });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument();
    });
  });

  it("clears chat history when clear button is clicked", async () => {
    createMockFetch();
    render(<ChatView documents={EMPTY_DOCS} />);

    const input = screen.getByRole("textbox", { name: "Ask a question" });
    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByText("This is a real AI response.")).toBeInTheDocument();
    });

    const clearButton = screen.getByRole("button", { name: "Clear chat thread" });
    fireEvent.click(clearButton);

    expect(screen.getByText("What would you like to know?")).toBeInTheDocument();
  });

  it("disables InputBar during loading and re-enables after response", async () => {
    const deferred = createDeferredResponse();
    vi.spyOn(global, "fetch").mockImplementation(() => deferred.promise);

    render(<ChatView documents={EMPTY_DOCS} />);
    const input = screen.getByRole("textbox", { name: "Ask a question" });
    const sendButton = screen.getByRole("button", { name: "Send message" });

    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.click(sendButton);

    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();

    deferred.resolve();

    await waitFor(() => {
      expect(screen.getByText("This is a real AI response.")).toBeInTheDocument();
    });

    expect(input).not.toBeDisabled();
  });

  it("shows pipeline status during loading", async () => {
    const deferred = createDeferredResponse();
    vi.spyOn(global, "fetch").mockImplementation(() => deferred.promise);

    const { container } = render(<ChatView documents={EMPTY_DOCS} />);
    const input = screen.getByRole("textbox", { name: "Ask a question" });

    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    // Pipeline status should show during loading
    const statusTexts = container.querySelectorAll(".animate-pulse");
    expect(statusTexts.length).toBeGreaterThanOrEqual(1);

    deferred.resolve();

    await waitFor(() => {
      expect(screen.getByText("This is a real AI response.")).toBeInTheDocument();
    });

    // Pipeline status should be gone after response
    expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
  });

  it("clicking a suggested prompt sends the message and triggers API call", async () => {
    const fetchSpy = createMockFetch();
    render(<ChatView documents={EMPTY_DOCS} />);

    const promptButton = screen.getByText("How did Scotland perform vs plan in Q3 and what drove the underperformance?");
    fireEvent.click(promptButton);

    expect(screen.getByText("How did Scotland perform vs plan in Q3 and what drove the underperformance?")).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "How did Scotland perform vs plan in Q3 and what drove the underperformance?" }),
      })
    );

    await waitFor(() => {
      expect(screen.getByText("This is a real AI response.")).toBeInTheDocument();
    });
  });

  it("shows error with no citations when API fails for any query", async () => {
    vi.spyOn(global, "fetch").mockImplementation(() => Promise.reject(new Error("Network error")));
    render(<ChatView documents={EMPTY_DOCS} />);

    const input = screen.getByRole("textbox", { name: "Ask a question" });
    fireEvent.change(input, { target: { value: "Scotland Q3 performance" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => {
      expect(screen.getByText(/Sorry, I encountered an error/)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Sources/)).not.toBeInTheDocument();
  });

  it("handles AbortError during first request and succeeds on second", async () => {
    let callCount = 0;
    vi.spyOn(global, "fetch").mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        const err = new Error("The operation was aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      }
      return Promise.resolve(createSseResponse());
    });

    render(<ChatView documents={EMPTY_DOCS} />);
    const textarea = screen.getByRole("textbox", { name: "Ask a question" });

    fireEvent.change(textarea, { target: { value: "First query" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("First query")).toBeInTheDocument();
    });

    fireEvent.change(textarea, { target: { value: "Second query" } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("This is a real AI response.")).toBeInTheDocument();
    });

    const responses = screen.getAllByText("This is a real AI response.");
    expect(responses).toHaveLength(1);
  });

  it("handles empty message via Enter key without sending", () => {
    createMockFetch();
    render(<ChatView documents={EMPTY_DOCS} />);

    const textarea = screen.getByRole("textbox", { name: "Ask a question" });

    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(screen.getByText("What would you like to know?")).toBeInTheDocument();
  });

  it("handles whitespace-only message without sending", () => {
    createMockFetch();
    render(<ChatView documents={EMPTY_DOCS} />);

    const textarea = screen.getByRole("textbox", { name: "Ask a question" });

    fireEvent.change(textarea, { target: { value: "   " } });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(screen.getByText("What would you like to know?")).toBeInTheDocument();
  });
});
