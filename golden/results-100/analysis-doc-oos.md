# Deep Analysis: Document & Out-of-Scope Failures

**Analysis by Agent C** — Traces, root causes, and system-level implications for 3 failed questions.

---

## Failed Question 1: doc-08 — "What are the target average order value (AOV) and conversion rate for the online channel in the sales plan?"

### 1. What Happened

| Dimension | Detail |
|-----------|--------|
| **Ground truth** | AOV target: GBP 82.00; Conversion rate target: 5.0% |
| **App reply** | `"No relevant data found."` |
| **Score** | 0/4 — 0% pass |
| **Citations** | 1 BigQuery citation, **0 document citations** |

The fact is present verbatim in doc1 at line 45:
> *"Average order value is targeted at GBP 82.00, with a conversion rate of 5.0%."*

The app returned zero document chunks and fell back to BigQuery, which computed an SQL aggregation of actual AOV (not the plan target), and then the LLM responded "No relevant data found" because neither source answered the question about *targets*.

### 2. Pipeline Trace

From the trace and raw JSON:

```
Intent: DATABASE
```

The classification trace shows the LLM classifier (`deepseek/deepseek-v4-flash`) labeled this as **DATABASE**. Why? The classifier's examples include "Average order value" under DATABASE and the heuristic regex at `classifierHeuristics.ts:73` also matches `average order value` as DATABASE with weight 0.97. Neither the heuristic nor the LLM distinguished "target" (document fact) from "actual" (database aggregation).

Because the intent was **DATABASE**, the orchestrator (`orchestrator.ts:77-94`) ran BQ first:

```typescript
if (intent === "DATABASE") {
    await execBq();  // ← ran first
    // ...
    if (isBqEmpty) {
        await execDoc();  // ← fallback only if BQ returned nothing
    }
}
```

BQ returned 1 row of actual AOV data (GBP 113.33), so `isBqEmpty` was `false`. The document pipeline never ran.

### 3. Root Cause

Three compounding failures:

**a) Intent classification conflates "target/metric" with "database aggregation"** — `classifierHeuristics.ts:73` maps `average (order value|discount|price|quantity|spend)` to DATABASE with 0.97 weight. The LLM classifier similarly lists "Average order value" under DATABASE examples. Neither the heuristic nor the prompt distinguishes between *asking for a plan target* vs. *asking for a computed actual*. A question containing both "target" AND "average order value" should signal DOCUMENT, but the "average order value" pattern fires first.

**b) Low MIN_RELEVANCE_SCORE defeats the fallback guard** — The orchestrator correctly has a fallback path: if BQ returns empty, run document RAG. But BQ returned non-empty results (1 row of actual AOV), so the fallback never triggered. The orchestrator has no mechanism to detect that the BQ result answers a *different question* (actuals vs. targets). It only checks `isEmpty`.

**c) The document context is suppressed even though it was never consulted** — When intent is DATABASE and BQ returns data, the document context is never fetched. The system conflates "we found data" with "we found the *right* data."

### 4. Why It Matters

This is a **classification-first architecture failure**. The single classification step gates which pipeline runs. There is no:
- Post-retrieval verification that the source answers the question
- Mechanism to detect semantic mismatch between the user's ask and the data source
- Reranking or relevance threshold on BQ results (only an `isEmpty` check)

The system design assumes intent classification is **perfect**, but it demonstrably blurs the line between "database aggregation" and "document target." A DATABASE query returns actual AOV but the question asks for target AOV. The system sees "we got data, done" and never checks the doc.

**Design lesson**: The orchestrator should run both pipelines on any intent that could match either, then rank the combined results by relevance to the *specific question*, not by pipeline. A hybrid-first architecture (always run both, then fuse) would catch this.

---

## Failed Question 2: oos-10 — "How many users did we acquire through Google Ads campaigns in Germany?"

### 1. What Happened

| Dimension | Detail |
|-----------|--------|
| **Ground truth** | `No relevant data found.` |
| **App reply** | `"We acquired 2 users through Google Ads campaigns in Germany [1]."` |
| **Score** | 0% — flagged as "Answered rather than declining" |

This is a **full hallucination with plausible-looking SQL**.

### 2. Pipeline Trace

From the trace:

```
[orchestrate] Intent: DATABASE
```

The generated SQL:
```sql
SELECT COUNT(*) as google_ads_acquisitions FROM jd_sports.users u WHERE u.traffic_source = 'paid'
```

Returned 1 row: `{ google_ads_acquisitions: 2 }`.

### 3. Root Cause

Three errors in sequence:

**a) Intent classification fails (should be UNKNOWN/out-of-scope)** — The heuristic `classifierHeuristics.ts:72` matches `how many (customers|orders|users|...)` → DATABASE at 0.97 weight. The question contains "how many users" so the heuristic fires. Even though "Google Ads" and "Germany" are not in any available data source, the classifier labels it DATABASE. The fallback function (if LLM disagrees) only reduces confidence, it doesn't override.

**b) NL-to-SQL hallucinates the mapping "Google Ads = paid"** — The `bigquery.sql.ts` generation prompt tells the LLM: `allowed values: [organic, paid, referral, social, email, direct]` for `users.traffic_source`. But it also tells the LLM: "NEVER invent allowed values." However, the LLM (`cohere/north-mini-code:free`) maps "Google Ads" → "paid" which is semantically related but **not the same thing**. The actual database has no column for ad campaign (only `traffic_source` with 6 broad values). The LLM made a reasonable leap: Google Ads is a paid channel, so `traffic_source = 'paid'`. But the database has no way to distinguish Google Ads from other paid channels (e.g., paid social, display ads).

**c) The database has no Germany data** — The `users` table has a `state` column (England, Scotland, Wales, Northern Ireland) and a `city` column, but no "Germany" data. The SQL generated doesn't even filter by Germany — it just counts all `traffic_source = 'paid'` users. The answer "2" is the **count of all paid-acquisition users in the entire dataset**, not specific to Google Ads or Germany.

**d) The LLM generated the final reply from the SQL results + the question** — The system prompt (`orchestrator.ts:169`) says: "If a database query successfully returned 0 rows, state that no records match the criteria rather than saying 'No relevant data found.'" But the query returned non-zero rows. The LLM received `[39] BigQuery: 1 rows: google_ads_acquisitions: 2` and the user question "How many users did we acquire through Google Ads campaigns in Germany?" and produced the hallucination "We acquired 2 users through Google Ads campaigns in Germany."

### 4. Why It Matters

This is a **cascading hallucination hazard**. Three independent systems each failed to detect out-of-scope:

1. **Classifier**: No "not in my data" detection. The classifier has no mechanism to know what data exists — it only knows intent categories. It sees "how many" + "users" and labels it DATABASE, ignoring that "Google Ads" and "Germany" don't exist in the schema.

2. **SQL Generator**: The LLM maps ambiguous natural language to existing column values even when the match is imprecise. The prompt says "NEVER invent allowed values" but it doesn't say "IF the question references values not in the allowed set, return a comment instead of SQL." There is no abstention mechanism.

3. **Answer Generator**: The orchestrator's system prompt tells the LLM to say "No relevant data found" only if the query returned 0 rows. There's no instruction: "If the SQL doesn't actually match what the user asked about (e.g., the question mentions Google Ads but the query only filters by traffic_source = 'paid'), say 'No relevant data found.'"

The "2" number comes from an orthogonal query — it counts ALL paid users, not Google Ads users in Germany. But the LLM uses the number to answer the original question verbatim because that's how in-context learning works: given a question and some data, it tries to construct an answer.

**Design lesson**: The NL-to-SQL pipeline needs a "no-match" threshold. If the question references entities not in the schema (countries, cities, specific campaign names), the system should detect this at the table-selection or SQL-generation stage and abstain. The answer generator also needs a stricter prompt: "Do not use data from a query if the query doesn't address the question's specific constraints."

---

## Failed Question 3: oos-16 — "How many store refits are planned for Wales in FY2027?"

### 1. What Happened

| Dimension | Detail |
|-----------|--------|
| **Ground truth** | `No relevant data found.` |
| **App reply** | `"No relevant data found. The FY2027 sales plan states that 12 stores will be refurbished in total [1], but no source provides a breakdown of refits by region, including Wales."` |
| **Score** | 100% pass according to the scorer |

The scorer marked this as **pass** — the reply correctly says "no breakdown by region" and cites the document. However, this is a **partial hallucination**: the app provides *extra* information (12 stores) that is true in general but answering an out-of-scope question with any factual content is arguably a violation of the gold standard (which expects complete rejection).

### 2. Pipeline Trace

From the trace:

```
Relevance Score: 0.0376
```

Classified as **DOCUMENT** (the heuristic likely matched "fy2027" at `classifierHeuristics.ts:153` which maps `/\b(h1|h2|fy\s?\d{2,4})\b/` to DOCUMENT with 0.95 weight).

The RAG pipeline retrieved a chunk from doc1 that contains "FY2027 Annual Sales Plan" in the excerpt (the document title/header). The relevance score was extremely low (0.0376), but the orchestrator's threshold for DOCUMENT intent is `MIN_RELEVANCE_SCORE = 0.001` (`orchestrator.ts:125`). So even a 0.037 score passed the threshold.

The chunk text in Pinecone starts with "FY2027 Annual Sales Plan JD Sports UK | Financial Year 2026/27..." — it's the document header/excerpt. The LLM read the entire chunk context (which includes line 139: "Twelve stores will undergo full refurbishment in FY2027") because the chunker produced overlapping chunks and Pinecone returns long chunks with the full text.

### 3. Root Cause

Two compounding issues:

**a) Threshold of 0.001 allows any chunk through** — `MIN_RELEVANCE_SCORE = 0.001` is essentially zero. Any document chunk with any non-zero similarity will pass. For `DOCUMENT` intent, the threshold is 0.001; for `HYBRID` it's also 0.001 (`orchestrator.ts:125`). This means the relevance filter is nearly non-functional.

**b) The chunker's context window includes the 12-stores fact** — doc1 line 139 is in section 8 (Strategic Initiatives). The RAG retrieved a chunk from section 1 (Executive Summary, line 1), but the chunk text contained the full beginning of the document. Because the `pipeline.ts:73-79` provides `topChunks` (up to 3) as context to the LLM, and each chunk can contain up to 2000 characters (500 tokens × 4), the LLM gets the entire document context including the "12 stores" fact from line 139. The answer generator then uses this fact to partially answer the question.

But the question asks specifically about **Wales**, and no part of the document provides a Wales-specific refit breakdown. The document mentions "Wales" only in the regional breakdown at line 113: *"The South West, Wales, Northern Ireland, and the East of England make up the balance."* — with no specific store refit information for Wales.

The LLM correctly identifies "no source provides a breakdown by region" but chooses to include the "12 stores" fact as helpful context. The gold standard considers this an over-answer — rejecting should not include any factual claims, even if true.

### 4. Why It Matters

This is a **boundary erosion problem** at the out-of-scope boundary. The app answers "there's no data for Wales, but here's the total for the UK." This is helpful in human conversation but fails the gold standard.

The deeper issue: **the 0.001 relevance threshold is meaningless**. With `topK=40` candidates from Pinecone and scores that range from ~0.7 down to 0.001, essentially all chunks pass. The reranker (`nvidia/llama-nemotron-rerank-vl-1b-v2:free`) selects the top 3, but even a score of 0.037 from the reranker passes the threshold. The threshold should be calibrated to actual score distributions.

For out-of-scope questions, the system needs a **stricter post-retrieval verification**: if the maximum relevance score is below some threshold (maybe 0.3 for OOS, 0.1 for DOCUMENT), the answer should be a plain rejection with no extra information.

Note: the scorer marked this as pass because the reply contains "No relevant data found" and the scorer's rubric checks for declining as the primary criterion. But the inclusion of the "12 stores" fact is still architecturally wrong.

**Design lesson**: Out-of-scope answers should be sterile — a binary "No relevant data found" with no elaboration. The orchestrator should have an explicit "OUT_OF_SCOPE" branch that returns only the rejection message, skipping any document or database context injection. Currently, OOS questions that get classified as DATABASE or DOCUMENT bypass the UNKNOWN early-return at `orchestrator.ts:47-49`.

---

## Cross-Cutting Systemic Issues

### Issue A: The 0.001 relevance threshold is functionally zero
- `MIN_RELEVANCE_SCORE = 0.001` in `orchestrator.ts:10`
- For DOCUMENT and HYBRID intents, this same threshold is used at line 125
- Pinecone similarity scores for relevant documents typically range 0.3-0.8
- A threshold of 0.001 means *any* chunk passes, even ones scored at 0.03 (oos-16)
- **Fix**: Set to 0.3 (or calibrate from real query distributions)

### Issue B: No abstention mechanism in NL-to-SQL
- The SQL generator (`bigquerySqlGenerator.ts`) can only produce SQL or fail with an error
- There's no "I can't answer this from available data" output path
- When the question mentions entities not in the schema (Google Ads, Germany), the LLM silently maps to the closest available value
- **Fix**: Add a "can't answer" path in the SQL generator, triggered by entity mismatches or low schema similarity scores

### Issue C: Classifier has no data-awareness
- The classifier (`classifier.ts`) only sees the question text, not the available document summaries or database schema
- It can label something DATABASE without knowing whether the relevant tables/columns exist
- **Fix**: Feed the classifier a summary of available data (document titles, table names/descriptions) as additional context, or use the schema-matching branch in `bigquerySemantic.ts` as a second opinion

### Issue D: Fallback logic checks emptiness, not relevance
- The orchestrator's fallback (`orchestrator.ts:77-110`) checks if BQ returned empty rows or if doc chunks had zero relevance
- It does NOT check whether the data actually answers the question
- A BQ result with 1 row (like doc-08's actual AOV) blocks the doc pipeline even though it's the *wrong* data
- **Fix**: Always run both pipelines in parallel for DATABASE and DOCUMENT intents, then select the best results based on relevance scoring and question alignment

### Issue E: RAG chunk quality and overlap
- The chunker uses 500-token chunks with 50-token overlap, producing ~2000-character chunks
- When the document header is embedded, its vector similarity is very general, leading to low-relevance but top-3 reranked chunks that still pass the 0.001 threshold
- The "12 stores" fact is far from the retrieved chunk's position in the document but within the chunk's text because the chunker creates large overlapping chunks
- **Fix**: Consider sliding window or section-aware chunking that respects document structure (headings)
