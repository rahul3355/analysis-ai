import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { Sidebar } from "../Sidebar";

describe("Sidebar", () => {
  const mockOnViewChange = vi.fn();

  beforeEach(() => {
    mockOnViewChange.mockClear();
    document.documentElement.className = "";
    localStorage.clear();
  });

  it("renders the sidebar with navigation buttons and footer information", () => {
    render(<Sidebar currentView="chat" onViewChange={mockOnViewChange} />);

    // Check application title
    expect(screen.getByText("Analysis AI")).toBeInTheDocument();

    // Check nav links
    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Documents" })).toBeInTheDocument();

    // Check theme toggle switch
    expect(screen.getByRole("switch", { name: "Switch to Dark Mode" })).toBeInTheDocument();
  });

  it("triggers onViewChange when navigation links are clicked", () => {
    render(<Sidebar currentView="chat" onViewChange={mockOnViewChange} />);

    const docButton = screen.getByRole("button", { name: "Documents" });
    fireEvent.click(docButton);

    expect(mockOnViewChange).toHaveBeenCalledWith("documents");
  });

  it("toggles collapse state when collapse button is clicked", () => {
    render(<Sidebar currentView="chat" onViewChange={mockOnViewChange} />);

    const collapseButton = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(collapseButton).toBeInTheDocument();

    fireEvent.click(collapseButton);
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
  });

  it("toggles dark mode class on documentElement when clicked", () => {
    render(<Sidebar currentView="chat" onViewChange={mockOnViewChange} />);

    const themeSwitch = screen.getByRole("switch", { name: "Switch to Dark Mode" });
    
    // Toggle to Dark Mode
    fireEvent.click(themeSwitch);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("theme")).toBe("dark");

    // Toggle back to Light Mode
    fireEvent.click(screen.getByRole("switch", { name: "Switch to Light Mode" }));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
