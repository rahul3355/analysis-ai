# Trace: hyb-01

**Generated:** 2026-06-20T02:51:45.770Z
**Category:** hybrid
**Question:** Hoka grew 52% year on year according to the deep dive. What was Hoka's actual revenue in the document and how many Hoka Clifton 9 pairs were sold according to BigQuery?

---

## Ground Truth

```
Document: GBP 20 million in H1 running revenue; Hoka Clifton 9: GBP 4.9M across ~38,000 pairs. BigQuery: Hoka revenue GBP 260.00, Clifton 9: 2 pairs sold.
```

---

## App Reply

According to the document, Hoka's revenue is **GBP 20 million** (8.8% of the category) [2][6]. Per BigQuery, the total Hoka revenue is **260** (units unspecified) and **2** pairs of the Hoka Clifton 9 were sold [39].

---

## Citations

### running_footwear_category_deep_dive_h1_2026.pdf

- **Source:** doc-jd-5
- **Type:** document
- **Relevance:** 0.0044510412268872835
- **Confidence:** N/A
- **Document:** running_footwear_category_deep_dive_h1_2026.pdf
- **Excerpt:** newer products.  ASICS (14.2% of category - GBP 32 million)  Growth of 24.0% versus prior year, making ASICS the second fastest growing brand. The Gel Kayano 31 and Novablast 4 were both top 10 SKUs. ...

### running_footwear_category_deep_dive_h1_2026.pdf

- **Source:** doc-jd-5
- **Type:** document
- **Relevance:** 0.0011604196251799289
- **Confidence:** N/A
- **Document:** running_footwear_category_deep_dive_h1_2026.pdf
- **Excerpt:** Running Footwear Category Deep Dive  JD Sports UK | H1 FY2027 (February to July 2026)  Author: Category Manager, Footwear Date: 15 August 2026 Classification: CONFIDENTIAL - INTERNAL USE ONLY

1. Exec...

### BigQuery Query

- **Source:** bigquery
- **Type:** bigquery
- **Relevance:** N/A
- **Confidence:** N/A
- **Document:** BigQuery Query
- **Excerpt:** Returned 1 rows.

SELECT SUM(oi.quantity * p.rrp) AS hoka_revenue, SUM(CASE WHEN p.product_name LIKE '%Clifton 9%' THEN oi.quantity ELSE 0 END) AS clifton_9_pairs_sold FROM jd_sports.orders o JOIN jd_sports.order_items oi ON o.order_id = oi.order_id JOIN jd_sports.products p ON oi.product_id = p.pro

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | false |
| Score | 0.47 |
| Checkpoints Found | 7/15 |
| Has Citations | true |
| Confidence | high |

### Errors

- Missing checkpoint: "1"
- Missing checkpoint: "gbp 4.9"
- Missing checkpoint: "38000"
- Missing checkpoint: "gbp 260.00"
- Missing checkpoint: "document gbp 20 million in h1 running revenue hoka clifton 9 gbp 4"
- Missing checkpoint: "9m across 38000 pairs"
- Missing checkpoint: "bigquery hoka revenue gbp 260"
- Missing checkpoint: "00 clifton 9 2 pairs sold"

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| gbp 20 | ✅ |
| million | ✅ |
| 1 | ❌ |
| 9 | ✅ |
| gbp 4.9 | ❌ |
| 38000 | ❌ |
| pairs | ✅ |
| gbp 260.00 | ❌ |
| 2 | ✅ |
| document gbp 20 million in h1 running revenue hoka clifton 9 gbp 4 | ❌ |
| 9m across 38000 pairs | ❌ |
| bigquery hoka revenue gbp 260 | ❌ |
| 00 clifton 9 2 pairs sold | ❌ |
| hoka | ✅ |
| clifton | ✅ |

---

## Raw JSON

```json
{
  "reply": "According to the document, Hoka's revenue is **GBP 20 million** (8.8% of the category) [2][6]. Per BigQuery, the total Hoka revenue is **260** (units unspecified) and **2** pairs of the Hoka Clifton 9 were sold [39].",
  "citations": [
    {
      "id": "7f01379c-b028-4bea-b75f-0bce7c9f5e56",
      "sourceId": "doc-jd-5",
      "label": "running_footwear_category_deep_dive_h1_2026.pdf",
      "excerpt": "newer products.  ASICS (14.2% of category - GBP 32 million)  Growth of 24.0% versus prior year, making ASICS the second fastest growing brand. The Gel Kayano 31 and Novablast 4 were both top 10 SKUs. ...",
      "documentName": "running_footwear_category_deep_dive_h1_2026.pdf",
      "relevanceScore": 0.0044510412268872835,
      "type": "document"
    },
    {
      "id": "8f70f9a9-bd95-4c4c-a654-5fe3b60eb688",
      "sourceId": "doc-jd-5",
      "label": "running_footwear_category_deep_dive_h1_2026.pdf",
      "excerpt": "Running Footwear Category Deep Dive  JD Sports UK | H1 FY2027 (February to July 2026)  Author: Category Manager, Footwear Date: 15 August 2026 Classification: CONFIDENTIAL - INTERNAL USE ONLY\n\n1. Exec...",
      "documentName": "running_footwear_category_deep_dive_h1_2026.pdf",
      "relevanceScore": 0.0011604196251799289,
      "type": "document"
    },
    {
      "id": "0a68883c-4dff-4efb-a11f-d50fc7efd506",
      "sourceId": "bigquery",
      "label": "BigQuery Query",
      "excerpt": "Returned 1 rows.\n\nSELECT SUM(oi.quantity * p.rrp) AS hoka_revenue, SUM(CASE WHEN p.product_name LIKE '%Clifton 9%' THEN oi.quantity ELSE 0 END) AS clifton_9_pairs_sold FROM jd_sports.orders o JOIN jd_sports.order_items oi ON o.order_id = oi.order_id JOIN jd_sports.products p ON oi.product_id = p.product_id WHERE p.brand = 'Hoka' AND o.status IN ('delivered', 'shipped');",
      "documentName": "BigQuery Query",
      "type": "bigquery"
    }
  ],
  "scoring": {
    "pass": false,
    "score": 0.47,
    "checkpointsFound": 7,
    "checkpointsTotal": 15,
    "hasCitations": true,
    "errors": [
      "Missing checkpoint: \"1\"",
      "Missing checkpoint: \"gbp 4.9\"",
      "Missing checkpoint: \"38000\"",
      "Missing checkpoint: \"gbp 260.00\"",
      "Missing checkpoint: \"document gbp 20 million in h1 running revenue hoka clifton 9 gbp 4\"",
      "Missing checkpoint: \"9m across 38000 pairs\"",
      "Missing checkpoint: \"bigquery hoka revenue gbp 260\"",
      "Missing checkpoint: \"00 clifton 9 2 pairs sold\""
    ],
    "results": [
      {
        "checkpoint": "gbp 20",
        "found": true
      },
      {
        "checkpoint": "million",
        "found": true
      },
      {
        "checkpoint": "1",
        "found": false
      },
      {
        "checkpoint": "9",
        "found": true
      },
      {
        "checkpoint": "gbp 4.9",
        "found": false
      },
      {
        "checkpoint": "38000",
        "found": false
      },
      {
        "checkpoint": "pairs",
        "found": true
      },
      {
        "checkpoint": "gbp 260.00",
        "found": false
      },
      {
        "checkpoint": "2",
        "found": true
      },
      {
        "checkpoint": "document gbp 20 million in h1 running revenue hoka clifton 9 gbp 4",
        "found": false
      },
      {
        "checkpoint": "9m across 38000 pairs",
        "found": false
      },
      {
        "checkpoint": "bigquery hoka revenue gbp 260",
        "found": false
      },
      {
        "checkpoint": "00 clifton 9 2 pairs sold",
        "found": false
      },
      {
        "checkpoint": "hoka",
        "found": true
      },
      {
        "checkpoint": "clifton",
        "found": true
      }
    ]
  }
}
```
