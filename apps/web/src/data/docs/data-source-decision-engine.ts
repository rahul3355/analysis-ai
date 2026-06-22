const content = `## How we choose between Documents, BigQuery, Both, or Neither

### The Data Source Decision Engine

The system uses a multi-stage intent classifier to determine which data source to query for a given question: Documents (RAG), BigQuery (database), Both (Hybrid), or Neither (Unknown).

### Key Files

| File | Role |
|---|---|
| src/core/pipeline/classifier.ts | Intent classifier with 4 stages: cache, heuristic, LLM, fallback |
| src/core/pipeline/classifierHeuristics.ts | 94 regex-based heuristic patterns with weighted confidence scores |
| src/server/services/intentCacheService.ts | Pinecone-backed intent cache for fast re-classification |
| src/core/pipeline/orchestrator.ts | Routes execution based on classified intent, with fallback logic |
| src/server/clients/embeddingClient.ts | OpenAI \`text-embedding-3-small\` for generating embeddings |

### The Four Intent Categories

| Intent | Meaning | Data Source |
|---|---|---|
| DATABASE | Structured data aggregation question | BigQuery SQL |
| DOCUMENT | Pre-computed metrics from business reports | Document RAG (Pinecone) |
| HYBRID | Cross-references document claims with database data | Both |
| UNKNOWN | Out of scope or too ambiguous | Neither |

### Stage 1: Heuristic Pattern Matching

The first and fastest stage (\`classifierHeuristics.ts\`) uses 94 regex patterns organized into groups:

**DOCUMENT patterns** (45+ patterns) — Triggered by phrases like:
- \`full-price sell-through\` → weight 0.99
- \`framework agreement\`, \`annual sales plan\`, \`campaign brief\` → weight 0.99
- \`media budget\`, \`gross margin\`, \`weeks of cover\` → weight 0.95-0.99
- \`how many stores\`, \`store count\`, \`like-for-like\` → weight 0.95-0.98

**DATABASE patterns** (20+ patterns) — Triggered by phrases like:
- \`how many customers/orders/users\` → weight 0.97
- \`average order value\`, \`by region/channel/category\` → weight 0.92-0.97
- \`total revenue/sales\`, \`top/bottom N\`, \`low stock\` → weight 0.95-0.97
- \`bigquery\`, \`sql query\`, \`database\`, \`bq\` keywords → weight 0.92

**HYBRID patterns** (9 patterns) — Triggered by phrases like:
- \`according to [document]... [compare/track]\` → weight 0.98
- \`validate/verify/confirm against data/database\` → weight 0.95
- \`actual vs plan/target/budget\` → weight 0.85-0.90
- \`how does... compare/track/stack up\` → weight 0.92

**UNKNOWN patterns** (7 patterns) — Triggered by:
- \`weather\`, \`tell me a joke/story/poem\` → weight 0.99
- \`who is CEO\`, \`stock price\` → weight 0.95
- \`how are sales/things/we doing\` (vague) → weight 0.70

**Conflict resolution logic:**
- HYBRID scores always win (first check)
- UNKNOWN >= 0.80 returns UNKNOWN
- If the top-2 scores both exceed 0.70, it's classified as HYBRID (conflicting signals)
- Otherwise, the highest-scoring intent wins with its weight as confidence

### Stage 2: Pinecone Intent Cache

Before calling the LLM, the system checks a Pinecone namespace (\`intent-cache\`) for cached classifications:

1. The question is embedded and searched against previous classifications
2. If a cached intent exists AND the heuristic agrees (same intent), it returns immediately with confidence 0.95
3. If there's a mismatch, the stale cache entry is deleted

This avoids an LLM call for questions that have been seen before.

### Stage 3: LLM Classification

If heuristic and cache don't yield a high-confidence result, the system calls OpenRouter with a system prompt:

\`\`\`typescript
const systemPrompt = \`You are a query intent classifier for a retail BI assistant.
Classify the user's question into one of four categories:

DATABASE: Structured data aggregation — counts, sums, averages, top-N rankings,
breakdowns by region/channel/category/brand. Answerable with SQL.
Examples: "What were our top 3 products by revenue?" "Average order value"

DOCUMENT: Pre-computed metrics from business reports — numbers an analyst wrote down.
Examples: "What is the running footwear full-price sell-through rate?" "Media budget for BTS?"

HYBRID: Cross-references a document claim with database data.
Examples: "Hoka grew 52% according to the deep dive. What was Hoka's actual revenue?"

UNKNOWN: Out of scope or too ambiguous.
Examples: "What is the weather in London?" "Tell me a joke"

Respond with ONLY the category label.\`;
\`\`\`

The model (\`deepseek/deepseek-v4-flash\`, temperature 0.0, 8s timeout) is used for this. The response is parsed by looking for one of the four labels in the output.

### Stage 4: Fallback

If the LLM call fails (timeout, API error, unparseable response), the system falls back to the heuristic result with 80% of its original confidence. If no heuristic matched, it defaults to HYBRID with 0.5 confidence.

### Stage 5: Orchestration & Routing

In \`orchestrator.ts\`, the classified intent drives execution:

\`\`\`
DATABASE → Execute BigQuery SQL
           If BQ returns empty → fallback to Document RAG

DOCUMENT → Execute Document RAG (Pinecone search)
           If no relevant chunks → fallback to BigQuery

HYBRID   → Execute BOTH in parallel (Promise.all)
           Both results merged into context

UNKNOWN  → Return "No relevant data found."
\`\`\`

**DATABASE flow:**
1. Question is embedded (for semantic cache check and table selection)
2. Semantic cache is checked (cosine similarity >= 0.95 reuses cached SQL)
3. Schema context is built (table selection via Pinecone, golden examples via RAG)
4. SQL is generated via LLM, validated, and executed against BigQuery
5. Results are formatted as \`[N] BigQuery: X rows\\n...\` with the SQL query cited
6. If BQ returns empty, fallback to document RAG

**DOCUMENT flow:**
1. Question is embedded and searched against Pinecone document chunks
2. Top chunks are re-ranked by relevance score
3. If max relevance score < 0.001, fallback to BigQuery
4. Document context is formatted with source indices \`[1]\`, \`[2]\` for citation

**HYBRID flow:**
1. Both RAG and BigQuery run in parallel
2. Document threshold is lowered to 0.001 (more inclusive)
3. Both results are merged into a single context block
4. The answer-generation LLM gets both sources and generates a unified answer

### The Answer Generation

After context is assembled (regardless of intent path), the final step feeds everything to an LLM:

\`\`\`
System: "You are Analysis AI. Answer ONLY using the sources below.
Use inline citations like [1], [2] referencing source indices.
... [merged context with document chunks and/or BigQuery results]"

User: [original question]
\`\`\`

The LLM generates the final answer with inline citations pointing back to specific sources, and citations are rendered in the UI with excerpts.
`;

export default content;
