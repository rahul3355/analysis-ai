import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MessageBubble } from "../MessageBubble";
import { Message } from "@analysis-ai/types";

const USER_MESSAGE: Message = {
  id: "m1",
  role: "user",
  content: "Analyze this vendor contract.",
  timestamp: new Date(),
};

const ASSISTANT_MESSAGE: Message = {
  id: "m2",
  role: "assistant",
  content: "Based on the agreement Section 4 [1] and Section 9 [2], standard liability is $500,000.",
  timestamp: new Date(),
  citations: [
    {
      id: "c1",
      sourceId: "doc-1",
      label: "Agreement (Section 4)",
      excerpt: "Standard liability is capped at $500,000.",
      type: "document",
    },
    {
      id: "c2",
      sourceId: "doc-1",
      label: "Agreement (Section 9)",
      excerpt: "Data breaches have an alternate cap.",
      type: "document",
    },
  ],
};

describe("MessageBubble", () => {
  it("renders user messages right-aligned", () => {
    render(<MessageBubble message={USER_MESSAGE} />);
    expect(screen.getByText("Analyze this vendor contract.")).toBeInTheDocument();
  });

  it("renders assistant messages left-aligned with citation buttons", () => {
    render(<MessageBubble message={ASSISTANT_MESSAGE} />);
    expect(screen.getByText("Based on the agreement Section 4")).toBeInTheDocument();
    const citation1 = screen.getAllByText("[1]")[0];
    const citation2 = screen.getAllByText("[2]")[0];
    expect(citation1).toBeInTheDocument();
    expect(citation2).toBeInTheDocument();
  });

  it("renders SourcesBlock and expands it on click", () => {
    render(<MessageBubble message={ASSISTANT_MESSAGE} />);
    expect(screen.getByText("Sources (2)")).toBeInTheDocument();
    expect(screen.queryByText("Agreement (Section 4)")).not.toBeInTheDocument();
    const toggleButton = screen.getByRole("button", { name: "Expand sources" });
    fireEvent.click(toggleButton);
    expect(screen.getByText("Agreement (Section 4)")).toBeInTheDocument();
  });

  it("renders bold text", () => {
    const message: Message = { ...ASSISTANT_MESSAGE, content: "This is **bold text**." };
    render(<MessageBubble message={message} />);
    const boldElement = screen.getByText("bold text");
    expect(boldElement).toBeInTheDocument();
    expect(boldElement.tagName).toBe("STRONG");
  });

  it("renders italic text", () => {
    const message: Message = { ...ASSISTANT_MESSAGE, content: "This is *italic text*." };
    render(<MessageBubble message={message} />);
    const italicElement = screen.getByText("italic text");
    expect(italicElement).toBeInTheDocument();
    expect(italicElement.tagName).toBe("EM");
  });

  it("renders inline code", () => {
    const message: Message = { ...ASSISTANT_MESSAGE, content: "Use the `code` function." };
    render(<MessageBubble message={message} />);
    const codeElement = screen.getByText("code");
    expect(codeElement).toBeInTheDocument();
    expect(codeElement.tagName).toBe("CODE");
  });

  it("renders unordered lists", () => {
    const message: Message = { ...ASSISTANT_MESSAGE, content: "- item 1\n- item 2\n- item 3" };
    render(<MessageBubble message={message} />);
    expect(screen.getByText("item 1")).toBeInTheDocument();
    expect(screen.getByText("item 2")).toBeInTheDocument();
    expect(screen.getByText("item 3")).toBeInTheDocument();
  });

  it("renders headers", () => {
    const message: Message = { ...ASSISTANT_MESSAGE, content: "### Section Header" };
    render(<MessageBubble message={message} />);
    const headerElement = screen.getByText("Section Header");
    expect(headerElement).toBeInTheDocument();
    expect(headerElement.tagName).toBe("H3");
  });

  it("renders citations alongside markdown text", () => {
    const message: Message = { ...ASSISTANT_MESSAGE, content: "text [1] more text" };
    render(<MessageBubble message={message} />);
    expect(screen.getByText("text")).toBeInTheDocument();
    expect(screen.getByText("more text")).toBeInTheDocument();
    expect(screen.getByText("[1]")).toBeInTheDocument();
  });

  it("renders mixed markdown with citations", () => {
    const message: Message = { ...ASSISTANT_MESSAGE, content: "**bold** [1] and *italic* [2] done" };
    render(<MessageBubble message={message} />);
    const boldElement = screen.getByText("bold");
    expect(boldElement.tagName).toBe("STRONG");
    const italicElement = screen.getByText("italic");
    expect(italicElement.tagName).toBe("EM");
    expect(screen.getByText("[1]")).toBeInTheDocument();
    expect(screen.getByText("[2]")).toBeInTheDocument();
    expect(screen.getByText("and")).toBeInTheDocument();
    expect(screen.getByText("done")).toBeInTheDocument();
  });
});
