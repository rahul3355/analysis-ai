# Trace: hyb-07

**Generated:** 2026-06-20T02:53:18.047Z
**Category:** hybrid
**Question:** The sales plan targets an online Average Order Value of GBP 82.00. What is the actual Average Order Value of online orders in BigQuery?

---

## Ground Truth

```
Target: GBP 82.00; Actual: GBP 113.33 (GBP 1,360.00 across 12 online orders).
```

---

## App Reply

The actual Average Order Value of online orders is GBP 113.33 [1].

---

## Citations

### BigQuery Query

- **Source:** bigquery
- **Type:** bigquery
- **Relevance:** N/A
- **Confidence:** N/A
- **Document:** BigQuery Query
- **Excerpt:** Returned 1 rows.

SELECT ROUND(AVG(o.total_amount), 2) AS average_order_value FROM jd_sports.orders o WHERE o.channel = 'online' AND o.status IN ('delivered', 'shipped')

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | false |
| Score | 0.16 |
| Checkpoints Found | 2/9 |
| Has Citations | false |
| Confidence | high |

### Errors

- Missing checkpoint: "gbp 82.00"
- Missing checkpoint: "gbp 1360.00"
- Missing checkpoint: "12"
- Missing checkpoint: "target gbp 82"
- Missing checkpoint: "00 actual gbp 113"
- Missing checkpoint: "33 gbp 1360"
- Missing checkpoint: "00 across 12 online orders"
- No BigQuery citation found for database/hybrid question

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| gbp 82.00 | ❌ |
| gbp 113.33 | ✅ |
| gbp 1360.00 | ❌ |
| 12 | ❌ |
| orders | ✅ |
| target gbp 82 | ❌ |
| 00 actual gbp 113 | ❌ |
| 33 gbp 1360 | ❌ |
| 00 across 12 online orders | ❌ |

---

## Raw JSON

```json
{
  "reply": "The actual Average Order Value of online orders is GBP 113.33 [1].",
  "citations": [
    {
      "id": "02e501cf-13a8-4ddb-9cd7-5e1e4917ea71",
      "sourceId": "bigquery",
      "label": "BigQuery Query",
      "excerpt": "Returned 1 rows.\n\nSELECT ROUND(AVG(o.total_amount), 2) AS average_order_value FROM jd_sports.orders o WHERE o.channel = 'online' AND o.status IN ('delivered', 'shipped')",
      "documentName": "BigQuery Query",
      "type": "bigquery"
    }
  ],
  "scoring": {
    "pass": false,
    "score": 0.16,
    "checkpointsFound": 2,
    "checkpointsTotal": 9,
    "hasCitations": false,
    "errors": [
      "Missing checkpoint: \"gbp 82.00\"",
      "Missing checkpoint: \"gbp 1360.00\"",
      "Missing checkpoint: \"12\"",
      "Missing checkpoint: \"target gbp 82\"",
      "Missing checkpoint: \"00 actual gbp 113\"",
      "Missing checkpoint: \"33 gbp 1360\"",
      "Missing checkpoint: \"00 across 12 online orders\"",
      "No BigQuery citation found for database/hybrid question"
    ],
    "results": [
      {
        "checkpoint": "gbp 82.00",
        "found": false
      },
      {
        "checkpoint": "gbp 113.33",
        "found": true
      },
      {
        "checkpoint": "gbp 1360.00",
        "found": false
      },
      {
        "checkpoint": "12",
        "found": false
      },
      {
        "checkpoint": "orders",
        "found": true
      },
      {
        "checkpoint": "target gbp 82",
        "found": false
      },
      {
        "checkpoint": "00 actual gbp 113",
        "found": false
      },
      {
        "checkpoint": "33 gbp 1360",
        "found": false
      },
      {
        "checkpoint": "00 across 12 online orders",
        "found": false
      }
    ]
  }
}
```
