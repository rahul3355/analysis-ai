# Trace: hyb-05

**Generated:** 2026-06-20T02:52:57.877Z
**Category:** hybrid
**Question:** The campaign brief targets 8,000 units of The North Face Nuptse Jacket. How many units of this jacket were actually sold in BigQuery?

---

## Ground Truth

```
Target: 8,000 units; BigQuery: 2 units sold (ORD-005 shipped, ORD-016 delivered).
```

---

## App Reply

According to the data, 2 units of The North Face Nuptse Jacket were sold [1].

---

## Citations

### BigQuery Query

- **Source:** bigquery
- **Type:** bigquery
- **Relevance:** N/A
- **Confidence:** N/A
- **Document:** BigQuery Query
- **Excerpt:** Returned 1 rows.

SELECT SUM(oi.quantity) AS units_sold FROM jd_sports.products p JOIN jd_sports.order_items oi ON p.product_id = oi.product_id JOIN jd_sports.orders o ON oi.order_id = o.order_id WHERE p.brand = 'The North Face' AND p.product_name LIKE '%Nuptse Jacket%' AND o.status IN ('delivered',

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | false |
| Score | 0.23 |
| Checkpoints Found | 2/6 |
| Has Citations | false |
| Confidence | high |

### Errors

- Missing checkpoint: "8000"
- Missing checkpoint: "005"
- Missing checkpoint: "016"
- Missing checkpoint: "target 8000 units bigquery 2 units sold ord005 shipped ord016 delivered"
- No BigQuery citation found for database/hybrid question

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 8000 | ❌ |
| units | ✅ |
| 2 | ✅ |
| 005 | ❌ |
| 016 | ❌ |
| target 8000 units bigquery 2 units sold ord005 shipped ord016 delivered | ❌ |

---

## Raw JSON

```json
{
  "reply": "According to the data, 2 units of The North Face Nuptse Jacket were sold [1].",
  "citations": [
    {
      "id": "2ab505d6-fcc2-4a27-bb66-2873f1120ebe",
      "sourceId": "bigquery",
      "label": "BigQuery Query",
      "excerpt": "Returned 1 rows.\n\nSELECT SUM(oi.quantity) AS units_sold FROM jd_sports.products p JOIN jd_sports.order_items oi ON p.product_id = oi.product_id JOIN jd_sports.orders o ON oi.order_id = o.order_id WHERE p.brand = 'The North Face' AND p.product_name LIKE '%Nuptse Jacket%' AND o.status IN ('delivered', 'shipped');",
      "documentName": "BigQuery Query",
      "type": "bigquery"
    }
  ],
  "scoring": {
    "pass": false,
    "score": 0.23,
    "checkpointsFound": 2,
    "checkpointsTotal": 6,
    "hasCitations": false,
    "errors": [
      "Missing checkpoint: \"8000\"",
      "Missing checkpoint: \"005\"",
      "Missing checkpoint: \"016\"",
      "Missing checkpoint: \"target 8000 units bigquery 2 units sold ord005 shipped ord016 delivered\"",
      "No BigQuery citation found for database/hybrid question"
    ],
    "results": [
      {
        "checkpoint": "8000",
        "found": false
      },
      {
        "checkpoint": "units",
        "found": true
      },
      {
        "checkpoint": "2",
        "found": true
      },
      {
        "checkpoint": "005",
        "found": false
      },
      {
        "checkpoint": "016",
        "found": false
      },
      {
        "checkpoint": "target 8000 units bigquery 2 units sold ord005 shipped ord016 delivered",
        "found": false
      }
    ]
  }
}
```
