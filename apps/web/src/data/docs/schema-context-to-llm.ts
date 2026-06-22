const content = `## How is schema context provided to the LLM?

### Overview

The system provides BigQuery schema context to an LLM (via OpenRouter) to generate BigQuery SQL queries from natural language questions. The pipeline has several stages: schema sourcing, semantic table selection, prompt construction, and LLM call.

### Key Files

| File | Role |
|---|---|
| src/server/config/bigquery.ts | Hand-authored schema metadata: 6 table schemas with columns, types, descriptions, allowed values, and join relationships |
| src/server/services/bigqueryHelpers.ts | Schema formatting: builds description text, injects allowed values, validates generated SQL |
| src/server/services/bigquerySemantic.ts | Semantic table selection & golden example retrieval via Pinecone |
| src/server/services/bigquerySqlGenerator.ts | LLM prompt construction & SQL generation |
| src/server/services/bigqueryService.ts | Main orchestrator: live schema fetch, table selection, golden examples, LLM call, retry loop, SQL execution |
| src/server/clients/bigqueryClient.ts | BigQuery SDK wrapper for executing generated SQL |

### Stage 1: Schema Sources (Two Layers)

**Layer 1: Live Schema from BigQuery API**
In \`bigqueryService.ts\`, \`fetchLiveSchemas()\` calls the BigQuery API to get actual column names and types for all 6 tables. Results are cached in \`schema-cache.json\` to avoid repeated API calls.

\`\`\`json
// schema-cache.json format
{
  "jd_sports.products": [
    { "name": "product_id", "type": "STRING" },
    { "name": "product_name", "type": "STRING" },
    { "name": "category", "type": "STRING" }
  ]
}
\`\`\`

**Layer 2: Hand-Authored Metadata**
In \`bigquery.ts\`, each table has descriptions, allowed values, join relationships, and business questions:

\`\`\`typescript
{
  table: "jd_sports.products",
  columns: [
    { name: "product_id", type: "STRING", description: "Unique product identifier" },
    { name: "product_name", type: "STRING", description: "Product display name" },
    { name: "category", type: "STRING", description: "Product category",
      allowedValues: ["Running", "Lifestyle", "Outerwear", "Training", "Accessories"] },
  ],
  joins: [
    { via: "product_id", to: "order_items", type: "one_to_many",
      description: "Each product appears in many order line items" }
  ]
}
\`\`\`

### Stage 2: Semantic Table Selection

Rather than dumping all 6 tables into every prompt, the system intelligently selects the most relevant ones:

1. Each table's description is embedded using \`text-embedding-3-small\` (1536 dimensions) and upserted to Pinecone namespace \`bq-schemas\`
2. At query time, the user's question is embedded and Pinecone returns the top-3 most relevant tables (cosine similarity threshold > 0.3)
3. Falls back to all tables if Pinecone fails or returns nothing

The description text used for embedding includes table name, columns with types and descriptions, allowed values, join relationships, and business questions it can answer.

### Stage 3: Golden Example Retrieval

22 NL-to-SQL example pairs are stored in \`golden/golden-queries.json\`. Each question is embedded and upserted to Pinecone namespace \`golden-queries\`. At query time, the top-2 most similar golden examples (threshold > 0.4) are retrieved and injected into the prompt as few-shot examples.

### Stage 4: Prompt Construction

In \`bigquerySqlGenerator.ts\`, the system prompt is built with these sections:

1. **Available Tables** — For each selected table, merge live column names/types with descriptions and allowed values:
   \`\`\`
   jd_sports.products:
     - product_id (STRING): Unique product identifier
     - category (STRING): Product category [values: Running, Lifestyle, ...]
     - Joins to order_items via product_id (one_to_many): Each product appears in many order line items
   \`\`\`

2. **Relationships** — All join relationships between selected tables:
   \`\`\`
   order_items.product_id → products.product_id: Each line item is one product SKU
   orders.user_id → users.user_id: Each order is placed by one customer
   \`\`\`

3. **Allowed Values** — Exact categorical values the LLM must use:
   \`\`\`
   products.category allowed values: [Running, Lifestyle, Outerwear, Training, Accessories]
   orders.status allowed values: [pending, processing, shipped, delivered, cancelled]
   \`\`\`

4. **Similar Queries** — The golden examples retrieved from Pinecone RAG

5. **Rules** — Hard constraints:
   - Output ONLY the SQL, no explanations, no markdown
   - Always qualify tables as \`jd_sports.table_name\`
   - Use aggregations (SUM, COUNT, AVG, ROUND) with GROUP BY
   - NEVER use SELECT * — always list column names
   - NEVER invent column names or allowed values
   - SELECT only — no DDL/DML
   - When aggregating revenue/sales, filter by \`o.status IN ('delivered', 'shipped')\`
   - Use \`IF()\` as a function expression
   - Use table aliases (p, o, oi, u, i, e)
   - For "most common"/"highest"/"top", check for ties with \`DENSE_RANK()\`
   - NEVER use numbers from user's question as literal SQL values

6. **Retry Error** (on second attempt) — The previous SQL execution error is injected for self-correction

### Stage 5: LLM Call & Retry Loop

The prompt is sent to OpenRouter:

- **Primary model**: \`cohere/north-mini-code:free\` (10s timeout)
- **Fallback model**: \`deepseek/deepseek-v4-flash\` (30s timeout)

Each model gets up to 2 attempts (total 4 max). On failure, the BigQuery execution error is passed back as \`retryError\` for the LLM to self-correct.

\`\`\`typescript
{
  model: "cohere/north-mini-code:free",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: question }
  ],
  temperature: 0.1,
  max_tokens: 5000,
}
\`\`\`

### Stage 6: SQL Post-Processing & Validation

After receiving the LLM response:
1. Markdown code fences are stripped
2. Whitespace is normalized
3. SQL is validated against a forbidden patterns regex (rejects DROP, DELETE, INSERT, UPDATE, ALTER, CREATE, etc.)
4. Validated SQL is executed via \`@google-cloud/bigquery\`

### Caching Architecture (3 Layers)

1. **Schema metadata cache** (\`schema-cache.json\`) — Persists column names/types from BigQuery API to avoid repeated API calls
2. **Semantic SQL cache** (\`sql-cache.json\`) — Stores question embeddings + generated SQL; uses cosine similarity (threshold 0.95) to reuse previously generated SQL for semantically similar questions
3. **Pinecone vector indices** — \`bq-schemas\` (6 table records), \`golden-queries\` (22 example records), \`intent-cache\` (previous classification results)

### Summary

The schema context provided to the LLM is a carefully constructed prompt that combines:
- Live BigQuery column metadata (names + types)
- Hand-authored semantic descriptions, allowed values, and join relationships
- Relevant tables only (semantic selection via Pinecone)
- Similar NL-to-SQL examples (few-shot via Pinecone RAG)
- Explicit rules and constraints
- (On retry) Previous error messages for self-correction
`;

export default content;
