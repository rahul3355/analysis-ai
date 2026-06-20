# Trace: hyb-14

**Generated:** 2026-06-20T02:55:54.149Z
**Category:** hybrid
**Question:** Adidas is planned at 25% of revenue in the sales plan. What is the actual Adidas revenue percentage in BQ?

---

## Ground Truth

```
Planned: 25%; Actual: 16.90% (GBP 365.00 Adidas revenue on GBP 2,160.00 total revenue).
```

---

## App Reply

The actual Adidas revenue percentage in BigQuery is 16.9% [39].

---

## Citations

### BigQuery Query

- **Source:** bigquery
- **Type:** bigquery
- **Relevance:** N/A
- **Confidence:** N/A
- **Document:** BigQuery Query
- **Excerpt:** Returned 1 rows.

SELECT ROUND( SUM(CASE WHEN p.brand = 'Adidas' THEN oi.sale_price * oi.quantity ELSE 0 END) / NULLIF(SUM(oi.sale_price * oi.quantity), 0) * 100, 2 ) AS adidas_revenue_pct FROM jd_sports.order_items oi JOIN jd_sports.products p ON oi.product_id = p.product_id JOIN jd_sports.orders o

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | false |
| Score | 0.11 |
| Checkpoints Found | 1/9 |
| Has Citations | true |
| Confidence | high |

### Errors

- Missing checkpoint: "25%"
- Missing checkpoint: "16.90%"
- Missing checkpoint: "gbp 365.00"
- Missing checkpoint: "gbp 2160.00"
- Missing checkpoint: "planned 25% actual 16"
- Missing checkpoint: "90% gbp 365"
- Missing checkpoint: "00 adidas revenue on gbp 2160"
- Missing checkpoint: "00 total revenue"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 25% | ❌ |
| 16.90% | ❌ |
| gbp 365.00 | ❌ |
| gbp 2160.00 | ❌ |
| planned 25% actual 16 | ❌ |
| 90% gbp 365 | ❌ |
| 00 adidas revenue on gbp 2160 | ❌ |
| 00 total revenue | ❌ |
| adidas | ✅ |

---

## Raw JSON

```json
{
  "reply": "The actual Adidas revenue percentage in BigQuery is 16.9% [39].",
  "citations": [
    {
      "id": "fb54472a-c113-402e-95fc-c1a47c4a3a0e",
      "sourceId": "bigquery",
      "label": "BigQuery Query",
      "excerpt": "Returned 1 rows.\n\nSELECT ROUND( SUM(CASE WHEN p.brand = 'Adidas' THEN oi.sale_price * oi.quantity ELSE 0 END) / NULLIF(SUM(oi.sale_price * oi.quantity), 0) * 100, 2 ) AS adidas_revenue_pct FROM jd_sports.order_items oi JOIN jd_sports.products p ON oi.product_id = p.product_id JOIN jd_sports.orders o ON oi.order_id = o.order_id WHERE o.status IN ('delivered', 'shipped');",
      "documentName": "BigQuery Query",
      "type": "bigquery"
    }
  ],
  "scoring": {
    "pass": false,
    "score": 0.11,
    "checkpointsFound": 1,
    "checkpointsTotal": 9,
    "hasCitations": true,
    "errors": [
      "Missing checkpoint: \"25%\"",
      "Missing checkpoint: \"16.90%\"",
      "Missing checkpoint: \"gbp 365.00\"",
      "Missing checkpoint: \"gbp 2160.00\"",
      "Missing checkpoint: \"planned 25% actual 16\"",
      "Missing checkpoint: \"90% gbp 365\"",
      "Missing checkpoint: \"00 adidas revenue on gbp 2160\"",
      "Missing checkpoint: \"00 total revenue\""
    ],
    "results": [
      {
        "checkpoint": "25%",
        "found": false
      },
      {
        "checkpoint": "16.90%",
        "found": false
      },
      {
        "checkpoint": "gbp 365.00",
        "found": false
      },
      {
        "checkpoint": "gbp 2160.00",
        "found": false
      },
      {
        "checkpoint": "planned 25% actual 16",
        "found": false
      },
      {
        "checkpoint": "90% gbp 365",
        "found": false
      },
      {
        "checkpoint": "00 adidas revenue on gbp 2160",
        "found": false
      },
      {
        "checkpoint": "00 total revenue",
        "found": false
      },
      {
        "checkpoint": "adidas",
        "found": true
      }
    ]
  }
}
```
