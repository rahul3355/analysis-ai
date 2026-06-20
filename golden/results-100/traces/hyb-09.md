# Trace: hyb-09

**Generated:** 2026-06-20T02:54:08.600Z
**Category:** hybrid
**Question:** The running category deep dive targets 200 stores for Hoka. In how many stores is Hoka currently stocked, and how many Hoka products were sold in BQ?

---

## Ground Truth

```
Document: Currently 85 stores (recommendation to expand to 200). BigQuery sold: 2 Hoka Clifton 9 units.
```

---

## App Reply

Based on the sources, Hoka is currently stocked in **85 stores** [1], [2]. No relevant data was found regarding the number of Hoka products sold in "BQ."

---

## Citations

### running_footwear_category_deep_dive_h1_2026.pdf

- **Source:** doc-jd-5
- **Type:** document
- **Relevance:** 0.00772553439742348
- **Confidence:** N/A
- **Document:** running_footwear_category_deep_dive_h1_2026.pdf
- **Excerpt:** 7.5% of running stock value, better than the total footwear aged stock figure of 9.8%. The top 5 SKUs account for 24% of running stock value. This concentration risk means that stock issues with any

...

### running_footwear_category_deep_dive_h1_2026.pdf

- **Source:** doc-jd-5
- **Type:** document
- **Relevance:** 0.0037362205834114964
- **Confidence:** N/A
- **Document:** running_footwear_category_deep_dive_h1_2026.pdf
- **Excerpt:** newer products.  ASICS (14.2% of category - GBP 32 million)  Growth of 24.0% versus prior year, making ASICS the second fastest growing brand. The Gel Kayano 31 and Novablast 4 were both top 10 SKUs. ...

---

## Scoring

| Metric | Value |
|--------|-------|
| Pass | false |
| Score | 0.23 |
| Checkpoints Found | 3/9 |
| Has Citations | false |
| Confidence | high |

### Errors

- Missing checkpoint: "200"
- Missing checkpoint: "9"
- Missing checkpoint: "units"
- Missing checkpoint: "document currently 85 stores recommendation to expand to 200"
- Missing checkpoint: "bigquery sold 2 hoka clifton 9 units"
- Missing checkpoint: "clifton"
- No BigQuery citation found for database/hybrid question

### Checkpoint Details

| Checkpoint | Found |
|------------|-------|
| 85 | ✅ |
| 200 | ❌ |
| 2 | ✅ |
| 9 | ❌ |
| units | ❌ |
| document currently 85 stores recommendation to expand to 200 | ❌ |
| bigquery sold 2 hoka clifton 9 units | ❌ |
| hoka | ✅ |
| clifton | ❌ |

---

## Raw JSON

```json
{
  "reply": "Based on the sources, Hoka is currently stocked in **85 stores** [1], [2]. No relevant data was found regarding the number of Hoka products sold in \"BQ.\"",
  "citations": [
    {
      "id": "126514da-8dc6-4ab5-968d-dd7793f2bcb2",
      "sourceId": "doc-jd-5",
      "label": "running_footwear_category_deep_dive_h1_2026.pdf",
      "excerpt": "7.5% of running stock value, better than the total footwear aged stock figure of 9.8%. The top 5 SKUs account for 24% of running stock value. This concentration risk means that stock issues with any\n\n...",
      "documentName": "running_footwear_category_deep_dive_h1_2026.pdf",
      "relevanceScore": 0.00772553439742348,
      "type": "document"
    },
    {
      "id": "aa0dc8d3-502f-44c0-a808-c67e1ca9bb8c",
      "sourceId": "doc-jd-5",
      "label": "running_footwear_category_deep_dive_h1_2026.pdf",
      "excerpt": "newer products.  ASICS (14.2% of category - GBP 32 million)  Growth of 24.0% versus prior year, making ASICS the second fastest growing brand. The Gel Kayano 31 and Novablast 4 were both top 10 SKUs. ...",
      "documentName": "running_footwear_category_deep_dive_h1_2026.pdf",
      "relevanceScore": 0.0037362205834114964,
      "type": "document"
    }
  ],
  "scoring": {
    "pass": false,
    "score": 0.23,
    "checkpointsFound": 3,
    "checkpointsTotal": 9,
    "hasCitations": false,
    "errors": [
      "Missing checkpoint: \"200\"",
      "Missing checkpoint: \"9\"",
      "Missing checkpoint: \"units\"",
      "Missing checkpoint: \"document currently 85 stores recommendation to expand to 200\"",
      "Missing checkpoint: \"bigquery sold 2 hoka clifton 9 units\"",
      "Missing checkpoint: \"clifton\"",
      "No BigQuery citation found for database/hybrid question"
    ],
    "results": [
      {
        "checkpoint": "85",
        "found": true
      },
      {
        "checkpoint": "200",
        "found": false
      },
      {
        "checkpoint": "2",
        "found": true
      },
      {
        "checkpoint": "9",
        "found": false
      },
      {
        "checkpoint": "units",
        "found": false
      },
      {
        "checkpoint": "document currently 85 stores recommendation to expand to 200",
        "found": false
      },
      {
        "checkpoint": "bigquery sold 2 hoka clifton 9 units",
        "found": false
      },
      {
        "checkpoint": "hoka",
        "found": true
      },
      {
        "checkpoint": "clifton",
        "found": false
      }
    ]
  }
}
```
