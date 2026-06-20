# Trace: doc-09

**Generated:** 2026-06-20T11:24:41.135Z
**Category:** document
**Question:** What percentage of online orders is expected to be click-and-collect in the annual plan?

---

## Ground Truth

```
25%.
```

---

## App Reply

Based on the FY2027 annual sales plan, click and collect is expected to account for 25% of online orders [1], [2].

---

## Citations

### fy2027_annual_sales_plan.pdf

- **Source:** doc-jd-1
- **Type:** document
- **Relevance:** 0.04216654125124465
- **Confidence:** N/A
- **Document:** fy2027_annual_sales_plan.pdf
- **Excerpt:** arily affected smaller retailers rather than Tier 0 partners like JD.  3. Channel Strategy  Stores (68% of revenue)  The UK store estate comprises approximately 472 JD fascia stores across five tiers....

### fy2027_annual_sales_plan.pdf

- **Source:** doc-jd-1
- **Type:** document
- **Relevance:** 0.012576348276879083
- **Confidence:** N/A
- **Document:** fy2027_annual_sales_plan.pdf
- **Excerpt:** eted at GBP 82.00, with a conversion rate of 5.0%. Click and collect is expected to account for 25% of online orders, driving additional footfall into stores. The JD Status loyalty programme, with a

...

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | true |
| Score | 1 |
| Checkpoints Found | 1/1 |
| Has Citations | true |
| Confidence | undefined |

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 25% | ✅ |

---

## Raw JSON

```json
{
  "reply": "Based on the FY2027 annual sales plan, click and collect is expected to account for 25% of online orders [1], [2].",
  "citations": [
    {
      "id": "661d5e94-b8f8-45c5-9e83-a5dd583a163c",
      "sourceId": "doc-jd-1",
      "label": "fy2027_annual_sales_plan.pdf",
      "excerpt": "arily affected smaller retailers rather than Tier 0 partners like JD.  3. Channel Strategy  Stores (68% of revenue)  The UK store estate comprises approximately 472 JD fascia stores across five tiers....",
      "documentName": "fy2027_annual_sales_plan.pdf",
      "relevanceScore": 0.04216654125124465,
      "type": "document"
    },
    {
      "id": "e99245c6-34cd-4fcb-b103-4a9a195cccd7",
      "sourceId": "doc-jd-1",
      "label": "fy2027_annual_sales_plan.pdf",
      "excerpt": "eted at GBP 82.00, with a conversion rate of 5.0%. Click and collect is expected to account for 25% of online orders, driving additional footfall into stores. The JD Status loyalty programme, with a\n\n...",
      "documentName": "fy2027_annual_sales_plan.pdf",
      "relevanceScore": 0.012576348276879083,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": true,
    "score": 1,
    "checkpointsFound": 1,
    "checkpointsTotal": 1,
    "hasCitations": true,
    "errors": [],
    "results": [
      {
        "checkpoint": "25%",
        "found": true
      }
    ]
  }
}
```
