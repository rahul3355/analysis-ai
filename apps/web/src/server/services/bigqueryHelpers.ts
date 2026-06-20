import { BQ_TABLE_SCHEMAS, BQ_DATASET_ID, type TableSchema } from "@/server/config/bigquery";
import { ServiceError } from "@/server/services/chatService";
import { BigQueryResult } from "@/server/clients/bigqueryClient";

export const ALL_TABLE_NAMES = BQ_TABLE_SCHEMAS.map((t) => t.table);

export const HEADER_DESC = new Map(
  BQ_TABLE_SCHEMAS.flatMap((t) => t.columns.map((c) => [`${t.table}.${c.name}`, c.description]))
);

export const ALLOWED_VALS = new Map<string, string[]>(
  BQ_TABLE_SCHEMAS.flatMap((t) =>
    t.columns.filter((c) => c.allowedValues).map((c) => [`${t.table}.${c.name}`, c.allowedValues!])
  )
);

export function buildSchemaDescription(table: TableSchema): string {
  const cols = table.columns.map((c) => {
    let desc = `${c.name} (${c.type}): ${c.description}`;
    if (c.allowedValues) desc += ` [values: ${c.allowedValues.join(", ")}]`;
    return desc;
  }).join("\n");
  const joins = table.joins.map((j) => `${table.table}.${j.via} → ${j.to}.${j.via}: ${j.description}`).join("\n");
  return `Table: ${BQ_DATASET_ID}.${table.table}\nColumns:\n${cols}\n\nRelationships:\n${joins}\n\nBusiness questions: ${table.businessQuestions.join(", ")}`;
}

export function injectAllowedValues(tables: string[]): string {
  const lines: string[] = [];
  for (const t of tables) {
    for (const col of BQ_TABLE_SCHEMAS.find((s) => s.table === t)?.columns ?? []) {
      if (col.allowedValues && col.allowedValues.length > 0) {
        lines.push(`${t}.${col.name} allowed values: [${col.allowedValues.join(", ")}]`);
      }
    }
  }
  return lines.join("\n");
}

export function validateSql(sql: string): void {
  const forbidden = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|CALL|EXPORT|LOAD|MERGE|EXECUTE)\b/i;
  if (forbidden.test(sql)) {
    throw new ServiceError("BQ_ERROR", "Generated SQL contains forbidden operations", 400);
  }
}

export function formatBqContext(results: BigQueryResult): string {
  if (results.rows.length === 0) {
    return `BigQuery returned no matches for this query.\n\nQuery: ${results.executedQuery}`;
  }
  const header = `BigQuery results (${results.rowCount} rows, ${results.latencyMs}ms):`;
  const rows = results.rows
    .slice(0, 30)
    .map((r) => "  " + Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(", "))
    .join("\n");
  const note = results.rows.length > 30 ? `\n  ... and ${results.rows.length - 30} more rows` : "";
  return `${header}\n${rows}${note}\n\nQuery: ${results.executedQuery}`;
}
