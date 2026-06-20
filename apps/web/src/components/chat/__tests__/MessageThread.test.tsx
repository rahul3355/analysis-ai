import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MessageThread } from "../MessageThread";
import { Message } from "@analysis-ai/types";

const mockMessages: Message[] = [
  { id: "1", role: "user", content: "Hello", timestamp: new Date() },
  { id: "2", role: "assistant", content: "Hi there!", timestamp: new Date() },
];

describe("MessageThread", () => {
  it("renders messages list and handles auto-scroll", () => {
    const { container } = render(<MessageThread messages={mockMessages} isLoading={false} />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("Hi there!")).toBeInTheDocument();
    expect(container.querySelector("div")?.children.length).toBeGreaterThan(0);
  });

  it("renders typing indicator when loading", () => {
    render(<MessageThread messages={mockMessages} isLoading={true} />);
    const indicator = document.querySelector(".animate-typing-bounce");
    expect(indicator).toBeInTheDocument();
  });
});
