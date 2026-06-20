import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import {
  cosineSimilarity,
  getCachedSql,
  addCachedSql,
  getCacheFilePath,
  resetInMemoryCache
} from "../semanticCache";

describe("Semantic Cache Service", () => {
  const configPath = getCacheFilePath();
  let originalContent: string | null = null;

  beforeEach(() => {
    resetInMemoryCache();
    if (existsSync(configPath)) {
      originalContent = readFileSync(configPath, "utf-8");
      unlinkSync(configPath);
    } else {
      originalContent = null;
    }
  });

  afterEach(() => {
    resetInMemoryCache();
    if (existsSync(configPath)) {
      try {
        unlinkSync(configPath);
      } catch {}
    }
    if (originalContent !== null) {
      try {
        writeFileSync(configPath, originalContent, "utf-8");
      } catch {}
    }
  });

  describe("cosineSimilarity", () => {
    it("returns 1.0 for identical vectors", () => {
      const v1 = [1, 2, 3];
      const v2 = [1, 2, 3];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0, 5);
    });

    it("returns 0.0 for orthogonal vectors", () => {
      const v1 = [1, 0];
      const v2 = [0, 1];
      expect(cosineSimilarity(v1, v2)).toBe(0.0);
    });

    it("calculates similarity correctly for non-orthogonal vectors", () => {
      const v1 = [3, 4, 0];
      const v2 = [0, 3, 4];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(0.48, 5);
    });

    it("returns 0 for empty arrays or mismatched lengths", () => {
      expect(cosineSimilarity([], [])).toBe(0);
      expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    });
  });

  describe("getCachedSql & addCachedSql", () => {
    it("returns null if cache is empty", async () => {
      const sql = await getCachedSql([0.1, 0.2, 0.3]);
      expect(sql).toBeNull();
    });

    it("saves and retrieves SQL when similarity is above threshold", async () => {
      const q = "select products";
      const emb = [0.5, 0.5, 0.5];
      const sqlQuery = "SELECT * FROM products";

      await addCachedSql(q, emb, sqlQuery);

      const hit = await getCachedSql([0.5, 0.5, 0.5]);
      expect(hit).toBe(sqlQuery);

      const nearHit = await getCachedSql([0.5, 0.5, 0.51]);
      expect(nearHit).toBe(sqlQuery);
    });

    it("returns null if similarity is below threshold (0.95)", async () => {
      const q = "select products";
      const emb = [1.0, 0.0, 0.0];
      const sqlQuery = "SELECT * FROM products";

      await addCachedSql(q, emb, sqlQuery);

      const miss = await getCachedSql([0.7, 0.7, 0.0]);
      expect(miss).toBeNull();
    });

    it("retrieves the SQL with the HIGHEST similarity if multiple candidates match", async () => {
      await addCachedSql("q1", [1.0, 0.0, 0.0], "SQL_ONE");
      await addCachedSql("q2", [0.0, 1.0, 0.0], "SQL_TWO");

      const hit1 = await getCachedSql([0.96, 0.1, 0.0]);
      expect(hit1).toBe("SQL_ONE");

      const hit2 = await getCachedSql([0.1, 0.96, 0.0]);
      expect(hit2).toBe("SQL_TWO");
    });
  });
});
