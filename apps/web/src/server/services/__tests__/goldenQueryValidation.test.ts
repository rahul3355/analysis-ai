import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { validateSql, ALL_TABLE_NAMES } from "../bigqueryHelpers";

interface GoldenQuery {
  id: string;
  question: string;
  sql: string;
}

const GOLDEN_PATH = join(process.cwd(), "..", "..", "golden", "golden-queries.json");

function loadGoldenQueries(): GoldenQuery[] {
  return JSON.parse(readFileSync(GOLDEN_PATH, "utf-8"));
}

function extractTableRefs(sql: string): string[] {
  const regex = /jd_sports\.(\w+)/g;
  const refs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql)) !== null) {
    refs.push(match[1]);
  }
  return [...new Set(refs)];
}

describe("Golden Query Validation", () => {
  it("golden-queries.json file exists", () => {
    expect(existsSync(GOLDEN_PATH)).toBe(true);
  });

  it("contains at least 20 entries", () => {
    const queries = loadGoldenQueries();
    expect(queries.length).toBeGreaterThanOrEqual(20);
  });

  it("every query has valid id, question, and sql fields", () => {
    for (const q of loadGoldenQueries()) {
      expect(typeof q.id).toBe("string");
      expect(q.id).toMatch(/^gq-\d{3}$/);
      expect(typeof q.question).toBe("string");
      expect(q.question.length).toBeGreaterThan(0);
      expect(typeof q.sql).toBe("string");
      expect(q.sql.length).toBeGreaterThan(0);
    }
  });

  it("every query starts with SELECT", () => {
    for (const q of loadGoldenQueries()) {
      expect(q.sql.trim().toUpperCase().startsWith("SELECT")).toBe(true);
    }
  });

  it("passes validateSql() — no forbidden operations", () => {
    for (const q of loadGoldenQueries()) {
      expect(() => validateSql(q.sql)).not.toThrow();
    }
  });

  it("every query references valid table names from ALL_TABLE_NAMES", () => {
    for (const q of loadGoldenQueries()) {
      const tables = extractTableRefs(q.sql);
      expect(tables.length).toBeGreaterThan(0);
      for (const t of tables) {
        expect(ALL_TABLE_NAMES).toContain(t);
      }
    }
  });

  it("all queries have unique IDs", () => {
    const queries = loadGoldenQueries();
    const ids = queries.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
