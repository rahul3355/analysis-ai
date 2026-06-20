import { describe, it, expect } from "vitest";
import { BQ_TABLE_SCHEMAS, BQ_RELATIONSHIPS } from "@/server/config/bigquery";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { ALL_TABLE_NAMES, buildSchemaDescription, injectAllowedValues, validateSql, formatBqContext } from "../bigqueryService";

describe("Feature 4: Categorical Values", () => {
  it("orders.status has allowed values", () => {
    const orders = BQ_TABLE_SCHEMAS.find((t) => t.table === "orders");
    expect(orders?.columns.find((c) => c.name === "status")?.allowedValues).toContain("delivered");
  });

  it("orders.region has allowed values (Scotland, London)", () => {
    const orders = BQ_TABLE_SCHEMAS.find((t) => t.table === "orders");
    const region = orders?.columns.find((c) => c.name === "region");
    expect(region?.allowedValues).toContain("Scotland");
    expect(region?.allowedValues).toContain("London");
  });

  it("orders.channel has allowed values (online, store, b2b)", () => {
    const orders = BQ_TABLE_SCHEMAS.find((t) => t.table === "orders");
    const channel = orders?.columns.find((c) => c.name === "channel");
    expect(channel?.allowedValues).toEqual(["online", "store", "b2b"]);
  });

  it("events.event_type has allowed values", () => {
    const events = BQ_TABLE_SCHEMAS.find((t) => t.table === "events");
    const et = events?.columns.find((c) => c.name === "event_type");
    expect(et?.allowedValues).toContain("purchase");
    expect(et?.allowedValues).toContain("page_view");
  });

  it("injectAllowedValues returns expected format", () => {
    const result = injectAllowedValues(["orders", "events"]);
    expect(result).toContain("orders.status allowed values:");
    expect(result).toContain("delivered");
    expect(result).toContain("events.event_type allowed values:");
    expect(result).toContain("purchase");
  });
});

describe("Feature 3: Golden Query Registry", () => {
  const repoRoot = join(process.cwd(), "..", "..");
  const candidates = [
    join(process.cwd(), "golden", "golden-queries.json"),
    join(repoRoot, "golden", "golden-queries.json"),
    join(process.cwd(), "..", "golden", "golden-queries.json"),
  ];
  const goldenPath = candidates.find((p) => existsSync(p)) || candidates[0];

  it("golden-queries.json exists", () => {
    expect(existsSync(goldenPath)).toBe(true);
  });

  it("contains at least 20 entries with valid structure", () => {
    const content = JSON.parse(readFileSync(goldenPath, "utf-8"));
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThanOrEqual(20);
    for (const q of content) {
      expect(typeof q.id).toBe("string");
      expect(typeof q.question).toBe("string");
      expect(typeof q.sql).toBe("string");
      expect(q.sql.trim().toUpperCase().startsWith("SELECT")).toBe(true);
    }
  });
});

describe("Feature 1: Schema Description Builder", () => {
  it("buildSchemaDescription includes table name and column count", () => {
    const products = BQ_TABLE_SCHEMAS.find((t) => t.table === "products")!;
    const desc = buildSchemaDescription(products);
    expect(desc).toContain("products");
    expect(desc).toContain("product_name");
    expect(desc).toContain("category");
  });

  it("all tables have business questions", () => {
    for (const table of BQ_TABLE_SCHEMAS) {
      expect(table.businessQuestions.length).toBeGreaterThan(0);
    }
  });

  it("ALL_TABLE_NAMES matches BQ_TABLE_SCHEMAS", () => {
    expect(ALL_TABLE_NAMES).toEqual(BQ_TABLE_SCHEMAS.map((t) => t.table));
    expect(ALL_TABLE_NAMES).toContain("products");
    expect(ALL_TABLE_NAMES).toContain("orders");
    expect(ALL_TABLE_NAMES).toContain("order_items");
  });
});

describe("Feature 2: SQL Validation", () => {
  it("rejects DROP TABLE", () => {
    expect(() => validateSql("DROP TABLE jd_sports.products")).toThrow();
  });

  it("rejects DELETE", () => {
    expect(() => validateSql("DELETE FROM jd_sports.products WHERE 1=1")).toThrow();
  });

  it("rejects INSERT", () => {
    expect(() => validateSql("INSERT INTO jd_sports.products VALUES (1)")).toThrow();
  });

  it("rejects CALL", () => {
    expect(() => validateSql("CALL some_procedure()")).toThrow();
  });

  it("rejects EXPORT DATA", () => {
    expect(() => validateSql("EXPORT DATA OPTIONS(...) AS SELECT 1")).toThrow();
  });

  it("rejects MERGE", () => {
    expect(() => validateSql("MERGE INTO t USING s ON ...")).toThrow();
  });

  it("allows valid SELECT", () => {
    expect(() => validateSql("SELECT * FROM jd_sports.products")).not.toThrow();
  });

  it("allows SELECT with multiple joins", () => {
    expect(() => validateSql("SELECT p.name FROM jd_sports.products p JOIN jd_sports.orders o ON p.id = o.id")).not.toThrow();
  });
});

describe("Feature 5: Unified Indexing — formatBqContext", () => {
  it("formatBqContext includes SQL query in output", () => {
    const result = formatBqContext({
      rows: [],
      schema: [],
      rowCount: 0,
      executedQuery: "SELECT 1 FROM test",
      latencyMs: 5,
    });
    expect(result).toContain("Query: SELECT 1 FROM test");
    expect(result).toContain("no matches");
  });

  it("formatBqContext shows row data when rows exist", () => {
    const result = formatBqContext({
      rows: [{ product: "Nike", revenue: 100 }],
      schema: [{ name: "product", type: "string" }, { name: "revenue", type: "number" }],
      rowCount: 1,
      executedQuery: "SELECT product, revenue FROM test",
      latencyMs: 10,
    });
    expect(result).toContain("1 rows");
    expect(result).toContain("product: Nike");
    expect(result).toContain("revenue: 100");
  });
});
