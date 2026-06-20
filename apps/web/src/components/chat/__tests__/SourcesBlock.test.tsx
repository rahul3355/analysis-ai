import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SourcesBlock } from "../SourcesBlock";
import { Citation } from "@analysis-ai/types";

const MOCK_CITATIONS: Citation[] = [
  {
    id: "c1",
    sourceId: "doc-1",
    label: "Document Source A (Page 12)",
    excerpt: "The first excerpt text from document A.",
    type: "document",
  },
  {
    id: "c2",
    sourceId: "db-1",
    label: "bq://sales.transactions",
    excerpt: "SELECT COUNT(*) FROM sales;",
    type: "bigquery",
  },
];

describe("SourcesBlock", () => {
  it("does not render when citations list is empty", () => {
    const { container } = render(<SourcesBlock citations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("is collapsed by default and displays only toggle button", () => {
    render(<SourcesBlock citations={MOCK_CITATIONS} />);
    expect(screen.getByText("Sources (2)")).toBeInTheDocument();
    expect(screen.queryByText("Document Source A (Page 12)")).not.toBeInTheDocument();
    expect(screen.queryByText("bq://sales.transactions")).not.toBeInTheDocument();
  });

  it("expands and displays labels and excerpts when clicked", () => {
    render(<SourcesBlock citations={MOCK_CITATIONS} />);
    const toggleButton = screen.getByRole("button", { name: "Expand sources" });
    fireEvent.click(toggleButton);
    expect(screen.getByText("Document Source A (Page 12)")).toBeInTheDocument();
    expect(screen.getByText("bq://sales.transactions")).toBeInTheDocument();
    expect(screen.getByText("\u201CThe first excerpt text from document A.\u201D")).toBeInTheDocument();
    expect(screen.getByText(/sales;/)).toBeInTheDocument();
  });
});
