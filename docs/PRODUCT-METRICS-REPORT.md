# Product Metrics & Business Impact for Analysis AI

**Author:** Claire H. — Staff Product Engineer (ex-Stripe, analytics infrastructure)
**Date:** June 2026
**Context:** Analysis AI — internal BI assistant for JD Sports UK. All 11 phases complete, 74 tests passing, pre-launch.

---

## Table of Contents

1. [Product Metrics Framework for AI Assistants](#1-product-metrics-framework-for-ai-assistants)
2. [Measuring Business Value](#2-measuring-business-value)
3. [Feedback Loops & Signals](#3-feedback-loops--signals)
4. [A/B Testing for AI Features](#4-ab-testing-for-ai-features)
5. [Analytics Infrastructure](#5-analytics-infrastructure)
6. [Perceived Changes](#6-perceived-changes)
7. [Optimal Route: Leanest Path to Measurement](#7-optimal-route-leanest-path-to-measurement)
8. [Deep Examples](#8-deep-examples)
9. [Business Impact & ROI](#9-business-impact--roi)
10. [Stakeholder Communication Strategy](#10-stakeholder-communication-strategy)

---

## 1. Product Metrics Framework for AI Assistants

### North Star Metric

**"Time-to-Insight"** — the elapsed time from when a user has a business question to when they have a data-backed answer they trust.

For a BI assistant, this is the one metric that captures everything: retrieval quality, LLM accuracy, UI usability, and trust. If it takes 3 minutes to get an answer instead of 3 hours (going through the old SQL/Slack/email pipeline), the product is delivering value.

**Alternative / Complementary North Stars:**
- **"Questions Answered Per Analyst Per Week"** — proxy for analyst throughput
- **"Decision Velocity"** — number of data-backed decisions made per week (harder to measure, more accurate)

> Stripe's internal BI tools tracked "time from query to dashboard" as their primary metric. Analysis AI should track "time from question to answer."

### Tier 1 — Adoption Metrics

| Metric | Definition | Why It Matters | Target (Month 3) |
|--------|-----------|---------------|-------------------|
| DAU / WAU / MAU | Daily/Weekly/Monthly Active Users | Core adoption signal | 70% WAU of eligible analysts |
| Conversations per User | Total chat threads created per user | Indicates habit formation | 3+/week per active user |
| Documents Uploaded per User | Contracts/docs added to the system per user | Data ingestion = trust surface area | 2+/user in first 30 days |
| User Activation Rate | % of signups who send ≥3 messages in first session | Activation = onboarding quality | >60% |
| Time to First Query | Minutes from login to first question | Barrier to entry | <2 minutes |

### Tier 2 — Engagement Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| Messages per Session | Average message count per session | >4 (indicates real conversation) |
| Session Duration | Minutes from first to last message in a session | 5–15 min (sweet spot for BI work) |
| Return Rate (D7) | % of users who come back within 7 days | >50% |
| Weekly Session Count | Sessions per user per week | >2 |
| Prompt Length (chars) | Average length of user queries | >50 chars = real questions, not test pings |

### Tier 3 — Quality Metrics (The "AI is Working" Signals)

These are the most important for a pre-launch product because they tell you if the model is actually useful, not just used.

| Metric | Definition | Signal Direction |
|--------|-----------|-----------------|
| **Follow-up Rate** | % of messages that are follow-ups in the same thread | High = answers are useful enough to dig deeper |
| **Rephrase Rate** | % of messages where user changes their query (same thread) | High = first answer was not what they wanted |
| **Answer Acceptance** | Thumbs-up / "This helped" click rate | >70% = good; <50% = investigate |
| **Citation CTR** | % of messages where user clicks a cited source | High = user verifying / deep diving |
| **Copy Rate** | % of answers where user copies text | High = answer is actionable |
| **Export / Share Rate** | % of conversations exported or shared | High = answers have business value worth preserving |

**From Mixpanel's 2026 State of Digital Analytics:** North American AI products have DAU/MAU stickiness of just 21%. Analysis AI needs to target >35% stickiness to beat the benchmark.

### Tier 4 — Trust Metrics

| Metric | Why |
|--------|-----|
| Citation CTR | Users trust the answer enough to verify it, or need more detail |
| % of Answers with Sources Opened | Source-backed answers get more engagement |
| "I Trust This" feedback rate | Explicit trust signal |
| Re-query Rate (same question in new session) | If users ask the same question again, they didn't trust/remember the first answer |
| Session-to-Decision Conversion | % of sessions that end with an export, share, or explicit "done" action |

---

## 2. Measuring Business Value

### Time Saved Per Analyst

**Formula:**
```
Hours Saved/Week = (Hours spent on data retrieval + report generation + Slack/email queries)
                 - (Hours spent using Analysis AI for same tasks)
```

**Conservative Estimate for JD Sports UK:**
| Task | Old Way | With Analysis AI | Time Saved |
|------|---------|-----------------|-----------|
| Find sales data for specific SKU | 30 min (Slack engineer + wait) | 2 min | 28 min |
| Create weekly promo performance report | 4 hours | 20 min | 3h 40m |
| Answer ad-hoc merchandising question | 45 min (email chain) | 3 min | 42 min |
| Query contract terms | 20 min (find doc + read) | 1 min | 19 min |
| **Per analyst per week** | **~10 hours** | **~1.5 hours** | **~8.5 hours** |

**At 50 analysts × 8.5 hours/week × £35/hr (blended UK rate) = £14,875/week = ~£773K/year**

### Reduction in Ad-Hoc Requests to Engineering

JD Sports' data/engineering team likely fields 20–50 ad-hoc data requests per week. Each takes 30–90 minutes to fulfill. Analysis AI can absorb 60–80% of these.

| Metric | Before | After | Impact |
|--------|--------|-------|--------|
| Weekly ad-hoc requests to data team | 35 | 8 | −77% |
| Engineering hours spent on queries | 30 hrs/week | 7 hrs/week | −23 hrs/week |
| Cost at £50/hr (blended eng rate) | £1,500/week | £350/week | **−£59K/year** |

### Quality of Decisions (Harder but Important)

Proxy metrics:
- **% of decisions using data** — survey users before/after; track culture shift
- **Consistency of insights** — do 2 analysts get the same answer to the same question?
- **Confidence scores** — users who feel "very confident" in their data-backed decisions

### Reduction in "Shadow BI"

Shadow BI = people making decisions based on stale CSV exports, personal spreadsheets, or gut feel.

Analysis AI solves this by:
1. Making BigQuery the single source of truth (always live data)
2. Providing source citations (users see where data comes from)
3. Making it faster to query the warehouse than to find their local spreadsheet

**Measure:** Pre- and post-launch surveys asking "What data source did you use for your last decision?"

---

## 3. Feedback Loops & Signals

### Implicit Signals (No Extra UI)

These are the highest-value signals because they require zero user effort.

| Signal | Event | Interpretation |
|--------|-------|---------------|
| User copies answer text | `answer_copied` | Answer was useful enough to paste elsewhere |
| User asks a follow-up | `message_sent` with `is_follow_up: true` | Answer was interesting, user wants more |
| User rephrases question | `message_sent` with `is_rephrase: true` | First answer missed the mark |
| User clicks a citation | `citation_clicked` | User is verifying or needs more detail |
| User scrolls to see more sources | `sources_expanded` | User is doing deep research |
| User switches to documents view mid-session | `view_switched` (chat→documents) | Could be task switching OR frustration |
| User deletes conversation | `conversation_deleted` | Negative signal — answer not worth keeping |
| Session abandonment (<30s) | session timeout | User didn't get what they needed |
| User opens the same document from Documents view | `document_opened` | Preferring to read source directly |
| Time between message and next action | `idle_time` | Very fast = copied/acted; Very slow = confused or multitasking |

### Explicit Signals (UI Required)

| Signal | UI Element | Why |
|--------|-----------|-----|
| Thumbs Up/Down | Inline buttons on each answer | Industry standard, low friction |
| "This Helped" button | Below answer | Positive reinforcement |
| Star Rating (1-5) | Optional at end of session | Measures overall session quality |
| Feedback Textarea | "Anything else?" after thumbs-down | Qualitative signal for improvements |
| Report an issue | Menu item in message actions | Catch edge cases |

### Implementation Principles for Feedback

1. **Thumbs up/down = always visible, always one click.** No confirmation dialogs.
2. **"This helped" = shown after 10 seconds** of the message being visible (cold start for LLM output display).
3. **Star rating = shown after session ends** or on session close, non-blocking.
4. **Feedback textarea = only appears after thumbs-down.** Don't burden happy users.
5. **All feedback = captured with message_id, model version, prompt template version** for root cause analysis.

### Negative Signal Detection

Build a "Suffering Score" for each session:
```
suffering_score = (
  rephrase_count * 2 +
  session_abandoned +
  conversation_deleted * 3 +
  view_switched_within_30s
) / expected_session_value
```

Alert when suffering_score exceeds 2× standard deviation for a given user cohort.

---

## 4. A/B Testing for AI Features

### What to A/B Test

| Variable | How to Test | Sample Size Consideration |
|---------|------------|--------------------------|
| **Prompt template** | System prompt change (e.g., "be concise" vs "be thorough") | 500+ sessions per variant |
| **Model** | GPT-4o vs Claude Sonnet vs custom fine-tune | 1000+ sessions (high variance) |
| **Retrieval params** | top_k=3 vs top_k=10, chunk size changes | 300+ sessions |
| **Temperature** | 0.1 vs 0.7 for creative answers | 300+ sessions |
| **Citation format** | Inline vs footer vs collapsible | 200+ sessions |
| **UI changes** | Input bar position, button labels | 200+ sessions |

### Statistical Considerations for LLMs

**LLM outputs are high-variance.** A single prompt can produce wildly different answers across runs. This means:

1. **Need larger sample sizes** than traditional A/B tests — 500–1000 users per variant minimum, not 100.
2. **Use sequential testing** (not fixed-horizon) to detect regressions faster. Google's CUPED or variance reduction techniques help.
3. **Segment by query type.** "What was Q3 revenue?" (factual, low variance) vs "Summarize the promo performance" (subjective, high variance) need separate analysis.

### Guardrail Metrics (What NOT to Break)

| Guardrail | Alert Threshold | Why |
|-----------|----------------|-----|
| P95 Latency | >8 seconds | Users abandon if answers take too long |
| Error Rate | >2% | Every error erodes trust disproportionately |
| Cost per Query | >$0.10 | Budget blow-up risk with LLM scaling |
| Citation Accuracy | <90% (LLM-as-judge eval) | Hallucinations destroy credibility |
| User Rephrase Rate | Increase by >20% | Change made answers worse |

### Online vs Offline Evaluation

| Dimension | Offline (Golden Dataset) | Online (A/B Test) |
|-----------|-------------------------|-------------------|
| Speed | Minutes | Days–Weeks |
| Cost | Cheap | Expensive (real users) |
| Measures | Model quality, accuracy | User satisfaction, behavior |
| Catches | Regressions, factual errors | Usability, trust, business value |
| Frequency | Every commit | Every major release |
| Tooling | LLM-as-judge, unit tests | Feature flags, analytics |

**Recommendation:** Run offline evals on a golden dataset of 200+ question/answer pairs before every deployment. Run online A/B tests for major changes (model swap, prompt rewrite) with 1–2 week runtimes.

### A/B Testing Infrastructure for Analysis AI

Since the frontend is Next.js and there's no backend yet, use:
1. **Feature flags via PostHog** (free tier) or a simple `Math.random()` split
2. **Store variant assignment in localStorage** or in a user property
3. **Emit variant info as an event property** on every tracked event

---

## 5. Analytics Infrastructure

### Recommended Stack

**Phase 1 (Immediate — pre-launch): PostHog**
- Self-host or cloud (free up to 1M events/month)
- JavaScript snippet → no backend changes needed
- Built-in session recording, feature flags, experiments
- Export data to BigQuery for warehouse-native analysis

**Phase 2 (Month 2–3): BigQuery streaming + dbt models**
- Stream events to BigQuery via PostHog export or direct SDK
- Build dbt models for product metrics
- Unify with existing BigQuery data warehouse

**Phase 3 (Quarter 2+): Dedicated analytics engineering**
- Build Looker dashboards
- Connect LLM observability (Langfuse) to product data
- Real-time alerting

### Why BigQuery-First (Given JD Sports Already Uses It)

> "Since they already use BigQuery → best fit is to stream events there."

Benefits:
- Single source of truth — no data silo
- Joins product events with business data (sales, inventory, promotions)
- Existing GCP permissions, IAM, and compliance
- dbt integration for transformation
- Looker/Data Studio for visualization

### Event Taxonomy

**Naming Convention:** `{domain}_{action}` — e.g., `conversation_started`, `message_sent`, `citation_clicked`

#### Core Events

| Event Name | Trigger | Properties |
|-----------|---------|-----------|
| `app_loaded` | App mounts | `view`, `user_email`, `user_role`, `session_id` |
| `view_switched` | User toggles chat/documents | `from_view`, `to_view` |
| `conversation_started` | User creates new chat | `conversation_id`, `timestamp` |
| `message_sent` | User submits a message | `message_id`, `conversation_id`, `content_length`, `is_initial`, `is_follow_up`, `is_rephrase`, `prompt_template_version`, `source` (clicked prompt / typed) |
| `answer_received` | LLM response displayed | `message_id`, `latency_ms`, `model`, `citation_count`, `sources_count`, `token_count_input`, `token_count_output`, `cost_usd` |
| `citation_clicked` | User clicks a source badge | `message_id`, `citation_index`, `document_id`, `source_type` (document/bigquery) |
| `sources_expanded` | User opens sources block | `message_id`, `source_count` |
| `sources_collapsed` | User closes sources block | `message_id` |
| `answer_copied` | User copies answer text | `message_id`, `copy_length` |
| `answer_feedback` | User gives thumbs up/down | `message_id`, `rating` (up/down), `feedback_text` (optional) |
| `conversation_ended` | User leaves/navigates away | `conversation_id`, `message_count`, `session_duration_s`, `suffering_score` |
| `conversation_deleted` | User deletes a thread | `conversation_id`, `message_count` |
| `documents_view_opened` | User opens documents view | — |
| `document_uploaded` | User uploads a document | `document_id`, `file_type`, `file_size_bytes`, `page_count` |
| `document_upload_progress` | Upload progress updates | `document_id`, `progress_pct` |
| `document_upload_complete` | Upload finishes | `document_id`, `duration_ms` |
| `document_opened` | User opens a document | `document_id`, `source` (list/upload/recent) |
| `document_deleted` | User removes a document | `document_id` |

#### User Properties (set once on identify)

| Property | Example |
|---------|---------|
| `email` | `analyst@jdsports.co.uk` |
| `role` | `merchandiser`, `analyst`, `buyer`, `manager` |
| `department` | `footwear`, `apparel`, `accessories` |
| `team` | `retail`, `ecommerce`, `wholesale` |
| `sso_provider` | `okta`, `azure_ad` |
| `first_seen` | `2026-05-01T00:00:00Z` |

#### Session Properties

| Property | Description |
|---------|------------|
| `session_id` | Unique per browser session (UUID) |
| `entry_view` | Which view user landed on |
| `channel` | `web`, `mobile` |
| `user_agent` | Browser info |
| `variant` | A/B test variant if applicable |

### User Identity

**Internal users = SSO (Okta / Azure AD).** Steps:

1. On login, capture `user.email` from auth provider
2. Call `posthog.identify(email)` — this is the `distinct_id`
3. Set user properties: `role`, `department`, `team` (from HR/SSO attributes)
4. For anonymous sessions (before login), use auto-generated `distinct_id` and merge on identify

---

## 6. Perceived Changes

Here's what the JD Sports team will notice when product analytics goes live:

### Week 1 — Foundation

- **PR #1:** `analytics-analytics` — Install PostHog snippet in `layout.tsx`
- **PR #2:** `chore(tracking): add event helpers` — Create `frontend/src/lib/analytics.ts` with `track()` wrapper
- **PR #3:** `chore(tracking): add consent banner` — GDPR-compliant tracking consent (or skip for internal-only)

### Week 2 — Core Events

- **PR #4:** `feat(analytics): track core chat events` — `message_sent`, `answer_received`, `conversation_started`
- **PR #5:** `feat(analytics): track citation interactions` — `citation_clicked`, `sources_expanded`
- **PR #6:** `feat(analytics): track document operations` — `document_uploaded`, `document_opened`

### Week 3 — Quality Signals

- **PR #7:** `feat(analytics): add feedback UI` — Thumbs up/down buttons in MessageBubble
- **PR #8:** `feat(analytics): track implicit signals` — `answer_copied`, follow-up detection, rephrase detection
- **PR #9:** `docs: add tracking-plan` — `docs/TRACKING-PLAN.md` with all events and properties

### Week 4 — Dashboards & Activation

- **Dashboard #1:** PostHog dashboard with all core metrics (DAU, MAU, messages/user, etc.)
- **Dashboard #2:** BigQuery Looker dashboard with joins to business data
- **PR #10:** `feat(analytics): add first session activation tracking`

### Visible Artifacts

1. **`frontend/src/lib/analytics.ts`** — new file with event tracking helpers
2. **`docs/TRACKING-PLAN.md`** — new document with full event taxonomy
3. **PostHog project** — new project in PostHog cloud
4. **PostHog dashboard** — product metrics dashboard shared with stakeholders
5. **BigQuery events table** — `analytics.product_events` or similar
6. **Looker dashboard** — Business-facing metrics with joins to sales data
7. **Thumbs up/down UI** — visible next to every answer in ChatView
8. **Pinpoint changes in MessageBubble.tsx** — small icon additions for feedback

---

## 7. Optimal Route: Leanest Path to Measurement

### Phase 1: Frontend-Only PostHog (Day 1 — Launched)

**Zero backend changes.** Dead simple.

```
npm install posthog-js
```

In `frontend/src/lib/analytics.ts`:

```typescript
import posthog from "posthog-js"

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ""
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com"

let initialized = false

export function initAnalytics(): void {
  if (initialized || typeof window === "undefined") return
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,
    autocapture: false, // explicit capture only
    disable_session_recording: true, // enable later if needed
  })
  initialized = true
}

export function track(event: string, properties?: Record<string, unknown>): void {
  posthog.capture(event, properties)
}

export function identify(email: string, properties?: Record<string, unknown>): void {
  posthog.identify(email, properties)
}
```

**What you get immediately:**
- DAU/WAU/MAU
- Page views (by view: chat vs documents)
- Custom events (messages, citations, uploads)
- Retention cohorts
- Funnel analysis
- PostHog dashboard

### Phase 2: BigQuery Export (Week 2–3)

PostHog has a native BigQuery export connector. Set it up in settings → data pipeline → BigQuery.

This gives you:
- All product events in BigQuery automatically
- Ability to join with sales tables, inventory tables, etc.
- SQL-based metrics (more flexible than PostHog UI)
- Looker/Data Studio dashboards

### Phase 3: Langfuse Integration (Week 4+)

Add Langfuse for LLM observability:
- Token usage, cost per query, latency per model
- LLM-as-judge scoring for answer quality
- Integration with PostHog via Mixpanel-style connector (or custom export)

---

## 8. Deep Examples

### 8.1 Tracking Plan: Analysis AI Chat Flow

| # | Event | Trigger | Properties | Priority |
|---|-------|--------|-----------|----------|
| 1 | `message_sent` | User presses Enter / clicks Send | `message_id`, `conversation_id`, `text` (hashed or truncated for privacy), `text_length`, `source` (`typed` / `prompt_click` / `voice`), `is_initial`, `is_follow_up`, `is_rephrase`, `prompt_template_version` | P0 |
| 2 | `answer_received` | LLM response fully rendered in UI | `message_id`, `conversation_id`, `latency_ms`, `model`, `citation_count`, `sources_count`, `token_count_input`, `token_count_output`, `cost_usd` (if available), `answer_length_chars` | P0 |
| 3 | `citation_clicked` | User clicks a numbered citation badge | `message_id`, `conversation_id`, `citation_index`, `source_document_id`, `source_type` (`document` / `bigquery`) | P0 |
| 4 | `sources_expanded` | User opens the collapsible sources section | `message_id`, `conversation_id`, `visible_source_count` | P0 |
| 5 | `sources_collapsed` | User collapses the sources section | `message_id`, `conversation_id` | P1 |
| 6 | `answer_copied` | User copies answer text to clipboard | `message_id`, `conversation_id`, `copy_length_chars`, `selection_type` (`partial` / `full`) | P0 |
| 7 | `answer_feedback` | User clicks thumbs up / thumbs down | `message_id`, `conversation_id`, `rating` (`up` / `down`), `feedback_text` (optional, shown on down) | P0 |
| 8 | `conversation_started` | User clicks "New Chat" or first message sent | `conversation_id`, `source` (`sidebar` / `auto`), `timestamp` | P0 |
| 9 | `conversation_ended` | User navigates away from chat view | `conversation_id`, `message_count`, `session_duration_s`, `suffering_score` | P1 |
| 10 | `conversation_deleted` | User deletes a conversation | `conversation_id`, `message_count` | P1 |
| 11 | `app_loaded` | App mounts in browser | `view` (`chat` / `documents`), `user_role`, `department` | P0 |
| 12 | `view_switched` | User clicks toggles chat/documents nav | `from_view`, `to_view` | P1 |

### 8.2 Code Snippet: Tracking "Message Sent" and "Citation Clicked"

```typescript
// frontend/src/lib/analytics.ts
import posthog from "posthog-js"
import { getUniqueId } from "@/lib/id"

// Types for event tracking
interface MessageSentProperties {
  message_id: string
  conversation_id: string
  text_length: number
  source: "typed" | "prompt_click" | "voice"
  is_initial: boolean
  is_follow_up: boolean
  is_rephrase: boolean
  prompt_template_version: string
}

interface CitationClickedProperties {
  message_id: string
  conversation_id: string
  citation_index: number
  source_document_id: string
  source_type: "document" | "bigquery"
}

export function trackMessageSent(
  props: Omit<MessageSentProperties, "message_id">
): void {
  posthog.capture("message_sent", {
    ...props,
    message_id: getUniqueId(),
  })
}

export function trackCitationClicked(
  props: CitationClickedProperties
): void {
  posthog.capture("citation_clicked", props)
}
```

Usage in components:

```typescript
// frontend/src/components/chat/MessageBubble.tsx
import { trackCitationClicked } from "@/lib/analytics"

function handleCitationClick(citation: Citation) {
  trackCitationClicked({
    message_id: message.id,
    conversation_id: conversationId,
    citation_index: citation.index,
    source_document_id: citation.documentId,
    source_type: citation.type,
  })
  // ... existing citation click logic
}

// frontend/src/components/chat/InputBar.tsx
import { trackMessageSent } from "@/lib/analytics"

function handleSend(text: string) {
  trackMessageSent({
    conversation_id,
    text_length: text.length,
    source: "typed",
    is_initial: messages.length === 0,
    is_follow_up: messages.length > 0,
    is_rephrase: /* detect via simple heuristic */,
    prompt_template_version: "v1.0",
  })
  // ... existing send logic
}
```

### 8.3 BigQuery Events Table Schema

```sql
-- Dataset: analytics
-- Table: product_events
-- Partitioned by: event_date
-- Clustered by: event_name, user_email

CREATE TABLE IF NOT EXISTS `jdsports.analytics.product_events` (
  event_id            STRING    NOT NULL,    -- UUID
  event_name          STRING    NOT NULL,    -- e.g. "message_sent"
  event_timestamp     TIMESTAMP NOT NULL,    -- when it happened
  event_date          DATE      NOT NULL,    -- partition column
  user_email          STRING,                -- identified user
  user_role           STRING,                -- from SSO attributes
  user_department     STRING,                -- from SSO attributes
  session_id          STRING,                -- browser session
  conversation_id     STRING,                -- chat thread ID
  message_id          STRING,                -- individual message ID

  -- Properties as JSON (flexible, no schema enforcement)
  properties          JSON,

  -- A/B testing
  variant             STRING,                -- "control" / "treatment"

  -- Environment
  app_version         STRING,
  environment         STRING,                -- "production" / "staging"

  -- Load metadata
  ingested_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY event_date
CLUSTER BY event_name, user_email
OPTIONS (
  partition_expiration_days = 365
)
```

**Query: Core Product Metrics**

```sql
-- Daily Active Users (DAU)
SELECT
  event_date,
  COUNT(DISTINCT user_email) AS dau
FROM `jdsports.analytics.product_events`
WHERE event_name = 'app_loaded'
  AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
GROUP BY event_date
ORDER BY event_date;

-- Messages Per User Per Day
SELECT
  event_date,
  user_email,
  COUNT(*) AS messages_sent
FROM `jdsports.analytics.product_events`
WHERE event_name = 'message_sent'
  AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
GROUP BY event_date, user_email;

-- Follow-up Rate (quality signal)
SELECT
  DATE(event_timestamp) AS event_date,
  SAFE_DIVIDE(
    COUNTIF(JSON_VALUE(properties.is_follow_up) = 'true'),
    COUNT(*)
  ) AS follow_up_rate
FROM `jdsports.analytics.product_events`
WHERE event_name = 'message_sent'
  AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
GROUP BY event_date;

-- Citation Click-Through Rate
WITH answer_events AS (
  SELECT
    DATE(event_timestamp) AS event_date,
    message_id,
    conversation_id
  FROM `jdsports.analytics.product_events`
  WHERE event_name = 'answer_received'
    AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY
  )
),
citation_clicks AS (
  SELECT
    DATE(event_timestamp) AS event_date,
    message_id,
    conversation_id
  FROM `jdsports.analytics.product_events`
  WHERE event_name = 'citation_clicked'
    AND event_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY)
)
SELECT
  a.event_date,
  COUNT(DISTINCT a.message_id) AS answers_with_citations,
  COUNT(DISTINCT c.message_id) AS answers_with_clicked_citations,
  SAFE_DIVIDE(
    COUNT(DISTINCT c.message_id),
    COUNT(DISTINCT a.message_id)
  ) AS citation_ctr
FROM answer_events a
LEFT JOIN citation_clicks c
  ON a.message_id = c.message_id
GROUP BY a.event_date;

-- Suffering Score by Session
SELECT
  session_id,
  COUNTIF(JSON_VALUE(properties.is_rephrase) = 'true') AS rephrase_count,
  COUNTIF(event_name = 'conversation_deleted') AS deleted,
  COUNTIF(event_name = 'view_switched') AS view_switches,
  (COUNTIF(JSON_VALUE(properties.is_rephrase) = 'true') * 2
   + COUNTIF(event_name = 'view_switched')
   + COUNTIF(event_name = 'conversation_deleted') * 3
  ) AS suffering_score
FROM `jdsports.analytics.product_events`
WHERE event_date = CURRENT_DATE()
GROUP BY session_id
HAVING suffering_score > 0
ORDER BY suffering_score DESC;
```

### 8.4 Looker Dashboard: Key Product Metrics

**Dashboard: "Analysis AI — Product Health"**

| Panel | Chart Type | Metric |
|-------|-----------|--------|
| DAU/WAU/MAU | Trend line (30 day) | Active users |
| Stickiness (DAU/MAU) | Single value + gauge | Ratio |
| Messages Per Active User | Trend line (14 day) | Volume |
| Follow-up Rate | Trend line (14 day) | % of messages that are follow-ups |
| Rephrase Rate | Trend line (14 day) | % of messages that are rephrases |
| Citation CTR | Trend line (14 day) | % of answers with at least one citation click |
| Copy Rate | Trend line (14 day) | % of answers copied |
| Feedback Rate | Trend line + pie | Thumbs up vs down split |
| Latency P50/P95 | Trend line (14 day) | Response time |
| Suffering Score | Bar chart (top 10 sessions) | High-suffering sessions for review |
| Top Departments by Usage | Bar chart | Department breakdown |
| User Activation Funnel | Funnel | Signup → First message → Second session |
| Weekly Retention | Cohort table | D1, D7, D14, D30 retention |

---

## 9. Business Impact & ROI

### Quantified ROI

**Year 1 Projected ROI:**

| Component | Value |
|-----------|-------|
| Analyst time saved (50 analysts × 8.5 hrs/wk × £35/hr × 48 wks) | £714,000 |
| Engineering unblocked (23 hrs/wk × £50/hr × 48 wks) | £55,200 |
| Faster promo planning (inventory optimization, 2% better sell-through) | £200,000+ (est.) |
| Reduced shadow BI errors (1 fewer costly mistake per quarter) | £50,000 |
| **Total Estimated Year 1 Value** | **£1,019,200** |
| **Development Cost (est. 3 engineers × 6 months)** | ~£150,000 |
| **Infrastructure + LLM costs (annual)** | ~£50,000 |
| **Net ROI Year 1** | **~4×** |

### Non-Quantifiable Impact

1. **Data culture transformation** — every decision backed by live data
2. **Merchandising velocity** — faster promo response, better inventory allocation
3. **Analyst satisfaction** — no more "I spend all day writing SQL queries"
4. **Executive confidence** — spend on data infrastructure shows measurable returns
5. **Product roadmap data** — know what features people actually use, kill what they don't

### Building Stakeholder Confidence

| Stakeholder | What They Care About | What to Show |
|------------|---------------------|-------------|
| Head of Analytics | Data accuracy, adoption | DAU trending up, rephrase rate <15% |
| VP Merchandising | Faster decisions, better outcomes | Time-to-insight from days to minutes |
| CTO | Cost, reliability, no regressions | Latency P95 < 5s, cost per query stable |
| CFO | ROI, bottom-line impact | £ saved, hours reclaimed, value per analyst |
| Data Engineering | Fewer ad-hoc requests | Request queue size reduction |

### Communication Cadence

- **Weekly:** Product metrics dashboard review (internal team)
- **Monthly:** Adoption + quality report (stakeholders)
- **Quarterly:** ROI calculation + roadmap impact (executives)
- **Per-release:** Quality eval results (engineering)

---

## 10. Summary: First 30-Day Action Plan

| Week | Action | Owner |
|------|--------|-------|
| W1 | Deploy PostHog snippet to production | Engineer |
| W1 | Create `analytics.ts` event helper module | Engineer |
| W1 | Set up PostHog project + dashboard template | PM + Engineer |
| W2 | Track core events: `message_sent`, `answer_received`, `conversation_started` | Engineer |
| W2 | Track interaction events: `citation_clicked`, `sources_expanded`, `answer_copied` | Engineer |
| W3 | Add feedback UI (thumbs up/down) to MessageBubble | Engineer + Designer |
| W3 | Set up BigQuery export from PostHog | Data Engineer |
| W4 | Build Looker dashboard with core KPI panels | Data Engineer + PM |
| W4 | Write `docs/TRACKING-PLAN.md` | PM |

**Key Principle:** Ship tracking in the first week. Start collecting data before you know what questions to ask. The data will tell you what matters.

---

*"What gets measured gets managed. But what gets measured in an AI product tells you whether the AI is actually helping — not just whether someone opened the chat box."*
