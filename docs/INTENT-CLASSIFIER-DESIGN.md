# Intent Classifier Design — Production Specification

> Target: <50ms p50 latency, >95% accuracy on golden test cases, zero LLM calls for trivial/obvious queries.

---

## 1. Architecture: Two-Stage Router

```
┌──────────────┐   stage 1 (<1ms)   ┌───────────────┐
│  User Query  │ ──────────────────→ │  Quick Class  │
└──────────────┘                     │  (regex +     │
                                     │   keyword)    │
                                     └───────┬───────┘
                                             │
                                     ┌───────▼───────┐
                                     │  confidence   │
                                     │  ≥ 0.95?      │
                                     └───────┬───────┘
                                    ╱         ╲
                                 YES           NO
                                 ╱               ╲
                    ┌──────────────┐     ┌──────────────┐
                    │ Return label │     │ Stage 2: LLM │
                    │ + confidence │     │ (only if      │
                    │ (no LLM)     │     │ 0.30 ≤ c <    │
                    └──────────────┘     │ 0.95)         │
                                         └──────┬───────┘
                                                │
                                         ┌──────▼───────┐
                                         │ confidence   │
                                         │ from LLM ≥   │
                                         │ 0.80?        │
                                         └──────┬───────┘
                                        ╱         ╲
                                     YES           NO
                                     ╱               ╲
                        ┌──────────────┐     ┌─────────────────┐
                        │ Return label │     │ Fallback:       │
                        │              │     │ UNKNOWN → ask   │
                        └──────────────┘     │ clarifying Q    │
                                             └─────────────────┘
```

### Threshold Constants

| Threshold | Value | Rationale |
|-----------|-------|-----------|
| `QUICK_ACCEPT` | 0.95 | Regex must be extremely certain to skip LLM |
| `LLM_LOWER` | 0.30 | Below this, query is almost certainly UNKNOWN/non-business |
| `LLM_ACCEPT` | 0.80 | LLM must be fairly confident; below → ask clarifying |
| `UNKNOWN_REJECT` | 0.10 | Hard non-business (weather, jokes) → immediate return |

### Execution Flow (pseudocode)

```typescript
// file: apps/web/src/core/pipeline/classifier.ts

export type IntentLabel = "DATABASE" | "DOCUMENT" | "HYBRID" | "UNKNOWN";

export interface ClassificationResult {
  label: IntentLabel;
  confidence: number;        // 0.0 – 1.0
  stage: "quick" | "llm";    // which stage produced this
  reasoning?: string;        // from LLM stage, for observability
}

export async function classifyIntent(message: string): Promise<ClassificationResult> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { label: "UNKNOWN", confidence: 1.0, stage: "quick" };
  }

  // --- Stage 1: Quick classifier ---
  const quickResult = quickClassify(trimmed);
  if (quickResult.confidence >= QUICK_ACCEPT) {
    return { ...quickResult, stage: "quick" };
  }

  // Hard UNKNOWN (weather, jokes, etc.) — no LLM needed
  if (quickResult.label === "UNKNOWN" && quickResult.confidence >= UNKNOWN_REJECT) {
    return { ...quickResult, stage: "quick" };
  }

  // Low-confidence UNKNOWN — still try LLM (user might be creative)
  if (quickResult.label === "UNKNOWN" && quickResult.confidence < LLM_LOWER) {
    return { label: "UNKNOWN", confidence: 1.0, stage: "quick" };
  }

  // --- Stage 2: LLM classifier (only for ambiguous queries) ---
  const llmResult = await llmClassify(trimmed, quickResult);
  if (llmResult.confidence >= LLM_ACCEPT) {
    return { ...llmResult, stage: "llm" };
  }

  // LLM uncertain → fallback to lower-cost path
  return { label: "UNKNOWN", confidence: llmResult.confidence, stage: "llm" };
}
```

---

## 2. Heuristic Rules — Quick Classifier

### 2.1 Pattern Priority

Rules are evaluated in priority order within each class. All patterns are case-insensitive. Each pattern has a base weight. The first match in each class "wins" for that class, then scores are aggregated.

### 2.2 DOCUMENT Patterns

```typescript
const DOCUMENT_PATTERNS: Array<{ re: RegExp; weight: number; label: string }> = [
  // ── Framework Agreements & Contracts ──
  { re: /\bframework\s*agreement\b/i,     weight: 0.95, label: "contract-term" },
  { re: /\bminimum\s*(annual\s*)?purchase\s*(commitment|obligation)\b/i, weight: 0.95, label: "purchase-commitment" },
  { re: /\brebate\s*(rate|threshold|tier)\b/i,  weight: 0.90, label: "rebate-term" },
  { re: /\bvolume\s*commitment\b/i,       weight: 0.90, label: "volume-commitment" },
  { re: /\b(contract|agreement)\s*(clause|term|section|provision)\b/i, weight: 0.85, label: "contract-clause" },

  // ── Sell-Through & Margin ──
  { re: /\bfull.?price\s*sell.?through\s*(rate|%|percentage)?\b/i, weight: 0.95, label: "sell-through" },
  { re: /\bsell.?through\s*rate\b/i,      weight: 0.85, label: "sell-through-generic" },
  { re: /\bgross\s*margin\b/i,            weight: 0.75, label: "margin" },
  { re: /\bprice\s*(tier|architecture|band)\b/i, weight: 0.85, label: "pricing" },

  // ── Campaign Briefs ──
  { re: /\b(BTS|back\s*to\s*school)\s*campaign\b/i, weight: 0.95, label: "campaign-bts" },
  { re: /\b(campaign|media|marketing)\s*budget\b/i,  weight: 0.80, label: "campaign-budget" },
  { re: /\bcampaign\s*brief\b/i,          weight: 0.90, label: "campaign-brief" },

  // ── Store & Regional Performance Reports ──
  { re: /\b(store\s*estate|store\s*count|new\s*stores?\s*planned)\b/i, weight: 0.90, label: "store-count" },
  { re: /\bperformance\s*vs\s*\.?\s*plan\b/i, weight: 0.85, label: "vs-plan" },
  { re: /\b(against|below|above)\s*plan\b/i,   weight: 0.70, label: "plan-comparison" },
  { re: /\bQ[1-4]\s*(review|performance|report|results?)\b/i, weight: 0.85, label: "quarterly-review" },
  { re: /\bregional\s*performance\b/i,    weight: 0.80, label: "regional-perf" },
  { re: /\bunderperformance\b/i,          weight: 0.75, label: "underperformance" },

  // ── Brand / Category Deep Dives ──
  { re: /\bdeep\s*dive\b/i,              weight: 0.85, label: "deep-dive" },
  { re: /\byear.?on.?year\s*growth\b/i,  weight: 0.80, label: "yoy-growth" },
  { re: /\bbrand\s*(share|growth|leader)\b/i, weight: 0.75, label: "brand-analysis" },
  { re: /\bcategory\s*revenue\b/i,        weight: 0.70, label: "category-rev" },
  { re: /\brunning\s*(footwear|shoe)\b/i, weight: 0.65, label: "running-fw" },

  // ── Document References ──
  { re: /\b(section|page|clause)\s*\d+\b/i, weight: 0.60, label: "section-ref" },
  { re: /\b(according\s*to\s*the|the\s*(report|document|review|brief)\s*(says|states|indicates|shows))\b/i, weight: 0.65, label: "doc-reference" },
];
```

### 2.3 DATABASE Patterns

```typescript
const DATABASE_PATTERNS: Array<{ re: RegExp; weight: number; label: string }> = [
  // ── Revenue & Transactions ──
  { re: /\b(total\s+)?revenue\b/i,        weight: 0.60, label: "revenue" },
  { re: /\baverage\s*order\s*value\b/i,   weight: 0.95, label: "aov" },
  { re: /\bAOV\b/i,                       weight: 0.95, label: "aov-acronym" },
  { re: /\border(s|ed)?\s*(placed|count|volume|total)\b/i, weight: 0.75, label: "order-count" },
  { re: /\bmost\s*revenue\b/i,            weight: 0.70, label: "top-revenue" },
  { re: /\btop\s*(selling|performing)\s*(product|SKU|item)\b/i, weight: 0.70, label: "top-product" },
  { re: /\bbrand\s*revenue\b/i,           weight: 0.65, label: "brand-rev" },

  // ── Returns & Discounts ──
  { re: /\breturn\s*rate\b/i,             weight: 0.90, label: "return-rate" },
  { re: /\breturned\b/i,                  weight: 0.60, label: "returned-items" },
  { re: /\bdiscount\s*(depth|percentage|rate|pct)\b/i, weight: 0.85, label: "discount-depth" },

  // ── Customers ──
  { re: /\b(how\s* many\s*)?customers?\b.*\b(by|per|grouped\s*by)\b/i,  weight: 0.80, label: "customer-count" },
  { re: /\bage\s*group\s*distribution\b/i, weight: 0.90, label: "age-dist" },
  { re: /\bage_group\b/i,                 weight: 0.85, label: "age-group-col" },
  { re: /\bcustomer(s)?\s*(demographic|age|segment)\b/i, weight: 0.75, label: "customer-demo" },
  { re: /\bloyalty\s*tier\b/i,            weight: 0.80, label: "loyalty" },

  // ── Channels ──
  { re: /\b(by|per)\s*(channel|sales\s*channel)\b/i, weight: 0.75, label: "by-channel" },
  { re: /\bchannels?\s*(online|store|b2b)\b/i, weight: 0.70, label: "channel-type" },
  { re: /\bconversion\s*rate\b/i,         weight: 0.80, label: "conversion" },

  // ── Inventory ──
  { re: /\b(distribution\s*cent(re|er)|DC)\b/i, weight: 0.75, label: "dist-center" },
  { re: /\bstock\s*(level|on\s*hand|low|reorder)\b/i, weight: 0.75, label: "stock-level" },
  { re: /\binventory\b/i,                 weight: 0.65, label: "inventory" },

  // ── Aggregation Signals ──
  { re: /\bGROUP\s*BY\b/i,                weight: 0.95, label: "sql-groupby" },
  { re: /\bSUM\s*\(/i,                    weight: 0.95, label: "sql-sum" },
  { re: /\bCOUNT\s*\(/i,                  weight: 0.90, label: "sql-count" },
  { re: /\btraffic\s*source\b/i,          weight: 0.75, label: "traffic" },

  // ── Temporal Aggregates ──
  { re: /\b(monthly|weekly|daily|quarterly)\s*(revenue|sales|trend)\b/i, weight: 0.75, label: "time-trend" },
  { re: /\b(month|week|quarter)\s*(over\s*month|over\s*week|over\s*quarter|to\s*date)\b/i, weight: 0.70, label: "time-period" },
];
```

### 2.4 HYBRID Patterns

```typescript
const HYBRID_PATTERNS: Array<{ re: RegExp; weight: number; label: string }> = [
  { re: /\b(how\s*does|does)\s*.{1,100}\s*(track|compare|align|match|square)\s*(against|with)\b/i, weight: 0.90, label: "cross-ref" },
  { re: /\bcompare\s*.{1,100}\s*(with|against|to)\s*.{1,100}\s*(database|bigquery|bq|document|report|pdf)\b/i, weight: 0.85, label: "explicit-compare" },
  { re: /\b(both|as well as|in addition to)\s*.{1,100}\s*(database|bigquery|bq|document|report|pdf|spreadsheet)\b/i, weight: 0.80, label: "both-sources" },
  { re: /\bcross.?reference\b/i,           weight: 0.85, label: "cross-reference" },
  { re: /\b(validate|verify|check)\s*.{1,100}\s*(against|with)\s*.{1,100}\s*(data|database|bq|bigquery)\b/i, weight: 0.80, label: "validate-against" },
  { re: /\b(according\s*to)\s*.{1,100}\s*(how|what|does|is)\b/i, weight: 0.70, label: "accord-vs-data" },
  { re: /\b(run.?rate|annualized)\s*.{1,100}\s*(threshold|target|plan)\b/i, weight: 0.75, label: "runrate-vs-target" },
];
```

### 2.5 UNKNOWN / Out-of-Scope Patterns

```typescript
const UNKNOWN_PATTERNS: Array<{ re: RegExp; weight: number; label: string }> = [
  // ── Non-business queries ──
  { re: /\bweather\b/i,                   weight: 0.99, label: "weather" },
  { re: /\bjoke\b/i,                      weight: 0.99, label: "joke" },
  { re: /\btell\s*me\s*a\b/i,            weight: 0.90, label: "tell-me" },
  { re: /\b(how are you|what can you do|who are you|what are you)\b/i, weight: 0.95, label: "about-bot" },
  { re: /\b(CEO|founder|chairman|director)\s*(of|is|name)\b/i, weight: 0.80, label: "person-query" },
  { re: /\bwho\s*is\b/i,                  weight: 0.50, label: "who-is" },
  { re: /\b(recipe|cook|eat|food|restaurant)\b/i, weight: 0.85, label: "food" },
  { re: /\b(movie|song|book|celebrity|actor|singer)\b/i, weight: 0.80, label: "entertainment" },
  { re: /\b(stock\s*price|share\s*price|market\s*cap)\b/i, weight: 0.70, label: "stock-price" },

  // ── Ambiguous / underspecified ──
  { re: /^\s*(how\s*are\s*sales|how's\s*business|how\s*are\s*things)\s*[?.!]*\s*$/i, weight: 0.60, label: "vague-sales" },
  { re: /^\s*(what\s*was\s*the\s*sell-through|what\s*is\s*the\s*sell-through)\s*[?.!]*\s*$/i, weight: 0.55, label: "vague-sellthrough" },

  // ── Empty / gibberish ──
  { re: /^[^a-zA-Z0-9]{3,}$/,            weight: 0.95, label: "non-alphanumeric" },
  { re: /^(hi|hello|hey|thanks|ok|okay|yes|no|goodbye|bye)\s*[?.!]*\s*$/i, weight: 0.90, label: "greeting" },
];
```

---

## 3. Confidence Scoring

### 3.1 Single-class Score

For each class C, collect all matching patterns:

```typescript
function classScore(message: string, patterns: Pattern[]): { score: number; matched: string[] } {
  let score = 0;
  const matched: string[] = [];

  for (const p of patterns) {
    if (p.re.test(message)) {
      // Noisy-OR accumulation: 1 - ∏(1 - weight_i)
      score = 1 - (1 - score) * (1 - p.weight);
      matched.push(p.label);
    }
  }

  return { score, matched };
}
```

### 3.2 Conflicting Pattern Handling

When multiple classes match, dampen confidence proportionally to the runner-up:

```typescript
function resolveConflicts(scores: Map<IntentLabel, { score: number; matched: string[] }>): ClassificationResult {
  const sorted = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);

  const [topLabel, top] = sorted[0];
  const runnerUp = sorted[1]?.[1];

  let finalConfidence = top.score;

  if (runnerUp && runnerUp.score > 0.15) {
    // Dampen: the higher the runner-up score, the more we dampen
    const dampening = runnerUp.score * 0.5;
    finalConfidence = Math.max(0, top.score - dampening);
  }

  // Boost from multiple matching classes (strong signal for HYBRID)
  if (topLabel !== "HYBRID" && runnerUp && runnerUp.score > 0.30) {
    // If two non-HYBRID classes both have decent scores, it's HYBRID
    const potentialHybrid = top.score + runnerUp.score * 0.3;
    if (potentialHybrid > finalConfidence && potentialHybrid > 0.5) {
      return { label: "HYBRID", confidence: potentialHybrid, stage: "quick" };
    }
  }

  return { label: topLabel, confidence: finalConfidence, stage: "quick" };
}
```

### 3.3 Quick Classifier — Full Implementation

```typescript
function quickClassify(message: string): ClassificationResult {
  const scores = new Map<IntentLabel, { score: number; matched: string[] }>();

  const doc = classScore(message, DOCUMENT_PATTERNS);
  const db = classScore(message, DATABASE_PATTERNS);
  const hybrid = classScore(message, HYBRID_PATTERNS);
  const unknown = classScore(message, UNKNOWN_PATTERNS);

  scores.set("DOCUMENT", doc);
  scores.set("DATABASE", db);
  scores.set("HYBRID", hybrid);
  scores.set("UNKNOWN", unknown);

  return resolveConflicts(scores);
}
```

---

## 4. LLM Stage — Few-Shot Prompt Design

### 4.1 Handling Thinking Models

Many models (DeepSeek R1, Gemini thinking, Claude with extended thinking) emit reasoning before the label. The parser MUST handle this robustly.

**Strategy**: Parse the LAST occurrence of a known label in the response. This works because:
- Thinking models usually end with the label
- Non-thinking models output just the label
- If neither, we extract any label occurrence

```typescript
function extractLabel(raw: string): { label: IntentLabel | null; raw: string } {
  const cleaned = raw.trim();
  const LABELS = ["DATABASE", "DOCUMENT", "HYBRID", "UNKNOWN"];

  // Strategy 1: Find the LAST occurrence in the text (handles thinking models)
  let lastIdx = -1;
  let lastLabel: IntentLabel | null = null;
  for (const lbl of LABELS) {
    const idx = cleaned.lastIndexOf(lbl);
    if (idx > lastIdx) {
      lastIdx = idx;
      lastLabel = lbl as IntentLabel;
    }
  }

  if (lastLabel) {
    return { label: lastLabel, raw: cleaned };
  }

  // Strategy 2: Try to match word boundaries (regex)
  for (const lbl of LABELS) {
    const re = new RegExp(`\\b${lbl}\\b`, "i");
    const match = re.exec(cleaned);
    if (match) {
      return { label: lbl as IntentLabel, raw: cleaned };
    }
  }

  return { label: null, raw: cleaned };
}
```

### 4.2 System Prompt

```typescript
const LLM_SYSTEM_PROMPT = `You are a precise intent classifier for a retail BI assistant at JD Sports.
Classify the user's question into exactly one category:

DATABASE:
Questions about structured transactional data stored in BigQuery.
Examples: revenue totals, order counts, customer counts by region, return rates, 
inventory levels, discount analysis, conversion rates, AOV, traffic sources, 
brand revenue breakdowns, monthly trends, age group distributions, loyalty tiers.
Keywords: revenue, orders, customers, return rate, inventory, AOV, channel, 
conversion, discount, traffic source, age group, loyalty tier, distribution centre.

DOCUMENT:
Questions about information found in PDF reports, contracts, campaign briefs.
Examples: framework agreement terms, sell-through rates from deep dive reports,
store counts from annual plans, campaign budgets from briefs, margin analysis,
brand growth rates, Q3 regional performance reviews, rebate thresholds, 
price architecture tier margins, factors driving underperformance.
Keywords: framework agreement, sell-through, rebate, store count, campaign budget,
deep dive, vs plan, margin, price tier, brand growth, Q3 review, section.

HYBRID:
Questions that require combining information from BOTH a document and database.
The question explicitly cross-references a document claim with database data,
or asks to validate/compare report findings against transactional data.
Examples: "Nike generated GBP 544M in Q3 per the review. Does this hit the 
rebate threshold?" "How did August BTS performance track against the campaign 
target?" "What was online revenue per the review AND per BigQuery?"

UNKNOWN:
Questions that are out of scope, ambiguous, or non-business.
Examples: weather, jokes, CEO names, sports scores, recipes, greetings,
or questions too vague to route.

RULES:
- If the question explicitly names a document ("in the report", "according to the review", "section X") 
  AND asks for transactional data (revenue, orders), classify as HYBRID.
- If the question is purely about finding a fact from a document, classify as DOCUMENT.
- If the question is purely about querying transactional data, classify as DATABASE.
- If the question is ambiguous or could be either, prefer HYBRID so both sources are consulted.

Respond with ONLY the category label on the LAST line of your response.
You may include brief reasoning on earlier lines, but the FINAL line must be 
exactly one of: DATABASE / DOCUMENT / HYBRID / UNKNOWN.`;
```

### 4.3 Few-Shot Examples (in prompt)

```typescript
const FEW_SHOT_EXAMPLES = [
  // DATABASE examples
  { user: "Which region generated the most revenue?", assistant: "DATABASE" },
  { user: "What is the average order value across all regions?", assistant: "DATABASE" },
  { user: "How many customers do we have by region?", assistant: "DATABASE" },
  { user: "What is the return rate by channel?", assistant: "DATABASE" },
  { user: "Which products are low on stock at the Glasgow distribution centre?", assistant: "DATABASE" },

  // DOCUMENT examples
  { user: "What is the running footwear category's full-price sell-through rate?", assistant: "This asks for a specific metric from the Running Footwear Deep Dive document.\nDOCUMENT" },
  { user: "What is the minimum annual purchase commitment in the Nike Framework Agreement?", assistant: "DOCUMENT" },
  { user: "What is the total media budget for the Back to School 2026 campaign?", assistant: "DOCUMENT" },
  { user: "How many JD stores are there in the UK and how many new stores are planned for FY2027?", assistant: "DOCUMENT" },
  { user: "Which price tier in running footwear has the highest gross margin?", assistant: "DOCUMENT" },

  // HYBRID examples
  { user: "Nike generated GBP 544 million in Q3 according to the review. How does this track against the Framework Agreement's rebate thresholds?", assistant: "This cross-references a document fact (Q3 review) with a document threshold (framework agreement), and may need database validation.\nHYBRID" },
  { user: "The BTS campaign targeted GBP 480 million. How did Q3 period 7 (August) perform against that target?", assistant: "HYBRID" },
  { user: "Hoka is growing at 52% and is in 85 stores. What is Hoka's revenue and how does it compare to other brands in BigQuery?", assistant: "HYBRID" },
  { user: "What was online revenue and conversion rate in Q3 according to both the review and BigQuery?", assistant: "HYBRID" },

  // UNKNOWN examples
  { user: "What is the weather in London today?", assistant: "UNKNOWN" },
  { user: "Tell me a joke", assistant: "UNKNOWN" },
  { user: "Who is the CEO of JD Sports?", assistant: "UNKNOWN" },
];
```

### 4.4 LLM Call Implementation

```typescript
async function llmClassify(
  message: string,
  quickResult: ClassificationResult
): Promise<ClassificationResult> {
  const config = getOpenRouterConfig();

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: LLM_SYSTEM_PROMPT },
  ];

  // Inject 2-3 most relevant few-shot examples based on quick classifier hints
  const examples = selectRelevantExamples(message, quickResult.label);
  for (const ex of examples) {
    messages.push({ role: "user", content: ex.user });
    messages.push({ role: "assistant", content: ex.assistant });
  }

  messages.push({ role: "user", content: message });

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-OpenRouter-Title": "Analysis AI Intent Classifier",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-8b",   // cheaper, faster model for simple classification
      messages,
      temperature: 0.1,                       // low but not 0 to allow some variability
      max_tokens: 150,                        // enough for brief reasoning + label
    }),
  });

  if (!response.ok) {
    console.warn(`[classifier] LLM returned ${response.status}. Using quick result.`);
    return quickResult;
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  const { label, raw } = extractLabel(content);

  if (!label) {
    console.warn(`[classifier] Could not parse label from: "${content.slice(0, 100)}"`);
    // Boost quick result confidence slightly since LLM failed
    return { ...quickResult, confidence: Math.min(1, quickResult.confidence + 0.1), stage: "llm" };
  }

  // Compute confidence from LLM response patterns
  // If the model is uncertain, it often hedges with "could be either" or contains question marks
  const confidence = computeLlmConfidence(raw, label, quickResult);

  return { label, confidence, stage: "llm", reasoning: raw };
}

function computeLlmConfidence(
  raw: string,
  label: IntentLabel,
  quickResult: ClassificationResult
): number {
  let confidence = 0.85; // base

  // Penalize hedging language
  const hedges = /\b(could be|might be|possibly|perhaps|either|unsure|not sure|ambiguous|unclear)\b/i;
  if (hedges.test(raw)) confidence -= 0.15;

  // Penalize question marks in reasoning (model is uncertain)
  const questions = raw.match(/\?/g);
  if (questions && questions.length > 1) confidence -= 0.10;

  // Boost if quick classifier agreed
  if (quickResult.label === label) {
    confidence = Math.min(1, confidence + 0.10);
  }

  // Boost if QUICK was UNKNOWN and LLM agrees
  if (quickResult.label === "UNKNOWN" && label === "UNKNOWN") {
    confidence = Math.min(1, confidence + 0.05);
  }

  // Penalize if LLM label directly contradicts a high-confidence quick match
  if (quickResult.confidence > 0.60 && quickResult.label !== label) {
    if (quickResult.label === "HYBRID") {
      // HYBRID in quick → LLM picking a single source is suspicious
      confidence -= 0.15;
    } else {
      confidence -= 0.10;
    }
  }

  return Math.max(0, Math.min(1, confidence));
}
```

### 4.5 Example Selection for Few-Shot

```typescript
function selectRelevantExamples(message: string, hint: IntentLabel): Array<{ user: string; assistant: string }> {
  // Always include at least 1 UNKNOWN example to prevent false positives
  const unknown = FEW_SHOT_EXAMPLES.filter(e => e.assistant.trim() === "UNKNOWN");
  // Filter by hint label
  const hinted = hint !== "UNKNOWN"
    ? FEW_SHOT_EXAMPLES.filter(e => e.assistant.trim() === hint)
    : [];

  // Select 2 from hinted (or other if hinted empty), plus 1 UNKNOWN
  const selected = [];
  if (hinted.length >= 2) {
    selected.push(hinted[0], hinted[1]);
  } else if (hinted.length === 1) {
    selected.push(hinted[0]);
    // Add one from DATABASE or DOCUMENT if message sounds analytical
    const dbExample = FEW_SHOT_EXAMPLES.find(e => e.assistant.trim() === "DATABASE");
    if (dbExample) selected.push(dbExample);
  } else {
    // No hint match → pick one DATABASE and one DOCUMENT
    const db = FEW_SHOT_EXAMPLES.find(e => e.assistant.trim() === "DATABASE");
    const doc = FEW_SHOT_EXAMPLES.find(e => e.assistant.trim() === "DOCUMENT");
    if (db) selected.push(db);
    if (doc) selected.push(doc);
  }
  selected.push(unknown[0]);

  return selected.slice(0, 3);
}
```

---

## 5. Fallback Logic

### 5.1 Classification → Orchestrator Integration

```typescript
// In orchestrator.ts
const classifierResult = await classifyIntent(input.message);

switch (classifierResult.label) {
  case "DATABASE": {
    // Run BQ only. If BQ returns no data, fall back to RAG for doc search.
    const bqData = await executeBqQuestion(input.message, queryEmbedding);
    if (bqData.results.rows.length === 0 && input.documentIds.length > 0) {
      // No DB data found → try documents as fallback
      const ragData = await executeRagPipeline({ message: input.message, documentIds: input.documentIds, queryEmbedding });
      if (ragData.chunks.length > 0) {
        return synthesizeReply(ragData, null, input.message);
      }
    }
    return synthesizeReply(null, bqData, input.message);
  }

  case "DOCUMENT": {
    // Run RAG only. If no chunks found, try BQ.
    const ragData = await executeRagPipeline({ message: input.message, documentIds: docIds, queryEmbedding });
    if (ragData.chunks.length === 0) {
      const bqData = await executeBqQuestion(input.message, queryEmbedding);
      if (bqData.results.rows.length > 0) {
        return synthesizeReply(null, bqData, input.message);
      }
    }
    return synthesizeReply(ragData, null, input.message);
  }

  case "HYBRID": {
    // Run both in parallel (existing behavior)
    const [ragData, bqData] = await Promise.allSettled([...]);
    return synthesizeReply(ragData, bqData, input.message);
  }

  case "UNKNOWN": {
    if (classifierResult.confidence >= 0.95) {
      // Hard UNKNOWN — no need to try any source
      return {
        reply: "I'm designed to answer questions about your retail data and documents. Could you please ask a business-related question about sales, inventory, reports, or contracts?",
        citations: [],
      };
    }
    // Low-confidence UNKNOWN — try both sources, but prefer to ask clarifying question
    // if both return empty
    const [ragData, bqData] = await Promise.allSettled([...]);
    const hasData = (ragData.status === "fulfilled" && ragData.value.chunks.length > 0)
                  || (bqData.status === "fulfilled" && bqData.value.results.rows.length > 0);
    if (hasData) {
      return synthesizeReply(ragData, bqData, input.message);
    }
    return {
      reply: "I couldn't find relevant data for that question. Could you clarify? For example: specify a product category, time period, or document name.",
      citations: [],
    };
  }
}
```

### 5.2 Clarifying Question Strategy

When confidence is low (LLM accepted but < 0.80, or UNKNOWN with 0.30–0.60):

| Scenario | Response |
|----------|----------|
| Vague like "How are sales?" | Ask: "Could you specify a period (e.g., Q3 2026), region, or category?" |
| Vague like "What was the sell-through?" | Ask: "Which product or category are you asking about? (e.g., running footwear, Nike)" |
| Non-business detected | ASAP decline: "I can only answer questions about JD Sports retail data and documents." |
| Ambiguous entity | Try both sources, present results with source labels, let user clarify |

---

## 6. Caching

### 6.1 Cache Key Design

```typescript
interface CacheEntry {
  normalized: string;           // normalized query text
  label: IntentLabel;
  confidence: number;
  stage: "quick" | "llm";
  expiresAt: number;            // epoch ms
  hitCount: number;
}

class IntentCache {
  private cache = new Map<string, CacheEntry>();
  private static NORMALIZE_RULES = [
    { from: /\bcategory(['\u2019]?)s?\b/gi, to: "category" },
    { from: /\brevenue\b/gi, to: "revenue" },
    { from: /\bcustomer(['\u2019]?)s?\b/gi, to: "customer" },
    { from: /\b(pct|percent|percentage)\b/gi, to: "%" },
    { from: /\bdistribution\s*cent(er|re)\b/gi, to: "dc" },
    { from: /[?.!,;:]+/g, to: "" },
    { from: /\s+/g, to: " " },
  ];

  private static normalize(text: string): string {
    let s = text.toLowerCase().trim();
    for (const rule of this.NORMALIZE_RULES) {
      s = s.replace(rule.from, rule.to);
    }
    return s.trim();
  }

  get(message: string): CacheEntry | undefined {
    const key = IntentCache.normalize(message);
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    entry.hitCount++;
    return entry;
  }

  set(message: string, result: ClassificationResult): void {
    const key = IntentCache.normalize(message);
    const ttl = result.stage === "quick" ? 3600_000  // 1 hour for regex results
                : result.confidence >= LLM_ACCEPT ? 1800_000  // 30 min for high-conf LLM
                : 300_000;                                   // 5 min for low-conf
    this.cache.set(key, {
      normalized: key,
      label: result.label,
      confidence: result.confidence,
      stage: result.stage,
      expiresAt: Date.now() + ttl,
      hitCount: 0,
    });
  }

  // LRU eviction when cache exceeds threshold
  evictIfNeeded(maxSize = 500): void {
    if (this.cache.size <= maxSize) return;
    const sorted = [...this.cache.entries()]
      .sort((a, b) => a[1].hitCount - b[1].hitCount);
    const toRemove = sorted.slice(0, sorted.length - maxSize);
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const intentCache = new IntentCache();
```

### 6.2 Semantic Similarity for Near-Duplicate Queries

For production, extend with embedding-based cache lookup:

```typescript
async function semanticCacheLookup(
  message: string,
  queryEmbedding: number[],
  threshold = 0.92
): Promise<ClassificationResult | null> {
  // Check exact/normalized first
  const exact = intentCache.get(message);
  if (exact) {
    return { label: exact.label, confidence: exact.confidence, stage: exact.stage };
  }

  // For fuzzy match, we'd need a vector store of recent query embeddings
  // This is a future optimization; start with exact match only
  return null;
}
```

### 6.3 Integration in Classifier

```typescript
export async function classifyIntent(message: string): Promise<ClassificationResult> {
  // 0. Check cache
  const cached = intentCache.get(message);
  if (cached) {
    return { label: cached.label, confidence: cached.confidence, stage: cached.stage };
  }

  // 1. Quick classify
  // 2. LLM classify (if needed)
  // 3. Cache result
  // ...
  intentCache.set(message, result);
  return result;
}
```

---

## 7. Orchestrator Changes

The orchestrator at `orchestrator.ts:44-71` must be updated to handle the new `UNKNOWN` state and cross-source fallback:

```typescript
// Updated routing logic
const result = await classifyIntent(input.message);

switch (result.label) {
  case "DATABASE":
    // Run BQ first, fallback to RAG on empty
    break;
  case "DOCUMENT":
    // Run RAG first, fallback to BQ on empty
    break;
  case "HYBRID":
    // Run both in parallel (existing behavior)
    break;
  case "UNKNOWN":
    if (result.confidence >= 0.95) {
      return {
        reply: "I can only answer questions about JD Sports retail data and documents.",
        citations: [],
      };
    }
    // Try both, but if empty return clarifying prompt
    const [rag, bq] = await Promise.allSettled([
      executeRagPipeline(...),
      executeBqQuestion(...),
    ]);
    const hasAnyData = /* check */;
    if (!hasAnyData) {
      return {
        reply: "I couldn\u2019t find relevant data. Could you specify a product category, time period, or document?",
        citations: [],
      };
    }
    return synthesizeReply(rag, bq, input.message);
}
```

---

## 8. Test Coverage Requirements

The classifier must pass these categories of tests:

| Category | Count | Source | Must-Pass Criteria |
|----------|-------|--------|-------------------|
| DATABASE | 8 | `db-001` to `db-008` | label = "DATABASE", no LLM call for 5/8 |
| DOCUMENT | 11 | `doc-001` to `doc-011` | label = "DOCUMENT", no LLM call for 7/11 |
| HYBRID | 6 | `hyb-001` to `hyb-006` | label = "HYBRID" |
| UNKNOWN (hard) | 3 | `edg-001` (weather), `edg-002` (CEO), `edg-005` (joke) | label = "UNKNOWN", no LLM call |
| UNKNOWN (soft) | 2 | `edg-003` ("How are sales?"), `edg-004` ("What was the sell-through?") | label = "UNKNOWN" or "HYBRID" |
| HYBRID edge | 1 | `edg-006` (margin vs plan) | label = "HYBRID" (mentions plan + margin + categories) |

### Expected Quick-Classify Hit Rate

| Class | Quick-classify w/o LLM | Rationale |
|-------|----------------------|-----------|
| DOCUMENT | 9/11 | All have strong keywords (framework agreement, sell-through rate, campaign brief, store count) |
| DATABASE | 5/8 | AOV, return rate, stock, age group, discount are strong signals |
| HYBRID | 2/6 | Only those with explicit "according to" + "bigquery" patterns |
| UNKNOWN | 5/5 | Weather, joke, CEO, greeting, gibberish all hit quickly |

---

## 9. Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| Quick classifier p50 | <1ms | JavaScript Date.now() before/after |
| LLM classifier p50 | <500ms | Including network |
| Cache hit p50 | <0.1ms | Map lookup |
| Total pipeline p95 | <300ms (quick) / <800ms (LLM) | integrated timing |
| LLM call avoidance | ≥70% of queries | Ratio of quick/total |

---

## 10. Migration Path

1. **Phase 1** (implement this doc): Replace classifier.ts with two-stage system, keep old test compatibility
2. **Phase 2**: Add caching layer, verify golden tests pass
3. **Phase 3**: Update orchestrator.ts for UNKNOWN handling and cross-source fallback
4. **Phase 4**: A/B test: old classifier vs new — measure latency reduction, accuracy on golden set
5. **Phase 5**: Add embedding-based cache lookup for near-duplicate queries
