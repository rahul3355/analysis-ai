# Trace: doc-06

**Generated:** 2026-06-20T11:24:18.740Z
**Category:** document
**Question:** What is Sports Direct's estimated market share in the UK sportswear market according to the sales plan?

---

## Ground Truth

```
Approximately 14.0%.
```

---

## App Reply

According to the FY2027 Annual Sales Plan, Sports Direct (Frasers Group) holds an estimated market share of approximately 14.0% in the UK sportswear market [1].

---

## Citations

### fy2027_annual_sales_plan.pdf

- **Source:** doc-jd-1
- **Type:** document
- **Relevance:** 0.49921894137018
- **Confidence:** N/A
- **Document:** fy2027_annual_sales_plan.pdf
- **Excerpt:** FY2027 Annual Sales Plan  JD Sports UK | Financial Year 2026/27  Author: Trading Director Date: February 2026 Classification: CONFIDENTIAL

1. Executive Summary  JD Sports UK targets total revenue of ...

### BigQuery Query

- **Source:** bigquery
- **Type:** bigquery
- **Relevance:** N/A
- **Confidence:** N/A
- **Document:** BigQuery Query
- **Excerpt:** Returned 8 rows.

WITH brand_sales AS ( SELECT p.brand, SUM(oi.sale_price * oi.quantity) AS total_revenue, COUNT(DISTINCT o.order_id) AS order_count FROM jd_sports.products p JOIN jd_sports.order_items oi ON p.product_id = oi.product_id JOIN jd_sports.orders o ON oi.order_id = o.order_id WHERE o.sta

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | true |
| Score | 1 |
| Checkpoints Found | 2/2 |
| Has Citations | true |
| Confidence | undefined |

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 14.0% | ✅ |
| approximately 14 | ✅ |

---

## Raw JSON

```json
{
  "reply": "According to the FY2027 Annual Sales Plan, Sports Direct (Frasers Group) holds an estimated market share of approximately 14.0% in the UK sportswear market [1].",
  "citations": [
    {
      "id": "b4c5fd45-e47b-485a-9224-60ca19c9af15",
      "sourceId": "doc-jd-1",
      "label": "fy2027_annual_sales_plan.pdf",
      "excerpt": "FY2027 Annual Sales Plan  JD Sports UK | Financial Year 2026/27  Author: Trading Director Date: February 2026 Classification: CONFIDENTIAL\n\n1. Executive Summary  JD Sports UK targets total revenue of ...",
      "documentName": "fy2027_annual_sales_plan.pdf",
      "relevanceScore": 0.49921894137018,
      "type": "document"
    },
    {
      "id": "7a585164-df53-49ac-9bb8-7899a3058645",
      "sourceId": "bigquery",
      "label": "BigQuery Query",
      "excerpt": "Returned 8 rows.\n\nWITH brand_sales AS ( SELECT p.brand, SUM(oi.sale_price * oi.quantity) AS total_revenue, COUNT(DISTINCT o.order_id) AS order_count FROM jd_sports.products p JOIN jd_sports.order_items oi ON p.product_id = oi.product_id JOIN jd_sports.orders o ON oi.order_id = o.order_id WHERE o.status IN ('delivered', 'shipped') GROUP BY p.brand ), total_market AS ( SELECT SUM(total_revenue) AS total_sportswear_revenue FROM brand_sales ) SELECT bs.brand, bs.total_revenue, bs.order_count, ROUND((bs.total_revenue / tm.total_sportswear_revenue) * 100, 2) AS market_share_percent FROM brand_sales bs CROSS JOIN total_market tm WHERE bs.brand IN ('Nike', 'Adidas', 'Hoka', 'ASICS', 'New Balance', 'The North Face', 'Converse', 'Under Armour') ORDER BY market_share_percent DESC",
      "documentName": "BigQuery Query",
      "type": "bigquery"
    }
  ],
  "scoring": {
    "pass": true,
    "score": 1,
    "checkpointsFound": 2,
    "checkpointsTotal": 2,
    "hasCitations": true,
    "errors": [],
    "results": [
      {
        "checkpoint": "14.0%",
        "found": true
      },
      {
        "checkpoint": "approximately 14",
        "found": true
      }
    ]
  }
}
```
