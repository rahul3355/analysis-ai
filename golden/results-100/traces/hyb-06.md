# Trace: hyb-06

**Generated:** 2026-06-20T02:53:08.071Z
**Category:** hybrid
**Question:** Scotland's Q3 performance was 92.5% of plan (GBP 128 million). How many delivered and shipped orders were placed in Scotland in BigQuery?

---

## Ground Truth

```
Document: 92.5% of plan (GBP 128M vs GBP 138M plan). BigQuery: 6 orders (most of any region).
```

---

## App Reply

According to the database query, there were 6 delivered or shipped orders placed in Scotland [39].

---

## Citations

### BigQuery Query

- **Source:** bigquery
- **Type:** bigquery
- **Relevance:** N/A
- **Confidence:** N/A
- **Document:** BigQuery Query
- **Excerpt:** Returned 1 rows.

SELECT COUNT(o.order_id) AS order_count FROM jd_sports.orders o WHERE o.region = 'Scotland' AND o.status IN ('delivered', 'shipped')

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | false |
| Score | 0.18 |
| Checkpoints Found | 2/8 |
| Has Citations | false |
| Confidence | high |

### Errors

- Missing checkpoint: "92.5%"
- Missing checkpoint: "gbp 128"
- Missing checkpoint: "gbp 138"
- Missing checkpoint: "document 92"
- Missing checkpoint: "5% of plan gbp 128m vs gbp 138m plan"
- Missing checkpoint: "bigquery 6 orders most of any region"
- No BigQuery citation found for database/hybrid question

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 92.5% | ❌ |
| gbp 128 | ❌ |
| gbp 138 | ❌ |
| 6 | ✅ |
| orders | ✅ |
| document 92 | ❌ |
| 5% of plan gbp 128m vs gbp 138m plan | ❌ |
| bigquery 6 orders most of any region | ❌ |

---

## Raw JSON

```json
{
  "reply": "According to the database query, there were 6 delivered or shipped orders placed in Scotland [39].",
  "citations": [
    {
      "id": "7af0d858-56d2-420e-893f-9432b5ca4bd0",
      "sourceId": "bigquery",
      "label": "BigQuery Query",
      "excerpt": "Returned 1 rows.\n\nSELECT COUNT(o.order_id) AS order_count FROM jd_sports.orders o WHERE o.region = 'Scotland' AND o.status IN ('delivered', 'shipped')",
      "documentName": "BigQuery Query",
      "type": "bigquery"
    }
  ],
  "scoring": {
    "pass": false,
    "score": 0.18,
    "checkpointsFound": 2,
    "checkpointsTotal": 8,
    "hasCitations": false,
    "errors": [
      "Missing checkpoint: \"92.5%\"",
      "Missing checkpoint: \"gbp 128\"",
      "Missing checkpoint: \"gbp 138\"",
      "Missing checkpoint: \"document 92\"",
      "Missing checkpoint: \"5% of plan gbp 128m vs gbp 138m plan\"",
      "Missing checkpoint: \"bigquery 6 orders most of any region\"",
      "No BigQuery citation found for database/hybrid question"
    ],
    "results": [
      {
        "checkpoint": "92.5%",
        "found": false
      },
      {
        "checkpoint": "gbp 128",
        "found": false
      },
      {
        "checkpoint": "gbp 138",
        "found": false
      },
      {
        "checkpoint": "6",
        "found": true
      },
      {
        "checkpoint": "orders",
        "found": true
      },
      {
        "checkpoint": "document 92",
        "found": false
      },
      {
        "checkpoint": "5% of plan gbp 128m vs gbp 138m plan",
        "found": false
      },
      {
        "checkpoint": "bigquery 6 orders most of any region",
        "found": false
      }
    ]
  }
}
```
