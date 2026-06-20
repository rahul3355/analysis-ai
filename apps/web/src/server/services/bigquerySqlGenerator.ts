import { BQ_TABLE_SCHEMAS, BQ_RELATIONSHIPS, BQ_DATASET_ID } from "@/server/config/bigquery";
import { getOpenRouterConfig } from "@/server/config/openrouter";
import { ServiceError } from "@/server/services/chatService";
import { HEADER_DESC, ALLOWED_VALS, injectAllowedValues } from "./bigqueryHelpers";

function buildSchemaPrompt(tables: string[], liveSchemas: Map<string, { name: string; type: string }[]>): string {
  return tables
    .map((t) => {
      const live = liveSchemas.get(t) ?? [];
      const desc = (name: string) => HEADER_DESC.get(`${t}.${name}`) ?? "";
      const cols = live.length > 0
        ? live.map((c) => {
            const d = desc(c.name);
            const vals = ALLOWED_VALS.get(`${t}.${c.name}`);
            const valStr = vals ? ` [values: ${vals.join(", ")}]` : "";
            return d ? `  - ${c.name} (${c.type}): ${d}${valStr}` : `  - ${c.name} (${c.type})${valStr}`;
          }).join("\n")
        : BQ_TABLE_SCHEMAS.find((s) => s.table === t)?.columns.map((c) => {
            const vals = ALLOWED_VALS.get(`${t}.${c.name}`);
            const valStr = vals ? ` [values: ${vals.join(", ")}]` : "";
            return `  - ${c.name} (${c.type}): ${c.description}${valStr}`;
          }).join("\n") ?? "";
      const joins = BQ_TABLE_SCHEMAS.find((s) => s.table === t)?.joins
        .map((j) => `  - Joins to ${j.to} via ${j.via} (${j.type}): ${j.description}`)
        .join("\n") ?? "";
      return `${BQ_DATASET_ID}.${t}:\n${cols}\n${joins}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

function buildRelationshipsPrompt(tables: string[]): string {
  return BQ_RELATIONSHIPS
    .filter((r) => tables.includes(r.from) && tables.includes(r.to))
    .map((r) => `${r.from}.${r.via} → ${r.to}.${r.via}: ${r.description}`)
    .join("\n");
}

const PRIMARY_MODEL = "cohere/north-mini-code:free";
const FALLBACK_MODEL = "deepseek/deepseek-v4-flash";

export async function llmGenerateSql(
  question: string,
  tables: string[],
  liveSchemas: Map<string, { name: string; type: string }[]>,
  goldenExamples: string,
  retryError?: string,
  model?: string
): Promise<string> {
  const schemaText = buildSchemaPrompt(tables, liveSchemas);
  const relationshipsText = buildRelationshipsPrompt(tables);
  const allowedValuesText = injectAllowedValues(tables);
  const retryHint = retryError
    ? `\n\nYour previous SQL attempt failed with this error:\n"${retryError}"\nFix the issue and return ONLY corrected SQL.`
    : "";
  const systemPrompt = `You are a BigQuery SQL expert for JD Sports UK. Generate ONLY valid BigQuery SQL.

AVAILABLE TABLES (actual columns from BigQuery):
${schemaText}

RELATIONSHIPS:
${relationshipsText}${allowedValuesText ? `\n\nALLOWED VALUES:\n${allowedValuesText}` : ""}${goldenExamples ? `\n\nSIMILAR QUERIES:\n${goldenExamples}` : ""}

RULES:
- Output ONLY the SQL query, no explanations, no markdown formatting
- Always qualify tables as \`${BQ_DATASET_ID}.table_name\`
- Use aggregations (SUM, COUNT, AVG, ROUND) with GROUP BY -- return summary rows, not raw data
- Use window functions (LAG, LEAD) for comparisons and trends when appropriate
- ROUND calculated fields to 2 decimal places
- Aim for under 50 result rows
- NEVER use SELECT * -- always list column names explicitly
- NEVER invent column names -- only use columns from the AVAILABLE TABLES above
- NEVER invent allowed values -- only use the exact values listed in ALLOWED VALUES
- Use SAFE_CAST if type conversion is needed
- If the question is ambiguous, make reasonable assumptions
- SELECT only -- no DDL, DML, or table mutations
- IMPORTANT: When aggregating revenue, sales, or orders, ALWAYS filter by o.status IN ('delivered', 'shipped') to exclude cancelled/processing/pending orders
- IMPORTANT: Use IF() as a function expression (e.g., IF(condition, val1, val2) AS alias), never as a standalone statement
- IMPORTANT: When joining, use table aliases (p, o, oi, u, i, e)
- IMPORTANT: For product name matching, use p.product_name LIKE '%keyword%' with the full product name from the question. NEVER split into brand + name fragment. If a brand is mentioned, also add p.brand = 'BrandName' as a filter.
- IMPORTANT: For "most common" / "highest" / "top" questions, check for ties. Do NOT use LIMIT 1 alone — use DENSE_RANK() window function or compare counts to handle ties.
- IMPORTANT: NEVER use numbers from the user's question as literal values in SQL calculations. All values must come from database columns or computed from them. You can use dates/times from the question as filter parameters.
- IMPORTANT: For gross margin or profit calculations, ALWAYS use oi.sale_price * oi.quantity for revenue and oi.cost * oi.quantity for cost from order_items joined to orders (o.status IN ('delivered','shipped')). NEVER compute margin from product catalog prices (p.rrp, p.cost_price) — those are list prices, not actual transaction prices. Always multiply by quantity: SUM(oi.sale_price * oi.quantity) and SUM(oi.cost * oi.quantity).${retryHint}`;

  const config = getOpenRouterConfig();
  const timeoutMs = model === PRIMARY_MODEL ? 10000 : 30000;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: model || PRIMARY_MODEL,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: question }],
        temperature: 0.1,
        max_tokens: 5000,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new ServiceError("LLM_ERROR", `OpenRouter SQL generation failed (${response.status}): ${text.slice(0, 200)}`, 502);
    }
    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    let sql = data?.choices?.[0]?.message?.content?.trim() || "";
    if (!sql) throw new ServiceError("LLM_ERROR", "OpenRouter returned empty SQL response", 502);

    sql = sql.replace(/^```(?:sql)?\s*/i, "").replace(/\s*```$/i, "").trim();
    sql = sql.replace(/^\s+$/gm, "").trim().replace(/\s+/g, " ").trim();
    return sql;
  } catch (err) {
    if (err instanceof ServiceError) throw err;
    throw new ServiceError("LLM_ERROR", `SQL generation failed: ${err instanceof Error ? err.message : String(err)}`, 502);
  }
}
