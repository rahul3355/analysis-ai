import { loadEnvConfig } from "@next/env";
import { existsSync } from "fs";
import { join } from "path";

const envDir = existsSync(join(process.cwd(), "apps/web"))
  ? join(process.cwd(), "apps/web")
  : process.cwd();

loadEnvConfig(envDir);

import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock matchMedia for jsdom environment
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock HTMLElement.prototype.scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = vi.fn();
